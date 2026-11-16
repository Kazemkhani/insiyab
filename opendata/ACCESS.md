# RTA's open bus tap files: where they are and how they are fetched today

Checked on 16 November 2026, 23:40 to 23:58 Dubai time, from a computer in the UAE, with no account and no key. Everything below was fetched and read, except where it says "not confirmed".

## The short answer

1. **The dataset is still published, and it downloads with no account.** Its home is https://data.dubai/en/l/459803 ("Bus Ridership Transactions", dataset name `bus_ridership`, issued by RTA, source system ITIC, classed "Open").
2. **It is no longer one file per day.** It is the whole history, 2017 to 2026, cut into 2,093 pieces of about 141 MB each (compressed), and every piece holds a thin slice of every day. To get whole days we must read every piece: about 290 GB compressed.
3. **Monday 15 December 2025 is in it**, and so are the six weeks before it.
4. Reading one piece took 16 seconds here (about 9 MB a second). All 2,093 would take about 9 hours one at a time, or 1.5 to 2.5 hours eight at a time. Nothing needs to be kept: the program reads each piece as it arrives, keeps only the rows for the days we want, and throws the rest away.
5. The other route is the data API, which can ask for one day at a time, but it needs an API key, and a key needs an account. Steps for a person are in `coordination/lane-3.md`. We do not depend on it.

## Where it is

