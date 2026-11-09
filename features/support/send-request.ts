import request from 'supertest';
import { app } from '../../src/app';
import { VALID_API_KEY } from './config';
import { RankingWorld } from './world';

// What a When step can ask us to send. Leaving a field out means
// "don't send this part of the request".
type RequestOptions = {
  city?: string;
  locationId?: number | string;
  // Defaults to the valid test API key if left out. Pass null to send no
  // key at all, or a string to send that exact (possibly invalid) key.
  apiKey?: string | null;
  correlationId?: string;
};

// Builds and sends the GET /activity-rankings request, with the right
// query string and headers, and records it on the World so both the
// step-by-step log and the end-of-scenario log can report on it. Every
// When step in the suite calls this, so the API key and correlation ID
// are handled in exactly one place.
export async function sendRequest(world: RankingWorld, options: RequestOptions) {
  const query: Record<string, string> = {};
  if (options.city !== undefined) query.city = options.city;
  if (options.locationId !== undefined) query.locationId = String(options.locationId);

  const headers: Record<string, string> = {};
  const apiKey = options.apiKey === undefined ? VALID_API_KEY : options.apiKey;
  if (apiKey !== null) headers['x-api-key'] = apiKey;
  if (options.correlationId !== undefined) headers['X-Correlation-ID'] = options.correlationId;

  const queryString = new URLSearchParams(query).toString();
  const url = queryString ? `/activity-rankings?${queryString}` : '/activity-rankings';

  // Remember what we're about to send, for the logs.
  world.lastRequest = { method: 'GET', url, headers };
  world.log(`Sent GET ${url}`);

  let pendingRequest = request(app).get('/activity-rankings').query(query);
  for (const [headerName, headerValue] of Object.entries(headers)) {
    pendingRequest = pendingRequest.set(headerName, headerValue);
  }
  world.response = await pendingRequest;

  world.log(`Received status ${world.response.status}`);
}
