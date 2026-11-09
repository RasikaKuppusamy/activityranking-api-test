import nock from 'nock';
import fs from 'node:fs';
import path from 'node:path';

// The real Open-Meteo addresses. nock intercepts calls to these.
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com';
const FORECAST_URL = 'https://api.open-meteo.com';
const MARINE_URL = 'https://marine-api.open-meteo.com';

// A place, as our tests describe it
export type Place = {
  id: number;
  name: string;
  region: string;
  country: string;
};

// Returns the next 7 dates, starting today, like "2026-11-07"
function nextSevenDays(): string[] {
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date();
    day.setDate(day.getDate() + i);
    dates.push(day.toISOString().slice(0, 10));
  }
  return dates;
}

// Real Open-Meteo forecast and marine calls use latitude/longitude, not a
// place name. So our fake place search, and anyone faking its weather,
// need to agree on the same coordinates for a given name. These are the
// approximate real-world coordinates for the places used in our feature
// files; any other name falls back to a default pair.
const KNOWN_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  Londonderry: { latitude: 54.99, longitude: -7.32 },
  London: { latitude: 51.51, longitude: -0.13 },
  Newquay: { latitude: 50.41557, longitude: -5.07319 },
  Birmingham: { latitude: 52.48, longitude: -1.9 },
  Zermatt: { latitude: 46.02, longitude: 7.75 },
  Manchester: { latitude: 53.48, longitude: -2.24 },
  Seville: { latitude: 37.39, longitude: -5.99 },
};
const DEFAULT_COORDINATES = { latitude: 51.5, longitude: -0.12 };

function coordinatesFor(name: string) {
  return KNOWN_COORDINATES[name] ?? DEFAULT_COORDINATES;
}

// A nock query-matcher that only accepts requests for this place's
// coordinates. This lets two different places have their own weather
// mocks active at the same time without one overriding the other.
function matchesCoordinatesOf(placeName: string) {
  const { latitude, longitude } = coordinatesFor(placeName);
  return (query: Record<string, unknown>) =>
    Number(query.latitude) === latitude && Number(query.longitude) === longitude;
}

// FAKE GEOCODING API (search by name)
// When someone searches for `name`, return these places.
// Like the real API, if there are no places, there's no "results" field at all.
export function mockPlaceSearch(name: string, places: Place[]) {
  const results = places.map((place) => ({
    id: place.id,
    name: place.name,
    admin1: place.region, // Open-Meteo calls the region "admin1"
    country: place.country,
    ...coordinatesFor(place.name),
    timezone: 'Europe/London',
  }));

  const responseBody = results.length > 0 ? { results } : { generationtime_ms: 0.1 };

  nock(GEOCODING_URL)
    .persist() // keep answering, however many times it's called
    .get('/v1/search')
    .query((query) => String(query.name).toLowerCase() === name.toLowerCase())
    .reply(200, responseBody);
}

// FAKE GEOCODING API (look up by id)
// Open-Meteo's geocoding API doesn't document an id lookup, so this is an
// assumption about how the real app would resolve a chosen locationId
// back into a full place (see the README's "assumptions" section).
// Pass `null` for a place to fake "no place has this id".
export function mockPlaceLookup(id: number, place: Place | null) {
  const responseBody = place
    ? {
        results: [
          {
            id: place.id,
            name: place.name,
            admin1: place.region,
            country: place.country,
            ...coordinatesFor(place.name),
            timezone: 'Europe/London',
          },
        ],
      }
    : { generationtime_ms: 0.1 };

  nock(GEOCODING_URL)
    .persist()
    .get('/v1/search')
    .query((query) => Number(query.id) === id)
    .reply(200, responseBody);
}

// The weather values that make up one fake week. Any field left out
// falls back to CALM_DEFAULTS below.
type WeekOverrides = {
  weatherCode?: number;
  minTempC?: number;
  maxTempC?: number;
  rainMm?: number;
  snowfallCm?: number;
  sunshineHours?: number;
  windKmh?: number;
  waveHeightM?: number | null;
  wavePeriodS?: number | null;
};

// A calm, dry, 12°C day with no sea data, as described in the weather
// feature file: this is what any value not mentioned in a scenario
// defaults to.
const CALM_DEFAULTS: Required<WeekOverrides> = {
  weatherCode: 0, // Clear sky
  minTempC: 12,
  maxTempC: 12,
  rainMm: 0,
  snowfallCm: 0,
  sunshineHours: 6,
  windKmh: 10,
  waveHeightM: null,
  wavePeriodS: null,
};

// Fakes a 7-day forecast + marine week for one named place: every day
// has the same weather, built from CALM_DEFAULTS plus whatever is
// overridden. The mock only answers requests for that place's own
// coordinates, so it won't clash with another place's mock in the same
// scenario.
function mockWeekFor(placeName: string, overrides: WeekOverrides) {
  const dates = nextSevenDays();
  const sameEveryDay = <T>(value: T) => dates.map(() => value);
  const week = { ...CALM_DEFAULTS, ...overrides };
  const matchesPlace = matchesCoordinatesOf(placeName);

  nock(FORECAST_URL)
    .persist()
    .get('/v1/forecast')
    .query(matchesPlace)
    .reply(200, {
      timezone: 'Europe/London',
      utc_offset_seconds: 0,
      daily: {
        time: dates,
        weather_code: sameEveryDay(week.weatherCode),
        temperature_2m_max: sameEveryDay(week.maxTempC),
        temperature_2m_min: sameEveryDay(week.minTempC),
        rain_sum: sameEveryDay(week.rainMm),
        snowfall_sum: sameEveryDay(week.snowfallCm),
        sunshine_duration: sameEveryDay(week.sunshineHours * 3600), // hours -> seconds
        wind_speed_10m_max: sameEveryDay(week.windKmh),
      },
    });

  nock(MARINE_URL)
    .persist()
    .get('/v1/marine')
    .query(matchesPlace)
    .reply(200, {
      daily: {
        time: dates,
        wave_height_max: sameEveryDay(week.waveHeightM),
        wave_period_max: sameEveryDay(week.wavePeriodS),
      },
    });
}

