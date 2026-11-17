# Recipe: forecast
# Loads the prepared day dict from the prepared_state folder.  Trains a GLM and a
# LightGBM boosted-trees model using rolling-origin cross-validation.  Writes
# flat tables of route-level and stop-level boardings forecasts, lateness
# forecasts, error metrics and feature importance.  Pickles the full bundle for
# the gap, decisions and publish recipes so the model is not re-trained.
import dataiku, io
from insiyab_flow import forecast, dump, load_bytes

day = load_bytes(dataiku.Folder("prepared_state").get_download_stream("day.pkl").read())

result = forecast(day, fixture=not day.get("_real", False))

dataiku.Dataset("forecast_boardings").write_with_schema(result["forecast_boardings"])
dataiku.Dataset("forecast_lateness").write_with_schema(result["forecast_lateness"])
dataiku.Dataset("model_metrics").write_with_schema(result["model_metrics"])
dataiku.Dataset("feature_importance").write_with_schema(result["feature_importance"])

dataiku.Folder("model_state").upload_stream("bundle.pkl", io.BytesIO(dump(result["_bundle"])))
