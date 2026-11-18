"""Small deterministic SVG/PDF layout engine used for the Insiyab brand book."""
from pathlib import Path
import re,html,xml.etree.ElementTree as ET
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from fontTools.pens.basePen import BasePen
from fontTools.svgLib.path import parse_path
from design_core import ROOT,FONTS,INK,IVORY,GOLD,RED,TEAL,svg,outlined_text

FONTMAP={('IBM Plex Sans','400'):'Plex',('IBM Plex Sans','500'):'PlexMedium',('IBM Plex Sans','600'):'PlexSemi',('Instrument Serif','400'):'Instrument',('Instrument Serif Italic','400'):'InstrumentItalic'}
for name,file in [('Plex','IBMPlexSans-Regular.ttf'),('PlexMedium','IBMPlexSans-Medium.ttf'),('PlexSemi','IBMPlexSans-SemiBold.ttf'),('Instrument','InstrumentSerif-Regular.ttf'),('InstrumentItalic','InstrumentSerif-Italic.ttf')]:
 pdfmetrics.registerFont(TTFont(name,str(FONTS/file)))

def fontkey(face,weight=400): return FONTMAP.get((face,str(weight)),FONTMAP.get((face,'400'),'Plex'))
def width(text,size,face='IBM Plex Sans',weight=400): return pdfmetrics.stringWidth(text,fontkey(face,weight),size)
def wrap(text,maxwidth,size,face='IBM Plex Sans',weight=400):
 lines=[]
 for para in text.split('\n'):
  words=para.split(); line=''
  for word in words:
   test=(line+' '+word).strip()
   if width(test,size,face,weight)>maxwidth and line: lines.append(line); line=word
   else: line=test
  lines.append(line)
 return lines

