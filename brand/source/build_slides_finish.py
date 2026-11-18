"""Package cleanup and POTX export for the Artifact Tool authored Insiyab deck."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from lxml import etree as E
import sys, posixpath
P='http://schemas.openxmlformats.org/presentationml/2006/main'
A='http://schemas.openxmlformats.org/drawingml/2006/main'
R='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
PKG='http://schemas.openxmlformats.org/package/2006/relationships'
CT='http://schemas.openxmlformats.org/package/2006/content-types'

def serialize(node): return E.tostring(node,xml_declaration=True,encoding='UTF-8',standalone=True)
def rel_target(source,target): return posixpath.normpath(posixpath.join(posixpath.dirname(source),target)).lstrip('/')
def rels_path(part): return posixpath.join(posixpath.dirname(part),'_rels',posixpath.basename(part)+'.rels')
def prepare(src,dst):
 with ZipFile(src) as z: data={n:z.read(n) for n in z.namelist()}
 slideparts=[n for n in data if n.startswith('ppt/slides/slide') and n.endswith('.xml')]
 used_layouts=set()
 for n in slideparts:
  for rel in E.fromstring(data[rels_path(n)]):
   if rel.get('Type','').endswith('/slideLayout'): used_layouts.add(rel_target(n,rel.get('Target')))
 used_masters=set()
 for n in used_layouts:
  for rel in E.fromstring(data[rels_path(n)]):
   if rel.get('Type','').endswith('/slideMaster'):used_masters.add(rel_target(n,rel.get('Target')))
 removed=set()
 for n in list(data):
  if n.startswith('ppt/slideLayouts/slideLayout') and n.endswith('.xml') and n not in used_layouts: removed.update([n,rels_path(n)])
  if n.startswith('ppt/slideMasters/slideMaster') and n.endswith('.xml') and n not in used_masters: removed.update([n,rels_path(n)])
 for n in removed:data.pop(n,None)
 pres_rels=E.fromstring(data['ppt/_rels/presentation.xml.rels']);removed_ids=[]
 for rel in list(pres_rels):
  if rel_target('ppt/presentation.xml',rel.get('Target','')) in removed:
   removed_ids.append(rel.get('Id'));pres_rels.remove(rel)
 data['ppt/_rels/presentation.xml.rels']=serialize(pres_rels)
 pres=E.fromstring(data['ppt/presentation.xml'])
 for el in pres.findall('.//{%s}sldMasterId'%P):
  if el.get('{%s}id'%R) in removed_ids:el.getparent().remove(el)
 data['ppt/presentation.xml']=serialize(pres)
 # Remove deleted package-part registrations.
 ct=E.fromstring(data['[Content_Types].xml'])
 for el in list(ct):
  if el.get('PartName','').lstrip('/') in removed:ct.remove(el)
 data['[Content_Types].xml']=serialize(ct)
 # Put the exact brand fonts in the PowerPoint theme as well as the placeholders.
 for n in list(data):
  if n.startswith('ppt/theme/theme') and n.endswith('.xml'):
   root=E.fromstring(data[n]);root.set('name','Insiyab')
   scheme=root.find('.//{%s}fontScheme'%A)
   if scheme is not None:
    scheme.set('name','Insiyab Typography')
    for family,latin in [('majorFont','Instrument Serif'),('minorFont','IBM Plex Sans')]:
     f=scheme.find('{%s}%s'%(A,family)); f.find('{%s}latin'%A).set('typeface',latin)
     f.find('{%s}cs'%A).set('typeface','Noto Kufi Arabic')
     arab=f.find("{%s}font[@script='Arab']"%A)
     if arab is None:arab=E.SubElement(f,'{%s}font'%A,script='Arab')
     arab.set('typeface','Noto Kufi Arabic')
   data[n]=serialize(root)
 with ZipFile(dst,'w',ZIP_DEFLATED) as z:
  for n,b in data.items():z.writestr(n,b)
 print({'slides':len(slideparts),'layouts':len(used_layouts),'masters':len(used_masters),'output':str(dst)})

def potx(src,dst):
 with ZipFile(src) as z: data={n:z.read(n) for n in z.namelist()}
 ct=E.fromstring(data['[Content_Types].xml'])
 matches=[]
 for el in ct:
  if el.get('PartName')=='/ppt/presentation.xml':
   el.set('ContentType','application/vnd.openxmlformats-officedocument.presentationml.template.main+xml');matches.append(el)
 assert len(matches)==1
 data['[Content_Types].xml']=serialize(ct)
 with ZipFile(dst,'w',ZIP_DEFLATED) as z:
  for n,b in data.items():z.writestr(n,b)
 print({'template':str(dst),'bytes':Path(dst).stat().st_size})

def preview(src,dst):
 from reportlab.pdfgen.canvas import Canvas
 from reportlab.lib.utils import ImageReader
 slides=sorted(Path(src).glob('slide-*.png'))
 assert len(slides)==7
 c=Canvas(str(dst),pagesize=(960,540))
 c.setTitle('Insiyab Executive Slide Master - Visual Reference')
 c.setAuthor('Insiyab')
 for slide in slides:
  c.drawImage(ImageReader(str(slide)),0,0,960,540)
  c.showPage()
 c.save()
 print({'preview':str(dst),'pages':len(slides)})

if __name__=='__main__':
 mode,src,dst=sys.argv[1:]
 {'prepare':prepare,'potx':potx,'preview':preview}[mode](src,dst)
