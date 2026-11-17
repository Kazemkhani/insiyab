# live/voice - Insiyab control-centre drill

A phone relay for one bus incident. The team acts it out on their own phones as a drill for the RTA Future Move Hackathon pitch. No real call is ever placed unless all three guards are met.

## What it does

An incident (a bus running badly late on a known route) is posted to the relay. The relay calls the driver, depot controller and station supervisor at the same time, asks each one question fitted to their role, and logs a one-sentence report from each. It then calls the duty manager with the incident, the staff reports and the available options. The manager chooses one. The relay calls the staff back with the decision and logs their acknowledgements.

Every agent prompt begins by saying this is a drill by a student team for the RTA Future Move Hackathon and that nothing said will be acted on. The agent informs and records; it instructs nobody; it never claims to be RTA. If a person reports a real emergency it tells them to call 999 and ends the call.

## Three guards before any call is placed

A real call is placed only when ALL of the following are true at run time:

1. `~/.config/insiyab/voice-numbers.txt` exists and lists at least one valid entry.
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

Roles must be exactly: `driver`, `depot`, `station`, `manager`. Example (use real numbers, never commit this file):

```
manager,Amir,+10000000001
driver,Hassan,+10000000002
depot,Fatima,+10000000003
station,Omar,+10000000004
```

The name is used by the agent to address the person. It never appears in `GET /voice/state` or the console.

## Commands

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

This creates five agents in ElevenLabs:
- `Insiyab relay: driver check`
- `Insiyab relay: depot check`
- `Insiyab relay: station check`
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
