# Activity Ranking API: Spec-First Test Suite

This is a spec-first test suite for an Activity Ranking API that doesn't exist yet.
A user enters a city or town and gets a ranked list of four activities (Skiing,
Surfing, Outdoor sightseeing, Indoor sightseeing) for each of the next 7 days,
based on weather from [Open-Meteo](https://open-meteo.com/).

Because the API hasn't been built, every scenario is expected to fail. The aim is
for them to fail meaningfully: at a real check that describes the intended
behaviour (e.g. `Expected status 200 but got 501`), not with a crash or an
undefined step.

## Running the tests

You'll need Node.js (I used v26).

```bash
npm install
npm test
```

This runs all 29 scenarios (30 runs, because one Scenario Outline has two examples).
Every scenario should fail, and the summary should end with something like:

```
30 scenarios (30 failed)
217 steps (151 passed, 36 skipped, 30 failed)
```

No step should ever show as undefined, pending or ambiguous. If one does, something
in the step definitions is broken. 

### The report

After a run, open `reports/cucumber-report.html` in a browser. Under each step,
there's a short, plain-English log line saying what it faked, sent or checked
(e.g. `Checking status: expected 200, got 501`), from Cucumber's own `this.log(...)`.
After the last step, every scenario also has a summary attached: the request
(method, URL and headers, with the API key masked as `***`), the response status,
its correlation ID (or `(none)`), and the full response body as formatted JSON.
So you can see exactly what happened without re-running anything.

## Why the tests fail: a meaningful red

`src/app.ts` is a placeholder, not the real API. It returns `501 Not Implemented`
for every request.

Without it, every test would crash with "connection refused" before checking
anything, which tells you nothing. With it, every scenario reaches its own check
and fails for a clear reason, for example:

- `Expected status 300 but got 501`: a partial name should return a list of matches
- `Expected status 404 but got 501`: an unknown place should return "not found"
- `Expected a rankings response with a "days" array...`: the API should return 7 days of rankings

When the real API is built, it replaces `src/app.ts` and keeps exporting `app`.
The same tests then check real behaviour.

## My approach

1. **Understood the feature** and listed what the ticket doesn't say (see Assumptions).
2. **Explored Open-Meteo in Postman** before designing anything. What I found shaped the design:
   - A search with no matches returns 200 with no `results` field at all, not an empty list
   - `sunshine_duration` is in seconds, so the API has to convert it to hours
   - The Marine API returns `null` wave values for inland places, which is how the API
     can tell a place has no coastline
   - Coordinates snap to the nearest grid point, so tests shouldn't expect exact values
3. **Designed the API contract**, since there wasn't one.
4. **Wrote the scenarios** in Gherkin, one feature file per area.
5. **Automated them** one scenario at a time, checking each one failed for the right reason.

### Tools

| Tool | Why |
|---|---|
| Cucumber | Runs the Gherkin scenarios |
| TypeScript + tsx | Step code in TypeScript. I used tsx instead of ts-node, because ts-node crashed with the latest TypeScript |
| supertest | Calls the Express app directly, in-process, with no real server or port needed |
| nock | Fakes the three Open-Meteo services, so tests never make real network calls or depend on today's weather |
| Express | The placeholder API |

### Folder structure

```
features/
  location/   location-search.feature + its steps        (finding the place)
  ranking/    activity-rankings.feature + its steps      (shape and rules of the response)
  weather/    weather-based-ranking.feature + its steps  (rankings match the weather)
  headers/    request-headers.feature + its steps        (API key and correlation ID)
  common/     steps shared by more than one feature
              (Cucumber steps are global, so each step is defined only once)
  support/
    world.ts            per-scenario state (stores the request and response)
    hooks.ts            blocks real network calls, cleans up mocks, attaches logs to the report
    open-meteo-mock.ts  fakes for the three Open-Meteo services
    send-request.ts     builds and sends the request; every When step calls this
    config.ts           the test API key
fixtures/     a real Newquay forecast and marine response, captured from Open-Meteo
src/app.ts    the placeholder API (not the real implementation)
```

## API contract

The full contract, with every field explained, is in [docs/api-contract.md](docs/api-contract.md).

```
GET /activity-rankings?city={name}
GET /activity-rankings?locationId={id}
```

Exactly one of the two, never both. The user journey:

1. The user types "Lon", and the front end calls `?city=Lon`
2. Several places match, so the API returns a list to choose from (300)
3. The user clicks "London, England", and the front end calls `?locationId=2643743`
4. The API returns the 7-day rankings (200)

If a name matches only one place, it goes straight to step 4.

### Headers

| Header | Direction | Purpose |
|---|---|---|
| `x-api-key` | request | Required on every request. Missing or wrong: 401 |
| `X-Correlation-ID` | request | Optional. If sent, the response echoes it back |
| `X-Correlation-ID` | response | Always present: the value the client sent, or a new UUID if it didn't send one |

The API key is checked before input validation, so no key and no city still
returns 401, not 400.

| Status | When | `error` code |
|---|---|---|
| 200 | One place matches, or a valid `locationId` | – |
| 300 | Several places match | – |
| 400 | No input, both inputs, city under 2 characters, or a non-numeric `locationId` | `INVALID_INPUT` |
| 401 | Missing or invalid `x-api-key` | `UNAUTHORIZED` |
| 404 | No place matches, or an unknown `locationId` | `LOCATION_NOT_FOUND` |
| 503 | The weather or sea service is unavailable | `WEATHER_UNAVAILABLE` |

Errors look like `{ "error": "CODE", "message": "..." }`. Tests check the code exactly.
The message is only checked for being present, or for mentioning a key detail like a
place name, so rewording a message for users never breaks a test.

A 200 response looks like this (one day shown, there are always 7):

```json
{
  "location": { "id": 2643743, "name": "London", "region": "England", "country": "United Kingdom" },
  "days": [
    {
      "date": "2026-11-07",
      "weather": {
        "summary": "Drizzle",
        "minTemperatureC": 8.9, "maxTemperatureC": 11.2,
        "rainMm": 1.5, "snowfallCm": 0, "sunshineHours": 0, "maxWindSpeedKmh": 6.5,
        "maxWaveHeightM": null, "maxWavePeriodS": null
      },
      "activities": [
        { "rank": 1, "activity": "Indoor sightseeing", "suitability": "Good", "score": 70, "reasoning": "Drizzle and 11°C" }
      ]
    }
  ]
}
```

A 300 response looks like `{ "message": "...", "matches": [ { "id", "name", "region", "country" } ] }`
with 2 to 10 matches.

### Rules the API always follows

1. Always 7 consecutive days, starting today.
2. Every day has exactly 4 activities, sorted by score (highest first), each with a
   `rank` field (1 to 4) matching that order.
3. Ties are sorted alphabetically.
4. Scores are whole numbers from 0 to 100, and suitability follows the score:
   75–100 Excellent, 50–74 Good, 25–49 Fair, 0–24 Poor.
5. Every activity has a non-empty reason.
6. Fields are never missing. No rain is `0`, an unknown region is `""`.
7. Inland places have `null` wave fields, and Surfing is always rated Poor.

### How Open-Meteo fields map to ours

| Open-Meteo field | Unit | Our field |
|---|---|---|
| `temperature_2m_min` / `_max` | °C | `minTemperatureC` / `maxTemperatureC` |
| `rain_sum` | mm | `rainMm` |
| `snowfall_sum` | cm | `snowfallCm` |
| `sunshine_duration` | seconds | `sunshineHours` (÷ 3600) |
| `wind_speed_10m_max` | km/h | `maxWindSpeedKmh` |
| `weather_code` | WMO code | `summary` (in words) |
| `wave_height_max` (Marine) | m | `maxWaveHeightM` |
| `wave_period_max` (Marine) | s | `maxWavePeriodS` |

## Assumptions

### About the product

The ticket leaves some things open, so I've assumed:

1. **Partial names** return a list of matching places to choose from, rather than rankings for all of them.
2. **Suitability** is a label (Excellent, Good, Fair, Poor) plus a score from 0 to 100.
3. **Weather rules** snow and cold suit
   skiing, heavy rain suits indoor sightseeing, sunshine and mild temperatures suit outdoor sightseeing.
4. **Surfing** depends mostly on waves, so it needs Marine data as well as wind and storms.
   Roughly: 1–3 m waves with a long period are good, under 0.5 m is too flat, over 4 m is too
   dangerous, and thunderstorms or no sea data are always Poor.
5. **Names** must be at least 2 characters.
6. **If any weather service is down**, the API returns 503 and never shows rankings based on
   missing or made-up data.
7. **Authentication:** A production API is normally
   protected, so I've assumed an API key is required on every request (`x-api-key`; missing or
   wrong gives 401). I chose an API key. anyone can look up any city, so there's no session to hold a token for. A
   single shared key fits that better. The test
   suite's key comes from the `TEST_API_KEY` environment variable, falling back to a fixed default
   (see `features/support/config.ts`), so it can be swapped per environment without touching any
   test code.

