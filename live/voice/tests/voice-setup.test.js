// Validate the actual provider payload without making calls or network requests.
'use strict';
const assert=require('node:assert/strict');
Object.assign(process.env,{INSIYAB_ENV_FILE:'/nonexistent',INSIYAB_CALLS:'armed',ELEVENLABS_API_KEY:'fake',VOICE_PUBLIC_URL:'https://example.invalid',VOICE_SHARED_KEY:'test-setup-key-01234567890123456789'});
process.argv.push('--setup-agents','--live');
const agents=[],tools=[];
const J=o=>new Response(JSON.stringify(o),{headers:{'content-type':'application/json'}});
global.fetch=async(url,init={})=>{
 const u=String(url),body=init.body?JSON.parse(init.body):null;
 if(u.endsWith('/tools')&&!body)return J({tools:[]});
 if(u.endsWith('/tools')&&body){tools.push(body.tool_config);return J({id:body.tool_config.name});}
 if(u.includes('/agents?page_size='))return J({agents:[]});
 if(u.endsWith('/agents/create')){agents.push(body);return J({agent_id:'test'+agents.length});}
 throw new Error('Unexpected request; no network allowed');
};
process.on('beforeExit',()=>{
 assert.equal(agents.length,6);
 for(const a of agents)assert.equal(a.conversation_config.agent.prompt.built_in_tools.end_call.params.system_tool_type,'end_call');
 assert(tools.filter(t=>t.name==='insiyab_report').every(t=>t.api_schema.request_body_schema.properties.real_emergency.type==='boolean'));
 const station=agents.find(a=>a.name.endsWith('station check'));
 assert(!station.conversation_config.agent.first_message.includes('staff_name'));
 console.log('PASS all six agents can end calls; emergency flag available; station opening respects name preference');
 console.log('ALL PASS');
});
require('../relay.js');
