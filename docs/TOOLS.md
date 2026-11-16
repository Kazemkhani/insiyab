# Tools: what we use, what we leave, and why

The owner asked whether to bring in powerful tools he knows exist but has no time to research: a Blender plug-in, Remotion, and others. The answer is yes to a few and no to most, and the test is always the same: does it win a line on the scoring sheet (`docs/REQUIREMENTS.md`, section 4) before Wednesday 10:00?

Most of the points are for a forecast and its error, and no rendering tool earns those. But a team that meets every line and surprises nobody does not stand out, and Marsad won on a moment nobody expected. So there are two lists: the tools that earn the points, and the tools that make the moments in `docs/WOW.md`. The first list is built first.

## Use

| Tool | For | Why it earns points | Who | State on Amir's laptop |
|---|---|---|---|---|
| **Dataiku itself**: a flow of recipes, its model evaluation and its analysis by sub-population | Running the engine where RTA would run it | "Deployability" (1.3) and "multiple subsets of the data" (the slide's fourth criterion), shown in the technical partner's own tool. The most undervalued tool on this list. | Lane 1, with a person at the lab | In the browser |
| **LightGBM**, with scikit-learn's boosted trees as the fallback | The forecast | Criteria 4 and 5. The method the evidence favours for this kind of table. | Lane 1 | Not installed: `pip install lightgbm` |
| **Split conformal ranges and SHAP-style reasons** (a few lines of code, or MAPIE and shap if Dataiku has them) | A tested range on every forecast, and three reasons for it | "Explainability & Reliability" (4.3), "Novelty of Techniques" (3.1) | Lane 1 | In code |
| **deck.gl**, pinned, with no base map | Every bus moving along its real path through the day | "Effective Visualizations" (2.2). Built for exactly this: thousands of moving vehicles from timestamps. | Lane 2 | Add to `web/` |
| **Blender, run from scripts with no window** | The four figures, a bus and a stop as small 3D files | The points of view (3.3). Already proved on Bayyina: `~/dev/bayyina/twin/tools/figure.py`. | Lane 2 | Blender 5.3 installed |
| **three.js** 0.187.0 and **esbuild** 0.28.2 | The scene for the four points of view | As on Bayyina | Lane 2 | Pinned there |
| **A real browser driven by tests, on the real graphics chip** | Proof that each screen does what it claims | Every claim tested | Lanes 1, 2, 3 | Installed |
| **Open-Meteo, Dubai's open data, OpenStreetMap** | Features from public data | "Creative Use of Data & Features" (3.2) | Lane 3 | On Devin's machine |

## Use only if the cut lines above it are finished

| Tool | For | When |
|---|---|---|
| **A single-file street map shipped with the site** (PMTiles with MapLibre) | Real streets under the routes, with no outside service at run time | After lane 2's cut 3. Check the file's size and the map data's credit line first. |
| **Walking times between nearby stops from the street network** (OSMnx, or r5py with OpenStreetMap) | A true walk in minutes for each rewarded choice, in place of a straight line times a stated factor | Lane 3, on its own machine, after its cut 5. The street file for the Gulf is 245 MB: never on the laptop. |
| **Blender rendering short clips**, **Remotion** 4.0.539 and **ElevenLabs** for a voice | The four mornings as rendered clips, and an opening film of 30 to 45 seconds that hands over to the live product (`docs/WOW.md`, moment 5) | After lane 2's first four cut lines. The film opens the pitch and never replaces the product. |
| **Twilio** and a small relay on the public address | The room closing the gap on the judges' own phones, and the depot's phone ringing (`docs/WOW.md`, moments 2 and 3) | Lane 1, after the walk-through is live. The calling code is Marsad's. |
| **A model of the stop placed on the table through the phone's camera** | `docs/WOW.md`, moment 6 | Last to build, first to cut. |

## Leave

| Tool | Why not |
|---|---|
| **A Blender plug-in that lets an AI drive Blender's window** | We need the same small files built the same way every time, checked by a test. A script with no window does that. A plug-in driving a window leaves work that cannot be rebuilt or tested. |
| **A film in place of the live product** | On Marsad the score fell from 84 to 70 the day the team opened with a three-minute film. A judge said: "Is this solution working or not?" It won the day a film of under two minutes handed over to a working address. A short film that opens the pitch is in; a film that replaces the product is out. |
| **Generated video or images of people** | Google refused every request from the team's cloud project on 16 November, and that refusal is not to be worked around. Real screen recordings are stronger anyway. |
| **A traffic or city simulator** (SUMO, MATSim), **a game engine** (Unreal, Unity), **a commercial twin platform** | Days to set up and calibrate, and they model roads we have no data for. The day's own records, replayed, are a truer twin than a simulation. |
| **A chatbot or a voice assistant that answers from a language model** | Nothing on the scoring sheet rewards them, and an answer with a number the records do not hold would cost trust. The provided language model may reword a decision's reason; a check throws the wording away if it adds a number. |
| **A deep network for the forecast** | One day of data, a table of mixed features, a deadline of hours, and a judge who must trust it. The comparison is in `docs/research/research-methods.md`. |
| **A front-end framework and a component kit** | Plain files build in a second, run with the network off and are easy to test. That won twice. |

## The rule for anything not on this list

Before a worker adds a tool, it writes one line in its coordination file: which scoring line it serves, what it costs in set-up, and what is cut to make room. If it cannot name the scoring line, the answer is no.
