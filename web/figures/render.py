"""Rebuild the fictional stage assets. No transport records or counts are encoded.
Blender --background --python web/figures/render.py -- web/assets/scenes
The browser overlays the role, time, measured/simulated state and bundle values.
"""
import bpy, math, sys, json
from bpy_extras.object_utils import world_to_camera_view
from pathlib import Path
from mathutils import Vector
OUT=Path(sys.argv[sys.argv.index('--')+1]).resolve();OUT.mkdir(parents=True,exist_ok=True)

def mat(name,hex):
 m=bpy.data.materials.new(name);m.use_nodes=True;b=m.node_tree.nodes['Principled BSDF'];b.inputs['Base Color'].default_value=tuple((int(hex[i:i+2],16)/255)**2.2 for i in (1,3,5))+(1,);b.inputs['Roughness'].default_value=.76;return m

def finish(o,m):
 o.data.materials.append(M[m]);
 if o.type=='MESH':
  for p in o.data.polygons:p.use_smooth=True
 return o

def box(name,p,scale,m='paper',r=.04):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if r:
  mod=o.modifiers.new('Soft manufactured edge','BEVEL');mod.width=r;mod.segments=3
  o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return finish(o,m)

def sphere(name,p,scale,m):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,radius=1,location=p);o=bpy.context.object;o.name=name;o.scale=scale;return finish(o,m)

def tube(name,a,b,r,m):
 d=Vector(b)-Vector(a);bpy.ops.mesh.primitive_cylinder_add(vertices=20,radius=r,depth=d.length,location=(Vector(a)+Vector(b))/2);o=bpy.context.object;o.name=name;o.rotation_mode='QUATERNION';o.rotation_quaternion=Vector((0,0,1)).rotation_difference(d.normalized());return finish(o,m)

def torus(name,p,r,thick,m,rotation=(0,0,0)):
 bpy.ops.mesh.primitive_torus_add(major_segments=48,minor_segments=12,location=p,major_radius=r,minor_radius=thick,rotation=rotation);o=bpy.context.object;o.name=name;return finish(o,m)

def torso(name,p,m):
 rings=[(0,.16,.105),(.18,.185,.12),(.42,.23,.125),(.48,.19,.115),(.53,.095,.085)];verts=[];faces=[];n=24
 for z,rx,ry in rings:
  verts.extend([(p[0]+rx*math.cos(i*2*math.pi/n),p[1]+ry*math.sin(i*2*math.pi/n),p[2]+z) for i in range(n)])
 for j in range(len(rings)-1):
  for i in range(n):a=j*n+i;b=j*n+(i+1)%n;faces.append((a,b,b+n,a+n))
 faces.extend([tuple(reversed(range(n))),tuple(range((len(rings)-1)*n,len(rings)*n))]);me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);finish(o,m);mod=o.modifiers.new('Cloth','SUBSURF');mod.levels=2;return o

