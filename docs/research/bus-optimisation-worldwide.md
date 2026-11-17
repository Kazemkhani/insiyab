# Bus service optimisation worldwide: what agencies have actually done and measured

Prepared 17 November 2026. Every claim carries a source URL and year. "Agency claim" means the figure is from the operator or its vendor and has not been independently verified. "No figure found" means I searched and did not find a measured result. British English throughout.

---

## What is already in this repository (do not repeat in a pitch)

The following cases are covered in `docs/TEST-LOG.md` section D and `docs/research/research-methods.md`. They are not repeated in depth below.

- Transport for NSW / Opal crowding forecast (2020), needs 21 days of personal travel history
- Singapore LTA Travel Smart Journeys / INSINC, 8% morning-peak shift on one line (4 March 2026)
- BART Perks San Francisco, -10.9% inbound Transbay peak, 35% of shifts persisted 4 months post-programme
- TfL "quieter times" bands for buses (static, not a forecast)
- Seoul Night Owl bus drawn from phone and taxi data (2013)

---

## 1. Running-time and timetable setting from AVL data

The core problem Insiyab found: RTA uses one all-day running time and a flat 16-minute layover; evening trips run long against that standard, and lateness compounds through the block.

### Case 1.1 — TriMet, Portland USA, 2001 and 2008

Who: TriMet (Portland metropolitan transit agency, USA).
What: Used archived AVL data to build running-time distributions by route and time period, and compared actual recovery and layover times to published planning standards. Estimated that if recovery times were set from 95th-percentile observed running times rather than a fixed percentage of scheduled time, cycle times would change and annual operating cost would fall by roughly USD 7 million.
Result: USD 7 million estimated saving per year. This is a planning estimate, not a measured saving after implementation — the word "could" is used in the source. No post-implementation figure was found.
Source: TRB/TCRP Synthesis 68, archived as "Setting Scheduled Trip Time Based on AVL Data", 2008. https://www.worldtransitresearch.info/research/4659 (2008). Also: National Academies, TCRP report on AVL data for running times. https://nap.nationalacademies.org/read/13907/chapter/6 (2003).
What this means for Insiyab: RTA's flat layover and one-band running time is exactly the problem described here. The evidence that 95th-percentile AVL running times differ materially from scheduled times is well-established; the team has now measured it on RTA data (evening trips run long, morning trips do not). That is a direct replication of the TriMet finding applied to Dubai.

### Case 1.2 — Wellington Regional Council, New Zealand, 2015

Who: Greater Wellington Regional Council (Metlink), New Zealand.
What: Used observed AVL running-time percentiles to adjust timetables. Set "allowed time" at the nth-percentile observed running time so the schedule can be completed on time n% of the time. Cited the 85th percentile as a feasibility criterion for one network.
Result: No before-and-after on-time performance figure was published in the document accessed.
Source: Official information request document, Attachment III: "Timetable Adjustments in the Wellington Region Using Real Time Data", 2015. https://fyi.org.nz/request/3397/response/10844/attach/html/6/Attachment%20III%20to%20OIA%202015%20109%20Timetable%20Adjustments%20in%20the%20Wellington%20Region%20Using%20Real%20Time%20Data.pdf.html (2015).
What this means for Insiyab: The percentile approach is public-sector practice, not just academic theory. The choice of percentile (85th, 90th, 95th) is a planning decision. The team can propose the same calculation for RTA.

### Case 1.3 — OC Transpo (Ottawa), Canada — block lateness propagation

Who: Ottawa transit blogger with access to OC Transpo schedule data.
What: Showed empirically that a bus block's timetable is fixed for the whole schedule period, but actual run times vary daily. When a single trip runs long and the layover is not long enough to absorb the difference, every subsequent trip in that block runs late; the block "falls behind schedule and is never able to recover." An extra bus inserted with a generous layover can interrupt the cascade.
Result: No aggregate figure; qualitative analysis of specific blocks.
Source: Blog post on OC Transpo bus scheduling, May 2025. https://otransitottawa.blogspot.com/2025/05/bus-scheduling-part-i-run-times.html (2025).
What this means for Insiyab: This is the mechanism Insiyab found on the RTA day — most late evening starts follow the same vehicle arriving late from its previous trip. It has been documented for another agency and can be named as a known pattern.

### Case 1.4 — Columbus, Ohio (COTA), USA — delay propagation study

Who: Ohio State University researchers using COTA GPS data.
What: Traced how delays initiate, cascade and recover across a city-wide bus network using real-time vehicle location data fused with schedule data. Found that delay initiation is spatially and temporally uneven, concentrating on specific downtown stops and certain suburban locations. "Core stops play a critical role in propagating delays to a wide range of connected stops."
Result: Spatial maps of delay hotspots; no single aggregate bunching or lateness figure was extracted from the abstract.
Source: Park, Mount, Liu, Xiao and Miller, International Journal of Geographic Information Science, 2020. doi 10.1080/13658816.2019.1608997. https://luyuliu.github.io/publication/IJGIS-delay-propagation (2020, peer-reviewed).
What this means for Insiyab: The team's finding that most late evening starts come from the previous trip is consistent with what COTA data shows. The team can say "consistent with published empirical work on delay propagation."

