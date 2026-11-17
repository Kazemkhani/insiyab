# population-by-community.csv: where it comes from

One row for each of Dubai's 224 communities, for 2025, the latest year in the source.

| Column | Meaning |
|---|---|
| `community_code` | Dubai Municipality's three-digit community number |
| `community_name`, `community_name_arabic` | As the source spells them |
| `sector` | The first digit of the code: the planning sector, 1 to 9 |
| `year` | 2025 |
| `population` | Estimated usual residents |

**Source:** "Estimated Population by Community", Dubai Data and Statistics Establishment, on Dubai's open data portal: https://data.dubai/en/l/2123655 . Fetched 17 November 2026 with no account and no key, file `estimated_population_by_community_2026-11-16_03-22-27_0001.csv.gz`. The portal's record says the reference period is the end of the year and the table is issued once a year.

**Terms:** the portal's terms (https://data.dubai/en/terms-conditions) put all open datasets under its Open Data Licence (https://data.dubai/documents/d/guest/open-data-license-english-1-1-pdf, read 17 November 2026): free use, commercial or not; name the originator and link to the original; do not present it misleadingly; do not suggest the government is behind the work. The dataset's own licence field is empty.

**Made by:** `python3 opendata/tools/fetch_dataset.py 2123655 <raw folder>` then `python3 opendata/tools/build_features.py <raw folder>`. Only the rows of the latest year are kept (the source goes back to 2018), sorted by code. No number is changed.

**Checked:** 224 rows, each code once. The populations add to 4,580,300. I did not compare that with a published total for Dubai.

**To join (lane 1):** there is no community column in the provided file or in the open tap files, so this joins through position: a stop's latitude and longitude must be placed inside a community's outline, and the outlines are not in this table. Without outlines, the names help only by hand: many stop names begin with their community's name ("Al Nahda, Park 1"). Treat this as a feature for later.
