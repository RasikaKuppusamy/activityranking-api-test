import { When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { sendRequest } from '../support/send-request';
import { RankingWorld } from '../support/world';

// A correlation ID the API generates itself should look like a standard
// UUID, e.g. "3fa85f64-5717-4562-b3fc-2c963f66afa6".
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Sends the request with no x-api-key header at all.
When(
  'I request activity rankings for the city {string} without an API key',
  async function (this: RankingWorld, city: string) {
    await sendRequest(this, { city, apiKey: null });
  },
);

// Sends the request with a specific (likely invalid) API key.
When(
  'I request activity rankings for the city {string} with the API key {string}',
  async function (this: RankingWorld, city: string, apiKey: string) {
    await sendRequest(this, { city, apiKey });
  },
);

// Sends the request with the valid API key plus a chosen correlation ID.
When(
  'I request activity rankings for the city {string} with the correlation ID {string}',
  async function (this: RankingWorld, city: string, correlationId: string) {
    await sendRequest(this, { city, correlationId });
  },
);

// Checks that the response echoes back the exact correlation ID we sent.
Then(
  'the response should include the correlation ID {string}',
  function (this: RankingWorld, expectedId: string) {
    const actualId = this.response!.headers['x-correlation-id'];
    this.log(`Checking correlation ID: expected "${expectedId}", got "${actualId}"`);
    assert.strictEqual(
      actualId,
      expectedId,
      `Expected correlation ID "${expectedId}" but got "${actualId}"`,
    );
  },
);

// Checks that the response includes a correlation ID the API made up
// itself (since we didn't send one), and that it looks like a UUID.
Then('the response should include a correlation ID', function (this: RankingWorld) {
  const actualId = this.response!.headers['x-correlation-id'];
  this.log(`Checking that a correlation ID was generated: got "${actualId}"`);
  assert.ok(actualId, 'Expected a correlation ID header, but none was returned');
  assert.ok(UUID_PATTERN.test(actualId), `Expected "${actualId}" to look like a UUID`);
});