def human(role,pos=(0,0,0),seated=False,phone=False):
 x,y,z=pos;h=.65 if seated else .86
 torso(role+' jacket',(x,y,z+h),'paper' if role in ['site_worker','driver'] else 'ink')
 tube('neck',(x,y,z+h+.48),(x,y,z+h+.62),.065,'skin');sphere('faceless head',(x,y-.012,z+h+.71),(.115,.105,.145),'skin')
 for sign in [-1,1]:
  hip=(x+sign*.105,y,z+h+.02);knee=(x+sign*.12,y-.34 if seated else y,z+.43);ankle=(x+sign*.13,y-.36 if seated else y,z+.11)
  tube('trouser upper',hip,knee,.085,'ink');tube('trouser lower',knee,ankle,.069,'ink');sphere('shoe',(ankle[0],ankle[1]-.05,z+.07),(.087,.16,.065),'ink')
  shoulder=(x+sign*.20,y,z+h+.41);elbow=(x+sign*.25,y-.20 if seated or phone else y-.02,z+h+.18);hand=(x+sign*.18,y-.38,z+h+.22) if seated or phone else (x+sign*.28,y-.06,z+h-.04)
  tube('sleeve',shoulder,elbow,.07,'paper' if role in ['site_worker','driver'] else 'ink');sphere('elbow',elbow,(.069,.069,.069),'paper' if role in ['site_worker','driver'] else 'ink');tube('forearm',elbow,hand,.052,'paper' if role in ['site_worker','driver'] else 'ink');sphere('hand',hand,(.052,.055,.065),'skin')
 if role=='site_worker':
  sphere('hard hat',(x,y,z+h+.79),(.15,.14,.10),'paper');box('hard hat brim',(x,y-.015,z+h+.76),(.34,.33,.025),'paper',.012)
  for dx in [-.115,.115]:box('workwear stripe',(x+dx,y-.126,z+h+.28),(.035,.012,.34),'grey',.005)
  box('workwear band',(x,y-.128,z+h+.14),(.32,.013,.025),'grey',.003)
 if role=='office_worker':
  box('work bag',(x+.34,y-.07,z+h-.1),(.24,.12,.29),'paper',.035);torus('bag handle',(x+.34,y-.07,z+h+.07),.065,.012,'ink',(math.pi/2,0,0))
 if phone:box('phone',(x+.12,y-.43,z+h+.24),(.105,.025,.18),'ink',.012)
 if seated:
  box('chair',(x,y+.11,z+.60),(.45,.42,.08),'grey');box('chair back',(x,y+.31,z+.95),(.43,.07,.58),'grey');tube('chair base',(x,y,z+.1),(x,y,z+.57),.06,'ink')

def bus(x=0,y=0):
 box('bus body',(x,y,1.15),(3.8,1.08,1.52),'paper',.12)
 box('dark glazing',(x,y-.548,1.46),(3.52,.025,.64),'ink',.035)
 for dx in [-1.25,-.58,.09,.76,1.43]:box('window divider',(x+dx,y-.57,1.46),(.055,.025,.65),'paper',.008)
 box('front window',(x-1.92,y,1.45),(.024,.84,.65),'ink',.025)
 box('lower panel',(x,y-.57,.91),(3.6,.035,.035),'grey',.005)
 for dx in [-1.15,1.15]:
  for dy in [-.52,.52]:
   tube('tyre',(x+dx,y+dy-.065,.43),(x+dx,y+dy+.065,.43),.30,'ink');tube('wheel centre',(x+dx,y+dy-.072,.43),(x+dx,y+dy+.072,.43),.15,'grey')
 for dy in [-.34,.34]:box('headlight',(x-1.925,y+dy,.82),(.03,.18,.11),'grey',.012)

def shelter():
 for x in [-1,1]:tube('stop support',(x,.75,.10),(x,.75,2.05),.035,'ink')
 box('shelter roof',(0,.38,2.10),(2.25,1.10,.10),'paper',.02);box('shelter back',(0,.77,1.18),(2.05,.04,1.80),'pale',.015)
 box('bench',(0,.50,.55),(1.55,.30,.06),'grey',.02)
 for x in [-.6,.6]:tube('bench leg',(x,.5,.12),(x,.5,.51),.035,'ink')
 tube('stop pole',(-1.4,.48,.10),(-1.4,.48,2.25),.035,'ink');box('stop sign',(-1.4,.48,2.0),(.32,.065,.44),'ink',.035)