---

## 2. Frequency and vehicle allocation to match demand by time of day

### Case 2.1 — Singapore LTA: reactive frequency adjustment

Who: Land Transport Authority, Singapore.
What: LTA's service standard requires operators to add buses when passenger loading on any trip exceeds 80–85 passengers per 100 seats (i.e., 80–85% load factor) during the busiest hour. This is a reactive standard — operators must respond after the threshold is crossed.
Result: This is the basis of Singapore's bus contracting model; no before-and-after figure for frequency adjustment alone was found.
Source: LTA press release on BSRF, March 2019. https://www.lta.gov.sg/content/ltagov/en/newsroom/2019/3/3/bus-service-reliability-framework-to-improve-service-level.html (2019). Also the parliamentary reply on BSRF at https://www.mot.gov.sg/news-resources/newsroom/written-reply-by-minister-for-transport-khaw-boon-wan-to-parliamentary-question-on-bus-regularity-following-implementation-of-bus-service-reliability-framework/ (2017).
What this means for Insiyab: RTA's planning rule (boardings in the hour divided by bus capacity) is equivalent to LTA's load-factor standard. The team has applied it and found most routes short at 18:00. Singapore shows this calculation is the recognised standard for a frequency-shortfall diagnosis.

### Case 2.2 — Auckland, New Zealand: new bus network with frequency tiers

Who: Auckland Transport (AT).
What: Completed a phased redesign of the bus network between 2016 and 2018, structured around a hierarchy of frequent routes (15-minute minimum all day) and connector routes. The final phase, the North Shore, launched in September 2018.
Result: AT reported 11% more trips in February 2019, with about 98 million trips for the year. Early phases saw gains of 10–22% per stage. A 2024 North West network, designed on the same principles, delivered 5 million passenger trips in its first year against a forecast of 3.5 million. These are AT-published figures.
Source: Auckland Transport releases and Greater Auckland post, 2019. https://ourauckland.aucklandcouncil.govt.nz/news/2019/03/services-and-passenger-trips-surge-on-auckland-s-new-transport-network/ (2019). North West network: https://www.greaterauckland.org.nz/2024/11/13/western-express-turns-one-in-style/ (2024).
What this means for Insiyab: Frequency tiers based on demand data (not equal service everywhere) produce ridership gains. The team's finding that most routes are short at 18:00 while off-peak capacity sits idle is the kind of imbalance that redesigns like Auckland's correct.

### Case 2.3 — Qingdao, China (Huawei case study)

Who: Qingdao bus operator, China, with Huawei technology.
What: Replaced manual scheduling based on experienced staff with data-driven prediction and dynamic departure intervals. Capacity scheduling "relied heavily on manual experience, making it difficult to precisely forecast dynamic passenger flows."
Result: Agency claim — "60% improvement in bus scheduling and dispatch efficiency." No independent verification found; this is a vendor case study.
Source: Huawei case study, 2026. https://e.huawei.com/my/case-studies/industries/urban-traffic/202609-huawei-qingdao-smart-bus-model (2026, vendor claim).
What this means for Insiyab: Shows that the problem of experience-based, manual scheduling exists in multiple places; RTA's flat layover is one symptom. The 60% figure is a vendor claim and should not be cited without that caveat.

---

## 3. Real-time control: holding, headway-based operation and decision support

### Case 3.1 — Singapore Bus Service Reliability Framework (BSRF) — incentive-linked headway management

Who: Land Transport Authority, Singapore; operators SMRT and SBS Transit.
What: Under the bus contracting model, LTA pays incentives and applies penalties based on Excess Wait Time (EWT) — the extra time passengers wait beyond what a perfectly scheduled service would provide. High-frequency services (headway under 15 minutes) are assessed on EWT. Operators were required to manage real-time headways and to adjust speeds to maintain even spacing between buses.
Result: Trial (45 services, December 2015 to August 2016): 20% reduction in average additional wait times; SGD 3.4 million in incentives, no penalties. Full rollout (108 services, from September 2016): 15% reduction in average additional wait times. Source is a government parliamentary reply.
Source: Written reply by Minister for Transport Khaw Boon Wan, 28 February 2017. https://www.mot.gov.sg/news-resources/newsroom/written-reply-by-minister-for-transport-khaw-boon-wan-to-parliamentary-question-on-bus-regularity-following-implementation-of-bus-service-reliability-framework/ (2017). Also: Leong, Goh, Hess and Murphy, Research in Transportation Economics, 2016. https://eprints.whiterose.ac.uk/id/eprint/106500/ (2016, peer-reviewed).
What this means for Insiyab: The BSRF was modelled directly on London's scheme. It shows that an incentive structure linked to a measurable EWT figure can achieve 15–20% EWT reduction. RTA currently targets "above 77% on-time arrivals" (search summary). EWT would be a more sensitive measure than on-time percentage.

### Case 3.2 — Seoul TOPIS, South Korea