### About the mocks

- **Looking up a `locationId`.** Open-Meteo's geocoding API is a name search and doesn't document
  a lookup by ID. The mocks assume the real API calls the same `/v1/search` endpoint with an `id`
  parameter (see `mockPlaceLookup` in `features/support/open-meteo-mock.ts`). If the real API does
  it differently, for example by caching the original search results, only that one helper needs
  to change. No feature file or assertion depends on it.

- **Matching fake weather to a place.** The real forecast and marine APIs are called with latitude
  and longitude, not a name. So the mocks keep a small table of approximate real coordinates for each
  place in the feature files, and match the fake responses to those coordinates. This matters because
  one scenario ("Inland places return empty wave values") sets up two places: Newquay in the
  Background and Birmingham in the scenario. Without this, the first mock would always win.

- **The Newquay fixtures are real**, captured from Open-Meteo (`fixtures/newquay-forecast.json` and
  `fixtures/newquay-marine.json`). Only the dates are rewritten at run time to the next 7 days, so
  they never look stale. The "normal week" scenarios only check general rules (sorting, scores,
  reasons, 7 days), so any realistic week works.

- **Defaults for the weather table.** Each weather scenario only lists the values that matter to it.
  Everything else defaults to a calm, dry, 12°C day with light wind (10 km/h), 6 hours of sunshine
  and no sea data (see `CALM_DEFAULTS` in `features/support/open-meteo-mock.ts`).

