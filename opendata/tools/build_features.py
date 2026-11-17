"""Build the small feature tables of item 2 in opendata/public/ from files fetched outside git.

    python3 opendata/tools/build_features.py <raw folder>

<raw folder> holds weather.json (the Open-Meteo answer, address below) and
estimated_population_by_community.csv.gz with its .source.json (opendata/tools/fetch_dataset.py 2123655 <raw folder>).
The calendar is written from two news pages that were opened and read; the dates are in this file.
The same inputs give the same tables byte for byte.
"""
import csv, datetime, gzip, io, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "public")
WEATHER_URL = ("https://archive-api.open-meteo.com/v1/archive?latitude=25.2048&longitude=55.2708"
               "&start_date=2025-11-01&end_date=2025-12-15"
               "&hourly=temperature_2m,precipitation,relative_humidity_2m,wind_speed_10m&timezone=Asia%2FDubai")
START, END = datetime.date(2025, 11, 1), datetime.date(2025, 12, 15)
HOLIDAYS = {datetime.date(2025, 12, 1): "Eid Al Etihad (National Day) holiday",
            datetime.date(2025, 12, 2): "Eid Al Etihad (National Day) holiday"}
TERM_END = datetime.date(2025, 12, 5)        # last day of term 1
BREAK_START = datetime.date(2025, 12, 8)     # winter break, to 4 January 2026


def write(name, header, rows):
    path = os.path.join(OUT, name)
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(header)
        w.writerows(rows)
    print(name, len(rows), "rows")


def calendar():
    rows, d = [], START
    while d <= END:
        dow = d.isoweekday()                 # 1 Monday .. 7 Sunday
        weekend = dow in (6, 7)
        hol = HOLIDAYS.get(d, "")
        if d >= BREAK_START:
            school = "winter_break"
        elif weekend:
            school = "weekend"
        elif hol:
            school = "public_holiday"
        else:
            school = "term"
        working = not weekend and not hol
        rows.append([d.isoformat(), dow, d.strftime("%A"), int(weekend), int(bool(hol)), hol, int(working), school,
                     int(school == "term")])
        d += datetime.timedelta(days=1)
    write("calendar.csv", ["date", "day_of_week", "day_name", "weekend", "public_holiday", "holiday_name",
                           "working_day", "school", "school_day"], rows)


def weather(raw):
    j = json.load(open(os.path.join(raw, "weather.json")))
    h = j["hourly"]
    rows = []
    for i, t in enumerate(h["time"]):
        rows.append([t[:10], int(t[11:13]), h["temperature_2m"][i], h["precipitation"][i],
                     h["relative_humidity_2m"][i], h["wind_speed_10m"][i]])
    assert len(rows) == 45 * 24 and rows[0][0] == "2025-11-01" and rows[-1][:2] == ["2025-12-15", 23]
    assert all(v is not None for r in rows for v in r)
    write("weather-hourly.csv", ["date", "hour", "temperature_c", "rain_mm", "humidity_percent", "wind_kmh"], rows)


def population(raw):
    with gzip.open(os.path.join(raw, "estimated_population_by_community.csv.gz"), "rt", encoding="utf-8-sig") as f:
        r = list(csv.DictReader(f))
    year = max(x["Year"] for x in r)
    rows = [[x["Code"], x["Sector & Community"].strip(), x["القطاع و المنطقة"].strip(), int(x["Code"][0]), year,
             int(x["Value"] or 0)] for x in r if x["Year"] == year]
    rows.sort(key=lambda x: x[0])
    assert len({x[0] for x in rows}) == len(rows)
    write("population-by-community.csv", ["community_code", "community_name", "community_name_arabic", "sector",
                                          "year", "population"], rows)
    print("  year", year, "total", sum(x[5] for x in rows))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    calendar(); weather(sys.argv[1]); population(sys.argv[1])
