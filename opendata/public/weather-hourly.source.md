# weather-hourly.csv: where it comes from

One row for each hour from 1 November 2025 00:00 to 15 December 2025 23:00, Dubai time (1,080 rows).

| Column | Meaning | Unit |
|---|---|---|
| `date`, `hour` | The hour that starts at this time, Dubai time (UTC+4) | hour 0 to 23 |
| `temperature_c` | Air temperature two metres above ground | °C |
| `rain_mm` | Rain and any other precipitation in the hour before this time | mm |
| `humidity_percent` | Relative humidity two metres above ground | % |
| `wind_kmh` | Wind speed ten metres above ground | km/h |

**Source:** Open-Meteo historical weather API, fetched 17 November 2026, no key:

`https://archive-api.open-meteo.com/v1/archive?latitude=25.2048&longitude=55.2708&start_date=2025-11-01&end_date=2025-12-15&hourly=temperature_2m,precipitation,relative_humidity_2m,wind_speed_10m&timezone=Asia%2FDubai`

The answer is for the grid point nearest the asked position: latitude 25.202108, longitude 55.302376, elevation 6 m.

**Terms:** Creative Commons Attribution 4.0 (CC BY 4.0), stated at https://open-meteo.com/en/licence , opened 17 November 2026. Credit line: "Weather data by Open-Meteo.com". The free API is for non-commercial use.

**Made by:** `python3 opendata/tools/build_features.py <raw folder>`, with the answer saved as `weather.json`. Nothing is changed but the column names and the split of time into date and hour.

**What it is not:** it is not a reading from a weather station. Open-Meteo's archive is a weather model's reconstruction on a grid, so it is one series for the whole city, and local showers can be missed. In it the 45 days hold 0.4 mm of rain over 4 hours, and 15 December 2025 is dry, 17.6 to 30.5 °C. I did not check it against the airport's station record.

**To join (lane 1):** on `date` and `hour`, where `hour` is the first two digits of the provided file's `Transaction_Time` or the open files' `txn_time`. Every stop and route gets the same weather.