- **Units.** The feature tables use hours for sunshine, but Open-Meteo reports seconds. The mock
  converts hours to seconds when building the fake response, to match the real API.

## Test coverage

I focused on the scenarios that pin down the contract and the main rules. These
are the other cases I'd add next, grouped by type.

**Covered:**

- Positive: one match, several matches, choose by ID, valid API key
- Negative: no input, 1 character, non-numeric ID, no match, unknown ID, no or invalid API key
- Edge: ties, inland places, thunderstorm, no correlation ID
- Contract: 7 consecutive days, 4 activities, sorted, ranks 1 to 4, scores 0 to 100, labels match scores, reasons present, error format
- Dependencies: weather or sea service down

**Not covered yet:**

- Boundary: exactly 2 characters accepted; 10 vs 11+ matches; score label boundaries (24/25, 49/50, 74/75); skiing at exactly 0°C; waves at 0.5 m and 4 m
- Negative: both city and locationId sent; name of only spaces; zero or negative ID; wrong HTTP method (405)
- Edge: upper/lower case names; special characters (São Paulo, O'Brien); leading and trailing spaces; place with no region; places in other timezones; all four activities tied
- Contract: every weather field present; sunshine converted to hours; full JSON schema check; Content-Type is JSON
- Business rules: strong wind, very hot or cold, flat or huge waves
- Dependencies: location search service down; timeouts; broken or partial weather data
- Headers: generated correlation ID is a valid UUID; invalid correlation IDs replaced; error messages don't leak technical details
- Non-functional: response time, load testing, rate limiting (429), caching

## Trade-offs

- **One endpoint with a 300 list.** This follows the ticket closely, but the front end has to
  handle two response shapes. An alternative is two endpoints: one for search suggestions and one
  for rankings by ID. Each response would always have one shape, and requests made while the user
  types would stay light, because weather would only be fetched once they choose a place.
  I'd suggest discussing this with the team.
- **Marine down means 503.** The API never guesses, but the user gets no rankings at all, even
  for the three activities that don't need wave data. Returning partial rankings is another option.
- **Only clear-cut weather cases are tested.** The rules aren't agreed yet, so borderline cases
  (like light snow at +1°C) would just be guesses. They need agreeing with the product owner first.
- **"Today" uses the test machine's date**, not today in the place's timezone. A proper
  cross-timezone check needs a real API to compare against.
- **The tie rule is only checked when a tie actually happens** in the response.

## Not covered

- Performance and load testing
- Caching
- Rate limiting (a public endpoint should probably return 429 when overused)
- Validating the shape of a client-sent correlation ID (see Next steps)
- Exact wording of error messages and reasons, deliberately, so the real API can write its own
- Any UI. This is API-only.

## How I used AI

I used AI throughout: to talk through the problem, draft the contract and scenarios, and help verify the step definitions with AI.

I didn't take its output on trust:

- I checked the real Open-Meteo responses in Postman before relying on any assumption
- I ran scenarios as I went, and made sure each one failed for the right reason
- I read and questioned the step definitions so I could explain every one

I also changed several of its suggestions. For example:

- It first suggested skipping the Marine API. I pushed back, because surfing can't be judged without wave data, so I added it.
- The first design used two endpoints. I changed it to one, to follow the ticket more closely.
- - Authentication wasn't in the ticket. I added an API key and correlation IDs, because real APIs need them, and chose an API key over a bearer token because there's no logged-in user.
- When ts-node crashed, I read the stack trace, saw the problem was in ts-node itself, and switched to tsx.

## Next steps

With more time, I'd:

- Agree the weather rules with the product owner and add boundary scenarios
- Add a schema check that every 200 response matches the contract
- Add a GitHub Actions workflow to run the suite on every push
- Add rate-limit and performance tests
- Check "today" against the place's own timezone
- Validate client-sent correlation IDs (format and length) to protect the logs: right now
  any string sent as `X-Correlation-ID` is accepted and echoed straight back, unchecked
