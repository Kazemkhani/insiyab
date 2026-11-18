"""Build the named team briefing from one content source and live-app notes."""
import argparse
import base64
import html
import json
import re
import subprocess
import zipfile
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, KeepTogether
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
E = html.escape


def clock(n):
    return f'{n//60}:{n%60:02d}'


def source_link(source):
    return 'https://github.com/Kazemkhani/insiyab/blob/main/' + source['path']


def presenter_notes():
    source = (ROOT / 'dataiku/webapp/script.js').read_text()
    block = source.split('var _presenterData = {', 1)[1].split('\n};', 1)[0]
    rows = []
    for key, body in re.findall(r'^\s*(\w+):\s*(\{.*\}),?$', block, re.M):
        body = re.sub(r'\b(say|point|next):', r'"\1":', body)
        rows.append((key, json.loads(body)))
    assert len(rows) == 8, 'Presenter-note source changed; inspect before building'
    return rows


def build_html(data, notes, out):
    people = {p['id']: p for p in data['people']}
    toc = ''.join(f'<a href="#{p["id"]}"><strong>{E(p["name"])}</strong><span>{E(p["area"])}</span></a>' for p in data['people'])
    flow = ''.join(f'<a href="#cue-{i}"><time>{clock(s["start"])}–{clock(s["end"])}</time><b>{E(people[s["person"]]["name"])}</b><span>{E(s["title"])}</span></a>' for i,s in enumerate(data['segments']))
    profiles = []
    for p in data['people']:
        turns = ', '.join(clock(s['start']) for s in data['segments'] if s['person'] == p['id'])
        learn = ''.join(f'<h3>{E(k)}</h3><p>{E(v)}</p>' for k,v in p['learn'])
        qa = ''.join(f'<details><summary>{E(q)}</summary><p>{E(a)}</p></details>' for q,a in p['qa'])
        nums = ''.join(f'<li>{E(n)}</li>' for n in p['numbers'])
        sources = ''.join(f'<a href="{source_link(data["sources"][s])}">{E(data["sources"][s]["title"])}</a>' for s in p['sources'])
        profiles.append(f'''<section class="person" id="{p['id']}"><div class="section-head"><p class="kicker">Your two-page brief · speaking at {turns}</p><h2>{E(p['name'])}</h2><p class="lead">{E(p['area'])}</p><a class="download" href="{p['id']}-brief.pdf" download>Download your two-page PDF</a></div><div class="columns"><article><p class="pullquote">{E(p['line'])}</p>{learn}<h3>Keep these facts straight</h3><ul>{nums}</ul></article><aside><h3>Your phone role</h3><p class="role">{E(p['role'])}</p><p>{E(p['call'])}</p><h3>Be ready for these questions</h3>{qa}<h3>Words to avoid</h3><p>{E(p['avoid'])}</p><h3>Your handover</h3><p>“{E(p['handoff'])}”</p><div class="sources"><h3>Read the source</h3>{sources}</div></aside></div><a href="#contents">Back to the team contents</a></section>''')
    cues = []
    for i,s in enumerate(data['segments']):
        cues.append(f'''<article class="cue" id="cue-{i}" data-start="{s['start']}" data-end="{s['end']}"><div class="cue-head"><time>{clock(s['start'])}–{clock(s['end'])}</time><b>{E(people[s['person']]['name'])}</b></div><h3>{E(s['title'])}</h3><p class="screen">SCREEN · {E(s['screen'])}</p><blockquote>{E(s['say'])}</blockquote><div class="direction"><p><b>Point at:</b> {E(s['point'])}</p><p><b>Do:</b> {E(s['action'])}</p></div></article>''')
    names = ['The day', "Planner’s worklist", 'Passenger demand', 'Service reliability', 'Supply and capacity', 'Forecast', 'What if', 'How it is built']
    note_html = ''.join(f'<details><summary>{i+1}. {names[i]}</summary><h3>Say</h3><p>{E(n["say"])}</p><h3>Point at</h3><p>{E(n["point"])}</p><h3>Then click</h3><p>{E(n["next"])}</p></details>' for i,(_,n) in enumerate(notes))
    source_html = ''.join(f'<li><a href="{source_link(s)}">{E(s["title"])}</a></li>' for s in data['sources'].values())
    fonts = {}
    for name,path in [('heading','overpass/files/overpass-latin-600-normal.woff2'), ('body','ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2')]:
        fonts[name] = base64.b64encode((ROOT/'web/node_modules/@fontsource'/path).read_bytes()).decode()
    template = (HERE/'template.html').read_text()
    substitutions = {'TITLE':E(data['title']), 'INTRO':E(data['intro']), 'STATUS':E(data['status']), 'TOC':toc, 'FLOW':flow, 'PEOPLE':'\n'.join(profiles), 'CUES':'\n'.join(cues), 'NOTES':note_html, 'SOURCES':source_html, 'HEADING_FONT':fonts['heading'], 'BODY_FONT':fonts['body'], 'SCHEDULE':json.dumps([{'start':s['start'],'end':s['end'],'name':people[s['person']]['name'],'title':s['title']} for s in data['segments']]).replace('<','\\u003c')}
    for key,value in substitutions.items():
        template = template.replace('{{'+key+'}}',value)
    assert '{{' not in template
    (out/'index.html').write_text(template)


