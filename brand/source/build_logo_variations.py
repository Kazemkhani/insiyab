"""Final Insiyab logo family: exact vector specimens and transparent PNG exports."""
from pathlib import Path
import subprocess
from reportlab.pdfgen.canvas import Canvas
from design_core import ROOT, INK, IVORY, GOLD, symbol, svg
from layout import Board, render_svg

LOGO=ROOT/'assets/logo'
OUT=ROOT/'guidelines'
PNG=LOGO/'png'
PREVIEW=ROOT/'preview'
RULE='#E0DFDB'

def heading(b,title,sub=None,dark=False):
    c=IVORY if dark else INK
    b.text('INSIYAB  /  FINAL IDENTITY',62,39,14,c,weight=500,tracking=1.5)
    b.text(title,62,106,52,c,face='Instrument Serif')
    if sub:b.para(sub,62,181,1050,19,c,leading=28)
    b.line(62,b.h-80,b.w-62,b.h-80,GOLD,1)
    b.text('Calm flow restored.',62,b.h-50,16,c)
    b.text('18 NOV 2026  /  VERSION 2.0',b.w-62,b.h-49,12,c,anchor='end',tracking=.7)

def family_board():
    b=Board(1800,1350,'Insiyab final identity and colour variations')
    b.text('INSIYAB  /  FINAL IDENTITY',76,57,20,weight=500,tracking=2.2)
    b.text('ARCHITECTURAL FLOW',1724,61,14,anchor='end',tracking=1.2)
    b.embed(LOGO/'insiyab-lockup-ink.svg',220,192,1360)
    b.line(76,807,1724,807,INK,1)
    panels=[('PRIMARY','Ink on Ivory',IVORY,'ink'),('REVERSE','Ivory on Ink',INK,'ivory'),('CHAMPAGNE','Ink on Champagne Gold',GOLD,'ink')]
    pw=(1648-48)/3
    for i,(name,desc,bg,fg) in enumerate(panels):
        x=76+i*(pw+24)
        b.rect(x,860,pw,306,bg,RULE if i==0 else None)
        b.embed(LOGO/f'insiyab-symbol-{fg}.svg',x+(pw-214)/2,901,214)
        b.text(name,x,1200,18,weight=500,tracking=1.2)
        b.text(desc,x,1237,16)
    b.save(LOGO/'insiyab-variations-board.svg')
    return b

def export_png(path,out,width=None):
    cmd=['inkscape',str(path),'--export-filename='+str(out)]
    if width:cmd+=['--export-width='+str(width)]
    r=subprocess.run(cmd,capture_output=True,text=True)
    if r.returncode:raise RuntimeError(r.stderr)

