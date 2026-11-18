"""Build the Insiyab visual brand guidelines as a fully vector PDF."""
import json,re
from pathlib import Path
from reportlab.pdfgen.canvas import Canvas
from design_core import ROOT,INK,IVORY,GOLD,RED,TEAL
from layout import Board,render_svg,width
from build_applications import icon,INK10,GOLD10,RED10,TEAL10

OUT=ROOT/'guidelines';OUT.mkdir(exist_ok=True)
PAGES=ROOT/'preview/pages';PAGES.mkdir(parents=True,exist_ok=True)
LOGO=ROOT/'assets/logo';APPS=ROOT/'assets/applications';GRAPH=ROOT/'assets/graphics'
pages=[]
def page(title,kicker='IDENTITY SYSTEM',subtitle=None):
 b=Board(1200,800,'Insiyab brand guidelines - '+title)
 b.text('INSIYAB',62,34,14,weight=500,tracking=1.6)
 b.text(kicker,1138,34,14,anchor='end',tracking=.8)
 b.text(title,62,88,59,face='Instrument Serif')
 if subtitle:b.para(subtitle,62,163,1060,18,leading=25)
 b.line(62,738,1138,738,INK10,1)
 b.text('Insiyab  /  Brand guidelines',62,758,12,weight=500)
 b.text(f'{len(pages)+1:02d}',1138,754,18,anchor='end')
 pages.append(b);return b

def block(b,x,y,w,title,body,size=20):
 b.text(title,x,y,22,weight=600)
 return b.para(body,x,y+39,w,size,leading=size*1.45)

def table(b,x,y,widths,headers,rows,row_h=54,size=17):
 total=sum(widths);b.rect(x,y,total,42,INK)
 for j,h in enumerate(headers):b.text(h,x+sum(widths[:j])+12,y+12,14,IVORY,weight=500)
 yy=y+42
 for i,row in enumerate(rows):
  if i%2==0:b.rect(x,yy,total,row_h,GOLD10)
  for j,text in enumerate(row):b.para(str(text),x+sum(widths[:j])+12,yy+13,widths[j]-24,size,leading=size*1.3)
  b.line(x,yy+row_h,x+total,yy+row_h,INK10)
  yy+=row_h
 return yy

def save():
 c=Canvas(str(OUT/'Insiyab_Brand_Guidelines.pdf'),pagesize=(720,480),pageCompression=1)
 c.setTitle('Insiyab Brand Guidelines');c.setAuthor('Insiyab');c.setSubject('Bilingual identity, applications, motion and image direction')
 for idx,b in enumerate(pages):
  b.save(PAGES/f'page-{idx+1:02d}.svg');render_svg(c,b.string(),0,0,720,480,480);c.bookmarkPage(f'page{idx+1}');c.addOutlineEntry(b.title.split(' - ',1)[-1],f'page{idx+1}',level=0);c.showPage()
 c.save()
 (OUT/'page-index.json').write_text(json.dumps([{'page':i+1,'title':b.title.split(' - ',1)[-1]} for i,b in enumerate(pages)],indent=2))
 print('Built',len(pages),'guideline pages')

