"""Insiyab identity primitives. Fonts are shaped with HarfBuzz, then outlined."""
from pathlib import Path
import ctypes as C
import ctypes.util
import html
import json
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen

ROOT = Path(__file__).resolve().parents[1]
FONTS = ROOT/'assets/fonts'
INK='#15181D'; IVORY='#F7F5F0'; GOLD='#9C7B3E'; RED='#C42B2B'; TEAL='#2E7D6B'
COLORS={'ivory':IVORY,'ink':INK,'gold':GOLD,'red':RED,'teal':TEAL}
# Final architectural identity. The mark is two FILLED masses, never a stroked S.
# Master artwork occupies x/y 10..110 on a 120-unit square.
UPPER_D='M10 10 H93 L110 27 V38 H71 C56 38 46 48 40 64 C36 74 32 76 22 76 H10 Z'
LOWER_D='M10 94 H32 C45 94 52 86 58 74 C63 63 68 60 78 60 H110 V110 H10 Z'
# This open curve is a non-printing MOTION GUIDE through the negative space.
SYMBOL_D='M10 85 H27 C44 85 46 49 74 49 H110'
MICRO_D=SYMBOL_D

HB = C.CDLL(ctypes.util.find_library('harfbuzz'))
def sig(name,restype,*args):
 f=getattr(HB,name); f.restype=restype; f.argtypes=list(args); return f
ptr=C.c_void_p; u=C.c_uint; i=C.c_int; s=C.c_char_p
blob=sig('hb_blob_create',ptr,s,u,i,ptr,ptr)
face=sig('hb_face_create',ptr,ptr,u)
fontcreate=sig('hb_font_create',ptr,ptr)
ot=sig('hb_ot_font_set_funcs',None,ptr)
scale=sig('hb_font_set_scale',None,ptr,i,i)
buff=sig('hb_buffer_create',ptr)
add=sig('hb_buffer_add_utf8',None,ptr,s,i,u,i)
guess=sig('hb_buffer_guess_segment_properties',None,ptr)
shape=sig('hb_shape',None,ptr,ptr,ptr,u)
class Info(C.Structure):
 _fields_=[('codepoint',u),('mask',u),('cluster',u),('var1',u),('var2',u)]
class Pos(C.Structure):
 _fields_=[('x_advance',i),('y_advance',i),('x_offset',i),('y_offset',i),('var',u)]
infos=sig('hb_buffer_get_glyph_infos',C.POINTER(Info),ptr,C.POINTER(u))
positions=sig('hb_buffer_get_glyph_positions',C.POINTER(Pos),ptr,C.POINTER(u))

def outline(text,fontfile):
 data=Path(fontfile).read_bytes(); b=blob(data,len(data),0,None,None)
 fc=face(b,0); f=fontcreate(fc); ot(f)
 tt=TTFont(fontfile); units=tt['head'].unitsPerEm; scale(f,units,units)
 buf=buff(); enc=text.encode(); add(buf,enc,len(enc),0,len(enc)); guess(buf); shape(f,buf,None,0)
 count=u(); inf=infos(buf,C.byref(count)); pos=positions(buf,C.byref(count))
 gs=tt.getGlyphSet(); order=tt.getGlyphOrder(); commands=[]; bounds=[]; cursor=0
 for k in range(count.value):
  name=order[inf[k].codepoint]; tx=cursor+pos[k].x_offset; ty=pos[k].y_offset
  pen=SVGPathPen(gs); gs[name].draw(TransformPen(pen,(1,0,0,-1,tx,-ty)))
  commands.append(pen.getCommands())
  bp=BoundsPen(gs); gs[name].draw(TransformPen(bp,(1,0,0,-1,tx,-ty)))
  if bp.bounds: bounds.append(bp.bounds)
  cursor+=pos[k].x_advance
 box=(min(a[0] for a in bounds),min(a[1] for a in bounds),max(a[2] for a in bounds),max(a[3] for a in bounds))
 for fn,obj in [('hb_buffer_destroy',buf),('hb_font_destroy',f),('hb_face_destroy',fc),('hb_blob_destroy',b)]:
  sig(fn,None,ptr)(obj)
 return ''.join(commands),box

