# Insiyab Dataiku webapp: how to create it

## What this is

A Dataiku DSS standard webapp that presents the Insiyab Flow results
to judges.  It has seven tabs matching the Flow's zones.  Every number
comes from a live dataset read by the Python backend.

## Files

| File          | Paste into                              |
|---------------|-----------------------------------------|
| `backend.py`  | Backend Python (do not add Flask app)   |
| `body.html`   | HTML (body fragment only)               |
| `style.css`   | CSS                                     |
| `script.js`   | JavaScript                              |

## Creating the webapp in Dataiku DSS

1. In your DSS project (INSIYAB), go to **Applications > Webapps**.
2. Click **+ New Webapp** then choose **Standard webapp**.
3. Name it `Insiyab`.
4. The editor has four panes: HTML, CSS, JavaScript, Backend (Python).
   Paste each file's contents into the matching pane.
5. In the Backend pane, do **not** add `app = Flask(__name__)`.
   Dataiku provides `app` automatically.
6. Save and click **Preview** (or the play button).
7. The webapp will start a Python process, load the backend routes,
   and serve the HTML.

## What each tab reads

| Tab                   | Datasets read                                              |
|-----------------------|------------------------------------------------------------|
| The day               | `punctuality_by_hour`, `demand_by_hour`                    |
| Service reliability   | `punctuality_by_route_hour`, `punctuality_by_bus_type`     |
| Passenger demand      | `demand_by_hour`, `demand_by_route_hour`, `demand_by_stop` |
| Supply and capacity   | `supply_vs_demand_by_route_hour`, `supply_status_by_hour`  |
| What if               | `supply_vs_demand_by_route_hour` (browser computation)     |
| How it is built       | static text, no dataset                                    |
| Forecast (if present) | `forecast_boardings`, `forecast_lateness`, `model_metrics`, `insights` |

## Notes

- The backend returns `{"error": "..."}` with HTTP 500 when a dataset
  is missing or empty.  The webapp shows the error message on screen,
  naming the dataset.
- The Forecast tab is hidden until at least one forecast dataset exists.
- The What if tab is labelled SIMULATED on every result.  It computes
  in the browser; no measured data is changed.
- No external network is needed.  No CDN, no web fonts.  The webapp
  works in an air-gapped Dataiku installation.
- Dataset column lists are fixed in `backend.py`; no unexpected column
  can leak into the JSON response.