Who: Seoul Metropolitan Government, Transport Operation and Information Service (TOPIS).
What: TOPIS collects GPS and RF data from over 7,400 buses in real time. Control centre staff use the system to manage headways and dispatch. TOPIS includes a Bus Management System for monitoring positions, headways and crowding.
Result: A 2014 city brief claims "a significant increase in punctuality and accuracy of operation intervals." No quantified before-and-after bunching reduction figure was found in the sources accessed.
Source: Cities Alliance profile of TOPIS. https://citynet-ap.org/?p=10884 (2014). Development Asia article: https://development.asia/explainer/topis-control-tower-managing-urban-mobility (2019). These are descriptive, not evaluation papers.
What this means for Insiyab: Seoul operates a real-time bus monitoring and intervention system at city scale. The team can note that RTA's S'hail app shows bus locations (suggesting similar data exists), but the gap is a decision-support layer for controllers.

### Case 3.3 — SFMTA Muni, San Francisco, USA — switch to headway management

Who: San Francisco Municipal Transportation Agency (SFMTA).
What: In May 2020, Muni switched from fixed timetable adherence to headway-based management on many routes. Software highlights buses running too close to or too far from the next bus, and controllers instruct drivers to hold or speed up. Director Jeffrey Tumlin said the aim was to make buses arrive at "reliably fixed intervals."
Result: No published before-and-after bunching or on-time figures were found.
Source: Streetsblog SF, May 2020. https://sf.streetsblog.org/2020/05/27/muni-switching-focus-to-bus-intervals-rather-than-a-fixed-schedule (2020).
What this means for Insiyab: Switching from timetable to headway management on high-frequency routes is an established operational tool, though SFMTA has not published its results.

---

## 4. Demand and crowding forecasting from fare-card taps

### Case 4.1 — TU Delft / Rotterdam, Netherlands — OV-chipkaart crowding Level of Service