def outlined_text(text,fontfile,x,y,height,color=INK,id='wordmark'):
 d,b=outline(text,fontfile); sc=height/(b[3]-b[1]); w=(b[2]-b[0])*sc
 tx=x-b[0]*sc; ty=y-b[1]*sc
 return f'<g id="{id}" inkscape:groupmode="layer" inkscape:label="{id}" aria-label="{html.escape(text)}"><path fill="{color}" d="{d}" transform="matrix({sc:.8f} 0 0 {sc:.8f} {tx:.8f} {ty:.8f})"/></g>',w

def svg(body,w,h,title='Insiyab',bg=None):
 return f'''<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-label="{html.escape(title)}"><title>{html.escape(title)}</title>{f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ''}{body}</svg>'''

def symbol(color=INK,small=False):
 body=f'<g id="symbol-upper" inkscape:groupmode="layer" inkscape:label="01 Upper architectural form"><path d="{UPPER_D}" fill="{color}"/></g><g id="symbol-lower" inkscape:groupmode="layer" inkscape:label="02 Lower architectural form"><path d="{LOWER_D}" fill="{color}"/></g>'
 return f'<g transform="translate(-0.4 -0.4) scale(0.14)">{body}</g>' if small else body

def wordmark_at_width(text,fontfile,x,y,width,color,id):
 _,bounds=outline(text,fontfile)
 height=width*(bounds[3]-bounds[1])/(bounds[2]-bounds[0])
 body,_=outlined_text(text,fontfile,x,y,height,color,id)
 return body,height

def lockup(color=INK,symbol_color=None):
 # Equal optical widths, not forced equal heights. Arabic joins remain intact.
 word_width=325
 _,ab=outline('انسياب',FONTS/'NotoKufiArabic-Medium.ttf')
 _,lb=outline('Insiyab',FONTS/'IBMPlexSans-Medium.ttf')
 ah=word_width*(ab[3]-ab[1])/(ab[2]-ab[0]);lh=word_width*(lb[3]-lb[1])/(lb[2]-lb[0])
 y=(240-ah-lh-22)/2
 arabic,_=wordmark_at_width('انسياب',FONTS/'NotoKufiArabic-Medium.ttf',285,y,word_width,color,'arabic-wordmark')
 latin,_=wordmark_at_width('Insiyab',FONTS/'IBMPlexSans-Medium.ttf',285,y+ah+22,word_width,color,'latin-wordmark')
 body=f'<g transform="translate(-12 0) scale(2.2)">{symbol(symbol_color or color)}</g>'+arabic+latin
 # Center the symbol's visible 220-unit height vertically in the 240 canvas.
 body=body.replace('translate(-12 0)','translate(-12 -12)')
 return body,620,240

def stacked(color=INK,symbol_color=None):
 body=f'<g transform="translate(92 0) scale(1.8)">{symbol(symbol_color or color)}</g>'
 arabic,ah=wordmark_at_width('انسياب',FONTS/'NotoKufiArabic-Medium.ttf',50,250,300,color,'arabic-wordmark')
 latin,_=wordmark_at_width('Insiyab',FONTS/'IBMPlexSans-Medium.ttf',50,250+ah+22,300,color,'latin-wordmark')
 return body+arabic+latin,400,480

