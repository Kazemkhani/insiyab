// Five participants, four reporting roles, one manager; provider calls are mocked.
'use strict';
const fs=require('fs'),os=require('os'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'insiyab-five-')),port=17895,key=crypto.randomBytes(24).toString('hex');
const roles=['driver','depot','station','planner','manager'];
fs.writeFileSync(path.join(dir,'numbers'),roles.map((r,i)=>`${r},Test${r},+1000000000${i+1}`).join('\n'));
Object.assign(process.env,{VOICE_PUBLIC_URL:`http://127.0.0.1:${port}`,VOICE_PORT:String(port),VOICE_SHARED_KEY:key,ELEVENLABS_API_KEY:'fake',ELEVENLABS_PHONE_NUMBER_ID:'fake',INSIYAB_CALLS:'armed',INSIYAB_NUMBERS_FILE:path.join(dir,'numbers'),INSIYAB_ENV_FILE:path.join(dir,'absent')});process.argv.push('--live','--sample-manager');
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
 if(process.argv.includes('--unreachable'))process.env.VOICE_PUBLIC_URL+= '/unreachable';
 require('../relay.js');
 if(process.argv.includes('--unreachable')){
  await wait(async()=>(await get()).outcome==='sample_failed');assert.equal(calls.length,0);
  console.log('PASS unavailable callback blocks every outgoing call');fs.rmSync(dir,{recursive:true});process.exit(0);
 }
 await wait(()=>calls.length===1);
 assert.equal(calls[0].agent_id,'manager');
 assert.match(calls[0].conversation_initiation_client_data.dynamic_variables.staff_reports,/No staff reports/);
 await tool('decision','manager',{option_key:'none',words:'Keep observing.'});
 await wait(async()=>(await get()).phase==='done');
 const s=await get();assert.equal(s.outcome,'sample_decision_recorded');assert.equal(calls.length,1);
 assert.equal(Object.keys(s.reports).length,0);assert.equal(Object.keys(s.acknowledgements).length,0);
 const again=await original(`http://127.0.0.1:${port}/voice/incident`,{method:'POST',headers:{'content-type':'application/json','x-insiyab-key':key},body:JSON.stringify({drill:true,route:'310',options:[{key:'none',say:'Observe'}]})}).then(r=>r.json());assert(again.skipped);
 console.log('PASS manager sample: one call, no invented reports, decision recorded, no callbacks, repeat blocked');
 fs.rmSync(dir,{recursive:true});process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
