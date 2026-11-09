import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { mockCalmWeek, mockInlandWeek } from '../support/open-meteo-mock';
import { sendRequest } from '../support/send-request';
import { RankingWorld } from '../support/world';

// A background step used by every feature: fakes the weather and sea
// APIs with a calm, ordinary week, so the request doesn't fail because
// of them. Individual scenarios can still override this with their own
// weather mocks (e.g. heavy snow, a service outage).
Given('the weather and sea services are available', function (this: RankingWorld) {
  this.log('Faked weather and sea services: a calm, ordinary week');
  mockCalmWeek();
});

// Sends the actual request our API under test, using a city name, with
// the valid test API key attached automatically. This step is shared by
// the location, ranking and weather features.
When(
  'I request activity rankings for the city {string}',
  async function (this: RankingWorld, city: string) {
    await sendRequest(this, { city });
  },
);

// Checks the HTTP status code of the last response.
Then(
  'the response status should be {int}',
  function (this: RankingWorld, expectedStatus: number) {
    this.log(`Checking status: expected ${expectedStatus}, got ${this.response!.status}`);
    assert.strictEqual(
      this.response!.status,
      expectedStatus,
      `Expected status ${expectedStatus} but got ${this.response!.status}`,
    );
  },
);

// Checks the machine-readable error code on an error response.
Then('the error code should be {string}', function (this: RankingWorld, expectedCode: string) {
  const actualCode = this.body.error;
  this.log(`Checking error code: expected "${expectedCode}", got "${actualCode}"`);
  assert.strictEqual(
    actualCode,
    expectedCode,
    `Expected error code "${expectedCode}" but got "${actualCode}"`,
  );
});

// Checks that an error response includes some human-readable message.
Then('the error message should not be empty', function (this: RankingWorld) {
  const message = this.body.message;
  this.log(`Checking error message is not empty: got "${message}"`);
  assert.ok(message && message.trim().length > 0, `Expected a non-empty error message but got "${message}"`);
});

// Checks that the error message mentions a specific detail, e.g. the
// place name that couldn't be found.
Then(
  'the error message should mention {string}',
  function (this: RankingWorld, expectedText: string) {
    const message = this.body.message;
    this.log(`Checking error message mentions "${expectedText}": got "${message}"`);
    assert.ok(
      message && message.toLowerCase().includes(expectedText.toLowerCase()),
      `Expected the error message to mention "${expectedText}" but got "${message}"`,
    );
  },
);

// Fakes a place with no sea data nearby (an inland place), used by both
// the ranking and weather features.
Given('the sea service has no data for {string}', function (this: RankingWorld, placeName: string) {
  this.log(`Faked sea service: no data for "${placeName}" (inland)`);
  mockInlandWeek(placeName);
});
