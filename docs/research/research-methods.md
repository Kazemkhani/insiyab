# Forecasting methods and evidence for the RTA Future Move Hackathon (one day of nol and AVL data)

Prepared 16 November 2026. Every claim carries its source and URL. Each section first says what the sources say, then gives my own recommendation. Where I could not reach a primary source, I say so. "Unverified" means I found the figure only in a secondary source or a search snippet, not in the original document.

---

## 0. Facts about the data day that change what you can claim

**What sources say**

- 15 December 2025 was a **Monday**, which is a normal working day in the UAE (my check of the calendar).
- It fell **inside the school winter break** for most UAE schools. September-start schools broke up from 8 December 2025 to 4 January 2026, and Indian-curriculum (April-start) private schools in Dubai began their break on 15 December 2025, the data day itself. Source: Gulf News, 24 September 2025, https://gulfnews.com/uae/education/uae-schools-set-1-month-winter-break-dates-for-2025-26-plan-your-holiday-now-1.500281324
- Dubai buses are cashless. Passengers tap in and tap out, the reader computes the fare from the zones travelled, and failing to tap out leads to an incorrect, higher fare. Source: Gulf News, https://gulfnews.com/living-in-uae/transport/uae-dont-get-fined-how-to-use-your-nol-card-on-dubai-public-buses-1.1724761102339 . This means alighting stops are observed for most trips, which is unusual and valuable (see section 4).
- Dataiku DSS can split by a time variable ("Time ordering") instead of randomly, and offers K-fold cross-test for error margins. Its time-series forecasting cross-test trains on all data except the last chunk (the forecast horizon). Sources: https://doc.dataiku.com/dss/12/machine-learning/supervised/settings.html , https://doc.dataiku.com/dss/14/machine-learning/advanced-optimization.html , https://knowledge.dataiku.com/14/ml/complex-data/time-series/concept-time-series-forecasting.html
- Dataiku computes **subpopulation analysis** ("assess if your model behaves identically across subpopulations"), partial dependence, and Shapley or ICE individual explanations for Python-backend models. Source: https://doc.dataiku.com/dss/14/machine-learning/supervised/results.html . This maps directly onto judging criterion 4 ("performance on multiple subsets").

**My recommendation**

State on the first slide: one weekday, during school holidays for most pupils, so the demand level is probably below a term-time weekday. Do not claim the model generalises to other days. Claim only what the design tests (see 1.4).

---

## 1. What to forecast and how to validate with one day

### 1.1 What the forecasting-evaluation literature says

- **Rolling forecasting origin.** Hyndman and Athanasopoulos, *Forecasting: Principles and Practice* (3rd ed.): in time series cross-validation "the corresponding training set consists only of observations that occurred prior to the observation that forms the test set", so "no future observations can be used in constructing the forecast"; accuracy "is computed by averaging over the test sets"; the procedure "can be modified to allow multi-step errors to be used". https://otexts.com/fpp3/tscv.html and https://otexts.com/fpp3/accuracy.html
- **Tashman (2000)**, "Out-of-sample tests of forecasting accuracy: an analysis and review", *International Journal of Forecasting* 16(4): 437 to 450. Reviews series-splitting rules, fixed versus rolling origins, and single versus multiple test periods; argues that undocumented implementation choices make accuracy studies hard to replicate. https://ideas.repec.org/a/eee/intfor/v16y2000i4p437-450.html (full text not read; abstract-level).
- **Bergmeir and Benítez (2012)**, "On the use of cross-validation for time series predictor evaluation", *Information Sciences* 191: 192 to 213. Found no practical harm from cross-validation and more robust model selection; recommended a **blocked** form of cross-validation. https://research.monash.edu/en/publications/on-the-use-of-cross-validation-for-time-series-predictor-evaluati/
- **Bergmeir, Hyndman and Koo (2018)**, *Computational Statistics and Data Analysis* 120: 70 to 83. Standard K-fold is valid for purely autoregressive models **when errors are uncorrelated**. https://econpapers.repec.org/RePEc:eee:csdana:v:120:y:2018:i:c:p:70-83
- **Cerqueira, Torgo and Mozetič (2020)**, *Machine Learning* 109. For real-world series "the most accurate estimates are produced by out-of-sample methods that preserve the temporal order of observations"; cross-validation is acceptable for stationary series. https://arxiv.org/abs/1905.11744
- **Roberts et al. (2017)**, "Cross-validation strategies for data with temporal, spatial, hierarchical, or phylogenetic structure", *Ecography* 40(8): 913 to 929. Random cross-validation overstates accuracy on structured data; block by time, space or group wherever dependence exists, "even if no correlation structure is visible in the fitted model residuals"; caution that blocking can force extrapolation. https://doi.org/10.1111/ecog.02881 (abstract-level; full text request-only).
- **scikit-learn `TimeSeriesSplit`** has a `gap` parameter: "Number of samples to exclude from the end of each train set before the test set". https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.TimeSeriesSplit.html
- **Target encoding leakage.** scikit-learn: `TargetEncoder.fit_transform` uses internal cross fitting "to prevent target information from leaking"; plain `fit` "does not use any cross fitting schemes" and "can introduce data leakage". https://scikit-learn.org/stable/modules/preprocessing.html#target-encoder
- **Leakage in applied ML.** Kapoor and Narayanan (2023), *Patterns* 4: 100804, found leakage in at least 294 papers across 17 fields and give an eight-type taxonomy; in their case study, once leakage was fixed, complex ML no longer beat old logistic regression. https://pmc.ncbi.nlm.nih.gov/articles/PMC10499856

### 1.2 Candidate targets, judged against one day of data

| Target | Unit and horizon | Defensible? | Held-out design | Leakage traps specific to this target |
|---|---|---|---|---|
| A. Boardings (CKI count) | stop (or stop x route) x 15-minute bin, h = 15, 30, 60, 120 min ahead of origin t | **Yes, strongest.** Rich signal, directly actionable (frequency, bus size, crowding alerts). | Rolling origin through the day (expanding window, gap so training targets end at or before t). Plus grouped hold-out of whole communities for the spatial part. | Any tap after t; whole-day stop totals or shares as features; target encodings of stop or route fitted on the whole day; random K-fold over rows. |
| B. Boardings per route-direction or community per 15 min | aggregate levels | Yes. Less sparse; good for reconciliation. | Same rolling origin. | Same as A. |
| C. Passenger load per trip segment | trip x segment, for trips departing after t | Yes, because tap-out is observed. Directly drives right-sizing and crowding. | Blocked by trip departure time; a trip is wholly in train or wholly in test. | Using CKO taps of the test trip; using the actual vehicle of a trip that has not started yet unless the block-to-vehicle plan is known in advance. |
| D. Arrival delay k stops downstream | stop visit, k = 1, 3, 5, 10 | Yes, classic AVL problem; supports holding and reliability story. | Rolling origin; group by trip (and preferably by block, since delay carries across trips in a block). | Same trip in train and test; actual arrival times after t; features computed from the full trip. |
| E. Dwell time at next stops | stop visit | Yes, but noisy; better as an explanatory model than a headline forecast. | Group by trip, block by time. | Using boardings at the same visit (only known after the visit) as a feature for a forecast. Fine for an explanatory model, not for a forecast. |
| F. Probability a stop visit has no boarding and no alighting | stop visit, next 1 to 2 hours | Yes. Feeds request-stop or skip-stop policy. Report Brier score, log loss and calibration, not accuracy. | Group by stop and block by time. | Same as A. |