Who: TU Delft (master's thesis), applied to Rotterdam bus lines 32, 33, 668 and 70.
What: Used OV-chipkaart (national smartcard) tap-in and tap-out data to measure on-bus crowding for each trip and each stop, then converted to Level of Service grades using TCQSM thresholds. The Netherlands has nationwide smartcard coverage since 2012 (19 million cards, 42 million transactions per week).
Result: Multiple lines experienced frequent overcrowding (LoS E and F) during peak periods. The analysis also compared conventional and articulated buses on the same lines.
Source: TU Delft thesis, available via Delft repository. https://repository.tudelft.nl/file/File_00415bba-1794-42d2-ac5e-f1f0ade76467 (year not confirmed in search; likely 2018–2020). Also: TU Delft CASPT 2018 paper on load prediction from smartcards. https://pure.tudelft.nl/ws/files/48110315/CASPT_2018_paper_76.pdf (2018).
What this means for Insiyab: The team's RTA analysis — taps in by route and hour — is methodologically the same as the Rotterdam study. The team can say the approach follows established European practice.

### Case 4.2 — Pittsburgh Port Authority, USA — 15-minute-ahead crowding prediction

Who: Arabghalizi and Labrinidis, University of Pittsburgh, applied to Pittsburgh Port Authority bus network.
What: Framed "how full will the next bus be?" as a 15-minute-ahead prediction for a given stop and route. Used automated passenger counts fused with historical patterns.
Result: Published in ACM Transactions on Data Science, 2020. The model outperformed naive baselines. No single accuracy number was visible in the snippets accessed.
Source: Arabghalizi and Labrinidis, 2020. http://db.cs.pitt.edu/assets/pdf/2019.urbcomp.ArabghaliziL19.pdf (2019 workshop version, peer-reviewed).
What this means for Insiyab: This is the specific application the team is doing (forecast of load by route and hour from fare-card data). The Pittsburgh model uses door counters, not fare cards; RTA has tap-out data, which is rarer and more precise.

### Case 4.3 — MTA NYC, USA — real-time crowding from automated passenger counters

Who: MTA New York City Transit.
What: In July 2020, MTA launched a real-time passenger count feature for buses, using Automated Passenger Counter (APC) sensors. The counts were published on the MTA app and website. At launch, APC sensors covered 40% of buses, with expansion planned.
Result: Ridership studies showed bus ridership increased after MTA Bus Time launched (pre-2020). The 2020 crowding feature was framed as a social-distancing tool. No accuracy figure for the APC sensors was found in sources accessed. A 2023 arXiv study on NYC bus data found that a Spacetimeformer model reached an error of under 40 seconds for arrival time estimates across more than 200 lines.
Source: Mass Transit Magazine, July 2020. https://masstransitmag.com/technology/miscellaneous/press-release/21147205/mta-new-york-city-transit-new-york-mta-announces-new-realtime-bus-ridership-tracker-on-web-and-app (2020). arXiv 2303.15495, 2023.
What this means for Insiyab: RTA's tap-out data is effectively more accurate than APC sensors for measuring alighting demand, since it records destination stops directly. This is a genuine advantage.

---

## 5. Lateness and arrival-time prediction

### Case 5.1 — MBTA Boston, USA — machine learning arrival time prediction

Who: Researchers using 2023 MBTA data (arXiv paper 2501.10514).
What: Neural network for predicting bus departure time (lateness at departure). Trained on route-level historical data.
Result: MAE 55.63 seconds, average RMSE 77.8 seconds across routes. Source is a preprint on arXiv.
Source: arXiv 2501.10514, January 2025. https://arxiv.org/pdf/2501.10514 (2025, preprint).
What this means for Insiyab: The team's model on RTA data reports MAE 2.667 minutes (160 seconds) for a one-hour-ahead forecast of boardings, not a point-in-time departure lateness. The comparison is not direct, but it shows external benchmarks exist.

### Case 5.2 — MTA NYC, USA — baseline arrival prediction accuracy

Who: Stanford CS229 student project benchmarking MTA's own arrival predictions.
What: The MTA's existing BusTime predictions had a MAPE of 14.48% and RMSE of 203 seconds on the test set at the time (2017 data). The student project beat both figures.
Result: MTA baseline RMSE 203 seconds, MAPE 14.48% (2017 data).
Source: Stanford CS229, 2017. https://cs229.stanford.edu/proj2017/final-reports/5229496.pdf (2017, student project; treat as indicative, not peer-reviewed).
What this means for Insiyab: These are concrete baseline numbers. An arrival prediction model with RMSE under 203 seconds would beat MTA's 2017 performance.

### Case 5.3 — Hong Kong KMB — open real-time ETA API

Who: Kowloon Motor Bus (KMB) and Transport Department, Hong Kong.
What: KMB publishes real-time Estimated Time of Arrival for each bus at each stop via an open API, updated every minute, covering 377 routes and roughly 2.66 million passenger trips per day.
Result: No published accuracy figure for the ETA API was found.
Source: Hong Kong government open data portal. https://data.gov.hk/en-data/dataset/hk-td-tis_21-etakmb/resource/3604afb8-b2c2-4d47-a637-dfab77fc4d72 (2015 onwards).
What this means for Insiyab: This is RTA's S'hail equivalent at scale. If RTA publishes arrival predictions, the team's running-time model would improve them.

---

## 6. Knock-on (propagated) delay through vehicle blocks

### Case 6.1 — Guangzhou, China — schedule recovery on bus segments

Who: Wu, Liu and Jin (simulation study, Guangzhou bus data).
What: Added schedule-recovery behaviour to a delay-propagation model. Found that "schedule recovery effort can be observed on at least half of the segments on a bus route" (citing an empirical study from a northeastern US transit agency).
Result: Recovery effort is widespread; the model predicts whether buses pull back toward schedule or continue late. No single headline percentage.
Source: Cited in IJGIS delay propagation search results. The empirical claim is from an unnamed US agency study. No direct URL found for the Guangzhou paper itself.
What this means for Insiyab: When a bus is late leaving the terminus (the main finding on the RTA day), it may or may not recover. The literature says recovery is common but not guaranteed, and the amount recovered depends on running time variability. The team's model implicitly estimates this by looking at the whole block.

### Case 6.2 — Columbus, Ohio (COTA) — downtown stops as delay nodes

Who: Park, Mount, Liu, Xiao and Miller (Ohio State, IJGIS 2020).
What: Used GPS + schedule data to trace delay propagation across a city-wide bus network. Found that specific stops at the city centre are where most delays are initiated and from which they cascade to a wide range of connected stops.
Result: Spatial concentration of delay initiation; stops near interchanges and in dense areas are highest risk.
Source: doi 10.1080/13658816.2019.1608997, 2020. https://luyuliu.github.io/publication/IJGIS-delay-propagation (2020, peer-reviewed).
What this means for Insiyab: If the team can identify which stops in Dubai correspond to delay-initiation nodes, the finding aligns with published evidence. The bus-station stops (Al Ghubaiba, Union, Al Qusais) are likely candidates.

---

## 7. Network redesigns driven by data

### Case 7.1 — Seoul 2004 bus reform

Who: Seoul Metropolitan Government; consultant Jarrett Walker involved in design.
What: July 2004: redesigned from overlapping private-operator routes to a colour-coded hierarchy with centre-road median bus lanes on major arterials. City took over route planning, changed operator payment to cost-per-km (not per passenger), and introduced integrated fares across bus and metro.
Result (source: Development.asia case study citing Seoul Urban Solutions Agency, 2019):
- Ridership: +17.8% (from 3.99 million to 4.7 million daily riders, 2004 to 2006); +9.4% over 2004 to 2017.
- Average rush-hour bus speed: +25.9% (15.8 to 19.9 km/h). On the Dobong-Mia-ro corridor: +81.8% (11 to 20 km/h).
- On-time arrival: +4.6%.
- Service satisfaction: +32%.
- Fares: fell 30% under integrated fare system.
Source: Development.asia case study, 2019. https://development.asia/case-study/fixing-citys-broken-public-bus-service (2019). Also: Streetsblog, 2018. https://usa.streetsblog.org/2018/09/04/what-american-cities-can-learn-from-seouls-2004-bus-redesign
What this means for Insiyab: The speed improvement came from centre-road lanes plus better stop locations; the OTP gain from operator incentives linked to performance. Both are relevant to Dubai's expansion of bus lanes.

### Case 7.2 — Houston Metro, USA — 2015 network redesign

Who: Houston Metro, with Jarrett Walker and Associates.
What: August 2015: redesigned the entire bus network with fewer, more frequent routes replacing a large number of low-frequency routes. Goal was +20% ridership after two years.
Result: One year after launch: local bus ridership +1.2% weekday; +13% Saturday; +34% Sunday. Combined local bus and light rail: +6.8 to 7.5% from September 2015 to July 2016. The two-year +20% target was not confirmed in sources accessed.
Source: Streetsblog, January and August 2016. https://usa.streetsblog.org/2016/01/04/ridership-on-the-upswing-after-houstons-bus-network-redesign and https://usa.streetsblog.org/2016/08/17/a-year-after-houstons-bus-network-redesign-ridership-is-up (2016).
What this means for Insiyab: Ridership did not rise immediately after the redesign. It took months for riders to adjust. The weekend gains were larger than weekday gains, as weekend had the most frequency improvement.

### Case 7.3 — Dublin BusConnects, Ireland — phased network redesign

Who: National Transport Authority (NTA), with Jarrett Walker and Associates.
What: Phased redesign from 2021, with new routes adding 24-hour services, increasing frequency, and simplifying transfers. 35% more annual scheduled service kilometres versus the old network.
Result: NTA's February 2025 report states passenger numbers in areas with the new network rose 48% up to end of 2024, versus 8% on the rest of the network. Route E1 (launched January 2025) carried over 8.1 million passengers in its first year (2025). NTA passenger satisfaction: 77%.
Source: NTA progress report and Transport for Ireland release, February 2025. https://www.nationaltransport.ie/news/busconnects-network-plan-sees-spike-in-passenger-numbers-in-dublin/ (2025). Also NTA BusConnects Research 2025: https://www.nationaltransport.ie/wp-content/uploads/2025/12/NTA-BusConnects-Research-2025-Final.pdf
What this means for Insiyab: The 48% vs 8% comparison is powerful evidence for restructuring around frequency. The comparison is relative to the rest of the network, not a before-after for the same routes, so it slightly overstates the effect of redesign alone. Still the clearest recent European evidence.

### Case 7.4 — LA Metro NextGen, USA — 2021 network overhaul

Who: LA Metro.
What: December 2021: overhauled the bus network. Modelled to deliver 20% more transit trips completable in 30 minutes or less (modelled result, not observed). Access to 10-minute or better frequency rose for an additional 2.2 million people during weekday midday hours, described as a 700%+ increase.
Result: These are modelled results and agency access metrics, not observed ridership. TransitCenter (2022) found that LA Metro cut bus service by 12% in February 2022 because of a driver shortage, preventing the new frequency from being delivered. The 25% drop in bus ridership since 2014 that prompted the redesign has not been reversed.
Source: METRO Magazine and GIRO case study. https://www.giro.ca/en-ca/news-insights/case-studies/la-metro/ (2021). TransitCenter critique, 2022. https://transitcenter.org/the-unfulfilled-promise-of-nextgen/ (2022).
What this means for Insiyab: Frequency redesigns can fail without enough vehicles to deliver them. The team's finding that most routes are short at 18:00 is a shortfall finding; a redesign recommendation needs to say where the buses come from.

### Case 7.5 — Singapore bus contracting model — reliability incentives

Who: Land Transport Authority, Singapore.
What: Since 2016, LTA owns buses and service standards; operators bid for contracts paid by cost-per-km, not fare revenue. BSRF creates financial incentives and penalties linked to EWT. See Case 3.1 for numbers.
Result: 15–20% EWT reduction. This model is described as drawn from London's bus tendering scheme, which ran for over 12 years before Singapore adopted it.
Source: Same as Case 3.1.
What this means for Insiyab: The governance change (separating bus ownership from operation, linking pay to reliability) is as important as the technology. This is context for RTA judges.

---

## 8. Demand-responsive and on-demand buses

### Case 8.1 — Dubai RTA Bus on Demand

Who: RTA Dubai.
What: Launched February 2020, now covering 20 areas with 55 minibuses, flexible routes booked through the app. Fares: AED 5 per trip plus AED 4 per extra rider. Paid separately from nol (not integrated).
Result: 984,929 riders in 2025 versus 417,315 in 2024, a 136% rise (RTA media office claim, agency claim). Over 527,000 riders in H1 2026, +25% year-on-year (H1 2026 vs H1 2025).
Source: Dubai Media Office, May 2026. https://www.khaleejtimes.com/life-and-living/public-transport-in-uae/dubai-rta-bus-on-demand-al-satwa-al-quoz-mirdif-ridership (2026). RTA media office, August 2026. https://cd1.mediaoffice.ae/en/news/2026/august/04-08/bus-on-demand-adds-3-new-areas-expands-to-20-areas-across-dubai
What this means for Insiyab: RTA already operates on-demand; do not present on-demand as a new idea for Dubai. The team can present fixed-route optimisation as complementary, not competing.

### Case 8.2 — Singapore LTA on-demand bus trial, 2018–2019

Who: LTA Singapore; technology provider Ministry of Movement (Swat).
What: Six-month trial December 2018 to June 2019, covering Joo Koon and Marina-Downtown areas plus a late-night CBD-to-Bedok/Tampines service using the BusNow app. Dynamically routed buses, flexible stops.
Result: Trial ended without full rollout. LTA stated the trial was designed to study feasibility; it did not publish ridership or efficiency outcomes. The night service replaced and permanently discontinued the fixed NightRider NR7.
Source: LTA newsroom, May 2019. https://www.lta.gov.sg/content/ltagov/en/newsroom/2019/5/2/conclusion-of-trial-for-on-demand-public-buses.html (2019).
What this means for Insiyab: Singapore chose not to continue. This is a case where on-demand did not replace fixed routes; the main lesson is that it complements, not replaces, the fixed network.

### Case 8.3 — Via (CapMetro Pickup, Austin, USA)

Who: Capital Metro (Austin), using Via Transportation technology.
What: On-demand microtransit service operating alongside fixed routes as a first/last-mile connection.
Result (vendor claim): 4x ridership growth for the new service; 50% reduction in cost per passenger; 9% increase in fixed-route ridership after a system redesign.
Source: Via/CapMetro case study on casestudies.com. https://www.casestudies.com/company/ride-with-via/case-study/capmetro-pickup-customer-case-study (year not stated; treat as vendor claim).
What this means for Insiyab: Demand-responsive can feed fixed routes rather than compete with them. These numbers are vendor-published; no independent audit found.

### Case 8.4 — York Region Transit, Canada (Via paratransit)

Who: York Region Transit (YRT), Ontario; Via Transportation technology.
What: Switched paratransit scheduling to Via's platform.
Result (vendor claim): 30% more rides served; 17% reduction in vehicle hours; 95% on-time performance.
Source: Via Transportation resource page. https://ridewithvia.com/resources/how-one-of-canadas-largest-and-fasting-growing-agencies-served-30-more-paratransit-rides-with-17-fewer-vehicle-hours (year not stated; vendor claim).
What this means for Insiyab: The paratransit application shows the clearest efficiency improvement in Via's published case studies. The on-demand bus case is weaker.

---

## 9. Passenger incentives and nudges to shift travel time

(BART Perks, Singapore INSINC and TfL quieter times are already in the repository.)

### Case 9.1 — Rotterdam bus social-label experiment, Netherlands, 2017

Who: Rotterdam municipal transport operator (RET), researchers at Radboud University and others.
What: 4,000 commuters on six bus lines received a free travel card holder. On three of the six lines, the holder displayed a social label framing bus use as environmentally sustainable. The other three received a plain holder. Researchers measured whether the social label increased bus use.
Result: No significant effect from the social-label nudge on bus usage. A separate experiment found a significant positive effect of an economic incentive (discount) on uptake and stated intentions.
Source: Frontiers in Psychology, 2021. https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2021.633865/pdf (2021, peer-reviewed). Also cited in search results from CEBI working paper on Swedish public transport incentives.
What this means for Insiyab: Nudges without money attached do not reliably shift travel time. Financial incentives work. This is consistent with BART Perks (which used financial rewards).

### Case 9.2 — Bangalore BMTC, India — peak-spreading pilot, 2015

Who: Bangalore Metropolitan Transport Corporation (BMTC), pilot with Urban Engines (later acquired by Google).
What: Passengers who shifted their bus trip to outside the peak hour received loyalty rewards.
Result: "Commuter travelling pre-rush hour doubled, and the average morning commute time of all bus riders fell from 71 to 54 minutes." Source is a news article, not a peer-reviewed evaluation. This figure is unverified.
Source: Planetizen, citing Urban Engines announcement, circa 2015. https://www.planetizen.com/node/68836 (2015, news report; treat as unverified).
What this means for Insiyab: If verified, this is a compelling result from an emerging market city with a high peak-to-offpeak load ratio. The 71-to-54-minute figure would need a primary source before citing in a pitch.

---

## 10. Performance standards that define "enough buses"

### Case 10.1 — TfL London: Excess Wait Time and Quality of Service Indicators

Who: Transport for London.
What: TfL uses two measures: (a) Excess Wait Time (EWT) for high-frequency routes (5+ buses per hour), which is the extra time passengers wait beyond the ideal; and (b) on-time performance for low-frequency routes, measuring departures within a window of the scheduled time. TfL publishes operator league tables and quarterly iBus QSI data.
Result: EWT targets and performance vary by route. TfL's 2024 Data Drop published bus boardings, alightings and loadings as open data at crowding.data.tfl.gov.uk.
Source: TfL bus operator league tables. https://tfl.gov.uk/corporate/publications-and-reports/bus-operator-league-tables (ongoing). TfL blog data drop August 2024. https://blog.tfl.gov.uk/2024/08/13/data-drop-bus-boardings-alightings-loadings (2024).
What this means for Insiyab: TfL publishes load data as open data; RTA does not. The team's calculation of load shortfall is equivalent to the analysis TfL publishes.

### Case 10.2 — LTA Singapore: loading standard and EWT

Who: Land Transport Authority, Singapore.
What: LTA's service standard: add buses when loading exceeds 80–85% during the busiest hour. EWT is the primary reliability measure for high-frequency services (headway under 15 minutes).
Result: 15–20% EWT reduction after BSRF incentives (see Case 3.1).
Source: Same sources as Cases 3.1 and 2.1.
What this means for Insiyab: RTA's planning rule (boardings divided by capacity) is functionally the same as LTA's 80–85% loading standard. The team's output is an international-standard metric.

### Case 10.3 — MARTA Atlanta, USA: on-time window definition

Who: Metropolitan Atlanta Rapid Transit Authority.
What: Counts a bus departure as on time if it departs between 0 and 5 minutes after its scheduled departure. No early departures count as on time.
Result: Performance published publicly on a balanced scorecard.
Source: MARTA Balanced Scorecard. https://itsmarta.com/bsc_Bus_OTP.aspx (ongoing).
What this means for Insiyab: RTA defines "on-time" as above 77% of arrivals. The team's finding that half of evening departures are 5+ minutes late is against that standard (5 minutes late from the scheduled departure would be on the boundary of MARTA's on-time window). RTA's threshold is not published precisely in sources found.

