# live/voice - Insiyab control-centre drill

A phone relay for one bus incident. The team acts it out on their own phones as a drill for the RTA Future Move Hackathon pitch. No real call is ever placed unless all three guards are met.

## What it does

An incident (a bus running badly late on a known route) is posted to the relay. The relay calls the driver, depot controller, station supervisor and planning analyst at the same time, asks each one question fitted to their role, and logs a one-sentence report from each. It then calls the duty manager with the incident, the staff reports and the available options. The manager hears names and roles from the private roster, may ask questions, and chooses one. Staff calls are capped at 90 seconds; the manager call at 150 seconds. The relay calls the staff back with the decision and logs their acknowledgements.

At Amir’s request, spoken calls open naturally and identify Insiyab as an AI operations assistant. The demo context remains in the agent instructions and dashboard; if asked, the agent explains it honestly. The agent informs and records; it instructs nobody; it never claims to be RTA. If a person reports a real emergency it tells them to call 999 and ends the call.

## Three guards before any call is placed

A real call is placed only when ALL of the following are true at run time:

1. `~/.config/insiyab/voice-numbers.txt` exists and lists all five distinct consenting participants.
2. The environment variable `INSIYAB_CALLS` is set to `armed`.
3. The process was started with the `--live` flag.

Without all three the relay runs in rehearsal mode: it processes the incident, prints what it would have said to each role, and makes no network call to ElevenLabs or Twilio.

## Configuration

Copy `live/voice/voice.env.example` to `~/.config/insiyab/voice.env` and fill in the values. The file must stay outside the repository.

### Required environment variables

| Variable | Purpose |
|---|---|
| `ELEVENLABS_API_KEY` | ElevenLabs account API key |
| `ELEVENLABS_PHONE_NUMBER_ID` | The Twilio number as imported into ElevenLabs (run `--import-number`) |
| `ELEVENLABS_VOICE_ID` | Voice ID for the agents (a calm British voice is recommended) |
| `ELEVENLABS_VOICE_MODEL` | TTS model (default: `eleven_v4_turbo`) |
| `VOICE_SHARED_KEY` | 24+ character key; protects `POST /voice/incident` |
| `VOICE_VIEW_KEY` | Separate 24+ character key for detailed dashboard reports |
| `VOICE_PUBLIC_URL` | Public HTTPS address of this process (needed for tool webhooks when running `--setup-agents`) |

### Optional

| Variable | Default | Purpose |
|---|---|---|
| `ELEVENLABS_VOICE_MODEL` | `eleven_v4_turbo` | ElevenLabs TTS model |
| `VOICE_PORT` | `7890` | Port the relay listens on |
| `INSIYAB_CALLS` | (unset) | Set to `armed` to enable dialling |
| `TWILIO_LIVE_ACCOUNT_SID` | (none) | Twilio SID, only for `--import-number` |
| `TWILIO_LIVE_AUTH_TOKEN` | (none) | Twilio token, only for `--import-number` |

### Numbers file

Create `~/.config/insiyab/voice-numbers.txt`. One entry per line in the format:

```
role,name,+number
```

Roles must be exactly: `driver`, `depot`, `station`, `planner`, `manager`. Example (use real numbers, never commit this file):

```
manager,Amir,+10000000001
driver,Hassan,+10000000002
depot,Fatima,+10000000003
station,Omar,+10000000004
planner,Alex,+10000000005
```

The name is used by the agent to address the person. It never appears in `GET /voice/state` or the console.

## Commands

### A single-person sample

`INSIYAB_CALLS=armed node live/voice/relay.js --live --sample-manager`

This starts the dashboard and places exactly one call to the manager in the private roster. It uses the existing simulated incident, explicitly supplies no staff reports, records the manager's choice through the normal authenticated webhook, and makes no callbacks. Check that the configured public tunnel is reachable before starting. Stop the existing relay first so the port is available. The usual three guards still apply. A sample is never a completed five-person rehearsal.

### (a) Rehearsal mode

Run without all three guards to see what the relay would say:

```
node live/voice/relay.js --incident live/voice/incident-example.json
```

Prints the opening message for each role and exits. No network calls.

### (b) Setting up agents

Before the first live drill, create the ElevenLabs agents. This is a one-time step per account.

Dry run (prints what will be created, makes no changes):

```
node live/voice/relay.js --setup-agents
```

Armed run (requires `INSIYAB_CALLS=armed` and `--live`; also requires `ELEVENLABS_API_KEY` and `VOICE_PUBLIC_URL` to be set):

```
INSIYAB_CALLS=armed node live/voice/relay.js --setup-agents --live
```

This creates or updates six agents in ElevenLabs:
- `Insiyab relay: driver check`
- `Insiyab relay: depot check`
- `Insiyab relay: station check`
- `Insiyab relay: planner check`
- `Insiyab relay: manager`
- `Insiyab relay: call back`

