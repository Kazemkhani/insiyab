# Five-person control-room drill

## Roles and purpose

| Person | Role in the drill | One useful contribution |
|---|---|---|
| Amir | Duty manager | Chooses an offered option after hearing reports; can take no action. |
| Alrifai | Driver | Confirms whether the simulated bus can continue and the return delay to plan for. |
| Maruf | Depot | Confirms simulated spare availability and duty/access checks. |
| Sarah Maaty | Station | Explains what departure information passengers need. |
| Mustafo | Planning analyst | Explains what the recorded-day evidence supports and what remains uncertain. |

These are student role-play assignments, not claims that team members hold RTA operational posts. All people have been nominated by Amir for the consenting rehearsal roster. Numbers are private and are not in this package. A driver-role participant takes this call while stationary; no real driver is being called.

## Flow and limits

Four concurrent report calls, then one manager call, then four acknowledgements. At most nine call attempts in one process; at most 90 seconds per staff call and 150 seconds for the manager. No auto-redial loop. A second live rehearsal requires an intentional restart. The default roster is five; the original four-person configuration is supported only when explicitly set with VOICE_ROSTER_SIZE=4. Do not drop a required role and declare success.

Each call naturally identifies Insiyab as the AI operations assistant. It does not repeat a drill disclaimer; if asked, it truthfully explains the demonstration context. The manager owns the decision. The tool validates the offered option, the call token, role, active run and current phase. Missing answers remain missing. A call accepted by the provider is not an answered call; an answered call is not a recorded report; a report is not an acknowledgement.

The dashboard can either connect to the real rehearsal relay using a private viewing key, or play a clearly labelled illustrated example. Its mode label must never claim the scripted example is a live report. Public state contains only progress status. Free-text reports require authentication. The viewing key does not start calls.

## Preparation

- Existing Twilio number and agents were verified through the provider API. Do not import the number again.
- The relay runs on 127.0.0.1:7890; a Cloudflare tunnel forwards only this service.
- The public URL changes when a quick tunnel is recreated. Update the private config, rerun agent setup, verify all tool URLs, and test authenticated callback access before a new rehearsal.
- Six agent configurations serve five people: four report-role agents, manager agent, shared callback agent.
- Use ~/.config/insiyab/voice.env and voice-numbers.txt, never command-line literal credentials. Keep mode 600.
- Obtain a current “call now” from Amir so all phones are ready. The prior request explicitly asked to be notified before step 8.

## Test and record

Run `bash live/voice/tests/run.sh` first. It uses mocks and must place no real call. Run the dashboard browser tests, including a delayed poll arriving after illustrated playback starts. Start the relay disarmed, verify HTTPS health, public status projection and protected reports. Only then start the armed server and post the incident from the private environment, without printing the key.

During a real run record the screen, not just the terminal. Check all four actual reports, Amir's chosen option and all four acknowledgements. Keep any recording or transcript private outside git; get consent before sharing it. If someone declines, cannot answer or hangs up, show that honestly and offer a later rehearsal. Do not invent a successful backup recording. Mark the playback artifact as recorded rehearsal, with its date, not live operations.

The $50 aggregate ceiling is for this work, not permission for indefinite retries. Before retrying inspect the provider's result and spend. Maintain a small external run log with actual call IDs, duration, outcomes and available charge data. Public deliverables carry no call IDs, phone numbers or conversation transcripts.
