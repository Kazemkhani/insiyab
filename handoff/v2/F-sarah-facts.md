# Stream F: facts and sources (Sarah Maaty, Claude)

Paste below into Claude Code opened in your clone of the repo.

---

Every number the team says on Friday must survive an RTA executive asking "where is that from?". You make sure it does.

## Read first
`docs/RULES.md`, `docs/v2/STRATEGY.md` section 7, **`docs/v2/FACTS.md`** (your work list).

## You own
`docs/research/` (new) and `coordination/v2-F.md`.

## Tasks
1. For **every row marked "Reported"** in `docs/v2/FACTS.md`: open the source yourself (WebFetch, or `curl -s "https://r.jina.ai/<url>"`), find the exact sentence, and record in `docs/research/VERIFIED.md`: the claim, the exact quote, the URL, the date, and the verdict (Verified, Changed to ..., or Drop). Prefer RTA, WAM or Dubai Media Office over newspapers. If only a newspaper says it, write "newspaper only".
2. Find the **primary source** for: RTA's 893 air-conditioned shelters (RTA or WAM page), the midday break rule (MoHRE), Dubai summer temperatures (NCM), Singapore Walk2Ride 200 km (LTA), and the UCLA heat-rerouting study (the paper itself).
3. Check two things the team wants to say, and give the safest true wording: "Most Dubai bus stops are not air-conditioned" (how many stops does RTA say it has in total?), and "No transit authority prioritises late buses by heat exposure" (search for counter-examples: Phoenix Valley Metro, Las Vegas RTC, Gulf cities). If a counter-example exists, the line becomes "few, if any".
4. Write `docs/research/ARC-SOURCES.md`: the sources for the 2030 and 2040 claims (Dubai 2040 Urban Master Plan; UAE National AI Strategy 2031; RTA's AI strategy, Nov 2026).
5. Every time you change a verdict, add a line to `coordination/v2-F.md` with `TO LANE 1:` so Amir updates `docs/v2/FACTS.md`, and `TO STREAM B:` and `TO STREAM E:` if a slide or a spoken line must change.

## Done means
No row in `docs/v2/FACTS.md` is left "Reported" without your verdict, by Thursday 10:00.