// FAKE FORECAST + MARINE APIs: a calm, dry, inland week, with no place
// in particular in mind. Used as a safe default before a specific place
// has been chosen (e.g. the location-search feature's background).
export function mockCalmWeek() {
  const dates = nextSevenDays();
  const sameEveryDay = <T>(value: T) => dates.map(() => value);

  nock(FORECAST_URL)
    .persist()
    .get('/v1/forecast')
    .query(true) // accept any query parameters
    .reply(200, {
      timezone: 'Europe/London',
      utc_offset_seconds: 0,
      daily: {
        time: dates,
        weather_code: sameEveryDay(CALM_DEFAULTS.weatherCode),
        temperature_2m_max: sameEveryDay(CALM_DEFAULTS.maxTempC),
        temperature_2m_min: sameEveryDay(CALM_DEFAULTS.minTempC),
        rain_sum: sameEveryDay(CALM_DEFAULTS.rainMm),
        snowfall_sum: sameEveryDay(CALM_DEFAULTS.snowfallCm),
        sunshine_duration: sameEveryDay(CALM_DEFAULTS.sunshineHours * 3600),
        wind_speed_10m_max: sameEveryDay(CALM_DEFAULTS.windKmh),
      },
    });

  nock(MARINE_URL)
    .persist()
    .get('/v1/marine')
    .query(true)
    .reply(200, {
      daily: {
        time: dates,
        wave_height_max: sameEveryDay(CALM_DEFAULTS.waveHeightM),
        wave_period_max: sameEveryDay(CALM_DEFAULTS.wavePeriodS),
      },
    });
}

// Fakes a calm week with no sea data for one specific place: used when a
// scenario says a place is inland (so Surfing should always be Poor).
export function mockInlandWeek(placeName: string) {
  mockWeekFor(placeName, {});
}

// Maps the weather feature file's plain-English weather names to their
// WMO codes (the real forecast API reports weather as one of these).
const WEATHER_CODES: Record<string, number> = {
  'Clear sky': 0,
  'Partly cloudy': 2,
  Drizzle: 53,
  'Heavy rain': 65,
  'Heavy snow': 75,
  Thunderstorm: 95,
};

// Builds a fake week for one place from a Gherkin table like:
//   | weather       | Heavy snow |
//   | min temp (°C) | -9         |
// Any row that's missing falls back to CALM_DEFAULTS.
export function mockCustomWeek(placeName: string, table: Record<string, string>) {
  const overrides: WeekOverrides = {};
  if (table['weather']) overrides.weatherCode = WEATHER_CODES[table['weather']];
  if (table['min temp (°C)']) overrides.minTempC = Number(table['min temp (°C)']);
  if (table['max temp (°C)']) overrides.maxTempC = Number(table['max temp (°C)']);
  if (table['rain (mm)']) overrides.rainMm = Number(table['rain (mm)']);
  if (table['snowfall (cm)']) overrides.snowfallCm = Number(table['snowfall (cm)']);
  if (table['sunshine (hours)']) overrides.sunshineHours = Number(table['sunshine (hours)']);
  if (table['wind (km/h)']) overrides.windKmh = Number(table['wind (km/h)']);
  if (table['wave height (m)']) overrides.waveHeightM = Number(table['wave height (m)']);
  if (table['wave period (s)']) overrides.wavePeriodS = Number(table['wave period (s)']);

  mockWeekFor(placeName, overrides);
}

// Fakes a realistic week for one place, using a fixture file captured
// from the real Open-Meteo API (see fixtures/ and the README). Only the
// `time` field is replaced with the next 7 real dates, so the fixture
// never goes stale.
export function mockNormalWeek(placeName: string) {
  const dates = nextSevenDays();
  const fixtureName = placeName.toLowerCase();
  const forecast = loadFixture(`${fixtureName}-forecast.json`);
  const marine = loadFixture(`${fixtureName}-marine.json`);
  forecast.daily.time = dates;
  marine.daily.time = dates;

  const matchesPlace = matchesCoordinatesOf(placeName);
  nock(FORECAST_URL).persist().get('/v1/forecast').query(matchesPlace).reply(200, forecast);
  nock(MARINE_URL).persist().get('/v1/marine').query(matchesPlace).reply(200, marine);
}

function loadFixture(fileName: string): any {
  const filePath = path.join(__dirname, '../../fixtures', fileName);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

// Fakes the weather or sea service being down, so our API should return
// a 503. Not scoped to one place's coordinates, because every scenario
// that uses this only ever looks at one place.
export function mockServiceUnavailable(service: 'weather' | 'sea') {
  const url = service === 'weather' ? FORECAST_URL : MARINE_URL;
  const endpointPath = service === 'weather' ? '/v1/forecast' : '/v1/marine';

  nock(url).persist().get(endpointPath).query(true).reply(500, { error: 'Internal Server Error' });
}