### 1.3 Leakage traps for this dataset (checklist)

1. Features that use taps or AVL records time-stamped after the forecast origin, including tap-outs of trips that were still running at t.
2. Whole-day aggregates (stop daily total, stop share of the day, route daily mean delay) used as features.
3. Target or mean encodings of stop, route, community or card fitted on all rows.
4. Random K-fold over stop-bin rows. Neighbouring bins at the same stop are strongly correlated (Roberts et al. 2017).
5. The same trip, or the same block, split across train and test for delay or load targets.
6. Scalers, imputers or peak-period definitions fitted on the full day.
7. Hyperparameters tuned on the final hold-out. The M5 organisers found that only 48.4% of teams beat the naive benchmark with the submission they chose, but 63.7% would have with their best submission: "many teams failed to choose the best method developed, probably due to misleading validation scores" (Makridakis, Spiliotis and Assimakopoulos 2022, PDF p. 13). https://statmodeling.stat.columbia.edu/wp-content/uploads/2021/10/M5_accuracy_competition.pdf
8. Using the actual vehicle assigned to a future trip (bus body id from AVL) unless that assignment is published before the day.

### 1.4 What can and cannot honestly be claimed from one day

**Can claim (if tested):**
- Forecasts of later hours of the same day from earlier hours (rolling origin, temporal generalisation within the day).
- Predictions for stops or communities the model never saw, from the rest of the network on the same day (leave-community-out, spatial generalisation).
- Stability of errors across subsets: horizon, peak versus off-peak, stop volume tier, route type, bus type, community.

**Cannot claim:**
- Day-of-week, monthly or seasonal behaviour, effects of weather, events, Ramadan, or term time. No seasonal naive benchmark ("same time last week") is possible.
- That accuracy will hold on a term-time weekday (the day was in school holidays).
- Causal effects of any policy. One day supports descriptive and predictive claims only.

**My recommendation:** say exactly this, in a box titled "What one day can and cannot prove". Judges reward honesty on criterion 4 ("reliability on unseen data").

---

## 2. Metrics

### 2.1 Definitions and pitfalls (what sources say)

Let y be the actual count and ŷ the forecast, summed over n test cells.

