"""Shared harness for the five persona walks (stream G).

Every walk runs against the public address, read-only. A route guard aborts every request to /voice/
and every request that is not GET or HEAD, and records it: a persona test can never place a real call,
and an attempt is itself a finding.

Each check records persona, page, severity (blocker, fix, polish) and the owning stream, and saves a
screenshot when it fails. Results go to tests/personas/out/<stamp>/ (ignored by git).
"""
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = os.environ.get("INSIYAB_BASE", "https://insiyab.amirkazemkhani.com").rstrip("/")
HERE = Path(__file__).resolve().parent
STAMP = os.environ.get("PERSONA_STAMP") or datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
OUT = HERE / "out" / STAMP
OUT.mkdir(parents=True, exist_ok=True)

PAGES = {"home": "/", "pitch": "/pitch/", "deck": "/pitch/deck/", "ops": "/ops/"}

# Who fixes a page when the check is about the page itself.
OWNER = {"home": "lane 1 (web/)", "pitch": "B", "deck": "B", "ops": "A"}

# docs/v2/STRATEGY.md section 7, docs/v2/FACTS.md "Never say", docs/RULES.md 1.4 and CONSOLE-SPEC "Must never happen" 5.
# Each entry: (name, regex, what to say instead). Matched case-insensitively against rendered text and speaker notes.
BANNED = [
    ("68% of delays", r"(delays?\b[^.]{0,40}\b68\s?%|68\s?%[^.]{0,40}\bdelays?\b)", "RTA's AI dashboards cut early departures by more than 68%"),
    ("50% punctuality", r"punctuality[^.]{0,40}50\s?%|50\s?%[^.]{0,40}punctuality", "say nothing: no RTA source"),
    ("boarding model beats naive", r"boarding[^.]{0,80}\b(beats?|outperforms?)\b", "close to the best simple rule; show its range"),
    ("warning 30 minutes / an hour ahead", r"\b(30|thirty) minutes ahead|\ban hour ahead|\bone hour ahead|\b60 minutes ahead", "made before departure; read when the departure is due"),
    ("stand-in +46/+43/+42 in 100", r"\+?\s?4[236] in 100|4[236] to 4[236] in 100|4[236]\s?(to|-|–)\s?4[236]\s?%", "15% closer, 6.97 vs 8.25 min (real trip-time result)"),
    ("20 stops ahead", r"\b20 stops ahead", "stand-in engine run: never on screen"),
    ("ranges held 91 to 98", r"\b91 to 98\b", "stand-in engine run: never on screen"),
    ("robots cut cost by X", r"robots?[^.]{0,40}\bcut\b[^.]{0,40}cost", "RTA already approves delivery robots and robotaxi trials"),
    ("every late bus was late an hour ago", r"every late bus", "85 in 100 when the bus was still out"),
    ("most stops are poles", r"most (bus )?stops are (bare )?poles", "553 air-conditioned shelters and 993 poles among the stops whose kind RTA published"),
    ("connected to the DSS", r"(?<!not )(?<!never )(?<!n't )\bconnected (to|with) (RTA'?s )?(the )?(DSS|Decision Support)", "designed to sit beside the DSS; a proposal"),
    ("AI decides", r"\bAI (decides|decided|fixed|chose|dispatche[sd])\b", "Predicted delay. Options ready for review. A person decides."),
    ("recommended by the AI", r"\b(AI|Insiyab)[- ]recommended\b|recommended by (the )?(AI|Insiyab)|\bAI recommends?\b|\bAI pick\b", "the suggestion is Insiyab's; the RTA system pick is simulated"),
    ("filler word", r"\b(seamless(ly)?|robust|leverag(e|es|ed|ing)|elevate[sd]?|cutting-edge|revolutionary)\b", "docs/RULES.md 1.4"),
]
EM_DASH = "—"