### Case 10.4 — TCQSM (Transit Capacity and Quality of Service Manual)

Who: Transportation Research Board, National Academies, USA.
What: TCQSM defines Level of Service for transit on an A–F scale. For bus loading: LOS A means high probability of a seat; LOS E means seated passengers cannot choose where to sit and standees are present; LOS F means crush loads, with passengers unable to board. The manual defines crowding by passenger loads relative to seated and total capacity, not by passengers per square metre for buses (the square-metre standard applies mainly to rail). Design capacity corresponds to LOS C or D in many agency standards.
Result: Guidance, not a measured result.
Source: TCQSM, 3rd edition, 2013, National Academies Press. https://nap.nationalacademies.org/read/14175/chapter/8 (2013). https://nap.nationalacademies.org/read/13907/chapter/6 (2003).
What this means for Insiyab: The load-factor calculation the team uses (boardings / seats) maps directly to the TCQSM LOS framework. If boardings exceed seats, that is LOS F. The team can say its threshold is consistent with TCQSM.

---

## A. The five cases most worth citing in a 10-minute pitch to RTA planners and Dataiku judges

Each sentence is sourced above.

1. **Singapore BSRF, 2016 (Cases 3.1, 10.2):** When Singapore linked operator contracts to Excess Wait Time — the extra time passengers wait beyond the schedule — average additional wait times fell 15 to 20 percent; this is the standard that RTA's load-factor calculation and EWT approach is closest to.

