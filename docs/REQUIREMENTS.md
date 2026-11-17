# Requirements: what RTA asked for, word for word

This file overrides every other file in the repository. Every worker reads it before every task. It is transcribed from the organisers' slides and the judges' scoring sheet (photographed on 16 November 2026) and from the agenda (version 1.0). Where a photograph was partly hidden, the gap is marked.

## 1. The event

| | |
|---|---|
| Name | RTA Future Move Hackathon, November 2026 |
| Organiser | Roads and Transport Authority, Dubai (RTA coordination: PTA, AI Center and EIT; Digital Lab) |
| Technical partner | Dataiku |
| Challenge, in the agenda's words | "optimize bus services and operations for efficiency and cost-effectiveness" |
| Teams | Seven (the scoring sheet has tabs Team 1 to Team 7) |
| Prize | AED 20,000 for first place (as told to the team) |

## 2. Dates that cannot move (Dubai time)

| When | What |
|---|---|
| Mon 16 Nov, 08:00 to 14:00 | Day 1, Define: briefing, criteria, tools, dataset, access checks. Done. |
| Tue 17 Nov, 09:00 to 14:00 | Day 2, Build. 09:15 to 11:15 development sprint with RTA and Dataiku mentors. 11:15 and 11:45 to 13:15 progress checks. 13:15 to 13:45 demo preparation and mentor feedback. 13:45 pitch briefing. |
| **Wed 18 Nov, before 10:00** | **"Final files and demos to be ready before 10:00 AM on Day 3; submission details to be confirmed."** |
| Wed 18 Nov, 10:00 to 11:30 | Presentations to the judges, RTA 4IR Emerging Technology Lab |
| Fri 20 Nov, 09:15 to 09:45 | Three finalists: "7-8 Mins pitch + 2 Mins Q&A" each, Dubai Future Foundation, Emirates Towers (Dubai Future Week, Creator's HQ Auditorium). Winners announced 09:45. |

## 3. The challenge slide, word for word

> **THE CHALLENGE. Can AI Make Dubai's Bus Network More Efficient?**
> Deliver more value from every bus, every trip and every kilometre, while protecting the passenger experience.

**Your mission**

| Understand demand | Optimise service | Improve operations | Improve cost-effectiveness |
|---|---|---|---|
| Where and when passengers travel | Routes and service frequencies | Runtime and reliability patterns | Reduce avoidable operational effort |
| Demand across routes and communities | Fleet allocation and capacity use | Recurring operational inefficiencies | Identify measurable efficiencies |
| Potential supply-demand mismatches | Service levels aligned with demand | Smarter use of resources | Protect passenger service quality |

**Your data toolkit:** GTFS, NOL, Runtime, Fleet, Communities, Open Data, LLM.

**Your output:** "AI-powered prototype, analytical model or decision-support solution". EVIDENCE-BASED | MEASURABLE IMPACT | FEASIBLE | SCALABLE | PASSENGER-CENTRED.

> What should RTA change, why, and what measurable difference could it make?

> **DON'T JUST FIND PATTERNS. TURN THEM INTO DECISIONS.**

## 4. How we are scored: 100 points

Five criteria, 20 points each. The split inside each criterion is from the judges' scoring sheet, which says of itself: "Each main criterion keeps its original 20 points. The split across the 3 sub-criteria (8/6/6 or 7/7/6) is a suggested weighting, not from the original sheet".

| # | Criterion | Sub-criterion | The sheet's description | Points |
|---|---|---|---|---|
| 1 | **Practical Application** | | How well the model addresses the business problem and provides actionable insights. | 20 |
| 1.1 | | Business Problem Alignment | The model directly targets the stated business problem, with clear objectives and scope. | 8 |
| 1.2 | | Actionable Insights | Outputs translate into concrete decisions or recommendations the business can act on. | 6 |
| 1.3 | | Deployability & Scalability | The solution is realistic to implement, integrate and scale in the operational environment. | 6 |
| 2 | **Documentation and Presentation** | | Clear presentation and documentation of the approach and effective use of visualizations to explain the model's performance. | 20 |
| 2.1 | | Clarity of Documentation | Approach, data, assumptions and steps are documented clearly enough to be reproduced. | 7 |
| 2.2 | | Effective Visualizations | Charts and visuals explain model behaviour and performance accurately and simply. | 7 |
| 2.3 | | Presentation Delivery & Q&A | Well-structured, on-time delivery with confident, accurate answers to judges' questions. | 6 |
| 3 | **Innovativeness and Creativity** | | Use of innovative techniques or methodologies that demonstrate creativity in solving the forecasting problem. | 20 |
| 3.1 | | Novelty of Techniques | Uses advanced or non-standard methods or model combinations beyond a basic baseline. | 8 |
| 3.2 | | Creative Use of Data & Features | Inventive feature engineering or use of additional/external data sources. | 6 |
| 3.3 | | Originality of Solution Design | The overall concept and problem framing is distinctive and adds new value. | 6 |
| 4 | **AI Model** | | Quality of the AI model itself: how well it was chosen, built and trained, and how well it can be understood and trusted. | 20 |
| 4.1 | | Model Selection & Suitability | The chosen AI model / algorithm fits the data and the problem, and the choice is justified against alternatives. | 8 |
| 4.2 | | Data Preparation & Training | Sound data cleaning, feature preparation, training and tuning process, with proper train/test separation. | 6 |
| 4.3 | | Explainability & Reliability | The model's outputs can be explained and trusted, and it behaves reliably on new or unseen data. | 6 |
| 5 | **Forecast Accuracy** | | Measures the average magnitude of errors in the forecasted values using metrics like MAE, MAPE, RMSE. | 20 |
| 5.1 | | Error Metrics (MAE, MAPE, RMSE) | Low error values on held-out data, reported with appropriate and correctly computed metrics. | 8 |
| 5.2 | | Improvement Over Baseline | Clear, quantified accuracy gain versus a naive or existing benchmark forecast. | 6 |
| 5.3 | | Accuracy Across Forecast Horizon | Accuracy holds up for short- and longer-term horizons and at peak/critical periods. | 6 |

**One difference between the two sources.** The briefing slide names the fourth criterion "Model Stability: Evaluates the model's performance on multiple subsets of the data to ensure it generalizes well." The scoring sheet names it "AI Model". We answer both: the model is justified against alternatives and explained, and its error is reported on many subsets.

**What this means.** Sixty of the hundred points (criteria 3, 4 and 5) are about a forecasting model: its novelty, its quality and its error on held-out data. The other forty are about how "the model" serves the business problem and how its performance is shown. A product with no held-out error number cannot win.

## 5. The data toolkit, word for word

"Five datasets. One view of bus demand, supply and performance."

| Dataset | What it is | Use it to explore |
|---|---|---|
| 1. GTFS Network & Schedule Package | Planned public transport network, service patterns, timetables and geography (12 files). | Network structure, scheduled supply, frequencies, stop coverage, route geometry, transfers |
| 2. Nol Smart Card Transactions | Anonymised passenger transaction activity (15 Dec 2025). | Demand by time, route and stop; passenger flow patterns; vehicle-level demand |
| 3. Bus Runtime / AVL Report | Actual stop-level bus performance vs. the scheduled service (15 Dec 2025). | Early/late running, runtime variability, schedule adherence, reliability by time and route |
| 4. Bus Fleet & Capacity | Vehicle-level fleet attributes and passenger capacity. | Fleet mix, capacity utilisation, demand-to-vehicle matching, fleet allocation opportunities |
| 5. Dubai Community Boundaries | GIS context for connecting transport activity to Dubai communities. | Community-level demand, spatial coverage, route/community relationships, GIS mapping |

Notes on the slides: "Nol data is anonymised. Fields such as CKI, CKO and Amount should be interpreted based on the data guidance and validated in your analysis." "'RTA Standing' is marked as 'not verified' in the supplied data and should be treated accordingly." "Teams may add open data and use the provided LLM capabilities." The appendix adds: combine the provided "datasets with relevant publicly available open data and use the provided LLM capabilities to support analysis, reasoning and solution development."

The field lists are in `docs/DATA.md`.

## 6. Rules we do not yet know, and who asks

| Question | Why it matters | Who asks, when |
|---|---|---|
| May the provided data, or totals worked out from it, leave Dataiku (a laptop, GitHub, a public demo address)? | A teammate understood on day 1 that "external things are not allowed". Until this is answered, raw data stays in Dataiku and the public site runs on made-up stand-in data. | A team member, to a mentor, Tue 17 Nov 09:15 (the sprint with mentors runs 09:15 to 11:15) |
| May we use our own AI tools on the data, or only "the provided LLM capabilities"? | Same reason. | Same |
| What exactly is submitted before 10:00 on Wed, and where? | "submission details to be confirmed" | Same |
| How long is the Wednesday pitch? | The agenda gives 7 to 8 minutes plus 2 for the Friday final only. | Same |

A person writes each answer in `docs/team/MENTOR-ANSWERS.md`, with who said it and when. Lane 1 copies it into this table.

| Answer | Who said it, and when |
|---|---|
| Yes: totals worked out from the data may be shown publicly. Raw rows still never leave Dataiku, and nothing about one card, device or driver is shown. | Amir, 17 November about 18:30, answering lane 1 directly before the pitch page was deployed. He said someone had said so; the person and the time were not named, and `docs/team/MENTOR-ANSWERS.md` has no entry. Name them here when known. |

The deploy script reads the next line, and shows real totals only when it says YES and the real bundle exists. Lane 1 changes it, and only from an answer recorded in `docs/team/MENTOR-ANSWERS.md`.

TOTALS MAY LEAVE DATAIKU: YES