class Run:
    """One persona walk: a browser, a guarded context, and the checks it records."""

    def __init__(self, persona):
        self.persona = persona
        self.results = []
        self.blocked = []
        self.requests = []
        self.errors = []
        self.pw = sync_playwright().start()
        self.browser = self.pw.chromium.launch()
        self.ctx = None
        self.page = None
        self.deploy = {}
        try:
            self.deploy = json.loads(self.pw.request.new_context().get(BASE + "/deploy.json").text())
        except Exception as e:  # the deploy marker is evidence, not a precondition
            self.deploy = {"error": str(e)}

    # ---- browser -----------------------------------------------------------------
    def new(self, width=1920, height=1080, reduced=False, mobile=False):
        if self.ctx:
            self.ctx.close()
        opts = dict(viewport={"width": width, "height": height}, reduced_motion="reduce" if reduced else "no-preference")
        if mobile:
            opts.update(is_mobile=True, has_touch=True, device_scale_factor=3)
        self.ctx = self.browser.new_context(**opts)
        self.ctx.route("**/*", self._guard)
        self.page = self.ctx.new_page()
        self.page.on("pageerror", lambda e: self.errors.append(f"{self.page.url}: {e}"))
        self.page.on("request", lambda r: self.requests.append((r.method, r.url)))
        return self.page

    def _guard(self, route):
        req = route.request
        if "/voice/" in req.url or req.method not in ("GET", "HEAD"):
            self.blocked.append(f"{req.method} {req.url}")
            route.abort()
        else:
            route.continue_()

    def goto(self, name, query="", settle=1200):
        resp = self.page.goto(BASE + PAGES[name] + query, wait_until="domcontentloaded")
        try:
            self.page.wait_for_load_state("networkidle", timeout=8000)
        except Exception:
            pass
        self.page.wait_for_timeout(settle)
        return resp

    def text(self, selector="body"):
        return self.page.locator(selector).first.inner_text()

    # ---- recording ---------------------------------------------------------------
    def check(self, ok, page, name, severity, owner, detail="", shot=True, full=False):
        row = {"persona": self.persona, "page": page, "check": name, "pass": bool(ok), "severity": severity,
               "owner": owner, "detail": str(detail)[:1500], "screenshot": None,
               "url": self.page.url if self.page else ""}
        if not ok and shot and self.page:
            n = sum(1 for r in self.results if not r["pass"]) + 1
            slug = re.sub(r"[^a-z0-9]+", "-", f"{self.persona}-{n:02d}-{name}".lower())[:80].strip("-")
            path = OUT / f"{slug}.png"
            try:
                self.page.screenshot(path=str(path), full_page=full)
                row["screenshot"] = str(path.relative_to(HERE.parents[1]))
            except Exception as e:
                row["detail"] += f" (screenshot failed: {e})"
        self.results.append(row)
        mark = "PASS" if ok else f"FAIL[{severity}->{owner}]"
        print(f"{mark} {page}: {name}" + (f" | {row['detail'][:300]}" if (detail and not ok) else ""), flush=True)
        return ok

    def finish(self):
        try:
            if self.ctx:
                self.ctx.close()
            self.browser.close()
        finally:
            self.pw.stop()
        failed = [r for r in self.results if not r["pass"]]
        blockers = [r for r in failed if r["severity"] == "blocker"]
        report = {"persona": self.persona, "time": datetime.now(timezone.utc).isoformat(), "base": BASE,
                  "deploy": self.deploy, "passed": len(self.results) - len(failed), "failed": len(failed),
                  "blockers": len(blockers), "blocked_requests": self.blocked, "page_errors": self.errors,
                  "results": self.results}
        (OUT / f"{self.persona}.json").write_text(json.dumps(report, indent=2))
        print(f"PERSONA {self.persona}: {report['passed']} PASS, {report['failed']} FAIL "
              f"({len(blockers)} blocker) on deploy {self.deploy.get('commit', '?')}", flush=True)
        return 1 if failed else 0


# ---- shared checks, each returns data; the persona decides severity and owner ---------
def banned_hits(text):
    hits = []
    for name, rx, instead in BANNED:
        for m in re.finditer(rx, text, flags=re.I):
            if re.search(r"(never|do not|don't|not) say[^.]{0,20}$", text[max(0, m.start() - 40):m.start()], re.I):
                continue  # a speaker note telling the presenter not to say it
            s = max(0, m.start() - 60)
            hits.append(f"{name}: '...{text[s:m.end() + 60].strip()}...' (say: {instead})".replace("\n", " "))
    return hits