def pdf_setup():
    font_dir = Path('/System/Library/Fonts/Supplemental')
    if (font_dir/'Arial.ttf').exists():
        pdfmetrics.registerFont(TTFont('Team',str(font_dir/'Arial.ttf')))
        pdfmetrics.registerFont(TTFont('TeamBold',str(font_dir/'Arial Bold.ttf')))
        pdfmetrics.registerFontFamily('Team',normal='Team',bold='TeamBold')
        face,bold='Team','TeamBold'
    else:
        face,bold='Helvetica','Helvetica-Bold'
    ink=colors.HexColor('#12263A')
    return {
        'title':ParagraphStyle('title',fontName=bold,fontSize=28,leading=31,textColor=ink,spaceAfter=8),
        'sub':ParagraphStyle('sub',fontName=face,fontSize=14,leading=18,textColor=colors.HexColor('#0E5A5A'),spaceAfter=12),
        'heading':ParagraphStyle('heading',fontName=bold,fontSize=11,leading=14,textColor=ink,spaceBefore=9,spaceAfter=4),
        'body':ParagraphStyle('body',fontName=face,fontSize=10,leading=13.6,textColor=ink,spaceAfter=7,alignment=TA_LEFT),
        'small':ParagraphStyle('small',fontName=face,fontSize=8,leading=10,textColor=colors.HexColor('#5A6672'),spaceAfter=5)
    }


