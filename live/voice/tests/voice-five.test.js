// Five participants, four reporting roles, one manager; provider calls are mocked.
'use strict';
const fs=require('fs'),os=require('os'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'insiyab-five-')),port=17894,key=crypto.randomBytes(24).toString('hex');
const roles=['driver','depot','station','planner','manager'];
fs.writeFileSync(path.join(dir,'numbers'),roles.map((r,i)=>`${r},Test${r},+1000000000${i+1}`).join('\n'));
Object.assign(process.env,{VOICE_PORT:String(port),VOICE_SHARED_KEY:key,ELEVENLABS_API_KEY:'fake',ELEVENLABS_PHONE_NUMBER_ID:'fake',INSIYAB_CALLS:'armed',INSIYAB_NUMBERS_FILE:path.join(dir,'numbers'),INSIYAB_ENV_FILE:path.join(dir,'absent')});process.argv.push('--live');
const original=global.fetch,calls=[],status={},names={driver:'driver check',depot:'depot check',station:'station check',planner:'planner check',manager:'manager',back:'call back'};
const J=o=>new Response(JSON.stringify(o),{headers:{'content-type':'application/json'}});
global.fetch=async(url,init={})=>{
 if(String(url).startsWith('http://127.0.0.1:'+port))return original(url,init);
 if(String(url).endsWith('/agents?page_size=100'))return J({agents:Object.entries(names).map(([k,n])=>({agent_id:k,name:'Insiyab relay: '+n}))});
 if(String(url).endsWith('/outbound-call')){const x=JSON.parse(init.body);x.id='call'+calls.length;calls.push(x);status[x.id]='in-progress';return J({success:true,conversation_id:x.id})}
 if(String(url).includes('/conversations/'))return J({status:status[String(url).split('/').pop()]});
 throw new Error('Unexpected external request blocked');
};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const get=()=>original(`http://127.0.0.1:${port}/voice/state/authenticated`,{headers:{'x-insiyab-key':key}}).then(r=>r.json());
const wait=async f=>{for(let i=0;i<120;i++){if(await f())return;await sleep(100)}throw new Error('Timed out')};
const tool=async(name,role,body={})=>{const c=[...calls].reverse().find(c=>c.conversation_initiation_client_data.dynamic_variables.staff_role===role);const r=await original(`http://127.0.0.1:${port}/voice/tool/${name}`,{method:'POST',headers:{'content-type':'application/json','x-insiyab-tool':crypto.createHash('sha256').update('insiyab-tool:'+key).digest('hex').slice(0,40)},body:JSON.stringify({...body,role,call_token:c.conversation_initiation_client_data.dynamic_variables.call_token})});status[c.id]='done';return r.json()};
(async()=>{
 require('../relay.js');await wait(()=>get().then(()=>true).catch(()=>false));await sleep(100);
 const inc={drill:true,route:'310',hour:'18:00',options:[{key:'none',say:'Keep observing; no dispatch.'}]};
 await original(`http://127.0.0.1:${port}/voice/incident`,{method:'POST',headers:{'content-type':'application/json','x-insiyab-key':key},body:JSON.stringify(inc)});
 await wait(()=>calls.length===4);assert.deepEqual(calls.map(c=>c.agent_id).sort(),roles.filter(r=>r!=='manager').sort());console.log('PASS four distinct staff called before manager');
 if(process.argv.includes('--emergency')){
  await tool('report','planner',{report:'An explicitly reported real emergency.',real_emergency:true});
  await wait(async()=>(await get()).phase==='done');
  const end=await get();assert.equal(end.outcome,'emergency_reported');assert.equal(calls.length,4);assert(!end.decision);
  console.log('PASS explicit emergency stops normal manager and callback sequence');fs.rmSync(dir,{recursive:true});console.log('ALL PASS');process.exit(0);
 }
 for(const role of roles.filter(r=>r!=='manager'))await tool('report',role,{report:`${role} confirms a simulated fact; private reference 784-1234-1234567-1.`});
 await wait(()=>calls.length===5);assert.equal(calls[4].agent_id,'manager');assert.match(calls[4].conversation_initiation_client_data.dynamic_variables.staff_reports,/planner:/);console.log('PASS manager hears all four role reports');
 await tool('decision','manager',{option_key:'none',words:'Keep the existing plan.'});await wait(()=>calls.length===9);
 await tool('acknowledge','station');
 const once=await get();await tool('acknowledge','station');const twice=await get();assert.deepEqual(twice.acknowledgements,once.acknowledgements);assert.equal(twice.timeline.length,once.timeline.length);console.log('PASS repeated acknowledgement is idempotent');
 for(const role of roles.filter(r=>r!=='manager'&&r!=='station'))await tool('acknowledge',role);
 await wait(async()=>(await get()).phase==='done');const s=await get();assert.equal(s.outcome,'complete');assert.equal(Object.keys(s.acknowledgements).length,4);assert.equal(calls.length,9);console.log('PASS nine bounded calls complete five-person relay with four acknowledgements');
 assert(!JSON.stringify(s).includes('Testdriver'));assert(!JSON.stringify(s).includes('call_token'));console.log('PASS authenticated state omits roster names and callback tokens');
 const pub=await original(`http://127.0.0.1:${port}/voice/state`).then(r=>r.json());assert(!JSON.stringify(pub).includes('784-1234'));assert(!('incident' in pub));assert(!JSON.stringify(pub).includes('simulated fact'));assert.equal((await original(`http://127.0.0.1:${port}/voice/state/authenticated`)).status,403);console.log('PASS public status excludes free text and detailed state requires authentication');
 const again=await original(`http://127.0.0.1:${port}/voice/incident`,{method:'POST',headers:{'content-type':'application/json','x-insiyab-key':key},body:JSON.stringify(inc)}).then(r=>r.json());assert(again.skipped);console.log('PASS second live rehearsal requires an explicit restart');
 fs.rmSync(dir,{recursive:true});console.log('ALL PASS');process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
