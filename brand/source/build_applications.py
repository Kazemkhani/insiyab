"""Original vector applications for Insiyab. All scenario data are fictional."""
from pathlib import Path
from reportlab.pdfgen.canvas import Canvas
from design_core import ROOT,INK,IVORY,GOLD,RED,TEAL,SYMBOL_D
from layout import Board,render_svg

OUT=ROOT/'assets/applications'; OUT.mkdir(parents=True,exist_ok=True)
LOGO=ROOT/'assets/logo'; ICONS=ROOT/'assets/icons'
INK10='#E0DFDB'; GOLD10='#EEE9DE'; RED10='#F2E1DC'; TEAL10='#E3E9E3'

def icon(b,name,x,y,w=28,color=None):
 import xml.etree.ElementTree as ET
 path=ICONS/(name+'.svg'); text=path.read_text()
 if color: text=text.replace(INK,color).replace('#15181d',color)
 root=ET.fromstring(text); inner=''.join(ET.tostring(e,encoding='unicode') for e in root if e.tag.split('}')[-1] not in ('title','desc'))
 b.raw(f'<g transform="translate({x} {y}) scale({w/24})">{inner}</g>')

def control_room():
 b=Board(1600,1000,'Insiyab control room concept with fictional illustrative data')
 b.embed(LOGO/'insiyab-lockup-ink.svg',48,10,250)
 b.text('BUS OPERATIONS',430,43,18,weight=500,tracking=.6)
 b.text('Duty controller',1552,30,18,anchor='end')
 b.text('18 Nov 2026  /  14:32 GST',1552,59,16,anchor='end')
 b.line(48,112,1552,112,INK10,1)
 b.text('Attention queue',48,153,22,weight=600)
 b.rect(48,199,290,175,RED10,rx=8)
 b.rect(48,199,5,175,RED,rx=2)
 b.text('Route D-17',72,224,24,weight=600)
 b.text('Predicted delay',72,262,18)
 b.text('+6 min',72,299,34,weight=500)
 b.text('Controller review needed',48,409,18,weight=500)
 b.para('One active briefing. The next action remains with the duty controller.',48,448,272,18,leading=28)
 b.line(365,150,365,890,INK10)
 b.text('Route D-17',412,151,22,weight=500)
 b.text('Decision briefing',412,191,48,face='Instrument Serif')
 b.rect(1288,151,264,42,GOLD10,rx=21)
 b.text('AWAITING YOUR DECISION',1420,163,13,weight=500,anchor='middle',tracking=.25)
 # One metric, with a plainly stated status and source.
 b.text('+6',412,269,92,weight=500)
 b.text('min',530,316,34)
 b.text('Predicted delay',645,284,23,weight=600)
 b.para('Extended dwell reported at the previous stop. Current arrival forecast remains unconfirmed.',645,326,720,19,leading=29)
 b.text('Forecast source: illustrative scenario SIM-017  |  Updated 14:32 GST',412,398,15)
 b.line(412,437,1552,437,INK10)
 b.text('Updates gathered',412,461,18,weight=600)
 callinfo=[('driver','Driver','Dwell report received.'),('depot','Depot','Reserve availability reported.'),('station','Station','Platform update received.')]
 for j,(ic,title,txt) in enumerate(callinfo):
  x=412+j*388
  b.rect(x,502,364,123,'none',INK10,1,8); icon(b,ic,x+20,522,26)
  b.text(title,x+62,522,20,weight=500);icon(b,'message-received',x+314,525,22,TEAL)
  b.text(txt,x+20,571,16)
  b.text('Reported '+('14:32' if j==2 else '14:31')+' GST',x+20,600,13)
 b.text('Choose one option',412,662,22,weight=600)
 options=[('01','Maintain current plan','Continue the service.','The current delay may persist.'),('02','Send a reserve vehicle','Use the reported reserve.','Confirm vehicle and driver first.'),('03','Adjust next departure','Review a spacing change.','Check onward impacts first.')]
 for j,(n,title,a,c) in enumerate(options):
  x=412+j*388
  b.rect(x,706,364,169,'none',INK,1.2,8)
  b.text(n,x+20,724,16,weight=500)
  b.text(title,x+20,756,22,weight=500)
  b.text(a,x+20,796,16)
  b.text(c,x+20,824,15)
 b.text('Select an option to review and authorize its relay.',412,905,17,weight=500)
 b.line(48,946,1552,946,INK10)
 b.text('ILLUSTRATIVE SCENARIO - NOT LIVE OPERATIONS DATA',48,963,13,weight=500,tracking=.4)
 b.text('A person decides. Insiyab coordinates.',1552,960,17,anchor='end')
 b.save(OUT/'control-room.svg');return b

