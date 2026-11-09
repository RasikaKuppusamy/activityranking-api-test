import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { mockPlaceSearch, mockPlaceLookup } from '../support/open-meteo-mock';
import { sendRequest } from '../support/send-request';
import { RankingWorld } from '../support/world';

// A made-up place id. The scenarios in this file never check the id
// itself, only the name/region/country, so any number will do.
const FAKE_PLACE_ID = 1;

// Fakes the Open-Meteo geocoding search so it returns exactly one place
// for this name. "Northern Ireland, United Kingdom" is split into a
// region and a country.
Given(
  'there is exactly one place called {string} in {string}',
  function (this: RankingWorld, name: string, regionAndCountry: string) {
    const [region, country] = regionAndCountry.split(', ');
    this.log(`Faked location search: "${name}" returns exactly one place (${region}, ${country})`);
    this.currentPlaceName = name;
    mockPlaceSearch(name, [{ id: FAKE_PLACE_ID, name, region, country }]);
  },
);

// Checks that the response's location matches "Name, Region, Country".
Then(
  'the rankings should be for {string}',
  function (this: RankingWorld, expected: string) {
    const location = this.body.location;
    const actual = `${location.name}, ${location.region}, ${location.country}`;
    this.log(`Checking location: expected "${expected}", got "${actual}"`);
    assert.strictEqual(actual, expected, `Expected location "${expected}" but got "${actual}"`);
  },
);

// Checks that the response contains one entry per day, for 7 days.
Then('the rankings should cover 7 days', function (this: RankingWorld) {
  const dayCount = this.body.days.length;
  this.log(`Checking day count: expected 7, got ${dayCount}`);
  assert.strictEqual(dayCount, 7, `Expected 7 days but got ${dayCount}`);
});

// Fakes the Open-Meteo geocoding search so it returns several places
// for this name, using the table's rows as the fake places.
Given(
  'the location search finds these places for {string}:',
  function (this: RankingWorld, name: string, dataTable: DataTable) {
    const places = dataTable.hashes().map((row) => ({
      id: Number(row.id),
      name: row.name,
      region: row.region,
      country: row.country,
    }));
    this.log(`Faked location search: "${name}" returns ${places.length} places`);
    mockPlaceSearch(name, places);
  },
);

// Checks how many places are offered to choose from, in a 300 response.
Then(
  'the response should list {int} places to choose from',
  function (this: RankingWorld, expectedCount: number) {
    const actualCount = this.body.matches.length;
    this.log(`Checking match count: expected ${expectedCount}, got ${actualCount}`);
    assert.strictEqual(
      actualCount,
      expectedCount,
      `Expected ${expectedCount} matches but got ${actualCount}`,
    );
  },
);

// Checks that every place in the list has all four fields.
Then('each place in the list should have an id, name, region and country', function (this: RankingWorld) {
  this.log(`Checking that all ${this.body.matches.length} matches have id, name, region and country`);
  for (const match of this.body.matches) {
    for (const field of ['id', 'name', 'region', 'country']) {
      assert.ok(field in match, `Expected match ${JSON.stringify(match)} to have a "${field}" field`);
    }
  }
});

// Checks that a list-of-matches response doesn't also include rankings.
Then('no rankings should be returned', function (this: RankingWorld) {
  this.log('Checking that no "days" field was returned');
  assert.strictEqual(this.body.days, undefined, 'Expected no "days" field, but rankings were returned');
});

// Fakes the geocoding search so this exact id resolves to one place,
// e.g. "London, Ontario, Canada" -> name "London", region "Ontario",
// country "Canada".
Given(
  'the location search knows place {int} as {string}',
  function (this: RankingWorld, id: number, fullName: string) {
    const [name, region, country] = fullName.split(', ');
    this.log(`Faked location search: id ${id} resolves to "${fullName}"`);
    this.currentPlaceName = name;
    mockPlaceLookup(id, { id, name, region, country });
  },
);

// Fakes the geocoding search finding nothing at all for this id.
Given("the location search doesn't know place {int}", function (this: RankingWorld, id: number) {
  this.log(`Faked location search: id ${id} resolves to nothing`);
  mockPlaceLookup(id, null);
});

// Fakes the geocoding search finding no places for this name.
Given('the location search finds no places for {string}', function (this: RankingWorld, name: string) {
  this.log(`Faked location search: "${name}" returns no places`);
  mockPlaceSearch(name, []);
});

// Sends the request using a locationId instead of a city name.
When(
  'I request activity rankings for location {int}',
  async function (this: RankingWorld, locationId: number) {
    await sendRequest(this, { locationId });
  },
);

// Same as above, but with a non-numeric locationId (used by the invalid
// locationId scenario, e.g. "abc").
When(
  'I request activity rankings for location {string}',
  async function (this: RankingWorld, locationId: string) {
    await sendRequest(this, { locationId });
  },
);

// Sends the request with neither a city nor a locationId.
When('I request activity rankings without a city or location', async function (this: RankingWorld) {
  await sendRequest(this, {});
});