- **MAE** = mean |y − ŷ|. "Easy to both understand and compute" (FPP3, https://otexts.com/fpp3/accuracy.html). MAE is minimised by the **median** of the predictive distribution; Kolassa warns that optimising MAE on skewed, intermittent series biases forecasts (Kolassa 2016, *IJF* 32(3): 788 to 803, https://ideas.repec.org/a/eee/intfor/v32y2016i3p788-803.html ; slides https://zhaw.ch/storage/hochschule/forschung/kooperationen/datalab/SDS/2016/Slides/kolassa.pdf ). With sparse bins whose median is zero, a model tuned on MAE can learn to predict zero. That last inference is mine; the slides state the median and skew point.
- **RMSE** = sqrt(mean (y − ŷ)²). "Minimising the RMSE will lead to forecasts of the mean" (FPP3). Sensitive to the few busy stops.
- **MAPE** = mean |(y − ŷ)/y| x 100. Infinite or undefined when y = 0 and penalises negative errors more heavily (FPP3; Hyndman and Koehler 2006, *IJF* 22: 679 to 688, https://doi.org/10.1016/j.ijforecast.2006.03.001 ).
- **sMAPE**. Can be negative; Hyndman and Koehler "recommend that the sMAPE not be used" (FPP3).
- **MASE** = MAE on test / MAE of a naive method in the training data. Proposed by Hyndman and Koehler (2006) as the standard for comparing across series; not undefined when test actuals are zero (FPP3).
- **WAPE** (also wMAPE, MAD/Mean) = Σ|y − ŷ| / Σy. Kolassa and Schütz (2007) show it is a weighted MAPE and suited to intermittent and near-zero demand. https://ideas.repec.org/a/for/ijafaa/y2007i6p40-43.html
- **Skill score** = 1 − (score of method / score of benchmark); positive means the method beats the benchmark (FPP3, https://otexts.com/fpp3/distaccuracy.html ).
- **Interval scores.** Quantile (pinball) score, Winkler score, CRPS (FPP3, same page).
- **Testing whether one forecast is better.** Diebold and Mariano (1995), *JBES* 13: 253 to 263, with the Harvey, Leybourne and Newbold (1997) small-sample correction, as implemented in R `forecast::dm.test`. https://search.r-project.org/CRAN/refmans/forecast/html/dm.test.html

### 2.2 My recommendation on metrics

- Train count models on Poisson or Tweedie deviance, not on MAE.
- Headline metric: **WAPE** (robust to zeros, interpretable as "percentage of boardings mis-predicted"). Report MAE and RMSE alongside, as the brief requires.
- Report **MAPE only on bins with at least 5 actual boardings**, and print the share of bins and the share of boardings that this filter keeps. Say so in the table header. (The threshold of 5 is my choice; state it before testing.)
- Report **MASE** scaled by the in-sample MAE of persistence computed on the training part of the day only.
- Report **skill against the best baseline**, not against the weakest one.
- For the improvement claim, give a **block bootstrap confidence interval** of the WAPE difference, resampling forecast origins (or communities for the spatial test). A Diebold-Mariano test assumes one series; with a panel of stops, the bootstrap is simpler to defend. This is my recommendation, not a sourced standard.

### 2.3 Naive baselines that make sense here

There is no previous day, so seasonal naive is impossible. Use:

| Baseline | Definition for boardings at stop s, bin t+h |
|---|---|
| B0 Persistence | boardings in the last observed bin t |
| B1 Same-day mean | mean boardings per bin at s from the start of service to t |
| B2 Timetable-proportional | (boardings at s so far / scheduled departures at s so far) x scheduled departures at s in bin t+h, from GTFS |
| B3 Network share | stop's share of network boardings so far x network persistence (optional) |

For delay at stop k downstream:

| Baseline | Definition |
|---|---|
| D0 Timetable | delay = 0 (the schedule is the forecast) |
| D1 Persistence | current delay of the bus persists to stop k |
| D2 Same-day segment average | current delay + sum over segments of today's mean (actual minus scheduled) running time so far |

Evidence that baselines matter: in M5, only 7.5% of teams beat the best benchmark (exponential smoothing, bottom-up) and 48.4% beat the naive one (M5 paper, p. 13). In bus arrival time research, 11 of 40 reviewed studies (27.5%) compared against no other method (Reich, Budka, Robbins and Hulbert 2019, "Survey of ETA prediction methods in public transport networks", https://arxiv.org/abs/1904.05037 ).

---

## 3. Models that win on this kind of data

### 3.1 What the evidence says

- **M5 (Walmart, 42,840 hierarchical daily series).** "Most of the methods examined utilized LightGBM"; the winner averaged LightGBM models trained by "maximizing the negative log-likelihood of the Tweedie distribution", suited to "a probability mass of zero and non-negative, highly right-skewed" data; the fifth place used Poisson regression; "all top 50 performing methods in M5 utilized cross-learning" (one model across many series); simple equal-weight combinations helped; gains over benchmarks were about 40% at the top level but only about 3% at the most disaggregated levels. Makridakis, Spiliotis and Assimakopoulos (2022), *IJF* 38(4): 1346 to 1364. https://ideas.repec.org/a/eee/intfor/v38y2022i4p1346-1364.html ; PDF quoted above.
- **Bus ridership with smart-card data.** Rowe, Mahony and Tao (2022) compared random forest, XGBoost and Tweedie XGBoost for near-real-time bus ridership in Brisbane; Tweedie XGBoost was most accurate across space and time. https://arxiv.org/abs/2204.09792
- **Bus arrival time.** Reich et al. (2019): Kalman filters beat historical averages (historical methods up to 9.3% less accurate); neural networks often beat regression; shallow networks frequently matched deeper ones; no single method wins everywhere; reporting standards are too inconsistent for objective comparison. https://arxiv.org/abs/1904.05037
- **Metro passenger flow.** Several studies combine LightGBM and LSTM and report the hybrid best, while XGBoost is valued for training speed (search-level summaries; I did not read the full papers, so I treat this as weak evidence).

**My reading:** with one day, deep sequence models have far too little history per stop. A single global gradient-boosted model with a Poisson or Tweedie objective, trained across all stops and horizons, is the evidence-backed choice. Justify it against: (a) the baselines, (b) a Poisson GLM with the same features (interpretable statistical alternative), and (c) optionally an untuned random forest. Say why you did not use LSTM or graph networks: one day gives too few sequences per stop, and M5 plus the bus ETA survey give no reason to expect a gain.

### 3.2 Cheap, defensible non-standard additions (one paragraph each)

Library versions below are the latest on PyPI when I checked on 16 November 2026. Dataiku code environments may pin older versions; check `pip list` in the Dataiku code env first.

**(a) Hierarchical forecast reconciliation.** Forecast at stop x route, then make stop, route, community and network totals add up. Wickramasuriya, Athanasopoulos and Hyndman (2019), "Optimal forecast reconciliation for hierarchical and grouped time series through trace minimization", *JASA* 114(526): 804 to 819 (MinT), https://econpapers.repec.org/RePEc:taf:jnlasa:v:114:y:2019:i:526:p:804-819 . MinT needs a residual covariance matrix that the authors note is hard to estimate; with one day, use bottom-up, OLS or structural weights (`wls_struct`) and show MinT-shrink only if it helps. Nixtla's own example shows `mint_shrink` making RMSE slightly worse in one case. In M5, combining top-down and bottom-up beat both. Library: `hierarchicalforecast` 1.5.3 (`BottomUp`, `MinTrace(method="ols" | "wls_struct" | "mint_shrink")`), https://nixtlaverse.nixtla.io/hierarchicalforecast/examples/hierarchicalforecastingatscale.html.md . Why judges care: coherent numbers for planners at every level, and an accuracy gain at aggregate levels.

**(b) Conformal prediction intervals.** Split conformal gives finite-sample coverage under exchangeability; conformalised quantile regression adapts the width to each case and gave shorter intervals than competing methods on 11 datasets (Romano, Patterson and Candès 2019, NeurIPS, https://proceedings.neurips.cc/paper_files/paper/2019/file/5103c3584b063c431bd1268e9b5e76fb-Paper.pdf ). Time-ordered data breaks exchangeability; adaptive conformal inference updates the miscoverage level online and keeps long-run coverage under shift (Gibbs and Candès 2021, NeurIPS, https://proceedings.neurips.cc/paper/2021/hash/0d441de75945e5acbc865406fc9a2559-Abstract.html ). Libraries: `mapie` 1.6.0 (1.x renamed classes, for example `TimeSeriesRegressor` supporting EnbPI and ACI, https://mapie.readthedocs.io/en/stable/generated/mapie.regression.TimeSeriesRegressor.html ); `crepes` 0.9.1. Calibrate on the most recent rolling origins only. Report empirical coverage by period and horizon.

**(c) Quantile models.** LightGBM supports `objective="quantile"` with `alpha` (default 0.9), plus `poisson` and `tweedie` (`tweedie_variance_power` in [1.0, 2.0), default 1.5). https://lightgbm.readthedocs.io/en/latest/Parameters.html . Library `lightgbm` 4.7.0; `xgboost` 3.4.1 has equivalents. Use the 90th percentile of segment load for crowding alerts and right-sizing, since TCRP Report 113 stresses that "extreme values are more important than mean values" for crowding (see section 5).

**(d) Stacking a structural model with a same-day nowcast.** Direct-demand (structural) models explain stop boardings from service frequency, population and land use (Kerkman, Martens and Meurs 2015, Arnhem-Nijmegen, https://www.worldtransitresearch.info/research/5880 ; Deepa et al. 2022, Bengaluru, who treat service frequency as endogenous, https://worldtransitresearch.info/research/9217 ). Fit a structural model across stops (leave-community-out) to give each stop a prior level, then let the gradient-boosted nowcast correct it with today's taps. This gives a model that works for a new stop (structural part) and sharpens with live data (nowcast part). This is my design; the two components are separately sourced.

**(e) Zero-inflated or hurdle count models.** Many stop-bins are zero. `statsmodels` 0.15.0 provides `ZeroInflatedPoisson`, `ZeroInflatedNegativeBinomialP` and `HurdleCountModel` (https://www.statsmodels.org/stable/discretemod.html ). In practice, a Tweedie objective already handles zero mass (M5 winner). A two-part model (classifier for "any boarding" times a count model for positives) doubles as target F (empty stop visits). Use it only if it beats Tweedie on deviance.

**(f) SHAP explanations.** Shapley-value attributions: Lundberg and Lee (2017), NeurIPS, https://papers.nips.cc/paper_files/paper/2017/file/8a20a8621978632d76c43dfd28b67767-Paper.pdf ; fast exact TreeSHAP and global summaries for tree models: Lundberg et al. (2020), *Nature Machine Intelligence* 2: 56 to 67, https://scholars.mssm.edu/en/publications/from-local-explanations-to-global-understanding-with-explainable- . Library `shap` 0.54.1, or Dataiku's built-in Shapley explanations. Show one global summary plot and two local explanations (a busy interchange at evening peak; a near-empty stop).

---

## 4. From smart-card data to demand, origin-destination and load

### 4.1 What sources say

- **Trip chaining for destination inference.** Trépanier, Tranchant and Chapleau (2007), "Individual trip destination estimation in a transit smart card automated fare collection system", *Journal of Intelligent Transportation Systems* 11(1): 1 to 14, https://trid.trb.org/View/804750 : infer each boarding's alighting stop from the card's next boarding (and the first boarding of the day for the last trip). A 2019 CIRRELT paper puts typical success at around 60% to 85% of trips, https://www.cirrelt.ca/DocumentsTravail/CIRRELT-2019-47.pdf . I could not confirm a specific success rate in the 2007 paper itself.
- **Munizaga and Palma (2012)**, *Transportation Research Part C* 24: 9 to 18 (Santiago): estimated time and position of alighting "for over 80% of the boarding transactions" (a coverage rate, not an accuracy rate). https://www.worldtransitresearch.info/research/4264
- **Pelletier, Trépanier and Morency (2011)**, "Smart card data use in public transit: a literature review", *TR Part C* 19(4): 557 to 568 (journal details from my knowledge; review confirmed). https://worldtransitresearch.info/research/3711
- **Fusing fare and AVL data.** Wang, Attanucci and Wilson (2011), *Journal of Public Transportation* 14(4): 131 to 150 (London Oyster plus AVL; validated against the BODS survey), https://dspace.mit.edu/handle/1721.1/110021 ; Gordon, Koutsopoulos, Wilson and Attanucci (2013), *TRR* 2343: 17 to 24, inferred boarding and alighting times and locations from Oyster plus iBus AVL, https://worldtransitresearch.info/research/4986
- **Data-quality problems.** Benavente et al. (Santander) list "missing, redundant or erroneous entries; fragmentation of the sequences of stops that are part of a single trip", clock discrepancies, and vehicle ids that change mid-trip; they fragment AVL into clean sequences and link them to planned trip starts. https://core.ac.uk/download/489479892.pdf (search-level; I did not read the full paper). Robinson et al. (2014), "Methods for pre-processing smartcard data to improve data quality", https://www.worldtransitresearch.info/research/5381 . A Montreal thesis assigned a boarding stop to 91.7% of transactions (54% via AVL/APC, 27.2% via user habits, 10.5% via GTFS), https://publications.polymtl.ca/1628/1/2014_F%C3%A9lixL%C3%A9gar%C3%A9.pdf (search snippet).
- **Crowding is about extremes.** TCRP Report 113 suggests standards such as "no more than 5% of our customers should experience a bus whose load exceeds x passengers" and has a chapter on the distribution of crowding by trip and by passenger. Furth, Hemily, Muller and Strathman (2006), https://onlinepubs.trb.org/onlinepubs/tcrp/tcrp_rpt_113.pdf (I read the text).

### 4.2 My recommendation: how to build load profiles from this dataset

1. **Clean taps.** Drop exact duplicates; flag double taps within 60 seconds on the same device; pair CKI and CKO per card per bus body in time order.
2. **Match taps to AVL trips.** Join on bus body id, then assign each tap to the AVL trip whose time window (first departure to last arrival) contains it. Check the stop id on the tap against the AVL stop sequence.
3. **Estimate clock offset.** For each device, find the time shift (for example within ±5 minutes) that maximises the share of taps falling between the AVL arrival and departure at the tapped stop. Apply it if it clearly improves the match rate. Report the match rate before and after.
4. **Missing tap-outs.** Impute the alighting stop by trip chaining (next boarding of the same card, Trépanier et al. 2007); if no next boarding, use the distribution of observed alightings for that route, direction and boarding stop. Report the share imputed.
5. **Load.** Along each trip, load after stop i = cumulative boardings minus cumulative alightings. Flag negative loads (data error).
6. **Crowding.** Seat load factor = load / seats (from the fleet table). The fleet table has seats only, so any standing capacity is an assumption: run a sensitivity with two standing allowances and say so.
7. **Expansion.** The nol data covers card users; if the brief says some payments are not in the data, say the load is a lower bound.
8. **Report** the percentage of taps matched to an AVL trip, the percentage with an observed CKO, and the percentage imputed. Judges score documentation.

A creative but defensible feature from this step (my idea, grounded in trip chaining): the **pending-return pool** at stop s at time t, that is, cards that alighted at s earlier today and have not tapped again. It uses only data before t and should predict afternoon boardings at work and school locations.

---

## 5. From AVL to reliability measures

### 5.1 What sources say

- **On-time performance.** Common practice treats arrivals up to five minutes late (or another chosen window) as on time, and arrivals generally no more than one minute early as on time; fixed on-time measures "may not be meaningful on high frequency routes, where bunched buses could technically be counted as on-time". Sam Schwartz Engineering for TransitCenter (2019), "Elevated Standards for Bus Operations: Scheduling and Dispatching", https://transitcenter.org/wp-content/uploads/2020/05/SSE_bus_reliability_paper.pdf
- **Headway regularity.** The coefficient of variation of headways (CoV, standard deviation over mean of observed headways) is increasingly used (same source). A level-of-service scale with A at 0.00 to 0.21 and F at 0.75 or above ("most vehicles bunched") is reported in a TUM master's thesis as a schedule-adherence index, https://www.mos.ed.tum.de/fileadmin/w00ccp/vt/theses/pdf/MA/2021/MA-Weinsziehr-Aushang-Dez21.pdf . This matches the TCQSM headway-adherence exhibit as I remember it, but **I could not open the TCQSM 3rd edition (TCRP Report 165) text to verify**; the National Academies site serves page images only and the TRB PDF server refused connections.
- **Excess wait time.** Transport for London: EWT "is the average time passengers wait over and above what would have been expected if the service was running exactly as scheduled", EWT = AWT − SWT, used for routes with five or more buses an hour; low-frequency routes are judged on punctuality. TfL QSI note via FOI, https://foi.tfl.gov.uk/FOI-0143-2122/QSI%20Statistics%20Explained%20v2.0%2009.12.13.pdf (search-level quote).
- **Waiting time from AVL (TCRP Report 113).** For random arrivals, mean wait = E[H²]/(2E[H]); TCRP 113 defines **budgeted waiting time** as the 95th percentile wait and **equivalent waiting time** = 0.5 x (platform waiting + 95th-percentile waiting); ideal versus excess waiting time separates the operational component. Worked example: scheduled 8-minute headway with observed headways {4, 5, 7, 9, 10, 13} minutes gives 10.6 minutes budgeted wait, of which 3.0 minutes is excess. https://onlinepubs.trb.org/onlinepubs/tcrp/tcrp_rpt_113.pdf (read directly; the E[H²]/(2E[H]) formula is the standard result, stated from my knowledge).
- **Schedule padding (TCRP Report 113).** "A feasibility criterion of 85% means setting allowed time equal to 85th-percentile observed running time"; half-cycle time (running plus recovery) should be based on a high percentile; Tri-Met revised half-cycle times on a 95% criterion; "basing recovery times on 95th-percentile running times ... could reduce annual operating cost by an estimated $7 million"; Brussels used 95% for half-cycle time and 80th percentile minus 5 minutes for allowed time; if buses do not hold at timepoints, a low percentile (for example 40th) for timepoint departure times may be better because running early harms passengers more than running late. Same source, Chapter 4.
- **Dwell time.** Dueker, Kimpel, Strathman and Callas (2004), "Determinants of bus dwell time", *Journal of Public Transportation* 7(1): 21 to 40, used stop-level AVL/APC records and found passenger activity, lift use, low-floor buses, time of day and route type drive dwell. https://digitalcommons.usf.edu/jpt/vol7/iss1/2 . TCRP 113 lists door open and close moments as the basis for dwell analysis.
- **Holding to fix bunching.** Daganzo (2009), *TR Part B* 43(10): 913 to 921, headway-based holding needs less slack than schedule-based holding, https://econpapers.repec.org/RePEc:eee:transb:v:43:y:2009:i:10:p:913-921 ; Bartholdi and Eisenstein (2012), *TR Part B* 46(4): 481 to 491, self-equalising headways implemented on a Georgia Tech route, https://www2.isye.gatech.edu/~jjb/buses/buses.html

### 5.2 My recommendation: computations from the runtime report

- Dwell = actual departure − actual arrival; cross-check with door status; dwell with doors never opened marks a non-served stop visit (target F).
- Segment running time = arrival at stop i+1 − departure at stop i.
- Per route, direction and hour: on-time share (−1 to +5 minutes, state the window), headway CoV, EWT, bunching share (headway below 25% of scheduled headway, my threshold, state it), 85th and 95th percentile running time versus scheduled.
- **Schedule recommendation:** where 85th-percentile running time is well below scheduled, padding can be cut; where 95th percentile exceeds half-cycle, recovery is short. With one day there are few trips per route-hour; pool by time band and say how many trips each percentile rests on.

---

## 6. Evidence for the decisions the team wants to propose

### 6.a Rewards for shifting time or route

| Programme | What was measured | Cost | Design lessons | Source |
|---|---|---|---|---|
| **BART Perks** (San Francisco, 2016 to 2017, about 18,000 enrolled) | Participants cut inbound Transbay peak-hour travel by 10.9% and system peak-hour travel by 9.6%, against 0.3% for all riders; 35% of the cut persisted four months after the end | About **$10 in cash incentives per shifted morning Transbay trip; about $23 including all programme costs** | Shifts larger when the bonus hour was close to the usual departure; the random-reward game raised engagement but triggered California sweepstakes law problems; many joiners already travelled off-peak, so reward change, not existing behaviour; participants were higher-income than riders overall; too small to reduce crowding noticeably | SFCTA, "Lessons from Perks" (June 2018), https://www.sfcta.org/sites/default/files/2019-03/Lessons%20From%20Perks%20-%20Eval%20Report.pdf (read directly). Phase II with randomised withholding: https://analytics.bart.gov/sites/default/files/docs/Perks%20Phase%20II%20-%20FTA%20Final%20Report.pdf (not read) |
| **INSINC** (Singapore, from January 2012; 20,319 admitted after six months) | Share of peak trips fell by **7.49%** relative to before joining (overall); over 10% for those with at least five prior peak trips, who made over 95% of participants' peak trips; 76% of morning peak trips came from 20% of commuters | Described as cost-effective; no per-trip figure found | 87.6% chose the raffle over fixed rewards; people with friends in the scheme shifted more; game players shifted more; targeting heavy peak users is efficient | Pluntke and Prabhakar (2013), *JOURNEYS*, https://web.stanford.edu/~balaji/papers/13INSINC.pdf (read directly) |
| **Singapore free pre-peak rail and Travel Smart Journeys** | 7% to 8% fall in 08:00 to 09:00 rail peak reported after free pre-peak travel began in June 2013; in early 2026, about 8% of North East Line commuters shifted out of the 07:30 to 09:00 peak under free off-peak first rail trips; Travel Smart Journeys grew to 25,500 participants, with an 80% rebate on connecting or express bus fares | Not published | Combines free rail with bus rebates; targeted at one crowded line | LTA, March 2026, https://www.lta.gov.sg/content/ltagov/en/newsroom/2026/3/news-releases/8-percent-nel-commuters-shift-out-morning-peak-travel.html (read). 2013 figure from Railway Gazette, https://www.railwaygazette.com/free-pre-peak-metro-travel-to-continue/40910.article (secondary, unverified) |
| **Melbourne free Early Bird** (free rail before 07:00) | About 23% of Early Bird users changed travel time, by 42 minutes on average; peak demand fell 1.2% to 1.5%; demand growth outweighed it, so overloading still rose | Not found | Big response among users, small effect on the peak | Currie (2010), *TRR* 2146: 35 to 42, https://www.worldtransitresearch.info/research/3616 ; Currie (2011), https://www.worldtransitresearch.info/research/4376 (abstracts only) |
| **Hong Kong MTR Early Bird Discount** | Difference-in-differences on smart-card data: statistically significant but **small** effect, mainly earlier departures; responsiveness driven by fares and crowding | Not found | A flat discount moves few people | Anupriya et al. (2020), *TR Part A* 141: 16 to 34, https://econpapers.repec.org/RePEc:eee:transa:v:141:y:2020:i:c:p:16-34 ; Halvorsen et al., https://dspace.mit.edu/handle/1721.1/136104 . The discount rate (often quoted as 25%) is **unverified** here |
| **INSTANT** (Infosys Bengaluru, Oct 2008 to Apr 2009) | Number of commuters arriving before 08:30 doubled by the end of six months | Not found | Credits (1.5 before 08:00, 1 between 08:00 and 08:30) exchangeable in a lottery; employer-based | Stanford GSB, https://www.gsb.stanford.edu/insights/balaji-prabhakar-doesnt-anybody-care-about-traffic ; Merugu, Prabhakar and Rama (2009), NetEcon, https://www.gsb.stanford.edu/faculty-research/publications/incentive-mechanism-decongesting-roads-pilot-program-bangalore |

**My recommendation:** propose a targeted, personalised scheme, not a flat discount. Use the card-level data to find the cards that ride at the overloaded segment-hour and are near the edge of the peak. Quote BART Perks for cost per shifted trip (about $10 to $23) and INSINC for targeting. Size the shift you need from your load forecasts. Most evidence is from rail; bus-specific evidence is thin, so present it as a pilot with a control group.

### 6.b Stop consolidation and stop balancing

- **NACTO Transit Street Design Guide:** for general local service, stops about **800 ft (about 245 m)** apart; for long local-only corridors **1,200 to 1,400 ft (about 365 to 425 m)**; local services with eight or more stops per mile are prime candidates; a Portland case where a 6% to 8% increase in stop spacing gave a **5.7% travel-time reduction without affecting ridership**. https://nacto.org/publication/transit-street-design-guide/transit-system-strategies/network-strategies/from-stops-to-stations
- **El-Geneidy, Strathman, Kimpel and Crout (2006)**, *TRR* 1971 (TriMet): no significant effect on passenger activity; running times improved by nearly 6%; gain possibly limited by insufficient schedule adjustment. https://worldtransitresearch.info/research/475 (abstract-level)
- **TransitCenter "Bus Stop Balancing":** buses spend about 20% of their time at stops; SFMTA raised speeds 4.4% to 14% on routes after cutting stop density from about 6 to 2.5 per mile; 63% of Bronx workshop riders preferred fewer stops. Equity cautions: some riders walk farther; audit accessibility and amenities first; fund better amenities at retained stops; make the walk safe and comfortable. https://transitcenter.org/publication/bus-stop-balancing/
- **SFMTA hot-spot stop removals** reported up to 24% to 44% segment travel-time savings on specific routes (often combined with signal priority). https://www.sfmta.com/node/27016 (search-level)
- **Walker** discusses 400 m as a planning convention and stresses that walking distance is network distance, not a circle. https://humantransit.org/2011/04/basics-walking-distance-to-transit.html (I did not reach his full text on recommended spacing.)
- **TCQSM** stop spacing guidance: **not verified** (text not accessible).

**My recommendation:** use the data to find stop pairs closer than about 300 m on the same route where both have low boardings plus alightings (target F helps), estimate seconds saved per removed stop from observed dwell plus acceleration loss, and check with r5py (section 7) how many people lose walk access within 400 m and 500 m. In Dubai heat, every extra metre matters more (6.g), so pair consolidation with shade or AC shelters.

### 6.c Stop skipping, request stops and holding

- **Gkiotsalitis and Cats (2021)**, "At-stop control measures in public transport: literature review and research agenda", *TR Part E* 145: 102176 (CC BY): "Stop-skipping increases the inconvenience of passengers who cannot board the vehicle that skips their stop"; "Holding increases the trip's travel time and the inconvenience of onboard passengers"; stop-skipping changes which origin-destination pairs are served, so high-demand stops should never be skipped and the same stop should not be skipped by consecutive buses; and crucially, "if the travel time and passenger demand estimates are unreliable, the suggested control measures might yield a negative impact". https://doi.org/10.1016/j.tre.2020.102176 (read directly)
- **Sun and Hickman (2005)**, "The real-time stop-skipping problem", *Journal of ITS* 9(2): 91 to 109: a basic skip policy may not suit real time; a variant lets the bus still drop off in the skipped segment. https://trid.trb.org/View/756819
- **Cats, Larijani, Koutsopoulos and Burghout (2011)**, *TRR* 2216: 51 to 58 (Stockholm trunk line, BusMezzo simulation): holding based on both preceding and succeeding headways was most efficient for passenger time and fleet costs. https://trid.trb.org/View/1092546
- **Request stops:** I found no rigorous evaluation in the time available.

**My recommendation:** the strongest link to the hackathon brief is the review's sentence that control backfires when forecasts are unreliable. That turns your forecast accuracy into the enabling condition for any control policy. Propose "drop-off only" skipping on the low-demand tail of overloaded, late trips, never skip a stop with predicted boardings above a threshold, never skip the same stop twice in a row, and use calibrated probabilities from target F.

### 6.d Demand-responsive transit replacing low-demand fixed routes

- **Failure rates.** Currie and Fournier (2020), "Why most DRT/micro-transits fail", *Research in Transportation Economics* 83: 100895: DRT is failure-prone; one summary says 50% last under 7 years, 40% under 3; another cites 67% failure in the UK and that recent microtransit is most failure-prone; failure is strongly linked to higher costs. https://ideas.repec.org/a/eee/retrec/v83y2020ics0739885920300937.html (summaries disagree; check the paper before quoting a number).
- **Cost and productivity.** TransitCenter (2019): LA Metro spent **$14.50 per Via trip, about twice its average bus trip**; Sacramento microtransit peaked at **6 trips per revenue hour** against the 10 to 15 the industry calls a low-performing bus route; Oakland AC Flex carried 3 riders per revenue hour, half the bus it replaced. https://transitcenter.org/wp-content/uploads/2020/01/Microtransit-1-1.pdf (read directly)
- **Arlington, Texas.** The single MAX route carried 250 to 300 trips a day; replaced by Via on-demand in December 2017, now citywide; fares $3 to $5; the mayor put the cost at about $9 million a year; "tenfold" ridership growth is claimed by the mayor and Via, not independently audited. https://www.citylab.com/transportation/2017/11/a-bus-shunning-texas-towns-big-leap-to-microtransit/546134/ ; https://www.govtech.com/fs/arlington-texas-expands-on-demand-micro-transit-citywide.html
- **Sutton, London (GoSutton, 2019).** 12-month TfL trial with Go-Ahead and ViaVan, £3.50 flat fare, https://londonist.com/london/transport/tfl-s-new-on-demand-bus-service-launches-today . A blog reading of TfL's report gives 3.9 passengers per driver hour and says it was not continued, https://diamondgeezer.blogspot.com/2021/07/go-sutton-slide-ealing.html (secondary; official cost figures not found).
- **Dubai Bus On-Demand.** 527,000 riders in the first half of 2026 (+25.1% on H1 2025); June 2026 was the busiest month (105,990); 55 buses; 20 areas; framed as first and last-mile, complementing fixed routes, not replacing them. **No cost per trip published.** Khaleej Times, 5 August 2026, https://www.khaleejtimes.com/life-and-living/public-transport-in-uae/dubai-rta-bus-on-demand-al-satwa-al-quoz-mirdif-ridership ; 84,009 trips Feb to Sep 2020, https://www.zawya.com/en/life/dubai-passengers-take-84k-journeys-using-bus-on-demand-service-b2sfekn2

**When it works (my synthesis of the above):** very low demand per scheduled trip, dispersed origins, feeder role to a trunk or metro station, small zones, and a clear productivity target (passengers per vehicle hour) and cost cap agreed before launch. Use your data to list route segments or time bands with very low boardings per trip and many empty stop visits, and propose DRT only there, as a pilot, with the productivity threshold stated.

### 6.e Matching vehicle size to load and reallocating frequency

- **Ceder (1984)**, "Bus frequency determination using passenger count data", *TR Part A* 18(5-6): 439 to 453: two point-check methods (frequency = load at the maximum load point / desired occupancy) and two ride-check methods (using the load profile, average load = area under the profile / route length); ride checks give fuller information at higher cost. https://www.scilit.net/publications/a884413cbf5d677e106ee514a7ee25e5 ; summary https://core.ac.uk/download/212694663.pdf (secondary)
- **Furth and Wilson (1981)**, "Setting frequencies on bus routes: theory and practice", *TRR* 818: 1 to 7: a model for setting frequencies that can evaluate alternative vehicle capacities. https://trid.trb.org/View/174187 (abstract only)
- **Savings from smaller vehicles are limited** because driver wages dominate: Dallas DART states its highest cost is the operator's salary and fuel and maintenance for smaller buses are "not much different" (DART page, https://dartdev.exemplifi.io/?p=4515 , appears to be a development mirror). Labour was about 61% to 63% of US transit operating expense in 1982 to 1997 (all modes, dated), https://vtc.rutgers.edu/wp-content/uploads/2014/05/TransFin.labor_costs.pdf . Optimisation studies find a two-fleet design only slightly cheaper than one fleet, https://trid.trb.org/View/1488883 (summary-level).
- **Typical percentage savings:** **not found** from a reliable source.

**My recommendation:** with seats per bus from the fleet table and loads from section 4, compute per trip the peak seat load factor and per block the maximum over its trips. Recommend (i) frequency reallocation from trips with peak loads well below seats to overloaded trips (Ceder's max-load method), and (ii) vehicle swaps (articulated or double-deck to standard, or standard to midi) only at block level, since a bus serves many trips. Express savings in vehicle-hours and seat-kilometres, not money, unless RTA cost figures are available.

### 6.f Off-peak fare discounts on buses

- **Paulley et al. (2006)**, *Transport Policy* 13(4): 295 to 306, and TRL Report 593 (Balcombe et al. 2004): bus fare elasticity "around −0.4 in the short run, −0.56 in the medium run and −1.0 in the long run". https://eprints.whiterose.ac.uk/2034/ ; value quoted via secondary copies (Leeds KonSULT, https://its.leeds.ac.uk/projects/konsult/private/level2/instruments/instrument028/l2_028b.htm ); the TRL PDF returned 403.
- **Litman (VTPI), "Transit Price Elasticities and Cross-Elasticities", 17 June 2025:** off-peak elasticities "are typically 1.5 to 2 times higher than peak period elasticities"; APTA bus values (Pham and Linsalata 1991) for large cities: peak −0.18, off-peak −0.39, all hours −0.36; Goodwin (1992) bus −0.28 short run, −0.55 long run; Dargay and Hanly (1999) UK urban −0.2 to −0.3 short run, −0.4 to −0.6 long run; long-run elasticities are typically two to three times short-run. https://www.vtpi.org/tranelas.pdf (read directly)

**My calculation (not a source):** a 20% off-peak discount with elasticity −0.4 raises off-peak trips by about 8% but cuts off-peak fare revenue by about 14% (0.8 x 1.08 = 0.864). With peak elasticity near −0.2, a fare gap moves few peak riders, which is consistent with the small MTR effect. Frame discounts as filling empty off-peak seats, not as the main tool to cut the peak.

### 6.g Walking distance and heat

- **400 m and 800 m buffers** are the usual service-area rules for bus and rail; in Montreal the 85th-percentile walk to bus from home origins was about **524 m** (1,259 m for commuter rail), so fixed buffers underestimate catchments. El-Geneidy et al. (2014), *Transportation* 41(1): 193 to 210, https://econpapers.repec.org/RePEc:kap:transp:v:41:y:2014:i:1:p:193-210
- **Heat changes route choice:** using smartphone walking trips in summer (Boston), pedestrians accept a route about **81 m longer to avoid one 1 °C hotter (UTCI)**, with the effect likely growing at higher temperatures. Basu, Colaninno, Alhassan and Sevtsuk (2024), *Cities*, https://www.sciencedirect.com/science/article/pii/S0264275124006498 (via Streetsblog, https://usa.streetsblog.org/2025/06/25/mit-research-finds-increasing-heat-makes-cities-measurably-less-walkable ; not read in full).
- **Heat cuts transit trips:** across 11 US metros (American Time Use Survey plus NOAA), transit trips fell by nearly 50% on extreme heat days on average. Pendyala et al. (2024), *TR Part D*. https://engineering.asu.edu/news/extreme-heat-impacts-daily-routines-and-travel-patterns-study-finds/ (news release)
- **Gulf:** a Riyadh GIS study assumed 500 m walking catchments in summer and 1,500 m in winter and found large summer coverage gaps; these are assumptions, not measured walks. https://sciforum.net/paper/37091 (abstract only). Dubai has 895 shelters (many air-conditioned) at 621 locations (RTA, May 2026), https://mediaoffice.ae/en/news/2026/may/06-05/rta-conducts-field-campaign-to-verify-bus-shelter-readiness-ahead-of-summer-2026
- **Dubai-specific measured walking distances:** **not found.**

**My recommendation:** December is the mild season in Dubai, so the data day understates summer walking resistance. In any stop-consolidation proposal, test 300 m, 400 m and 500 m catchments with r5py and add a "summer penalty" sensitivity (for example halving acceptable walk distance) as an explicit assumption, citing Basu et al. and the Riyadh study.

---

## 7. Digital twins and day-replay simulation

**What sources say**

- **deck.gl TripsLayer** renders animated vehicle paths from a path array and matching timestamps, with a `currentTime` playhead. https://deck.gl/docs/api-reference/geo-layers/trips-layer . **kepler.gl trip layer** takes GeoJSON LineStrings whose coordinates carry a fourth element for time, with built-in playback. https://docs.kepler.gl/docs/user-guides/c-types-of-layers/k-trip
- **SUMO** imports GTFS with `gtfs2pt.py` (needs pandas, preferably 2.0+) onto an OSM-derived network; the network must allow buses or lines cannot be mapped. https://sumo.dlr.de/docs/Tutorials/GTFS.html ; a 2026 SUMO preprint builds a city digital twin from GTFS and OSM, https://sumo.dlr.de/preprints/pre-print-3240.pdf ; Transit-Gym builds SUMO bus simulations from GTFS, https://arxiv.org/abs/2107.00105
- **MATSim** via `pt2matsim` converts GTFS to a mapped transit schedule (Java). https://github.com/matsim-org/pt2matsim
- **r5py** computes travel-time matrices from OSM plus GTFS in Python. https://r5py.readthedocs.io/stable/ . **OpenTripPlanner 2** offers multimodal routing with a GraphQL API and GTFS-Realtime trip updates. https://docs.opentripplanner.org/en/v2.8.0/
- A Toronto MASc work built a data-driven mesoscopic bus simulation from AVL running speeds and dwell times plus GTFS. https://uttri.utoronto.ca/wp-content/uploads/sites/19/2017/09/Wen_Bo_W_20179_MASc_thesispresentation.pdf

**My recommendation (what each is good for in 24 hours)**

| Tool | Good for | 24-hour feasibility |
|---|---|---|
| deck.gl TripsLayer or kepler.gl trip layer | Replay of 15 December: scheduled (GTFS) versus actual (AVL) bus positions, coloured by forecast or observed load; side-by-side "today versus with policy" | **High** (hours). Best demo value. |
| r5py (or OTP) | What-if accessibility: jobs or population within 30 minutes, or walk access lost, before and after stop consolidation or frequency changes | **Medium to high** (a few hours with a Dubai OSM extract) |
| SUMO with gtfs2pt | Traffic-level simulation of one corridor (bus priority, holding) | **Low**; corridor only, if someone already knows SUMO |
| MATSim with pt2matsim | Agent-based whole-network demand response | **Not feasible** in 24 hours |

Call the replay a "day-replay digital twin" and be precise: it replays observed data and applies counterfactual rules (for example a re-sized vehicle or a removed stop with fixed time saving); it is not a calibrated traffic simulation.

---

## 8. What usually goes wrong in hackathon and student forecasting entries

1. **No baseline**, or only a weak one. (27.5% of bus ETA studies had no comparison, Reich et al. 2019.)
2. **Random train/test split** on time-ordered or grouped data (Roberts et al. 2017; FPP3).
3. **Future information in features**: whole-day totals, later taps, later AVL records, full-data target encodings (Kapoor and Narayanan 2023; scikit-learn TargetEncoder docs).
4. **Tuning on the test set**, then reporting that score. (M5: teams picked the wrong submission because of misleading validation.)
5. **MAPE on zero or tiny counts**, or sMAPE without caveats (Hyndman and Koehler 2006).
6. **Only one aggregate number**: no breakdown by horizon, peak, stop tier or community.
7. **Pretty dashboard, no held-out number** on the slide.
8. **Point forecasts with no uncertainty**, so operators cannot act on risk.
9. **Claims beyond the data**: "the model generalises to any day" from one day.
10. **Undocumented cleaning**: unknown match rates, dropped records, imputed tap-outs.
11. **Recommendations not tied to the model** (for example, proposing DRT without showing which segments qualify).
12. **Deep models chosen for novelty** without evidence they beat boosting on one day of data.
13. **Leaking the vehicle assignment** of future trips (bus body id from AVL).
14. **Non-reproducible notebooks**: no fixed seeds, no pinned versions, manual steps outside the Dataiku flow.

---

## My recommendation: the single design to build in 24 hours

### Design: "Structural prior plus same-day nowcast", a global Tweedie LightGBM, reconciled and with conformal intervals

**Target.** Boardings (CKI taps) per stop x route x 15-minute bin, forecast from origin t for h = 15, 30, 60 and 120 minutes ahead, using only data time-stamped at or before t. Aggregate levels (stop, route-direction, community, network) are produced by reconciliation.

**Features (all computable at t):**
- *Same-day dynamics:* boardings at the stop in the last 1, 2 and 4 bins; cumulative boardings so far; a demand index (boardings so far / boardings expected from scheduled departures so far); the same at route, community and network level.
- *Supply from GTFS:* scheduled departures at the stop in the target bin and the bins around it; scheduled headway; number of routes; transfer stops within 200 m.
- *Operations from AVL up to t:* current delay of the next bus due at the stop; whether the last two buses were bunched.
- *Trip chaining (innovation):* the pending-return pool (cards that alighted at this stop earlier today and have not tapped again).
- *Structural:* community, distance to the nearest metro station (if metro stops are in the GTFS), and external OSM points of interest within 400 m (state the extract date).
- *Calendar:* target bin time of day, horizon, minutes since service start.

**Models compared:** B0 persistence, B1 same-day mean, B2 timetable-proportional, M1 Poisson GLM (same features), M2 LightGBM Tweedie (one global model across stops and horizons), M3 = M2 plus reconciliation (bottom-up versus OLS or WLS-struct, pick on validation), M4 = M3 plus conformal intervals (ACI, 80% and 95%).

**Validation protocol (fixed before looking at test results):**
1. **Development period:** origins from 08:00 to 15:30 every 30 minutes, rolling origin with an expanding window and a gap so every training target ends at or before its origin. Tune here only.
2. **Final temporal hold-out:** origins from 16:00 to 21:30 (covers the evening peak), never touched during tuning. Retrain once at each origin with the frozen hyperparameters.
3. **Spatial hold-out:** leave-community-out GroupKFold (for example 5 folds of communities), same rolling origins, to show performance on unseen areas.
4. **Uncertainty of the improvement:** block bootstrap over origins (temporal) and over communities (spatial) for the WAPE difference against the best baseline.
5. **Explainability:** SHAP global summary and two local cases; Dataiku subpopulation analysis by bus type, route type and community.

### The evaluation table to show the judges

**Table 1. Headline accuracy on the final temporal hold-out (origins 16:00 to 21:30, all horizons pooled)**

| Model | MAE | RMSE | WAPE % | MAPE % (bins with ≥5 boardings; share kept shown in header) | MASE | Poisson deviance | Skill vs best baseline (WAPE) | 95% CI of skill |
|---|---|---|---|---|---|---|---|---|
| B0 Persistence | | | | | | | | |
| B1 Same-day mean | | | | | | | | |
| B2 Timetable-proportional | | | | | | | 0 (if best) | |
| M1 Poisson GLM | | | | | | | | |
| M2 LightGBM Tweedie | | | | | | | | |
| M3 M2 + reconciliation | | | | | | | | |

**Table 2. Accuracy by horizon and period (final hold-out; M3 versus best baseline)**

| Horizon | Period | n stop-bins | Best baseline WAPE % | M3 WAPE % | Improvement % (95% CI) | M3 MAE | 80% interval coverage % | 80% interval mean width |
|---|---|---|---|---|---|---|---|---|
| 15 min | PM peak | | | | | | | |
| 15 min | Off-peak | | | | | | | |
| 30 min | PM peak | | | | | | | |
| 30 min | Off-peak | | | | | | | |
| 60 min | PM peak | | | | | | | |
| 60 min | Off-peak | | | | | | | |
| 120 min | PM peak | | | | | | | |
| 120 min | Off-peak | | | | | | | |

Define the peak window from scheduled frequency in GTFS before testing, and state it. If the AM peak lies in the development period, report it in a separate development-period table, clearly labelled as not a final hold-out.

**Table 3. Generalisation on subsets (M3, WAPE %, with best-baseline WAPE in brackets)**

| Subset | Group | n | WAPE % (baseline) | MAE |
|---|---|---|---|---|
| Aggregation level | Stop x route / Stop / Route-direction / Community / Network | | | |
| Stop volume tier | Low / Medium / High (tiers from development period only) | | | |
| Bus type on route | Standard / Articulated / Double / Midi / Coach | | | |
| Spatial hold-out | Leave-community-out, mean ± sd over folds | | | |
| Metro feeder | Within 400 m of a metro station / Not | | | |

Report the full rows even where the model loses. A row where M3 does not beat the baseline is evidence of honest evaluation, and it tells the operator where not to rely on the model.

### Why this scores on criteria 3, 4 and 5

- **Criterion 3 (innovation):** pending-return pool from trip chaining, AVL-informed features in a demand model, structural-plus-nowcast stacking, hierarchical reconciliation, and adaptive conformal intervals. Each is sourced and cheap.
- **Criterion 4 (AI model):** model choice justified by M5 and the bus ETA survey against a GLM and baselines; strict rolling-origin and leave-community-out separation; SHAP plus Dataiku subpopulation analysis; explicit statement of what one day can prove.
- **Criterion 5 (accuracy):** MAE, RMSE and MAPE as asked, plus WAPE and MASE that behave with zeros; quantified skill with confidence intervals against the best of three baselines; results by horizon (15 to 120 minutes) and by peak.

---

## Items I could not verify (do not quote without checking)

- TCQSM 3rd edition text (on-time window, headway adherence LOS bands, stop spacing guidance): text not accessible.
- Exact Hong Kong MTR Early Bird discount rate and shift percentage.
- Success rate in Trépanier et al. (2007).
- Typical percentage savings from vehicle right-sizing.
- Cost per trip of Dubai Bus On-Demand, GoSutton and Arlington Via (only the mayor's annual figure for Arlington).
- Measured walking distances to bus stops in Dubai or other Gulf cities.
- Currie and Fournier (2020) exact failure percentages (secondary summaries disagree).