def mobile():
 b=Board(430,840,'Insiyab mobile notification concept with fictional illustrative data')
 b.rect(10,10,410,820,IVORY,INK,2,40)
 b.rect(164,25,102,18,INK,rx=9)
 b.text('14:32',44,67,18,weight=600)
 b.text('CONTROLLER DEVICE',388,69,10,weight=500,anchor='end',tracking=.6)
 b.embed(LOGO/'insiyab-lockup-ink.svg',42,102,278)
 b.text('Operations notification',42,220,17,weight=500)
 b.rect(30,266,370,409,'none',INK10,1.5,14)
 b.rect(30,266,5,409,RED,rx=2)
 b.text('Controller review needed',52,293,22,weight=600)
 b.text('Route D-17',52,337,18,weight=500)
 b.text('+6 min',52,376,56,weight=500)
 b.text('predicted delay',52,440,18)
 b.para('Driver, depot and station updates are ready. Review three options in the console.',52,484,318,18,leading=28)
 b.rect(52,597,326,52,INK,rx=6)
 b.text('Open briefing',215,613,20,IVORY,weight=500,anchor='middle')
 b.text('Awaiting your decision',215,703,16,weight=500,anchor='middle')
 b.text('ILLUSTRATIVE SCENARIO',215,747,12,anchor='middle')
 b.text('SIM-017  /  14:32 GST',215,770,12,anchor='middle')
 b.line(156,807,274,807,INK,5)
 b.save(OUT/'mobile-notification.svg');return b

def card():
 # 10 units per mm, two artboards at exact 85x55 mm trim.
 front=Board(850,550,'Insiyab business card front 85 by 55 mm')
 front.embed(LOGO/'insiyab-lockup-champagne.svg',115,140,620)
 front.text('Calm flow restored.',425,430,28,anchor='middle',face='Instrument Serif')
 front.save(OUT/'business-card-front.svg')
 back=Board(850,550,'Insiyab business card back template 85 by 55 mm')
 back.text('Name Surname',65,70,48,face='Instrument Serif')
 back.arabic('الاسم الكامل',555,80,36)
 back.text('Operations partnerships',65,148,26,weight=500)
 back.line(65,236,785,236,GOLD,2)
 back.text('[Phone]',65,291,28)
 back.text('[Email]',65,344,28)
 back.text('Human judgement. Quiet coordination.',65,451,25)
 back.save(OUT/'business-card-back.svg')
 # Actual print PDF uses 3 mm bleed and 85x55 mm trim, with no crop-mark clutter.
 mm=72/25.4; c=Canvas(str(OUT/'business-card-print-template.pdf'),pagesize=(91*mm,61*mm))
 c.setTitle('Insiyab business card template - 85 x 55 mm trim with 3 mm bleed')
 from reportlab.lib.colors import HexColor
 for page in (front,back):
  c.setFillColor(HexColor(IVORY));c.rect(0,0,91*mm,61*mm,fill=1,stroke=0)
  render_svg(c,page.string(),3*mm,3*mm,85*mm,55*mm,61*mm);c.showPage()
 c.save()
 from pypdf import PdfReader,PdfWriter
 from pypdf.generic import RectangleObject
 p=OUT/'business-card-print-template.pdf';r=PdfReader(p);w=PdfWriter()
 for page in r.pages:
  page.trimbox=RectangleObject([3*mm,3*mm,88*mm,58*mm]);page.bleedbox=RectangleObject([0,0,91*mm,61*mm]);w.add_page(page)
 w.add_metadata({'/Title':'Insiyab business card template - replace placeholder contacts before printing'})
 with p.open('wb') as f:w.write(f)
 return front,back

def facade():
 b=Board(1600,900,'Insiyab architectural facade specimen, conceptual non-site-specific building')
 # Flat vector glass and stone. No representation of an actual government building.
 b.rect(80,62,1440,780,'#E0DFDB')
 b.rect(182,96,1236,616,IVORY)
 for x in (182,388,594,800,1006,1212,1418):b.line(x,96,x,712,'#C8C9C6',2)
 for y in (96,301,506,712):b.line(182,y,1418,y,'#C8C9C6',2)
 b.rect(150,320,1300,232,INK)
 b.embed(LOGO/'insiyab-lockup-ivory.svg',520,328,560)
 b.line(80,842,1520,842,INK,4)
 b.text('Architectural scale specimen / conceptual facade',80,868,18)
 b.text('No official affiliation implied',1520,868,18,anchor='end')
 b.save(OUT/'facade-specimen.svg');return b

def overview():
 b=Board(1600,1250,'Insiyab identity overview')
 b.text('INSIYAB  /  BRAND IDENTITY',70,54,17,weight=500,tracking=2)
 b.embed(LOGO/'insiyab-lockup-layered.svg',70,136,1050)
 b.text('Calm flow restored.',70,582,78,face='Instrument Serif')
 b.text('A person decides. Insiyab coordinates.',74,681,28)
 colors=[('Ivory',IVORY),('Ink',INK),('Champagne',GOLD),('Authority',RED),('Confirmation',TEAL)]
 for j,(name,col) in enumerate(colors):
  x=72+j*292;b.rect(x,788,272,100,col)
  b.text(name,x,906,20,weight=500);b.text(col,x,943,17)
 b.line(72,1016,1528,1016,INK10)
 for j,name in enumerate(['driver','depot','station','planning','controller','phone-call','briefing','decision','message-received']):
  x=80+j*163;icon(b,name,x+36,1079,46);b.text(name.replace('-',' '),x+60,1147,15,anchor='middle')
 b.save(OUT/'identity-overview.svg');return b

def main():
 boards=[control_room(),mobile(),*card(),facade(),overview()]
 c=Canvas(str(OUT/'application-specimens.pdf'),pagesize=(1200,800))
 c.setTitle('Insiyab application specimens')
 for b in boards:
  c.setPageSize((b.w*.6,b.h*.6));render_svg(c,b.string(),0,0,b.w*.6,b.h*.6,b.h*.6);c.showPage()
 c.save();print('Built',len(boards),'application boards')
if __name__=='__main__':main()