def build():
    PNG.mkdir(parents=True,exist_ok=True)
    pages=[]
    board=family_board();pages.append(board)
    b=Board(1200,900,'Insiyab primary horizontal bilingual lockup')
    heading(b,'Primary signature','The default identity for executive slides, documents and operational interfaces.')
    b.embed(LOGO/'insiyab-lockup-ink.svg',140,320,920)
    b.text('INK  #15181D',140,745,17,weight=500)
    b.text('IVORY  #F7F5F0',1060,745,17,anchor='end')
    pages.append(b)
    b=Board(1200,900,'Insiyab formal Champagne signature')
    heading(b,'Champagne signature','A restrained formal variation for stationery, title slides and selected physical materials.')
    b.embed(LOGO/'insiyab-lockup-champagne.svg',140,320,920)
    b.text('CHAMPAGNE GOLD  #9C7B3E',140,745,17,weight=500)
    b.text('INK WORDMARKS  #15181D',1060,745,17,anchor='end')
    pages.append(b)
    b=Board(1200,900,'Insiyab reverse signature',INK)
    heading(b,'Reverse signature','Use the supplied Ivory artwork on a solid Ink surface.',True)
    b.embed(LOGO/'insiyab-lockup-ivory.svg',140,320,920)
    b.text('IVORY  #F7F5F0',140,745,17,IVORY,weight=500)
    b.text('INK  #15181D',1060,745,17,IVORY,anchor='end')
    pages.append(b)
    b=Board(1200,900,'Insiyab stacked bilingual signatures')
    heading(b,'Stacked signature','A centred composition for portrait covers, compact signage and formal stationery.')
    b.embed(LOGO/'insiyab-lockup-stacked-ink.svg',182,245,300)
    b.rect(647,237,421,520,INK)
    b.embed(LOGO/'insiyab-lockup-stacked-ivory.svg',707,255,300)
    b.text('INK ON IVORY',332,748,16,anchor='middle',tracking=.8)
    pages.append(b)
    b=Board(1200,900,'Insiyab standalone emblem and monochrome')
    heading(b,'Standalone emblem','The same two-piece silhouette in Ink, Ivory, Champagne Gold and solid Black.')
    specs=[('INK',INK,IVORY,'ink'),('REVERSE',IVORY,INK,'ivory'),('GOLD',GOLD,IVORY,'gold'),('BLACK','#000000',IVORY,'black')]
    for i,(name,fg,bg,asset) in enumerate(specs):
        x=62+i*275
        b.rect(x,320,251,300,bg,RULE if bg==IVORY else None)
        b.embed(LOGO/f'insiyab-symbol-{asset}.svg',x+28,363,195)
        b.text(name,x+126,656,15,anchor='middle',weight=500,tracking=.8)
        b.text(fg,x+126,690,14,anchor='middle')
    pages.append(b)
    b=Board(1200,900,'Insiyab minimum size and production handoff')
    heading(b,'Small size. Clear silhouette.','Use the native SVG or PNG size supplied; keep the open passage clear and the orientation fixed.')
    for i,size in enumerate((16,24,32,40)):
        x=100+i*270
        b.embed(LOGO/f'insiyab-symbol-{size}-ink.svg',x,312,size)
        b.text(str(size)+' px',x,384,20,weight=500)
        b.embed(LOGO/f'insiyab-symbol-{size}-ink.svg',x,447,132)
        b.text('Enlarged for inspection',x,610,14)
    b.para('The horizontal lockup starts at 240 px or 55 mm. Keep clear space equal to one fifth of the visible emblem width. At small sizes use the symbol alone. Filled SVG paths remain crisp at architectural scale.',62,682,1076,19,leading=29)
    pages.append(b)
    c=Canvas(str(OUT/'Insiyab_Logo_Variations.pdf'),pageCompression=1)
    c.setTitle('Insiyab Final Logo Variations');c.setAuthor('Insiyab')
    for i,b in enumerate(pages):
        c.setPageSize((b.w*.6,b.h*.6));render_svg(c,b.string(),0,0,b.w*.6,b.h*.6,b.h*.6)
        c.bookmarkPage('variation'+str(i+1));c.addOutlineEntry(b.title,'variation'+str(i+1),level=0);c.showPage()
    c.save()
    # App tile and favicon are flat originals with the same emblem registration.
    tile=f'<rect width="120" height="120" rx="14" fill="{INK}"/><g transform="translate(13.2 13.2) scale(.78)">{symbol(IVORY)}</g>'
    (LOGO/'insiyab-app-icon.svg').write_text(svg(tile,120,120,'Insiyab application icon'))
    exports={
        'insiyab-lockup-ink.svg':2480,'insiyab-lockup-ivory.svg':2480,
        'insiyab-lockup-black.svg':2480,'insiyab-lockup-gold.svg':2480,
        'insiyab-lockup-champagne.svg':2480,
        'insiyab-lockup-stacked-ink.svg':1600,'insiyab-lockup-stacked-ivory.svg':1600,
        'insiyab-symbol-ink.svg':1600,'insiyab-symbol-ivory.svg':1600,
        'insiyab-symbol-gold.svg':1600,'insiyab-app-icon.svg':1024,
    }
    for name,w in exports.items():export_png(LOGO/name,PNG/Path(name).with_suffix('.png').name,w)
    for size in (16,24,32,40):
        for tone in ('ink','ivory'):
            name=f'insiyab-symbol-{size}-{tone}.svg'
            export_png(LOGO/name,PNG/Path(name).with_suffix('.png').name,size)
    export_png(LOGO/'insiyab-variations-board.svg',PREVIEW/'final-variations-board.png',1800)
    export_png(ROOT/'assets/applications/identity-overview.svg',PREVIEW/'identity-overview.png',1600)
    print('Built 7-page final logo variations PDF, vector board and',len(exports)+8,'transparent PNG exports.')

if __name__=='__main__':build()