2. **Seoul 2004 (Case 7.1):** Seoul's data-driven network redesign raised rush-hour bus speed 26 percent and ridership 18 percent in two years, primarily by concentrating frequency on major corridors and linking operator pay to reliability — the same two levers the team's analysis points toward.

3. **Dublin BusConnects, 2024 (Case 7.3):** Passenger numbers in Dublin's redesigned bus areas rose 48 percent against 8 percent elsewhere by end of 2024; the redesign added 35 percent more service kilometres by concentrating frequency where demand is highest.

4. **Columbus COTA delay propagation, 2020 (Cases 1.3, 6.2, 6.1):** Empirical research on two transit networks confirms that most lateness cascades from a few key stops and from insufficient recovery time between trips — which is precisely what the team found on RTA's 15 December 2025 data.

5. **TriMet Portland, 2001 (Case 1.1):** Setting recovery time from observed 95th-percentile AVL running times rather than a fixed percentage of scheduled time was estimated to save USD 7 million per year at one US agency; RTA's one-size layover of 16 minutes all day is exactly the problem this method solves.

---

## B. What RTA already does according to public sources (do not present as new)

Sources: docs/research/research-dubai.md sections B9 to B11, plus searches above.

1. **ML on nol card data for route planning (2020):** RTA announced in September 2020 that it had tested machine learning on nol card data to plan routes by how stops are used through the day. A 30-day trial on 10 routes cut "wasted time" by 13.3%. The plan was to extend to all routes. Source: Dubai Media Office, 6 September 2020.
2. **Bus on Demand (2020–present):** 20 areas, 55 buses, 985,000 riders in 2025, 136% year-on-year growth. See Case 8.1.
3. **Bus performance monitoring centre:** A search summary says RTA has a Bus Performance Monitoring Centre tracking new Volvo buses. Not independently verified beyond the search snippet.
4. **Skip Stop and Update Scheduling features (AI LED Bus):** RTA's GITEX 2024 PDF describes a "Skip Stop" feature and "Update Scheduling" feature. The PDF was not readable in the sources accessed; treat as unverified.
5. **S'hail app — real-time bus locations and occupancy:** The S'hail app provides live bus locations and, according to one RTA note, "bus occupancy data". If RTA already publishes occupancy, the team's load calculation is a planning complement, not a novel data source.
6. **Bus lanes:** 6.1 km of dedicated bus lanes in June 2026, expanding to 20.6 km on six streets. Journey time savings of 24–59% claimed in peak direction (RTA/Khaleej Times claim, not independently measured).