### (c) Importing the Twilio number

This imports a Twilio number into ElevenLabs so the relay can place outbound calls. It replaces the number's current voice webhook.

Dry run (prints current webhook status, makes no changes):

```
node live/voice/relay.js --import-number
```

Armed run:

```
INSIYAB_CALLS=armed node live/voice/relay.js --import-number --live
```

Requires `TWILIO_LIVE_ACCOUNT_SID` and `TWILIO_LIVE_AUTH_TOKEN` in `voice.env`.

### (d) Live drill

Start the relay server:

```
INSIYAB_CALLS=armed node live/voice/relay.js --live
```

Then post an incident. The key is read from the environment, never typed into a command:

```
set -a; . ~/.config/insiyab/voice.env; set +a
```

Using the example file:

```
curl -s -X POST http://127.0.0.1:7890/voice/incident \
  -H 'Content-Type: application/json' \
  -H "x-insiyab-key: $VOICE_SHARED_KEY" \
  -d @live/voice/incident-example.json
```

Or open the console in a browser for a projector view:

```
open live/voice/console.html
```

The console polls `GET /voice/state` every 2.5 seconds. It shows the incident at the top, three staff report cards filling in as calls complete, the manager's decision large in the centre, and acknowledgement pills at the bottom. The banner says DRILL at all times.

## GET /voice/state

Returns the current timeline as JSON. No phone number and no name from the numbers file appears in the response. The phase field is one of: `idle`, `check`, `manager`, `callout`, `done`.

```json
{
  "since": "2025-12-15T18:00:00.000Z",
  "incident": { "route": "310", "direction": "1", "hour": "18:00", ... },
  "phase": "manager",
  "reports": {
    "driver": { "report": "Traffic backed up at Deira interchange, moving very slowly.", "at": "..." },
    "depot": null,
    "station": { "report": "About 60 passengers waiting, some asking about the bus.", "at": "..." }
  },
  "decision": null,
  "acknowledgements": {},
  "timeline": [...]
}
```

## Tests

```
bash live/voice/tests/run.sh
```

The last line is `ALL PASS` or `N FAILED`. Tests use a fake ElevenLabs server on `127.0.0.1`; no real network call is made.

## Console

Open `live/voice/console.html` in a browser while the relay server is running. Pass `?port=7890` if using a non-default port. The page polls every 2.5 seconds and requires no authentication (the state has no personal data).

## Rehearsal limits and status

The default roster is five people, with four reports and acknowledgements. `VOICE_ROSTER_SIZE=4` explicitly supports the original four-person rehearsal. Roles and numbers must be unique. Each process permits one rehearsal and at most nine outgoing calls. Restart only for an approved fresh run.

`GET /voice/state` exposes event status by role only. It never exposes free-text reports or incident details. The dashboard uses `GET /voice/state/authenticated` with the private `x-insiyab-view` header. Callback tools additionally require a per-call token bound to the current run, role and phase.

Completion requires all four reports, the manager’s valid choice, and all four acknowledgements. Busy, unanswered or missing callbacks remain incomplete. The illustrated dashboard playback is scripted and never initiates a call.

## Preparing the people and the agents

Build `web/team/` and share `phone-cards.html` or `call-cards.pdf` before ringing the team. Each reporting role answers one concrete check; unconfirmed facts remain unconfirmed. All four reporting roles receive one callback attempt after a valid manager decision, even if a first call was missed. Completion still requires every report and acknowledgement. A duplicate acknowledgement changes nothing. An explicitly flagged real emergency stops the normal report-to-manager sequence.

`AGENT_SPECS` in `relay.js` is the authoritative prompt source. `--setup-agents --live` updates all six agents and explicitly enables their `end_call` system tool; it does not dial. Restart the local relay to use changed orchestration code. The prepared phone cards describe fictional operating conditions, while any recorded-day statistics are separately identified.

## Repeating the team call from the dashboard

Open `/pitch/voice/`, enter the relay address, viewing key and call key once,
and choose **Save and connect**. With **Remember on this browser** checked,
the settings stay in this browser's local storage, including after a reload.
Use this on your own device; **Forget saved settings** removes the saved keys.
The site never includes these private values in its published files.

**Start team calls** starts one incident. After the reports, manager decision,
and callbacks, **Call the team again** becomes available once the provider
confirms the previous calls have ended. Each run is limited to nine outbound
attempts. Reloading or reconnecting never starts a call. An unconfirmed start
can be retried with the same request ID without dialling a second team.
The relay and public tunnel must remain running; a lost connection disables
starting calls. Manager-only sample processes cannot start full-team runs.

The dashboard posts `scenario: "default"` and a fresh `request_id`; the relay
reads `incident-example.json` as the single source of that scenario. Direct
incident clients can still post a complete incident; repeated live runs need
a unique request ID. An unresolved provider call keeps the relay locked.