def deck_slides(run):
    """Every slide of the deck with all steps shown: (number, visible text, speaker notes)."""
    run.goto("deck", "?s=1&all", settle=600)
    count = run.page.locator(".slide").count()
    out = []
    for i in range(1, count + 1):
        run.page.goto(f"{BASE}/pitch/deck/?s={i}&all", wait_until="domcontentloaded")
        run.page.wait_for_timeout(350)
        slide = run.page.locator(".slide.on").first
        out.append((i, slide.inner_text(), slide.get_attribute("data-notes") or ""))
    return out


OVERFLOW_JS = """() => {
  const w = document.documentElement.clientWidth;
  const off = [];
  for (const e of document.querySelectorAll('body *')) {
    const r = e.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const cs = getComputedStyle(e);
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.position === 'fixed') continue;
    let p = e.parentElement, clipped = false;
    while (p && p !== document.body) { const o = getComputedStyle(p).overflowX; if (o === 'hidden' || o === 'auto' || o === 'scroll' || o === 'clip') { clipped = true; break; } p = p.parentElement; }
    if (!clipped && r.right > w + 1) off.push((e.id ? '#' + e.id : e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : '')) + ' right=' + Math.round(r.right));
  }
  return {scroll: document.documentElement.scrollWidth, width: w, offenders: off.slice(0, 8)};
}"""

# WCAG relative luminance contrast of every visible text node against its first opaque ancestor background.
CONTRAST_JS = """() => {
  const parse = c => { const m = c.match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return {r:p[0], g:p[1], b:p[2], a: p.length > 3 ? p[3] : 1}; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const blend = (fg, bg) => ({r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1});
  const bgOf = e => { const stack = []; let n = e; while (n) { const cs = getComputedStyle(n); if (cs.backgroundImage && cs.backgroundImage !== 'none') return {unknown: true}; if (n.tagName === 'VIDEO' || n.tagName === 'CANVAS' || n.tagName === 'IMG') return {unknown: true}; const c = parse(cs.backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a >= 1) break; } n = n.parentElement; }
    let bg = {r: 255, g: 255, b: 255, a: 1}; for (let i = stack.length - 1; i >= 0; i--) bg = blend(stack[i], bg); return bg; };
  const seen = new Map(); const bad = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const t = walker.currentNode; const txt = t.textContent.trim(); if (txt.length < 2) continue;
    const e = t.parentElement; if (!e) continue; const r = e.getBoundingClientRect(); if (r.width === 0 || r.height === 0) continue;
    if (r.bottom < 0 || r.top > innerHeight * 4) continue;
    const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) continue;
    // something positioned above the text (a map, a video) can make the true background unknowable: skip those
    const under = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, r.left + 2)), Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2)));
    const bg = bgOf(e); if (bg.unknown) continue;
    let fg = parse(cs.color); if (!fg) continue; fg = blend({...fg, a: fg.a * parseFloat(cs.opacity)}, bg);
    const L1 = lum(fg), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight) >= 700; const large = size >= 24 || (bold && size >= 18.66);
    const need = large ? 3 : 4.5;
    if (ratio + 0.005 < need) { const key = cs.color + '|' + JSON.stringify(bg); if (!seen.has(key)) { seen.set(key, 1); bad.push(`${ratio.toFixed(2)}:1 need ${need} '${txt.slice(0, 40)}' color ${cs.color} on rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)}) ${size}px`); } }
  }
  return bad;
}"""

SMALL_TEXT_JS = """(min) => {
  const out = new Map();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) { const t = walker.currentNode; const txt = t.textContent.trim(); if (txt.length < 2) continue;
    const e = t.parentElement; const r = e.getBoundingClientRect(); if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight) continue;
    const cs = getComputedStyle(e); if (cs.visibility === 'hidden') continue;
    const s = parseFloat(cs.fontSize); if (s < min) { const k = s.toFixed(1) + 'px'; if (!out.has(k)) out.set(k, []); if (out.get(k).length < 4) out.get(k).push(txt.slice(0, 30)); } }
  return [...out.entries()].map(([k, v]) => k + ': ' + v.join(' | '));
}"""

