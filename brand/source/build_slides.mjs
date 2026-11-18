import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {FontLibrary} from '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/node_modules/skia-canvas/lib/index.mjs';
import {Presentation,PresentationFile} from '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';

const ROOT='/workspace/scratch/ccb5634d60a0/insiyab';
const OUT=path.join(ROOT,'presentation');
const BUILD=path.join(OUT,'.build');
const PREV=path.join(OUT,'previews');
const SKILL='/home/agent/.codex/skills/builtins/presentations';
const C={ivory:'#F7F5F0',ink:'#15181D',gold:'#9C7B3E',red:'#C42B2B',teal:'#2E7D6B',rule:'#D0CECA'};
const F={display:'Instrument Serif',text:'IBM Plex Sans',arabic:'Noto Kufi Arabic'};
FontLibrary.use({[F.display]:[path.join(ROOT,'assets/fonts/InstrumentSerif-Regular.ttf'),path.join(ROOT,'assets/fonts/InstrumentSerif-Italic.ttf')],[F.text]:[path.join(ROOT,'assets/fonts/IBMPlexSans-Regular.ttf'),path.join(ROOT,'assets/fonts/IBMPlexSans-Medium.ttf'),path.join(ROOT,'assets/fonts/IBMPlexSans-SemiBold.ttf')],[F.arabic]:[path.join(ROOT,'assets/fonts/NotoKufiArabic-Regular.ttf'),path.join(ROOT,'assets/fonts/NotoKufiArabic-Bold.ttf')]});
await fs.mkdir(BUILD,{recursive:true});await fs.mkdir(PREV,{recursive:true});
const p=Presentation.create({slideSize:{width:1280,height:720}});
p.theme.defaultFont=F.text;
p.theme.colorScheme={name:'Insiyab',themeColors:{accent1:C.gold,accent2:C.red,accent3:C.teal,accent4:C.ink,accent5:C.ivory,accent6:'#D0CECA',bg1:C.ivory,bg2:C.ink,tx1:C.ink,tx2:C.ivory,dk1:C.ink,dk2:C.gold,lt1:C.ivory,lt2:'#FFFFFF',hlink:C.teal,folHlink:C.ink}};
const noLine={style:'solid',fill:'none',width:0};
function txt(surface,name,text,x,y,w,h,size=24,font=F.text,color=C.ink,bold=false,align='left'){
 const s=surface.shapes.add({geometry:'textbox',name,position:{left:x,top:y,width:w,height:h},fill:'none',line:noLine});s.text=text;s.text.style={fontSize:size,typeface:font,color,bold,alignment:align,verticalAlignment:'top',insets:0,autoFit:'none',wrap:'square'};return s;
}
function rule(surface,name,x,y,w,color=C.rule,width=1){return surface.shapes.add({geometry:'line',name,position:{left:x,top:y,width:w,height:0},fill:'none',line:{style:'solid',fill:color,width}});}
function rect(surface,name,x,y,w,h,fill='none',stroke=C.ink,sw=1){return surface.shapes.add({geometry:'rect',name,position:{left:x,top:y,width:w,height:h},fill,line:{style:'solid',fill:stroke,width:sw}});}
function line(surface,name,x1,y1,x2,y2,color=C.gold,width=2){return surface.shapes.add({geometry:'line',name,position:{left:Math.min(x1,x2),top:Math.min(y1,y2),width:Math.abs(x2-x1),height:Math.abs(y2-y1),horizontalFlip:x2<x1,verticalFlip:y2<y1},fill:'none',line:{style:'solid',fill:color,width}});}
function circle(surface,name,x,y,r,fill=C.ivory,stroke=C.ink,sw=2){return surface.shapes.add({geometry:'ellipse',name,position:{left:x-r,top:y-r,width:r*2,height:r*2},fill,line:{style:'solid',fill:stroke,width:sw}});}
function curve(surface,name,x,y,w,h,commands,color=C.gold,width=2){return surface.shapes.add({geometry:'custom',name,position:{left:x,top:y,width:w,height:h},fill:'none',line:{style:'solid',fill:color,width},customPaths:[{width:w,height:h,commands}]});}
const logoPath=process.env.INSIYAB_LOGO || path.join(ROOT,'assets/logo/insiyab-lockup-ink.svg');
const symbolPath=process.env.INSIYAB_SYMBOL || path.join(ROOT,'assets/logo/insiyab-symbol-gold.svg');
async function svgAsset(surface,filename,name,x,y,w,h){
 const svg=await fs.readFile(filename,'utf8');
 const viewBox=svg.match(/viewBox\s*=\s*[\"']([^\"']+)[\"']/i);
 if(!viewBox)throw new Error('SVG lacks an intrinsic viewBox: '+filename);
 const bounds=viewBox[1].trim().split(/[\s,]+/).map(Number);
 const vbw=bounds[2],vbh=bounds[3];
 if(!(vbw>0&&vbh>0))throw new Error('Invalid SVG viewBox: '+filename);
 const scale=Math.min(w/vbw,h/vbh);
 const actualW=vbw*scale,actualH=vbh*scale;
 return surface.images.add({svg,alt:name,fit:'contain',position:{left:x+(w-actualW)/2,top:y+(h-actualH)/2,width:actualW,height:actualH}});
}
function ph(layout,index,type,name,text,x,y,w,h,size=24,font=F.text,color=C.ink,bold=false){
 const s=layout.placeholders.add({type,index,text,geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:noLine});s.name=name;s.text.style={typeface:font,fontSize:size,color,bold,insets:0,autoFit:'none',wrap:'square',verticalAlignment:'top'};return s;
}
const main=p.masters.add('Insiyab Light'); main.background.fill=C.ivory;
const cover=p.masters.add('Insiyab Light Cover');cover.background.fill=C.ivory;
await svgAsset(main,logoPath,'Insiyab bilingual logo',920,18,280,100);
rule(main,'Footer rule',80,658,1120,C.rule,1);
const NOTES_BRIEF='Source: product description supplied in the Insiyab brand brief. This slide illustrates proposed functionality and design. It does not assert measured service outcomes, live operational status, RTA endorsement, or authorization to control a vehicle. The controller selects and authorizes an action.';
const SCENARIO='Illustrative scenario — not live operations data';
const layouts=[];
function layout(name,parent=main){const l=p.layouts.add(name);l.setParentLayoutId(parent.id);layouts.push(l);return l;}
function base(l,title='Slide title',intro='Supporting sentence',foot='Source: owner, dataset, period, retrieval time and method.'){
 ph(l,0,'title','Title',title,80,124,1120,74,52,F.display);
 ph(l,1,'subtitle','Introduction',intro,80,211,1110,66,24);
 ph(l,90,'body','Source',foot,80,674,1060,28,16);
 ph(l,91,'body','Page','00',1150,674,50,28,16,F.text,C.ink,false);
}
function slideFor(l,values,notes=NOTES_BRIEF){
 const s=p.slides.add({layoutId:l.id});const local=s.placeholders.addFromLayout();
 for(const item of local){const k=item.placeholder.index;if(Object.hasOwn(values,k))item.text=values[k];else item.text='';}
 s.speakerNotes.text=notes;
 return s;
}
// 01 Cover. The two wordmarks remain locked as one original logo asset.
const l1=layout('01 Cover',cover);
await svgAsset(l1,logoPath,'Insiyab bilingual logo',80,48,480,172);
ph(l1,0,'title','Title','Presentation title',80,252,1020,180,82,F.display);
ph(l1,1,'subtitle','Description','One clear sentence about the briefing',84,464,900,70,28);
ph(l1,2,'body','Context','Audience and venue',84,627,1010,38,19);
await svgAsset(l1,symbolPath,'Insiyab architectural symbol',1080,492,120,120);
const s1=slideFor(l1,{0:'Calm flow restored',1:'AI co-pilot for bus operations\nA person decides. Insiyab does the legwork.',2:'Executive identity application   Emirates Towers, Dubai'});

// 02 Decision brief. Three equally weighted choices preserve human authority.
const l2=layout('02 Decision brief');base(l2,'Controller decision brief','One short briefing with three options',SCENARIO);
ph(l2,2,'body','Metric','6 min',80,296,230,82,68,F.display,C.red);
ph(l2,3,'body','Metric caption','Forecast delay',84,381,230,30,20);
ph(l2,4,'body','Situation','Situation and confirmed information',372,292,828,112,25);
for(let k=0;k<3;k++){const x=80+k*382;rule(l2,`Option ${k+1} rule`,x,438,354,C.gold,2);ph(l2,10+k*3,'body',`Option ${k+1} number`,String(k+1).padStart(2,'0'),x,459,65,60,42,F.display,C.gold);ph(l2,11+k*3,'body',`Option ${k+1} title`,'Option title',x+75,462,280,40,24,F.text,C.ink,true);ph(l2,12+k*3,'body',`Option ${k+1} explanation`,'Outcome and trade-off',x,519,354,86,21);}
ph(l2,30,'body','Authority status','Awaiting controller authorization',80,614,1110,33,20,F.text,C.ink,true);
const s2=slideFor(l2,{0:'Controller decision brief',1:'Route EX-01 needs a response. The controller selects and authorizes it.',2:'6 min',3:'Forecast delay',4:'Driver reports slow traffic. Depot confirms a spare vehicle. Station can hold the connection.',10:'01',11:'Maintain service',12:'Keep the current plan.\nContinue monitoring the delay.',13:'02',14:'Dispatch a spare',15:'Use the confirmed spare.\nCheck vehicle and crew readiness.',16:'03',17:'Hold the connection',18:'Request a short station hold.\nConsider onward passengers.',30:'Awaiting controller authorization',90:SCENARIO,91:'02'},NOTES_BRIEF+'\nFictional route EX-01 and six-minute delay are demonstration data. All call responses and availability statements are scripted examples. No option has been preselected. Add the approved operational constraints to every production recommendation.');

// 03 One metric, bounded meaning.
const l3=layout('03 One metric and evidence');base(l3,'Operational measure','Metric definition and period',SCENARIO);
ph(l3,2,'body','Main value','48 s',80,298,460,160,130,F.display);
ph(l3,3,'body','Measure name','Time to controller briefing',84,490,490,88,29);
rule(l3,'Evidence column rule',645,304,555,C.gold,2);
ph(l3,4,'body','Interpretation','Interpretation',645,327,555,90,30,F.display);
ph(l3,5,'body','Definition','Start and end event definitions',645,434,555,112,23);
ph(l3,6,'body','Qualification','Required qualification',645,568,555,65,19);
const s3=slideFor(l3,{0:'Time to controller briefing',1:'One number represents one defined operational measure.',2:'48 s',3:'Illustrative elapsed time',4:'The number needs a clear boundary',5:'Start: the route alert is logged.\nEnd: the briefing is ready for review.\nController decision time is separate.',6:'Example display only. Replace with a measured value and a cited source before external use.',90:SCENARIO,91:'03'},NOTES_BRIEF+'\n48 seconds is a fictional value, not a measured or promised performance result. Before reuse, replace it with a supported value and include dataset, period, sample size, metric definition, and timestamp.');

// 04 Comparison with shared scale. All bars and labels are editable.
const l4=layout('04 Timetable comparison');base(l4,'Planned and actual arrivals','Route EX-01 at one station',SCENARIO);
ph(l4,2,'body','Row one','Planned',80,313,240,48,27);
ph(l4,3,'body','Row two','Actual',80,433,240,48,27);
ph(l4,4,'body','Difference','+6 min',1040,518,160,65,48,F.display,C.red);
ph(l4,5,'body','Difference label','Arrival delay',1040,579,160,30,20);
ph(l4,6,'body','Takeaway','Keep one time scale and label both series directly.',80,580,810,48,23);
const s4=slideFor(l4,{0:'Planned and actual arrivals',1:'Route EX-01 at the same station on a shared time axis.',2:'Planned',3:'Actual',4:'+6 min',5:'Arrival delay',6:'Hollow bars show the plan. Solid bars show the observed record.',90:SCENARIO,91:'04'},NOTES_BRIEF+'\nFictional planned arrival 17:30 and actual arrival 17:36 on route EX-01. The shared axis runs from 17:20 to 17:40. Bars encode elapsed time from the same axis origin; they do not represent vehicle lengths or route distance.');
const tx=362,tw=600,tbase=538;
for(let k=0;k<5;k++){const x=tx+k*tw/4;line(s4,`Time tick ${k+1}`,x,282,x,510,'#D0CECA',1);txt(s4,`Time label ${k+1}`,['17:20','17:25','17:30','17:35','17:40'][k],x-36,tbase,90,28,17);}
rect(s4,'Planned arrival bar',tx,315,300,34,'none',C.ink,2);
rect(s4,'Actual arrival bar',tx,435,480,34,C.ink,'none',0);
txt(s4,'Planned arrival time','17:30',tx+320,314,145,42,26);
txt(s4,'Actual arrival time','17:36',tx+500,434,150,42,26);
line(s4,'Delay marker start',tx+300,391,tx+300,409,C.red,2);line(s4,'Delay marker end',tx+480,391,tx+480,409,C.red,2);line(s4,'Delay interval',tx+300,400,tx+480,400,C.red,2);

// 05 Calls converge, then controller authorization governs the return path.
const l5=layout('05 Coordinated call flow');base(l5,'Calls converge on one briefing','Information gathering runs in parallel. A person authorizes the response.','Source: Insiyab product brief. Diagram shows the proposed information flow.');
ph(l5,2,'body','Authority note','Relay begins only after controller authorization.',80,604,1120,38,22,F.text,C.ink,true);
const s5=slideFor(l5,{0:'Calls converge on one briefing',1:'Information gathering runs in parallel. A person authorizes the response.',2:'Relay begins only after controller authorization.',90:'Source: Insiyab product brief. Diagram shows the proposed information flow.',91:'05'});
const nodes=[['Driver',300],['Depot',402],['Station',504]];
for(const [nm,y] of nodes){circle(s5,`${nm} call node`,107,y,14,C.ivory,C.ink,2);txt(s5,`${nm} label`,nm,141,y-21,200,44,26);line(s5,`${nm} call line`,323,y,444,y,C.gold,2);}
line(s5,'Call convergence',444,300,444,504,C.gold,2);line(s5,'Converged call line',444,402,550,402,C.gold,2);
const brief=rect(s5,'Briefing frame',550,344,270,116,'none',C.ink,2);txt(s5,'Briefing label','Briefing',576,363,218,38,29,F.display);txt(s5,'Briefing content','Three options',576,410,218,33,21);
line(s5,'Briefing to controller',820,402,900,402,C.ink,2);
const controller=rect(s5,'Controller frame',900,344,300,116,C.ink,'none',0);txt(s5,'Controller label','Controller',925,363,250,38,29,F.display,C.ivory);txt(s5,'Controller authority','Selects and authorizes',925,410,250,34,20,F.text,C.ivory);
line(s5,'Authorized relay down',1050,460,1050,554,C.ink,2);line(s5,'Authorized relay return',323,554,1050,554,C.ink,2);line(s5,'Authorized relay up',323,300,323,554,C.ink,2);
txt(s5,'Relay label','Decision relayed to the relevant people',455,564,625,35,20);

// 06 Pilot brief. Scope and evidence replace unsupported impact claims.
const l6=layout('06 Pilot evidence and next steps');base(l6,'Supervised pilot','The pilot tests the briefing workflow under named operational ownership.','Source: proposed pilot structure for this illustrative identity application.');
rule(l6,'Left section rule',80,301,520,C.gold,2);rule(l6,'Right section rule',680,301,520,C.gold,2);
ph(l6,2,'body','Evidence heading','Evidence to collect',80,323,520,52,34,F.display);
ph(l6,3,'body','Evidence items','Measure definitions and sources',80,397,520,177,24);
ph(l6,4,'body','Conditions heading','Conditions for expansion',680,323,520,52,34,F.display);
ph(l6,5,'body','Conditions items','Operational conditions',680,397,520,177,24);
ph(l6,6,'body','Decision request','Decision requested',80,604,1120,38,23,F.text,C.ink,true);
const s6=slideFor(l6,{0:'Supervised pilot',1:'The pilot tests the briefing workflow under named operational ownership.',2:'Evidence to collect',3:'Elapsed time to a usable briefing\nAcknowledgement completion\nController changes to proposed options\nRecovery outcomes with context',4:'Conditions for expansion',5:'Operational owner signs off\nFallback workflow remains usable\nEvery decision has an audit record\nEvidence supports the next scope',6:'Example decision request: approve a supervised pilot with agreed success criteria.',90:'Source: proposed pilot structure for this illustrative identity application.',91:'06'},NOTES_BRIEF+'\nThis slide is a proposed discussion structure. It does not state that a pilot is authorized, underway, funded, or endorsed. Replace the example request and success criteria with the actual decision under consideration.');

// 07 Closing. A concise restatement of the product contract.
const l7=layout('07 Closing',cover);
await svgAsset(l7,logoPath,'Insiyab bilingual logo',80,48,480,172);
ph(l7,0,'title','Closing statement','Calm flow restored',80,267,1100,100,82,F.display);
ph(l7,1,'subtitle','Product contract','A person decides. Insiyab does the legwork.',84,414,1010,108,32);
ph(l7,2,'body','Discussion prompt','Discussion or next step',84,628,1050,38,20);
await svgAsset(l7,symbolPath,'Insiyab architectural symbol',1080,492,120,120);
const s7=slideFor(l7,{0:'Calm flow restored',1:'The controller decides.\nInsiyab does the legwork.',2:'Insiyab   AI co-pilot for bus operations'});

await fs.writeFile(path.join(BUILD,'deck-model.json'),JSON.stringify(p.toProto(),null,2));
await fs.writeFile(path.join(BUILD,'layout-names.json'),JSON.stringify(layouts.map(x=>({id:x.id,name:x.name})),null,2));
for(let i=0;i<p.slides.items.length;i++){
 const s=p.slides.items[i];const stem=`slide-${String(i+1).padStart(2,'0')}`;
 const png=await p.export({slide:s,format:'png',scale:1.5});await fs.writeFile(path.join(PREV,stem+'.png'),new Uint8Array(await png.arrayBuffer()));
 const layoutJson=await s.export({format:'layout'});await fs.writeFile(path.join(BUILD,stem+'.json'),await layoutJson.text());
}

execFileSync(process.env.CODEX_PRIMARY_RUNTIME_PYTHON,[path.join(ROOT,'source/build_slides_finish.py'),'preview',PREV,path.join(OUT,'Insiyab_Executive_Slide_Master_Preview.pdf')],{stdio:'inherit'});

const candidatePath=path.join(BUILD,'candidate.pptx');const rawPath=path.join(BUILD,'raw-artifact.pptx');await (await PresentationFile.exportPptx(p)).save(rawPath);
execFileSync(process.env.CODEX_PRIMARY_RUNTIME_PYTHON,[path.join(ROOT,'source/build_slides_finish.py'),'prepare',rawPath,candidatePath],{stdio:'inherit'});
const {finalizePresentation}=await import(pathToFileURL(path.join(SKILL,'container_tools/artifact_tool_utils.mjs')).href);
const finalPath=path.join(OUT,process.env.INSIYAB_PPTX_NAME||'Insiyab_Executive_Slide_Master.pptx');
const result=await finalizePresentation({workspaceDir:ROOT,candidatePath,finalPath,pythonExecutable:process.env.CODEX_PRIMARY_RUNTIME_PYTHON,integrityValidatorPath:path.join(SKILL,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(SKILL,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit'],explicitTotalSlideCount:7,requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[],fontPolicy:{basis:'user_request',families:[F.display,F.text],scriptFonts:{cs:F.arabic}},verifyArtifactToolImport:true,receiptPath:path.join(ROOT,'source/build_slides_validation-'+Date.now()+'.json')});
console.log(JSON.stringify({finalPath,result},null,2));
