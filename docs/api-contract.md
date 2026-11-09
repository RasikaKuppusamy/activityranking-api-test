# API contract: Activity Rankings

This is the full, detailed contract this test suite checks. It matches the
feature files under `features/` exactly; the README's "API contract" section
is a short summary of this page.

## Endpoint

```
GET /activity-rankings
```

Exactly one of these two query parameters must be given, never both and
never neither:

| Parameter | Type | Example | Notes |
|---|---|---|---|
| `city` | string | `city=Londonderry` | At least 2 characters |
| `locationId` | integer | `locationId=2643743` | The id of a place returned by an earlier search |

Sending both, sending neither, a `city` under 2 characters, or a
non-numeric `locationId`, is a 400 (`INVALID_INPUT`).

## Headers

| Header | Direction | Purpose |
|---|---|---|
| `x-api-key` | request | Required on every request. Missing or wrong: 401 (`UNAUTHORIZED`) |
| `X-Correlation-ID` | request | Optional. Any string. If sent, the response echoes it back unchanged |
| `X-Correlation-ID` | response | Always present: the value the client sent, or a new UUID the API generated if it didn't send one |

The API key is checked before input validation, so a request with no key and
no city is still a 401, not a 400.

Example request headers:

```
x-api-key: your-api-key
X-Correlation-ID: 3fa85f64-5717-4562-b3fc-2c963f66afa6
```

## Status codes

| Status | When | `error` code | Example message |
|---|---|---|---|
| 200 | One place matches, or a valid `locationId` | n/a | n/a |
| 300 | Several places match | n/a | n/a |
| 400 | No input, both inputs, city under 2 characters, or a non-numeric `locationId` | `INVALID_INPUT` | "Please provide a city name of at least 2 characters, or a locationId." |
| 401 | Missing or invalid `x-api-key` | `UNAUTHORIZED` | "A valid API key is required." |
| 404 | No place matches, or an unknown `locationId` | `LOCATION_NOT_FOUND` | "No place called \"Zzzzzz\" was found." |
| 503 | The weather or sea service is unavailable | `WEATHER_UNAVAILABLE` | "The weather service is temporarily unavailable. Please try again shortly." |

The example messages above are illustrative only. The tests check the
`error` code exactly, and only check that the message is present, or that it
mentions a key detail (like the place name): the real implementation is free
to word these however it likes.

## Example responses

### 200: one place matched

One day is shown below; a real response always has 7, all with the same shape.

```json
{
  "location": { "id": 2643743, "name": "London", "region": "England", "country": "United Kingdom" },
  "days": [
    {
      "date": "2026-11-07",
      "weather": {
        "summary": "Drizzle",
        "minTemperatureC": 8.9,
        "maxTemperatureC": 11.2,
        "rainMm": 1.5,
        "snowfallCm": 0,
        "sunshineHours": 0,
        "maxWindSpeedKmh": 6.5,
        "maxWaveHeightM": null,
        "maxWavePeriodS": null
      },
      "activities": [
        { "rank": 1, "activity": "Indoor sightseeing", "suitability": "Good", "score": 70, "reasoning": "Drizzle and 11°C make indoor activities the comfortable choice" },
        { "rank": 2, "activity": "Outdoor sightseeing", "suitability": "Fair", "score": 45, "reasoning": "Light drizzle, but mild and calm enough to still get out" },
        { "rank": 3, "activity": "Skiing", "suitability": "Poor", "score": 10, "reasoning": "No snow and well above freezing" },
        { "rank": 4, "activity": "Surfing", "suitability": "Poor", "score": 5, "reasoning": "No coastline nearby" }
      ]
    }
    // ... 6 more days, same shape
  ]
}
```

### 300: several places matched

```json
{
  "message": "Several places match \"Lon\". Please choose one.",
  "matches": [
    { "id": 2643743, "name": "London", "region": "England", "country": "United Kingdom" },
    { "id": 6058560, "name": "London", "region": "Ontario", "country": "Canada" },
    { "id": 2643736, "name": "Londonderry", "region": "Northern Ireland", "country": "United Kingdom" }
  ]
}
```

Between 2 and 10 matches.

### Error responses (400, 401, 404, 503)

All four error statuses share the same body shape, just with their own code
and message, for example:

```json
{
  "error": "LOCATION_NOT_FOUND",
  "message": "No place called \"Zzzzzz\" was found."
}
```

## Field tables

### Location object

| Field | What it is | Type | Example or Allowed values |
|---|---|---|---|
| `id` | The place's id | integer | `2643743` |
| `name` | The place's name | string | `"London"` |
| `region` | The place's region, state or province | string | `"England"`, or `""` if Open-Meteo has none |
| `country` | The place's country | string | `"United Kingdom"` |

### Day object

| Field | What it is | Type | Example or Allowed values |
|---|---|---|---|
| `date` | The calendar date, in the place's local time | string, ISO 8601 date | `"2026-11-07"` |
| `weather` | That day's weather (see Weather object below) | object | see below |
| `activities` | The 4 activities for that day, sorted by score (highest first) | array of 4 Activity objects | see below |

### Weather object

| Field | What it is | Type | Example or Allowed values |
|---|---|---|---|
| `summary` | A short description of the day's weather | string | `"Clear sky"`, `"Partly cloudy"`, `"Drizzle"`, `"Heavy rain"`, `"Heavy snow"`, `"Thunderstorm"` |
| `minTemperatureC` | The day's lowest temperature | number, °C | `8.9` |
| `maxTemperatureC` | The day's highest temperature | number, °C | `11.2` |
| `rainMm` | Total rainfall for the day | number, mm; `0` if none | `1.5` |
| `snowfallCm` | Total snowfall for the day | number, cm; `0` if none | `0` |
| `sunshineHours` | Hours of sunshine | number, hours; `0` if none | `0` |
| `maxWindSpeedKmh` | The day's highest wind speed | number, km/h | `6.5` |
| `maxWaveHeightM` | The day's highest wave height | number, m, decimal; `null` if inland | `1.8` or `null` |
| `maxWavePeriodS` | The day's longest wave period | number, seconds, decimal; `null` if inland | `11` or `null` |

### Activity object

| Field | What it is | Type | Example or Allowed values |
|---|---|---|---|
| `rank` | Position in the day's list, best first | integer, 1 to 4, unique per day | `1` (1 = best) |
| `activity` | Which activity this is | string | `"Skiing"`, `"Surfing"`, `"Outdoor sightseeing"`, `"Indoor sightseeing"` |
| `suitability` | A label summarising the score | string | `"Excellent"` (75 to 100), `"Good"` (50 to 74), `"Fair"` (25 to 49), `"Poor"` (0 to 24) |
| `score` | How suitable this activity is that day | integer, 0 to 100 | `70` |
| `reasoning` | A short, human-readable reason for the score | string, never empty | `"Drizzle and 11°C make indoor activities the comfortable choice"` |