ALT_JS = """() => {
  const bad = [];
  for (const i of document.querySelectorAll('img')) if (!i.hasAttribute('alt')) bad.push('img ' + (i.getAttribute('src') || '').slice(-50));
  for (const s of document.querySelectorAll('svg[role=img]')) if (!s.getAttribute('aria-label') && !s.querySelector('title') && !s.getAttribute('aria-labelledby')) bad.push('svg role=img without a name');
  for (const v of document.querySelectorAll('video')) if (!v.getAttribute('aria-label') && !v.getAttribute('title') && !v.querySelector('track') && !v.getAttribute('aria-hidden')) bad.push('video without a label or captions ' + (v.id || v.currentSrc.slice(-30)));
  for (const c of document.querySelectorAll('button, select, input:not([type=hidden]), a[href]')) {
    const r = c.getBoundingClientRect(); if (!r.width || (c.checkVisibility && !c.checkVisibility({visibilityProperty: true}))) continue;
    const name = (c.getAttribute('aria-label') || c.getAttribute('title') || c.innerText || c.value || (c.labels && c.labels[0] && c.labels[0].innerText) || (c.getAttribute('aria-labelledby') ? 'x' : '') || (c.querySelector('img[alt]') ? c.querySelector('img[alt]').alt : '')).trim();
    if (!name) bad.push(c.tagName.toLowerCase() + (c.id ? '#' + c.id : '') + ' has no accessible name');
  }
  return bad;
}"""

TARGETS_JS = """() => {
  const bad = [];
  for (const c of document.querySelectorAll('button, select, input:not([type=hidden]), [role=button], summary, a[href]')) {
    const r = c.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const cs = getComputedStyle(c); if (cs.visibility === 'hidden' || (c.checkVisibility && !c.checkVisibility({visibilityProperty: true}))) continue;
    if (c.tagName === 'A' && c.closest('p, li, td, figcaption, small')) continue; // inline links in a sentence are exempt (WCAG 2.5.8)
    if (r.width < 44 || r.height < 44) bad.push((c.id ? '#' + c.id : c.tagName.toLowerCase() + ' "' + (c.innerText || c.getAttribute('aria-label') || '').trim().slice(0, 24) + '"') + ` ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  return bad;
}"""

MOTION_JS = """() => {
  const running = document.getAnimations().filter(a => a.playState === 'running').map(a => {
    const t = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming() : {}; const tgt = a.effect && a.effect.target;
    return {name: a.animationName || a.transitionProperty || a.constructor.name, dur: t.duration, iter: t.iterations, on: tgt ? (tgt.id ? '#' + tgt.id : tgt.tagName) : '?'};
  }).filter(a => (a.dur || 0) > 50);
  const videos = [...document.querySelectorAll('video')].filter(v => !v.paused && v.getBoundingClientRect().width > 0).map(v => '#' + (v.id || 'video'));
  return {running, videos};
}"""


def numbers_without_label(page, selector):
    """Text nodes inside `selector` that are only a number, whose nearby text carries no word."""
    return page.evaluate("""(sel) => {
      const root = document.querySelector(sel); if (!root) return ['(missing ' + sel + ')'];
      const bad = []; const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (w.nextNode()) { const t = w.currentNode.textContent.trim(); if (!/^[-+~]?[\\d.,]+\\s*%?$/.test(t)) continue;
        const e = w.currentNode.parentElement; const r = e.getBoundingClientRect(); if (!r.width) continue;
        let ctx = e.parentElement; let txt = ctx ? ctx.innerText : '';
        if (!/[A-Za-z]{3,}/.test(txt.replace(t, '')) && ctx && ctx.parentElement) txt = ctx.parentElement.innerText;
        if (!/[A-Za-z]{3,}/.test(txt.replace(t, ''))) bad.push(t + ' in ' + (e.id ? '#' + e.id : e.tagName.toLowerCase())); }
      return bad; }""", selector)


def main(walk, persona):
    run = Run(persona)
    try:
        walk(run)
    except Exception as e:  # a crash in the walk is a finding too, never a silent pass
        run.check(False, "walk", f"walk completed without error", "blocker", "G", f"{type(e).__name__}: {e}")
    code = run.finish()
    sys.exit(code)