def make_pdfs(data,notes,out):
    styles=pdf_setup()
    def para(txt,kind='body'):
        return Paragraph(E(txt).replace('\n','<br/>'),styles[kind])
    def footer(canvas,doc):
        canvas.saveState()
        canvas.setStrokeColor(colors.HexColor('#C3C9CF'))
        canvas.line(42,38,A4[0]-42,38)
        canvas.setFillColor(colors.HexColor('#5A6672'));canvas.setFont('Helvetica',8)
        canvas.drawString(42,25,'INSIYAB  |  TEAM PREPARATION  |  18 NOVEMBER 2026')
        canvas.drawRightString(A4[0]-42,25,str(doc.page));canvas.restoreState()
    def save(filename,items,title):
        doc=SimpleDocTemplate(str(out/filename),pagesize=A4,rightMargin=42,leftMargin=42,topMargin=38,bottomMargin=49,title=title,author='Insiyab team')
        doc.build(items,onFirstPage=footer,onLaterPages=footer)
    for p in data['people']:
        items=[para(p['name'],'title'),para(p['area'],'sub'),para(p['line'],'heading')]
        for title,body in p['learn']:
            items += [KeepTogether([para(title,'heading'),para(body)])]
        items += [para('Keep these facts straight','heading')]
        items += [para('• '+n) for n in p['numbers']]
        items += [para('One service day: 15 December 2025. These are team briefing notes, not a claim of operational deployment.','small'),PageBreak(),para(p['name']+' | Be ready','title'),para(p['role'],'sub'),para('Your phone role','heading'),para(p['call'])]
        for q,a in p['qa']:
            items += [KeepTogether([para(q,'heading'),para(a)])]
        items += [para('Avoid','heading'),para(p['avoid']),para('Your handover','heading'),para(p['handoff'])]
        for key in p['sources']:
            src=data['sources'][key]
            items += [Paragraph(f'<link href="{source_link(src)}" color="#0E5A5A">{E(src["title"])}</link>',styles['small'])]
        save(p['id']+'-brief.pdf',items,p['name']+' - Insiyab two-page briefing')
    people={p['id']:p for p in data['people']}
    items=[para('The ten-minute pitch','title'),para('Full spoken script, screen cues and handovers','sub'),para(data['status'],'small')]
    for i,s in enumerate(data['segments']):
        if i and i%2==0 and i<8: items += [PageBreak()]
        items += [para(f'{clock(s["start"])}-{clock(s["end"])} | {people[s["person"]]["name"]}','heading'),para(s['title'],'sub'),para('Screen: '+s['screen'],'small'),para(s['say']),para('Point at: '+s['point'],'small'),para('Action: '+s['action'],'small')]
    items += [PageBreak(),para('The eight live presenter notes','title'),para('Read from dataiku/webapp/script.js at build time. The ten-minute script above selects a route through these tabs; this section is the complete reference.','small')]
    for i,(key,n) in enumerate(notes):
        if i==4: items += [PageBreak()]
        items += [KeepTogether([para(f'{i+1}. {key.capitalize()}','heading'),para(n['say']),para('Point at: '+n['point'],'small'),para('Then click: '+n['next'],'small')])]
    save('full-script.pdf',items,'Insiyab - ten-minute script and live presenter notes')


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--out',required=True);args=parser.parse_args()
    out=Path(args.out).expanduser().resolve()
    assert not out.is_relative_to(ROOT), 'Build outside the repository'
    out.mkdir(parents=True,exist_ok=True)
    data=json.loads((HERE/'content.json').read_text());notes=presenter_notes()
    assert data['segments'][0]['start']==0 and data['segments'][-1]['end']==600
    assert all(a['end']==b['start'] for a,b in zip(data['segments'],data['segments'][1:]))
    assert len({p['id'] for p in data['people']})==5
    build_html(data,notes,out);make_pdfs(data,notes,out)
    readme='OPEN index.html for the interactive guide. Use the clickable names at the top. Each person has a two-page PDF. full-script.pdf contains the ten-minute script and all eight live-app presenter notes. The HTML works offline; source links need internet. No phone numbers, keys or raw records are included.\n\nBuilt from repository commit '+subprocess.check_output(['git','rev-parse','--short','HEAD'],cwd=ROOT,text=True).strip()+'. The published pitch result and John independent checks are labelled separately.\n'
    (out/'READ-ME.txt').write_text(readme)
    from pypdf import PdfReader
    for p in data['people']:
        pdf=out/(p['id']+'-brief.pdf')
        assert len(PdfReader(pdf).pages)==2, f'{pdf.name} is not two pages'
        print('PASS two pages: '+pdf.name)
    with zipfile.ZipFile(out.parent/'Insiyab-team-briefing.zip','w',zipfile.ZIP_DEFLATED) as z:
        for p in [out/'index.html',out/'READ-ME.txt',out/'full-script.pdf']+[out/(x['id']+'-brief.pdf') for x in data['people']]:
            z.write(p,'Insiyab-team/'+p.name)
    print(f'BUILT {out}/index.html; five two-page briefs; full script; ZIP')


if __name__=='__main__': main()