def build():
 # 01
 b=page('Brand guidelines','VERSION 2.0  /  18 NOVEMBER 2026')
 b.embed(LOGO/'insiyab-lockup-layered.svg',64,202,850)
 b.text('Calm flow restored.',64,550,75,face='Instrument Serif')
 b.text('A person decides. Insiyab coordinates.',68,662,26)
 # 02
 b=page('The movement is the message','FOUNDATION',
  'Insiyab means "flow" in Arabic. An AI co-pilot for Dubai bus operations, with human judgement at its centre.')
 b.para('Insiyab flags a route at risk of delay, gathers updates from the driver, depot and station in parallel, and gives the controller one short briefing with three options. It relays the decision after the controller authorizes it.',62,236,636,25,leading=36)
 b.para('The brand makes that division of responsibility visible. The city is the subject. Coordination is the service. A quiet, ordered presentation gives the human decision room to stand out.',62,454,636,21,leading=31)
 b.line(756,232,756,670,GOLD,2)
 b.text('IN THIS GUIDE',804,239,16,weight=600,tracking=1)
 for k,(num,title) in enumerate([('04','Logo system'),('09','Typography'),('11','Colour and contrast'),('14','Icons and graphics'),('17','Motion and vector handoff'),('20','Applications'),('26','Imagery and prompts'),('33','Standards and references')]):
  b.text(num,804,282+k*48,18,weight=500);b.text(title,850,282+k*48,18)
 # 03
 b=page('Quiet intelligence, clear authority','POSITIONING AND VOICE')
 b.text('A person decides.',62,219,68,face='Instrument Serif')
 b.text('Insiyab coordinates.',62,294,68,face='Instrument Serif')
 block(b,64,427,308,'Calm','Use plain verbs and steady spacing. State what changed, what is known and what the controller can do.',19)
 block(b,440,427,308,'Precise','Separate a prediction, a report and a verified outcome. Name the source and the update time.',19)
 block(b,816,427,308,'Accountable','Make the controller visible. Attribute the decision to a person and the relay to Insiyab.',19)
 b.text('Say: "Predicted delay. Three options ready for review."',64,646,20,weight=500)
 b.text('Avoid: "AI has fixed the route" or any unmeasured claim of improvement.',64,682,18)
 # 04
 b=page('One identity, two equal voices','PRIMARY BILINGUAL LOCKUP')
 b.embed(LOGO/'insiyab-lockup-layered.svg',158,205,840)
 block(b,64,547,490,'The Latin wordmark','IBM Plex Sans Medium gives the name presence without competing with the emblem. Preserve the supplied letter shapes and spacing.',20)
 block(b,654,547,484,'The Arabic wordmark','Noto Kufi Arabic Medium has equal standing. Match optical widths, preserve natural heights and keep generous space between the scripts.',20)
 # 05
 b=page('Architecture gives flow a clear passage','SYMBOL CONSTRUCTION')
 b.embed(LOGO/'insiyab-symbol-ink.svg',179,208,396)
 b.line(212,571,542,571,INK10,1)
 b.line(212,241,542,241,INK10,1,'4 6')
 b.text('Two solid forms. One open passage.',90,625,20,weight=500)
 b.text('Chamfered exterior / controlled internal curve',90,664,18)
 block(b,826,230,310,'Structure','A compact silhouette and one chamfer supply architectural authority. The masses stay still and balanced.',19)
 block(b,826,414,310,'Flow','The open channel moves from a low entry to a higher horizontal exit. Movement lives in the space between forms.',19)
 b.para('Master: 120 x 120 units. Visible artwork: 10-110 on both axes. Filled geometry; no symbol stroke.',826,624,310,17,leading=26)
 # 06
 b=page('Three surfaces, one signature','COLOUR AND MONOCHROME')
 for i,(label,name,bg) in enumerate([('IVORY','on-ivory',IVORY),('INK','on-ink',INK),('GOLD','on-gold',GOLD)]):
  y=211+i*150;b.rect(62,y,1076,128,bg,INK10 if i==0 else None)
  b.embed(LOGO/('insiyab-lockup-ivory.svg' if i==1 else 'insiyab-lockup-ink.svg'),450,y+6,300)
  b.text(label,84,y+100,12,IVORY if i==1 else INK,weight=500,tracking=1)
 b.text('Monochrome: use the complete Ink, solid Black or reverse Ivory artwork.',64,680,20)
 # 07
 b=page('Give the mark room to breathe','CLEAR SPACE AND MINIMUM SIZES')
 b.rect(100,225,336,336,'none',GOLD,1.5)
 b.embed(LOGO/'insiyab-symbol-ink.svg',124,249,288)
 b.line(148,273,388,273,INK10,1,'3 5')
 b.line(148,513,388,513,INK10,1,'3 5')
 b.text('20 units',492,280,32,face='Instrument Serif')
 b.para('Minimum clear space outside every visible edge of the emblem or complete lockup.',492,335,245,20,leading=29)
 b.text('Clear space = one fifth of the visible symbol width',85,578,17,weight=500)
 b.embed(LOGO/'insiyab-symbol-16-ink.svg',107,632,16)
 b.embed(LOGO/'insiyab-symbol-24-ink.svg',177,624,24)
 b.embed(LOGO/'insiyab-symbol-32-ink.svg',256,616,32)
 b.embed(LOGO/'insiyab-symbol-40-ink.svg',349,608,40)
 for x,n in [(107,'16'),(177,'24'),(256,'32'),(349,'40')]:b.text(n+' px',x,665,15)
 b.text('Actual-size optical variants',85,704,16)
 block(b,816,223,316,'Primary lockup','Minimum width: 240 px on screen or 55 mm in print. If the bilingual name cannot remain clear, use the symbol.',19)
 block(b,816,412,316,'Standalone symbol','Use the supplied 16, 24, 32 and 40 px assets at their intended sizes. Scale the master proportionally for larger use. Preserve the open channel.',19)
 b.para('SVG canvas padding is not the clear-space allowance. Keep the same identity orientation in both English and Arabic layouts.',816,636,316,17,leading=25)
 # 08
 b=page('Protect the quiet character','LOGO DO AND DO NOT')
 pairs=[('Preserve the supplied geometry.','Do not stretch, rotate, skew, close the passage or add new cuts.'),('Keep both scripts optically equal.','Do not shrink Arabic into a translation line or split its joined forms.'),('Use a solid approved colour.','Do not add gradients, bevels, glow, shadows or decorative outlines.'),('Use the symbol as a complete mark.','Do not add a crown, external flourish, arrow, bus pictogram or skyline.'),('Separate identity from affiliation.','Do not attach official emblems or imitate the RTA or Emirates Towers logos.')]
 for i,(a,c) in enumerate(pairs):
  y=218+i*91;b.text(f'{i+1:02d}',64,y,28,GOLD,face='Instrument Serif');b.text(a,124,y,22,weight=500);b.para(c,124,y+34,980,18,leading=25);b.line(124,y+76,1138,y+76,INK10)
 # 09
 b=page('Editorial character, operational clarity','TYPE FAMILIES')
 b.text('Instrument Serif',62,227,63,face='Instrument Serif')
 b.text('Calm flow restored.',62,317,43,face='Instrument Serif')
 b.para('Editorial display. Regular is the default; italic is reserved for occasional emphasis. Use at large sizes, away from dense operational information. The logo retains its supplied sans wordmark. [1]',642,239,495,21,leading=31)
 b.line(62,395,1138,395,INK10)
 b.text('IBM Plex Sans',62,427,44,weight=500)
 b.text('Route D-17   14:32   +6 min',62,499,26)
 b.para('Latin wordmark, body, labels, numerals and controls. Use Regular 400, Medium 500 and Semibold 600. The wordmark uses Medium. Clear distinctions support reading. [2]',642,426,495,21,leading=31)
 b.line(62,568,1138,568,INK10)
 b.arabic('انسياب',62,604,61)
 b.para('Noto Kufi Arabic. Use for the wordmark, Arabic display and generous short labels. Its large-size character needs space; avoid compressing it into small dense UI. [3]',642,604,495,20,leading=30)
 # 10
 b=page('Scale with purpose','TYPE SCALE AND BILINGUAL BEHAVIOUR')
 table(b,62,220,[210,274,284,308],['ROLE','EXECUTIVE SLIDES','PRODUCT UI','RULE'],[
  ('Hero','Instrument 61.5 / 68 pt','Instrument 64 / 70 px','One short statement'),
  ('Section title','Instrument 39 / 45 pt','Plex 32 / 40 px','Stable, sentence case'),
  ('Key number','Instrument 97.5 / 105 pt','Plex 48 / 56 px','Unit and time adjacent'),
  ('Body','Plex 18 / 25 pt','Plex 18 / 28 px','Short complete sentences'),
  ('Label','Plex 15.75 / 21 pt','Plex 16 / 24 px','Medium or Semibold'),
  ('Source','Plex 12 / 16 pt','Plex 14 / 20 px','Never remove to fit')],row_h=51,size=17)
 b.para('Sizes are size / recommended line height. For Arabic, begin with 1.5-1.7 line height and adjust size optically by script. Prefer 18 px or larger for Kufi operational labels; use a dedicated Arabic UI face such as Plex Sans Arabic if extended dense UI is needed. [2,3]',62,599,1050,19,leading=28)
 b.para('Shape Arabic right to left before outlining. Do not track its letters. Isolate route IDs and times as left-to-right runs; mirror layout order and directional navigation, while leaving the brand symbol intact. [7]',62,688,1050,16,leading=23)
 # 11
 b=page('A restrained working palette','FIVE COLOURS AND THEIR ROLES')
 items=[('Ivory',IVORY,'Space and composure','Primary paper and screen ground. The eye has a quiet surface on which to work.'),('Ink',INK,'Authority and legibility','Wordmarks, body copy, key numbers and operational controls. The default information colour.'),('Champagne Gold',GOLD,'Identity and material','Symbol, dividers and large editorial accents. It never signals a live warning.'),('Authority Red',RED,'Attention required','An exception or unresolved action that needs a person. Pair it with a clear label.'),('Deep Teal',TEAL,'Evidence of receipt','A verified acknowledgement or an explicitly confirmed state. It does not mean recovery by itself.')]
 for i,(name,col,role,desc) in enumerate(items):
  y=214+i*95;b.rect(62,y,118,73,col,INK10 if i==0 else None);b.text(name,208,y+4,23,weight=500);b.text(col,208,y+41,16);b.text(role,470,y+3,21,weight=600);b.para(desc,470,y+34,660,18,leading=25)
 b.text('Suggested editorial balance: 80% Ivory, 15% Ink, 4% Gold, 1% status colour.',62,706,17)
 # 12
 b=page('Tints create depth without effects','SOLID SURFACES AND EXACT HEX VALUES')
 tints=json.loads((ROOT/'research/contrast.json').read_text())['tints_over_ivory']
 xs=[62,350,638,926]
 for j,(name,col) in enumerate([('ink',INK),('gold',GOLD),('red',RED),('teal',TEAL)]):
  x=xs[j];b.text(name.upper(),x,224,17,weight=500,tracking=1)
  for k,pct in enumerate(['10','25','50']):
   y=267+k*119;val=tints[name][pct];b.rect(x,y,212,72,val);b.text(pct+'%  '+val,x,y+84,16)
 b.para('These are fixed solid colours, mixed in encoded sRGB with Ivory: tint = p x base + (1 - p) x Ivory, rounded to the nearest 8-bit channel. The percentage is the amount of the named base colour. Ivory remains #F7F5F0 at every step.',62,652,1076,18,leading=26)
 # 13
 b=page('Contrast is part of the identity','ACCESSIBILITY  /  DIGITAL COLOUR')
 table(b,62,217,[310,164,602],['PAIR','RATIO','APPROVED USE'],[
 ('Ink / Ivory','16.33:1','Preferred pair for all text; normal-text AAA contrast.'),
 ('Red / Ivory','5.17:1','Normal-text AA. Use with an explicit attention label.'),
 ('Teal / Ivory','4.52:1','Normal-text AA, narrow margin. Prefer Ink for small copy.'),
 ('Ink / Gold','4.50:1','Technically AA at 4.504289; reserve for generous sizes.'),
 ('Gold / Ivory','3.63:1','Large text and meaningful graphics; not small body text.'),
 ('Red / Teal','1.14:1','Fails. Separate with Ivory and use different labels/forms.')],row_h=52,size=17)
 b.para('Thresholds: 4.5:1 for normal text; 3:1 for large text and essential graphics. Large text is 24 CSS px regular or about 18.7 px bold. Ratios are shown rounded; pass/fail uses unrounded values. [4,5]',62,591,1070,18,leading=27)
 b.para('Use Ink on tinted cards. Red on Red 10% is 4.448:1; Teal on Teal 10% is 3.996:1, so both fail normal-text AA. Colour never carries status alone. These pair checks do not establish whole-product accessibility. [4-6]',62,662,1070,18,leading=27)
 # 14
 b=page('A small vocabulary of useful actions','ICON FAMILY')
 names=['driver','depot','station','planning','controller','phone-call','briefing','decision','message-received']
 labels=['Driver','Depot','Station','Planning','Controller','Phone call','Briefing','Decision','Message received']
 for j,(name,label) in enumerate(zip(names,labels)):
  col=j%5;row=j//5;x=74+col*218;y=226+row*194
  icon(b,name,x+48,y,62);b.text(label,x+80,y+87,19,weight=500,anchor='middle')
  icon(b,name,x+68,y+129,24)
 b.para('One 24 x 24 grid. One 1.5-unit stroke. Rounded caps and joins, consistent live area and open detail. Use at 24 px or above for normal UI, 32 px for control-room scan distance. Labels remain visible.',62,646,1072,20,leading=29)
 b.text('A received-message tick confirms receipt only. A decision icon appears after an explicit human choice.',62,711,16)
 # 15
 b=page('The network supplies the structure','ROUTE LINES AND THE FLOW MOTIF')
 b.embed(GRAPH/'route-lines.svg',62,213,594)
 block(b,734,227,400,'Route language','Use straight runs, rounded bends and disciplined station dots. Lines connect real roles or places; they do not decorate every spare corner.',20)
 block(b,734,434,400,'Architectural rhythm','Allow one controlled diagonal and broad horizontal rests. Use an 8-unit spacing rhythm and generous margins. Never draw a literal tower into the identity.',20)
 b.path('M75 636 C125 636 125 594 165 594 C205 594 205 655 245 655 C285 655 285 619 325 619 C365 619 365 636 410 636 H638',GOLD,4)
 b.text('Decorative flow metaphor / not measured data',62,692,16)
 # 16
 b=page('Data earns the visual emphasis','TIMETABLES AND EVIDENCE')
 b.embed(GRAPH/'timetable-planned-actual.svg',62,214,680)
 block(b,808,224,328,'Planned and actual','Outline = planned. Solid = observed actual. A red excess segment shows a delay. Use one shared time scale and explicit labels.',19)
 block(b,808,415,328,'Predicted is distinct','A prediction uses a dashed outline and the word "Predicted". It never becomes an observed actual simply because it is more recent.',19)
 b.para('One headline number per idea. Show its unit, route or scope, observation window and source. Use zero baselines for duration bars; show uncertainty only when the source provides it. Keep legends adjacent and never invent accuracy or minutes saved.',62,619,1074,20,leading=29)
 b.text('Source format: system or document / record ID / observed or predicted / timestamp in GST.',62,707,17,weight=500)
 # 17
 b=page('Motion restores order, then stops','SIGNATURE MOTION')
 table(b,62,219,[322,138,616],['MOVEMENT','DURATION','INTENT'],[
 ('Architectural emblem reveals','800 ms','A travelling mask reveals the solid form, then stops.'),
 ('Delay bend smooths','900 ms','A separate motif settles once, with no overshoot or loop.'),
 ('Three calls converge','700 ms','Equal endpoints meet in one stationary briefing card.'),
 ('Briefing card settles','600 ms','Maximum 12 px travel at 1080p; finish exactly on the grid.'),
 ('Human choice registers','600 ms','Border and label acknowledge the controller selection.'),
 ('Decision relays out','800 ms','A single sweep travels back only after authorization.'),
 ('Both wordmarks appear','600 ms','Arabic and Latin fade together, without a hierarchy.')],row_h=51,size=17)
 b.para('Reference ease: cubic-bezier(0.4, 0, 0.2, 1). At 30 fps, 600 / 700 / 800 / 900 ms = 18 / 21 / 24 / 27 frames. No bounce, glow, particle trails or idle heartbeat. Timings describe animation, not operational response speed.',62,644,1076,19,leading=29)
 # 18
 b=page('A six-second story with a human gate','MOTION STORYBOARD')
 steps=[('00.00 - 00.80','Identity arrives','The form reveals; both scripts appear together.'),('00.80 - 01.70','A bend settles','A separate illustrative route becomes calm.'),('01.70 - 02.40','Updates converge','Driver, depot and station feed one briefing.'),('02.40 - 03.50','The controller reads','Three options stay still and equally available.'),('03.50 - 04.10','The person chooses','A staged explicit selection is acknowledged.'),('04.10 - 04.90','The decision relays','An outward sweep shows sending, not receipt.'),('04.90 - 06.00','The identity returns','Hold, then fade to the complete bilingual mark.')]
 for i,(time,title,body) in enumerate(steps):
  y=218+i*63;b.text(time,64,y,17,weight=500);b.circle(270,y+10,5,GOLD,GOLD,1);b.text(title,304,y,21,weight=500);b.text(body,583,y+2,17)
  if i<6:b.line(270,y+16,270,y+63,GOLD,1.5)
 b.para('In a live demo, pause at the decision for as long as the controller needs. Never choose automatically to preserve six seconds. Reduce motion to static changes or an opacity fade of 200 ms or less. [8]',62,682,1070,18,leading=26)
 # 19
 b=page('Layered vectors, ready to animate','LAYERED ASSET HANDOFF',
  'insiyab-lockup-layered.svg: four visible groups. insiyab-lockup-animation.svg: adds the hidden guide.')
 parts=[('symbol-upper + symbol-lower','01','Two filled masses. Reveal with a mask; preserve the stationary geometry.'),('line-path (hidden guide)','02','Open motion guide in the animation master. Exclude it from print.'),('latin-wordmark','03','Complete outlined Latin wordmark. Animate opacity as one unit.'),('arabic-wordmark','04','Complete shaped Arabic wordmark. Preserve joining and registration.')]
 for k,(name,n,body) in enumerate(parts):
  y=220+k*84;b.text(n,62,y,42,GOLD,face='Instrument Serif');b.text(name,141,y+4,20,weight=500);b.para(body,520,y+5,613,18,leading=26)
 b.line(62,562,1138,562,INK10)
 block(b,62,590,490,'After Effects','Reveal the filled groups with a mask over 24 frames at 30 fps. Trim Paths applies only to the optional guide. Keep both wordmarks separate. [9]',17)
 block(b,650,590,488,'Blender','Keep filled curves stationary. Use an animated visibility mask or opacity fade. The optional guide can use bevel Factor End. Preserve the final static frame. [10]',17)
 # 20
 b=page('An executive master that leaves room','APPLICATION  /  16:9 PRESENTATION')
 b.rect(62,217,714,402,IVORY,INK10,1)
 b.embed(LOGO/'insiyab-lockup-layered.svg',93,238,267)
 b.text('A person decides.',101,351,51,face='Instrument Serif')
 b.text('Insiyab coordinates.',101,410,51,face='Instrument Serif')
 b.text('Bus Operations Control Centre',102,514,19)
 b.line(100,573,738,573,GOLD,2)
 b.text('Executive briefing / Emirates Towers',102,590,12)
 block(b,834,222,300,'Composition','16:9. Light ground. Wide margins and one idea per slide. Align the logo, headline, evidence and source to one left edge.',19)
 block(b,834,442,300,'Seven layouts','Cover; decision brief; key metric; timetable; coordinated calls; pilot evidence; closing. Text and shapes remain editable.',19)
 b.text('The supplied PPTX and POTX contain actual master layouts, editable placeholders and example slides.',62,678,19)
 # 21
 b=page('The controller sees what matters','APPLICATION  /  CONTROL ROOM')
 b.embed(APPS/'control-room.svg',62,207,830)
 b.line(929,218,929,686,GOLD,1.5)
 b.para('A visible queue, one briefing and three comparable choices.',960,225,178,22,weight=500,leading=31)
 b.para('Prediction and evidence stay separate. Every update retains its source and time.',960,388,178,18,leading=27)
 b.para('No option is preselected. The relay awaits authorization.',960,549,178,18,leading=27)
 # 22
 b=page('Make authority visible in the interface','APPLICATION  /  DECISION STATES')
 states=[('Attention required',RED,'A risk needs review.','Name the route, the predicted or observed change and the time of the evidence.'),('Awaiting decision',INK,'The briefing is ready.','Show the three options, their assumptions and their tradeoffs without default approval.'),('Relay sent',INK,'The controller has authorized it.','Show the chosen option and responsible controller. Sending does not prove receipt.'),('Message received',TEAL,'A recipient acknowledged it.','Confirm each role separately. Keep any missing response visible.'),('Service recovered',TEAL,'Operational evidence confirms it.','Use only when the defined recovery condition is met, with a source and timestamp.')]
 for i,(title,col,short,body) in enumerate(states):
  y=220+i*92;b.rect(62,y+4,5,63,col);b.text(title,88,y,23,weight=500);b.text(short,423,y,22,weight=500);b.para(body,423,y+35,708,18,leading=26)
 # 23
 b=page('A notification opens the briefing','APPLICATION  /  MOBILE')
 b.embed(APPS/'mobile-notification.svg',104,210,252)
 block(b,481,235,627,'One actionable message','The notification names the route, the predicted delay and the next action. "Open briefing" takes the controller into the decision context. It does not offer a casual approve button on a lock screen.',22)
 block(b,481,462,627,'A restrained alert','Red is a narrow attention marker. Ink carries the text. No pulsing badge or countdown pressures the person into a decision. Keep live status and privacy requirements within the product design.',21)
 b.text('Full-size editable notification artwork is included in the asset kit.',481,665,18,weight=500)
 # 24
 b=page('The same character in the hand','APPLICATION  /  BUSINESS CARD')
 b.embed(APPS/'business-card-front.svg',62,225,510)
 b.rect(62,225,510,330,'none',INK10,1.2)
 b.embed(APPS/'business-card-back.svg',628,225,510)
 b.rect(628,225,510,330,'none',INK10,1.2)
 block(b,62,590,510,'Format and material','85 x 55 mm trim, 3 mm bleed, minimum 6 mm safe margin. Specify a smooth uncoated or matte warm-white stock. The gold is a flat colour unless a separate physical finish is commissioned.',18)
 block(b,628,590,510,'Production','The supplied print PDF includes front and back, trim and bleed boxes. Replace name and contact placeholders. Proof small letterforms, the open channel and exact colour on the chosen stock.',18)
 # 25
 b=page('Architectural at any scale','APPLICATION  /  FACADE AND MATERIALS')
 b.embed(APPS/'facade-specimen.svg',62,218,760)
 block(b,878,228,260,'Facade','Use flat lettering and the complete emblem. Align to the architecture and keep the internal passage open. Avoid illuminated edge effects.',18)
 block(b,878,461,260,'Material','Ink paint, ivory surface or a restrained champagne metal finish. Proof physical samples; a hex value does not specify metal or a universal CMYK build.',18)
 b.text('Conceptual facade specimen. No actual building, installation or affiliation is represented.',62,691,18)
 # 26
 b=page('Photograph the city being served','IMAGERY DIRECTION')
 b.text('The outcome looks ordinary.',62,230,64,face='Instrument Serif')
 b.text('That is the point.',62,307,64,face='Instrument Serif')
 block(b,62,437,313,'Subjects','Realistic full-size buses, usable stops, depot readiness and the human act of reviewing. Steel, glass and pale stone supply the setting.',19)
 block(b,441,437,313,'Light and framing','Golden hour or early dusk. Natural exposure, straight verticals, one main subject, and 35-45% quiet space for a later headline.',19)
 block(b,820,437,313,'Editorial restraint','No visible logos, readable signs or identifiable faces. No futuristic vehicles, holograms or artificial data trails. Add typography in layout.',19)
 b.para('Natural photographic tonal transitions are allowed; graphic gradients remain prohibited. Generated imagery is conceptual and must never be presented as evidence of an RTA deployment. Inspect every wheel, door, reflection and kerb before use.',62,664,1076,18,leading=26)
 # 27-32: complete copy-ready prompts, one per page.
 text=(OUT/'imagery-prompts.md').read_text()
 sections=re.split(r'\n## Prompt \d+ [—-] ',text)[1:]
 for idx,sec in enumerate(sections):
  title=sec.split('\n',1)[0]
  prompt=re.search(r'\*\*Ready prompt\*\*\s*\n\n> (.*?)(?=\n\n\*\*Why)',sec,re.S).group(1).strip()
  rationale=re.search(r'\*\*Why it belongs:\*\* (.*?)(?=\n\n|$)',sec,re.S).group(1).strip()
  meta=sec.split('**Ready prompt**')[0]
  fmt=re.search(r'\*\*Format:\*\* (.*?)(?=\n\n)',meta,re.S).group(1).replace('**','').replace('×','x')
  b=page(title,f'IMAGE PROMPT {idx+1:02d}  /  READY TO USE')
  yy=b.para(fmt,62,214,1070,16,weight=500,leading=23)
  b.line(62,yy+15,1138,yy+15,GOLD,1.5)
  yy=b.para(prompt.replace('—','-'),62,yy+40,1070,20,leading=28)
  b.para(rationale,62,max(yy+20,648),1070,18,leading=26)
 # 33
 b=page('Keep the system disciplined','DO AND DO NOT  /  HANDOFF')
 do=[('Create one clear hierarchy.','Keep the briefing short, the decision visible and the evidence close to the claim.'),('Use colour with a named meaning.','Ink carries information; red requests attention; teal confirms a specific evidenced state.'),('Protect the Arabic.','Use real shaping, appropriate line height and complete wordmarks in motion.'),('Deliver useful files.','Keep the solid emblem, motion guide, outlined wordmarks, icon SVGs and editable slide layouts together.')]
 for i,(h,t) in enumerate(do):
  y=222+i*112;b.text(f'{i+1:02d}',62,y,29,GOLD,face='Instrument Serif');b.text(h,124,y,23,weight=500);b.para(t,124,y+38,1008,20,leading=28)
 b.para('Do not add AI ornaments, neon, purple, dramatic motion, unverifiable performance claims or official marks. Do not treat a proposal, prediction, acknowledgement and recovery as the same event.',62,682,1076,18,leading=26)
 # 34
 b=page('A practical identity package','DELIVERABLES AND PRODUCTION NOTES')
 table(b,62,221,[300,776],['FILE GROUP','CONTENTS AND PURPOSE'],[
 ('Brand guidelines','This vector PDF, with the identity, rationale, rules, applications and six image prompts.'),
 ('Logo SVGs','Layered primary master, two wordmark parts, symbol, monochrome and surface versions, optical small sizes.'),
 ('Icons and graphics','Nine original icons, sprite, route language, timetable and illustrative flow motif.'),
 ('Application artwork','Editable SVGs for the control room, notification, business card and conceptual facade.'),
 ('Executive template','PPTX and POTX with seven editable layouts and example slides. Install fonts before editing.'),
 ('Implementation notes','Motion and imagery documents, exact colour tokens, font licences and reproducible source.')],row_h=57,size=18)
 b.para('Use SVG for screen, scale and animation. The emblem is filled vector artwork; its separate motion guide is not part of the printed mark. Digital colour is sRGB. Convert print output through the printer\'s chosen ICC profile and proof it. No Pantone equivalence or trademark clearance is asserted.',62,631,1070,19,leading=28)
 # 35
 b=page('References and technical basis','SOURCE NOTES  /  1 OF 2')
 refs=[('[1] Instrument Serif','Official repository: display usage and SIL Open Font License.','https://github.com/Instrument/instrument-serif'),('[2] IBM Plex','Official repository: UI intent, families and licence.','https://github.com/IBM/plex/'),('[3] Noto Kufi Arabic','Official Noto description: design and larger-size usage.','https://github.com/notofonts/noto-docs/blob/main/docs/descriptions/NotoKufiArabic.md'),('[4] W3C WCAG 2.2 SC 1.4.3','Normal and large text contrast thresholds; unrounded pass/fail.','https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html'),('[5] W3C WCAG 2.2 SC 1.4.11','Contrast for essential graphics and active controls.','https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html'),('[6] W3C WCAG 2.2 SC 1.4.1','Colour must not be the sole information carrier.','https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html')]
 for i,(head,desc,url) in enumerate(refs):
  y=216+i*81;b.text(head,62,y,20,weight=500);b.text(desc,62,y+29,16);b.text(url,62,y+53,13)
 # 36
 b=page('Sources, licences and the limits of a guide','SOURCE NOTES  /  2 OF 2')
 refs=[('[7] W3C Arabic and Persian Layout Requirements','Contextual shaping, bidirectional layout and Arabic composition.','https://www.w3.org/TR/alreq/'),('[8] W3C WCAG 2.2 SC 2.3.3','Disabling interaction animation is an AAA criterion; adopted here as a brand principle.','https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions'),('[9] Adobe After Effects','Editable SVG import and Trim Paths. Full primary links in motion-spec.md.','https://helpx.adobe.com/after-effects/desktop/import-files/import-svg-files/import-svg-files.html'),('[10] Blender Manual','SVG curves and curve bevel Factor End. Full primary links in motion-spec.md.','https://docs.blender.org/manual/en/latest/files/import_export/svg_curve.html')]
 for i,(head,desc,url) in enumerate(refs):
  y=216+i*91;b.text(head,62,y,20,weight=500);b.text(desc,62,y+29,16);b.text(url,62,y+55,13)
 b.para('All references checked 18 November 2026. Font binaries are supplied with their OFL notices. Preserve those notices when redistributing the fonts. The visual identity, palette roles, layout rules and timings are design decisions for this brief.',62,608,1070,18,leading=27)
 b.para('Contrast ratios were calculated from the exact supplied sRGB hex values with the WCAG relative-luminance formula. Scenario routes, times and outcomes are illustrative. A completed product still needs accessibility and operational usability validation.',62,679,1070,17,leading=25)
 save()

if __name__=='__main__':build()
