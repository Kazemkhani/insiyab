# Current team scripts and phone cards

The authoritative named content is `web/team/content.json`. Build it with:

```bash
.venv/bin/python web/team/build.py --out /Users/amirhosseinkazemkhani/work/insiyab-run/delivery/team
```

Send `Insiyab-team-briefing.zip` from the delivery folder. Inside it:

- `phone-cards.html`: clickable names for Amir, Sara Alrifai, Sarah Maaty, Maruf and Mustafo. Each card gives the role, prepared facts, agent question, example answer, uncertainty fallback and callback response.
- `call-cards.pdf`: overview and one page per person; `call-cards.md` is the copyable text.
- `index.html`: complete interactive briefing, five personal two-page PDFs, ten-minute rehearsal flow, Q&A and all eight live Dataiku presenter notes.
- `full-script.pdf`: the spoken presentation script and presenter notes.

These phone-role conditions are fictional demonstration inputs, not measured operating reports. Answer from the agreed card, or say unconfirmed. On the callback, repeat the decision actually heard. Amir chooses from the reports received; the system never dispatches an actual RTA vehicle.

The AI's own authoritative prompts are `AGENT_SPECS` in `live/voice/relay.js`. The clearer questions and call-ending tool were updated in the provider after the 18 November morning rehearsal. A full successful conversation loop with those revisions has not yet been demonstrated.

Before another call: all five phones available, everyone has read their own card, incoming calls enabled, and the private console connected. Check reports, the recorded manager choice and acknowledgements; ringing is not completion.