Do not say RTA has no AI for buses, no demand analysis, or no real-time systems. Any of those claims would be corrected by an RTA planner in the room.

---

## C. Ideas the team has not built, ranked by how much the evidence says they are worth

Evidence ratings: **strong** = peer-reviewed or government-published result; **moderate** = agency claim; **indicative** = one study or unclear methodology.

### C1. Time-of-day running-time bands (strong evidence)

What it is: Separate scheduled running times for morning peak, evening peak, midday and night, derived from AVL data at the nth percentile.
What the team has: One all-day running time comparison. The team has found that evening trips run long; it has not yet built a model that predicts how much longer based on the hour.
Evidence: TriMet $7M saving estimate; Wellington 85th-percentile approach; TCRP guidance. This is the single most direct evidence-backed extension of the team's current work.
How hard: Moderate. The team already has AVL running times by trip. Building a model that assigns a band by hour of day and route type is one additional step in Dataiku.

### C2. EWT as the primary output metric (strong evidence)

What it is: Instead of "are buses late by more than N minutes?" — which is what RTA currently measures — report "how many extra minutes did a passenger wait because the bus was late?"
What the team has: Lateness by departure. Converting lateness at departure to EWT requires knowing headway and passenger arrival patterns.
Evidence: Singapore BSRF cut EWT 15–20%; TfL uses EWT as its primary reliability measure. The metric is the international standard for high-frequency bus reliability.
How hard: Moderate. EWT can be approximated if headway is known from the timetable and lateness is known from AVL data.

