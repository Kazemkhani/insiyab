# calendar.csv: where it comes from

One row for each day from 1 November 2025 to 15 December 2025 (45 days).

| Column | Meaning |
|---|---|
| `date` | The day, year-month-day |
| `day_of_week`, `day_name` | 1 is Monday, 7 is Sunday |
| `weekend` | 1 on Saturday and Sunday, the UAE's weekend |
| `public_holiday`, `holiday_name` | 1 on 1 and 2 December 2025 |
| `working_day` | 1 when it is neither weekend nor public holiday |
| `school` | `term`, `weekend`, `public_holiday` or `winter_break` |
| `school_day` | 1 when `school` is `term` |

**Sources, both opened and read on 17 November 2026:**

- Public holiday: Khaleej Times, published 13 November 2026, https://www.khaleejtimes.com/uae/uae-2-day-national-day-break-private-sector-employees-eid-al-etihad . It says: "National Day holidays in 2025 were initially scheduled for December 2 and 3 (Tuesday and Wednesday), but were officially moved to December 1 and 2 (Monday and Tuesday). This resulted in a longer break for residents who follow the Saturday–Sunday weekend, giving them time off from November 29 to December 2."
- School terms: Khaleej Times, https://www.khaleejtimes.com/uae/schools-and-parents/uae-2025-2026-academic-calendar-schools-universities-students-parents-educators . It says: "The first term will end on December 5, 2025 with schools resuming for the second term on January, 5 2026" and "the winter holidays will run from December 8, 2025, to January 4, 2026".
- The government's own holiday page, https://u.ae/en/information-and-services/public-holidays-and-religious-affairs/public-holidays , opened the same day, lists "National Day - 2 and 3 December (2 days)" as the standing rule and gives no dates for 2025.

**Terms:** these are dates, which are facts; the wording quoted above belongs to Khaleej Times and is quoted to show the source. No file was copied.

**Made by:** `python3 opendata/tools/build_features.py <raw folder>`. The dates are written in that file.

**Not confirmed:**

- The official 2025 announcement itself (the ministry's or the news agency's page) was not opened. The dates come from a newspaper's later account.
- Dubai's school regulator's own calendar (web.khda.gov.ae) refused an automatic reader, so it was not read.
- Schools that start their year in April (mostly Indian-curriculum) are said to have begun their winter break on 15 December 2025, not 8 December. That comes from a search summary in `docs/research/research-dubai.md` and no page was opened. If it is right, `school_day` is wrong for those schools from 8 to 12 December. On 15 December itself both calendars agree: no school.
- 30 November 2025 (Commemoration Day) fell on a Sunday and is not marked as a holiday here.

**To join (lane 1):** on the day: `date` equals the provided file's `Transaction_date` and the open tap files' `txn_date`. 15 December 2025 is a working Monday with no school. In the six weeks before, the working Mondays are 3, 10, 17 and 24 November (school in term) and 8 December (working, no school): 8 December is the closest match.