def make_logos():
 out=ROOT/'assets/logo'; out.mkdir(parents=True,exist_ok=True)
 for n,c in [('ink',INK),('ivory',IVORY),('gold',GOLD),('black','#000000')]:
  b,w,h=lockup(c); (out/f'insiyab-lockup-{n}.svg').write_text(svg(b,w,h,f'Insiyab انسياب bilingual logo in {n}'))
  (out/f'insiyab-symbol-{n}.svg').write_text(svg(symbol(c),120,120,f'Insiyab architectural flow emblem in {n}'))
  (out/f'insiyab-symbol-16-{n}.svg').write_text(svg(symbol(c,True),16,16,f'Insiyab optical symbol at 16 pixels in {n}'))
  small=symbol(c,True)
  (out/f'insiyab-symbol-small-{n}.svg').write_text(svg(small,16,16,f'Insiyab optical symbol for 16 to 47 pixels in {n}'))
  for size in (24,32,40):
   sc=(size-2)/100
   body=f'<g transform="translate({1-10*sc} {1-10*sc}) scale({sc})">{symbol(c)}</g>'
   (out/f'insiyab-symbol-{size}-{n}.svg').write_text(svg(body,size,size,f'Insiyab optical symbol at {size} pixels in {n}'))
  for lang,text,facefile in [('latin','Insiyab','IBMPlexSans-Medium.ttf'),('arabic','انسياب','NotoKufiArabic-Medium.ttf')]:
   body,tw=outlined_text(text,FONTS/facefile,12,12,80,c,f'{lang}-wordmark')
   (out/f'insiyab-wordmark-{lang}-{n}.svg').write_text(svg(body,tw+24,104,f'Insiyab {lang} wordmark'))
  sb,sw,sh=stacked(c)
  (out/f'insiyab-lockup-stacked-{n}.svg').write_text(svg(sb,sw,sh,f'Insiyab stacked bilingual logo in {n}'))
 b,w,h=lockup(INK)
 (out/'insiyab-lockup-layered.svg').write_text(svg(b,w,h,'Insiyab انسياب layered animation master'))
 (out/'insiyab-lockup-production-outlined.svg').write_text(svg(b,w,h,'Insiyab complete outlined production master'))
 (out/'insiyab-symbol-production-outlined.svg').write_text(svg(symbol(INK),120,120,'Insiyab filled silhouette production master'))
 guide=f'<g id="line-path" inkscape:groupmode="layer" inkscape:label="05 Hidden motion guide - not logo artwork" style="display:none" transform="translate(-12 -12) scale(2.2)"><path d="{SYMBOL_D}" fill="none" stroke="{GOLD}" stroke-width="2"/></g>'
 (out/'insiyab-lockup-animation.svg').write_text(svg(b+guide,w,h,'Insiyab animation master with separate hidden flow guide'))
 (out/'insiyab-motion-guide.svg').write_text(svg(f'<g id="line-path"><path d="{SYMBOL_D}" fill="none" stroke="{GOLD}" stroke-width="2"/></g>',120,120,'Insiyab non-printing open motion guide'))
 b,w,h=lockup(INK,GOLD)
 (out/'insiyab-lockup-champagne.svg').write_text(svg(b,w,h,'Insiyab Champagne symbol with Ink bilingual wordmarks'))
 for name,fg,bg in [('on-ivory',INK,IVORY),('on-ink',IVORY,INK),('on-gold',INK,GOLD)]:
  b,w,h=lockup(fg)
  (out/f'insiyab-lockup-{name}.svg').write_text(svg(b,w,h,'Insiyab انسياب '+name,bg))
 body,sw,sh=stacked(INK)
 (out/'insiyab-lockup-stacked.svg').write_text(svg(body,sw,sh,'Insiyab انسياب stacked bilingual lockup'))
 (out/'geometry.json').write_text(json.dumps({'version':'2.0','master_viewbox':[0,0,120,120],'visible_symbol_bounds':[10,10,110,110],'upper_mass':UPPER_D,'lower_mass':LOWER_D,'motion_guide':SYMBOL_D,'construction':'Two filled masses; negative space is transparent. No logo stroke.','small_sizes':[16,24,32,40],'clear_space':20,'lockup_width':620,'lockup_height':240,'wordmark_optical_width':325,'wordmark_gap':22,'fonts':{'latin':'IBM Plex Sans Medium','arabic':'Noto Kufi Arabic Medium'},'layers':['symbol-upper','symbol-lower','arabic-wordmark','latin-wordmark'],'optional_animation_layer':'line-path'},indent=2))
 return w,h

if __name__=='__main__': print(make_logos())