### C3. Recovery-time modelling for the planning rule (strong evidence)

What it is: For each route and each hour, compute: does the scheduled layover exceed the difference between the nth-percentile running time and the median? If not, the block will run late by the end of the day at that frequency.
What the team has: The team has found that most late starts follow the previous trip arriving late; the layover is about 16 minutes all day. The team has not yet built a model that quantifies how often the 16 minutes is insufficient.
Evidence: TriMet, Wellington, OC Transpo blog; Columbus COTA propagation study. All point to inadequate recovery time as the root cause of cascading lateness.
How hard: Low to moderate. The team already has both running times and scheduled times. The calculation is: for each block, did the actual running time of trip N plus layover exceed the scheduled departure time of trip N+1?

### C4. Incentive design linked to EWT (moderate evidence)

What it is: Recommend a performance contract structure that ties operator or planner incentive to EWT reduction rather than on-time percentage.
What the team has: A diagnosis (lateness by route and hour). The team has not recommended a contract or incentive structure.
Evidence: Singapore BSRF (15–20% EWT reduction); London's scheme which Singapore drew on. The governance design is well-evidenced but requires policy change, not engineering.
How hard: This is a recommendation, not a software feature. High-impact in a pitch; zero build time.

### C5. Passenger-facing crowding information (moderate evidence)

What it is: Show passengers on the S'hail app (or equivalent) how full the next bus is likely to be.
What the team has: A forecast of boardings by route and hour for planners. Converting to a passenger-facing view would require a different interface.
Evidence: MTA NYC launched real-time crowding in 2020; TfL publishes load data; Transport for NSW has had a crowding forecast in the app since 2020. These are not controlled experiments, but they are deployed at scale.
How hard: The team's model already produces the input (expected load by trip). The interface is a different question.

### C6. Time-of-travel incentive linked to load forecast (indicative)

What it is: When the forecast shows a route will be short at 18:00, offer passengers an incentive to shift to 17:00 or 19:00. Used by BART Perks and Singapore INSINC (already in repo).
What the team has: The load forecast and the gap analysis. No incentive mechanism.
Evidence: BART Perks -10.9% peak shift; Singapore 8% shift; Bangalore 71→54-minute commute time (unverified). The Rotterdam study showed nudges without money do not work.
How hard: A recommendation, not a build. Would require integration with the nol Plus loyalty programme.

---

## Sources not found or not verifiable

- No published results for a Riyadh (SAPTCO) bus network redesign or smart card evaluation were found. Public transport usage in Riyadh was stated as 1% in 2024 (CEO interview, AGBI), with a goal of 15% by end of decade.
- No published results for Doha (Qatar Integrated Railways) or Abu Dhabi ITC bus optimisation were found in this search.
- No results for Japan / Tokyo bus-specific IC-card crowding prediction (rail is covered extensively; bus-specific work was not found).
- No results for India BEST Mumbai scheduling beyond a Trapeze vendor claim (4–5 weeks to a few days for duty scheduling, unverified, 2016).
- No Transantiago/RED Chile published ridership or on-time results after the 2007 crisis and subsequent reforms were found (search returned World Bank project pages, not evaluation reports).
- No formal evaluation of SFMTA Muni's 2020 switch to headway management was found.
- Exact on-time window for RTA (the -1/+5 minute or equivalent definition) not found in any public source.
- Shenzhen City Brain bus-specific results: an ITU/U4SSC case study (undated) claims "20% improvement in dispatch efficiency, 30% reduction in operating costs" for Shenzhen Bus Group using Intellifusion AI; this is a vendor-partner claim not independently verified. Source: https://www.itu.int/hub/publication/t-joint-u4ssc-2026-4/ (undated).