class Board:
 def __init__(self,w=1200,h=800,title='Insiyab',bg=IVORY):
  self.w=w; self.h=h; self.title=title; self.elements=[]
  if bg: self.rect(0,0,w,h,bg)
 def raw(self,t): self.elements.append(t); return self
 def rect(self,x,y,w,h,fill='none',stroke=None,sw=1,rx=0):
  return self.raw(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}"'+(f' stroke="{stroke}" stroke-width="{sw}"' if stroke else '')+'/>')
 def line(self,x1,y1,x2,y2,color=INK,sw=1,dash=None):
  return self.raw(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{sw}"'+(f' stroke-dasharray="{dash}"' if dash else '')+'/>')
 def circle(self,x,y,r,fill='none',stroke=INK,sw=1.5):
  return self.raw(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>')
 def path(self,d,stroke=INK,sw=2,fill='none'):
  return self.raw(f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round" stroke-linecap="round"/>')
 def text(self,text,x,y,size=20,color=INK,face='IBM Plex Sans',weight=400,anchor='start',tracking=0):
  # y is the top of the em box. Baseline at 0.82 em.
  return self.raw(f'<text x="{x}" y="{y+size*.82}" fill="{color}" font-family="{face}" font-size="{size}" font-weight="{weight}" text-anchor="{anchor}" letter-spacing="{tracking}">{html.escape(str(text))}</text>')
 def para(self,text,x,y,w,size=20,color=INK,face='IBM Plex Sans',weight=400,leading=None):
  lead=leading or size*1.45
  for k,line in enumerate(wrap(text,w,size,face,weight)): self.text(line,x,y+k*lead,size,color,face,weight)
  return y+len(wrap(text,w,size,face,weight))*lead
 def arabic(self,text,x,y,h=30,color=INK,weight='Regular'):
  body,w=outlined_text(text,FONTS/f'NotoKufiArabic-{weight}.ttf',x,y,h,color,id='arabic-text')
  self.raw(body); return w
 def embed(self,path,x,y,w=None,h=None,opacity=1):
  root=ET.fromstring(Path(path).read_text()); vb=[float(v) for v in root.attrib.get('viewBox','0 0 100 100').split()]; sw,sh=vb[2:]
  if w is None: w=h*sw/sh
  if h is None: h=w*sh/sw
  s=min(w/sw,h/sh)
  inner=''.join(ET.tostring(e,encoding='unicode') for e in root if e.tag.split('}')[-1] not in ('title','desc','metadata','defs'))
  self.raw(f'<g transform="translate({x} {y}) scale({s})" opacity="{opacity}">{inner}</g>'); return h
 def save(self,path): Path(path).parent.mkdir(parents=True,exist_ok=True); Path(path).write_text(svg(''.join(self.elements),self.w,self.h,self.title))
 def string(self): return svg(''.join(self.elements),self.w,self.h,self.title)

class CPen(BasePen):
 def __init__(self,c): super().__init__(None); self.p=c.beginPath()
 def _moveTo(self,p): self.p.moveTo(*p)
 def _lineTo(self,p): self.p.lineTo(*p)
 def _curveToOne(self,a,b,c): self.p.curveTo(*a,*b,*c)
 def _closePath(self): self.p.close()
 def _endPath(self): pass

def render_svg(c,svgtext,x=0,y=0,w=None,h=None,page_h=None):
 root=ET.fromstring(svgtext); vb=[float(v) for v in root.attrib.get('viewBox','0 0 100 100').split()]
 w=w or vb[2]; h=h or w*vb[3]/vb[2]
 c.saveState(); c.translate(x,(page_h or c._pagesize[1])-y); c.scale(w/vb[2],-h/vb[3])
 def draw(el,inherit=None):
  attrs=dict(inherit or {}); attrs.update(el.attrib)
  for bit in el.attrib.get('style','').split(';'):
   if ':' in bit:
    a,b=bit.split(':',1); attrs[a.strip()]=b.strip()
  if attrs.get('display')=='none' or attrs.get('visibility')=='hidden': return
  tag=el.tag.split('}')[-1]
  c.saveState()
  for op,val in re.findall(r'(matrix|translate|scale|rotate)\s*\(([^)]+)\)',el.attrib.get('transform','')):
   v=[float(t) for t in re.split(r'[,\s]+',val.strip())]
   if op=='matrix': c.transform(*v)
   elif op=='translate': c.translate(v[0],v[1] if len(v)>1 else 0)
   elif op=='scale': c.scale(v[0],v[1] if len(v)>1 else v[0])
   elif op=='rotate':
    if len(v)==3: c.translate(v[1],v[2]); c.rotate(v[0]); c.translate(-v[1],-v[2])
    else: c.rotate(v[0])
  fill=attrs.get('fill',INK); stroke=attrs.get('stroke','none')
  if fill not in ('none','transparent'): c.setFillColor(HexColor(fill if fill!='currentColor' else INK))
  if stroke not in ('none','transparent'): c.setStrokeColor(HexColor(stroke if stroke!='currentColor' else INK))
  c.setLineWidth(float(attrs.get('stroke-width',1)))
  c.setLineCap({'round':1,'square':2}.get(attrs.get('stroke-linecap'),0)); c.setLineJoin({'round':1,'bevel':2}.get(attrs.get('stroke-linejoin'),0))
  if attrs.get('stroke-dasharray') and attrs['stroke-dasharray']!='none': c.setDash([float(v) for v in re.split(r'[,\s]+',attrs['stroke-dasharray'])])
  if 'opacity' in el.attrib: c.setFillAlpha(float(el.attrib['opacity']));c.setStrokeAlpha(float(el.attrib['opacity']))
  st=int(stroke not in ('none','transparent')); fi=int(fill not in ('none','transparent'))
  n=lambda k,default=0:float(attrs.get(k,default))
  if tag=='path':
   pen=CPen(c); parse_path(attrs.get('d',''),pen); c.drawPath(pen.p,stroke=st,fill=fi,fillMode=0 if attrs.get('fill-rule')=='evenodd' else 1)
  elif tag=='rect':
   if n('rx'): c.roundRect(n('x'),n('y'),n('width'),n('height'),n('rx'),stroke=st,fill=fi)
   else:c.rect(n('x'),n('y'),n('width'),n('height'),stroke=st,fill=fi)
  elif tag=='line': c.line(n('x1'),n('y1'),n('x2'),n('y2'))
  elif tag=='circle':c.circle(n('cx'),n('cy'),n('r'),stroke=st,fill=fi)
  elif tag=='ellipse':c.ellipse(n('cx')-n('rx'),n('cy')-n('ry'),n('cx')+n('rx'),n('cy')+n('ry'),stroke=st,fill=fi)
  elif tag in ('polyline','polygon'):
   pts=[float(z) for z in re.split(r'[,\s]+',attrs.get('points','').strip())]; p=c.beginPath()
   if pts:
    p.moveTo(*pts[:2])
    for idx in range(2,len(pts),2):p.lineTo(*pts[idx:idx+2])
    if tag=='polygon':p.close()
    c.drawPath(p,stroke=st,fill=fi,fillMode=0 if attrs.get('fill-rule')=='evenodd' else 1)
  elif tag=='text':
   text=''.join(el.itertext()); fs=n('font-size',20); fam=attrs.get('font-family','IBM Plex Sans').split(',')[0].strip("'");fw=attrs.get('font-weight','400')
   key=fontkey(fam,600 if fw in ('bold','600','700') else 500 if fw=='500' else 400)
   c.translate(n('x'),n('y')); c.scale(1,-1); c.setFont(key,fs)
   tw=pdfmetrics.stringWidth(text,key,fs)+max(0,len(text)-1)*n('letter-spacing'); anch=attrs.get('text-anchor','start'); off=-tw/2 if anch=='middle' else -tw if anch=='end' else 0
   textobj=c.beginText(off,0);textobj.setFont(key,fs);textobj.setCharSpace(n('letter-spacing'));textobj.textOut(text);c.drawText(textobj)
  else:
   for child in el:
    if child.tag.split('}')[-1] not in ('title','desc','metadata','defs','style'):draw(child,{k:v for k,v in attrs.items() if k in ('fill','fill-rule','stroke','stroke-width','stroke-linecap','stroke-linejoin','font-family','font-weight','font-size')})
  c.restoreState()
 draw(root);c.restoreState()