def setup():
 global M
 bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene
 M={k:mat(k,v) for k,v in {'paper':'#F6F5F1','ink':'#12263A','grey':'#8C96A0','skin':'#C3C9CF','pale':'#E6E8EA'}.items()}
 scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.render.resolution_x=1200;scene.render.resolution_y=720;scene.render.resolution_percentage=100
 scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True
 scene.view_settings.view_transform='Standard';scene.world=bpy.data.worlds.new('Studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.8,.8,.8,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.25
 bpy.ops.object.light_add(type='AREA',location=(-3,-4,8));bpy.context.object.data.energy=700;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=7
 bpy.ops.object.light_add(type='AREA',location=(5,3,5));bpy.context.object.data.energy=250;bpy.context.object.data.size=5
 bpy.ops.object.camera_add(location=(7,-10,7.2));cam=bpy.context.object;target=Vector((0,0,1));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=8.2;scene.camera=cam
 return scene

layouts={}
for role,setting in [('planner','control_room'),('site_worker','stop'),('site_worker','bus'),('office_worker','stop'),('office_worker','phone'),('driver','bus')]:
 scene=setup();box('stage',(0,0,-.10),(6,4,.18),'pale',.07)
 if role=='planner':
  human(role,(-1.65,-.2,0),True)
  box('desk',(-.2,-1.3,.91),(2.7,1.0,.10),'paper',.04)
  for x in [-1.25,.85]:box('desk leg',(x,-1.3,.43),(.07,.7,.86),'ink',.01)
  box('monitor frame',(-.15,-1.67,1.52),(1.3,.10,.82),'ink',.025);box('monitor face',(-.15,-1.73,1.52),(1.20,.015,.72),'pale',.01);tube('monitor stand',(-.15,-1.67,.97),(-.15,-1.67,1.12),.05,'ink')
  box('wall display',(0,1.35,1.3),(3.9,.14,1.2),'paper',.04)
  box('planning board',(0,1.265,1.3),(3.65,.02,.96),'pale',.015)
 elif role=='driver':
  human(role,(.05,-.10,0),True)
  box('cab floor',(0,-.3,.03),(2.3,2.2,.10),'paper');box('dashboard',(0,-1.03,.93),(2.0,.38,.30),'ink',.06)
  torus('steering wheel',(.05,-.64,1.13),.22,.025,'ink',(math.pi/3,0,0));tube('steering spoke',(-.15,-.64,1.13),(.25,-.64,1.13),.015,'ink')
  box('windshield surround',(0,-1.30,1.82),(2.1,.075,.10),'ink',.02)
  for x in [-1.0,1.0]:tube('windscreen pillar',(x,-1.30,.85),(x,-1.30,1.87),.04,'ink')
  box('side mirror',(1.17,-1.28,1.60),(.22,.10,.35),'grey',.04)
 else:
  box('kerb',(0,.10,.01),(6,.16,.16),'paper',.012);shelter()
  bus(.65,-1.15)
  # A cutaway seat is illustrative, not a count of seats or a reconstructed journey.
  if setting=='bus':
   box('cutaway floor',(-2.25,-1.55,.10),(1.1,.95,.14),'paper');human(role,(-2.25,-1.55,.17),True)
  else:human(role,(-2.35,-1.65,0),phone=setting=='phone')
 target=Vector((-1.15,-.55,1.05) if role=='planner' else (0,-.3,1.0) if role=='driver' else (-1.25,-1.3,1.0))
 scene.camera.location=target+Vector((7,-10,7.2));scene.camera.rotation_euler=(target-scene.camera.location).to_track_quat('-Z','Y').to_euler();scene.camera.data.ortho_scale=4.6 if role!='driver' else 3.8
 bpy.context.view_layer.update()
 if role=='planner':
  corners=[(-.72,-1.742,1.84),(.42,-1.742,1.84),(-.72,-1.742,1.20),(.42,-1.742,1.20)]
  layouts['planner']=[[round(q.x*710,3),round((1-q.y)*426,3)] for q in [world_to_camera_view(scene,scene.camera,Vector(v)) for v in corners]]
 scene.render.filepath=str(OUT/f'{role}-{setting}.png');bpy.ops.render.render(write_still=True)
 print('RENDERED',scene.render.filepath,flush=True)

(OUT/'layout.json').write_text(json.dumps(layouts,indent=2)+'\n')