| What | Address | Needs an account? |
|---|---|---|
| The dataset's page | https://data.dubai/en/l/459803 | No |
| The list of files, as the page's own Download button asks for it | `https://data.dubai/o/dda/data-services/dataset-download?datasetId=459803&page=1&pageSize=100&sortDir=desc` | No. Answered 200 with no cookie and no key |
| Each file | An address on `cdn.data.dubai/files/rta/open/bus_ridership/...csv.gz`, given in that list. It is signed and stops working after 600 seconds, so ask for the list again just before each download | No |
| The portal's list of datasets | `https://data.dubai/o/c/datasets/?search=ridership` | No |
| The data API | `https://apis.data.dubai/open/rta/rta_bus_ridership-open-api` | **Yes.** Without a key it answers 401 "Unauthorized application request". The page for asking for a key (https://data.dubai/en/request-api-access-key?datasetId=459803) sends you to the login page |

The old address, https://www.dubaipulse.gov.ae/data/rta-bus/rta_bus_ridership-open, redirects to the home page of data.dubai, not to the dataset. The portal's questions page says Dubai Pulse "is no longer available for public access and has been replaced by Data.Dubai".

**The portal answers only inside the UAE.** Its questions page says: "access to the Data.Dubai portal and its related APIs is limited to users within the United Arab Emirates". So the fetch must run on a machine in the country. Lane 3 runs it on Mustafo's laptop in Dubai.

## What the portal says about accounts

From https://data.dubai/en/faqs, word for word:

- "Creating an account is not mandatory to browse, view, or download publicly available open datasets on Data.Dubai."
- "Do users need to log in, or register to view or download open datasets from the portal? No, users can view or download open datasets from the portal without logging in or registering."
- An account is needed for: "Requesting data not available on the portal", "Favoriting datasets", "Accessing confidential and/or sensitive data", "Applying for services", "Requesting an API access key to retrieve the data programmatically."

The dataset page has a picture puzzle (captcha) on two forms only: the request for API access and the feedback form. The download has none. We used no way round anything.

## Terms and licence, as stated

- The dataset's own record says licence "Not Specified" and rights "N/A".
- The portal's terms (https://data.dubai/en/terms-conditions, last update 5 February 2025) say: "All use of datasets and information classified as 'Open Data' is subject to the Open Data Licence". The licence is a PDF at https://data.dubai/documents/d/guest/open-data-license-english-1-1-pdf.
- The questions page describes it: "All data is available under 'Dubai's Open Data License' which grants users a worldwide, royalty-free, non-exclusive licence to use and modify the information in any media or technology, for both commercial and non-commercial purposes, subject to the terms and conditions of the license." And: "Open datasets and associated API access are available at no cost".
- **Not confirmed:** I did not read the PDF itself tonight. `docs/research/research-dubai.md` (A1) read an earlier draft of it, which asks for attribution (the originator's name, and a link where practicable) and bans misleading presentation. Until someone reads the current PDF, every table we make names RTA and data.dubai as the source and gives the address.
- The terms also forbid overloading the servers. The fetch runs a few downloads at a time, not hundreds.

## The fields

The first line of every file:

`end_loaction, end_zone, route_name, start_location, start_zone, txn_date, txn_subtype, txn_time, load_timestamp`

(`end_loaction` is the portal's spelling.) One row is one tap.

| Field | What it holds | Seen |
|---|---|---|
| txn_date | the day of the tap | `2025-12-15` |
| txn_time | the time, to the second | `08:57:21.000` |
| txn_subtype | check-in or check-out. **Two spellings:** `CKI` and `CKO` in rows of 2025 and 2026, `Check in` and `Check out` in older rows | |
| route_name | the route's public number | `C26`, `F23A`, `81` |
| start_location, end_loaction | stop names, not stop numbers | `Union Metro Bus Stop 1-2` |
| start_zone, end_zone | fare zone | `Zone 5` |
| load_timestamp | when the row was loaded into the portal | `2025-11-04T15:37:40.000Z` |

There is no card number, no device, no vehicle, no driver, no stop number and no fare. Nothing in it is about a person.

**Not confirmed:** what the two stop names mean on one row. In the rows I read from 2025 and 2026 both names were the same stop on check-ins and on check-outs alike, so I read them as "the stop where this tap happened". In older rows `start_location` is often empty. So a row does not seem to join a boarding to its alighting, and we will not claim journeys from it. I will count this properly when the files are read (item 5) and say so in the table's source file.

## Dates covered, and how the files are laid out

- The list holds 2,128 entries: 2,043 from a full re-load on 21 July 2026 (pieces 0001 to 2047) and small weekly additions since, the latest on 9 November 2026. Later loads re-issue the last few piece numbers; the fetch takes the newest copy of each number, which leaves 2,093 pieces.
- Each piece has a `.csv.gz` (about 141 MB; the last few are 200 to 288 MB) and a `.json.gz` twice the size with the same rows. We use the CSV.
- I read one whole piece (number 1600; 1,048,476 rows). It held rows from every year 2017 to 2026, and for 1 November to 31 December 2025 it held 24,926 rows spread over 59 of the 61 days, about 300 to 500 a day: 396 for 15 December 2025. Times 2,093 pieces that is roughly 800,000 taps a day, which is the right size for Dubai's buses. So the days are spread evenly across the pieces, not kept together.
- In that one piece 11 November and 19 December 2025 had no rows, and 12 and 13 December had 1 and 19. Whether those days are thin in the whole dataset, or only in that piece, is **not confirmed** until all pieces are read.
- The portal's record says the source updates daily; the portal's own loads have been weekly.

## How to fetch it

`python3 opendata/tools/list_files.py 459803` asks the portal for the list of files (names and sizes; it writes `files_459803.json` in the folder it is run from). Run it outside the repository. The program that reads every piece and keeps the wanted days comes with item 5; the downloaded rows stay on the fetching machine and never enter git, only the small tables of totals do.

## What this means for lane 1

- More days are available: six weeks before the organisers' day, and the organisers' day itself, as counts of taps by day, route, stop name and hour.
- The public file names stops, the provided file numbers them. The match has to go through stop names (public `start_location` against the provided `Stop_name`), and through the stop table in item 3 to reach a stop number. Route numbers should match as they are (`route_name` against `Route`). I will give the match rates I can measure from the public side with the stop table; the provided side can only be measured where that data is.
- The public file has no vehicle, so it cannot give loads on a bus. It gives demand: boardings and alightings.

## Also on the portal (found, not yet opened)

The same list answers `search=` for the other RTA datasets (stops, routes, monthly passengers by route, metro stations). They are fetched in items 3 and 7, each with its own source file.
