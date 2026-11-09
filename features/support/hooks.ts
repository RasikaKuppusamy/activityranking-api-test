import { Before, After, ITestCaseHookParameter } from '@cucumber/cucumber';
import nock from 'nock';
import { RankingWorld } from './world';

// Before each scenario: block every real network call. supertest still
// needs to reach our own app, so we allow localhost/127.0.0.1 through.
Before(function () {
  nock.disableNetConnect();
  nock.enableNetConnect((host) => host.includes('127.0.0.1') || host.includes('localhost'));
});

// Turns a headers object into one readable line, hiding the API key's
// real value so it never ends up in a log or report.
function describeHeaders(headers: Record<string, string>): string {
  const entries = Object.entries(headers).map(([name, value]) => {
    const isApiKey = name.toLowerCase() === 'x-api-key';
    return `${name}: ${isApiKey ? '***' : value}`;
  });
  return entries.length > 0 ? entries.join(', ') : '(none)';
}

// After each scenario: attach a plain-English log of the request and
// response to the HTML report, then clean up nock so nothing leaks into
// the next scenario.
After(async function (this: RankingWorld, scenario: ITestCaseHookParameter) {
  // scenario.result.status is "PASSED", "FAILED", etc.
  const scenarioResult = scenario.result?.status ?? 'UNKNOWN';
  const logLines = [`Scenario result: ${scenarioResult}`, ''];

  if (!this.lastRequest) {
    // Some scenarios (e.g. the pure negative-input ones) never send a
    // request before failing, so there's nothing to log.
    logLines.push('No request was sent');
  } else {
    logLines.push(`Request: ${this.lastRequest.method} ${this.lastRequest.url}`);
    logLines.push(`Request headers: ${describeHeaders(this.lastRequest.headers)}`);

    if (this.response) {
      logLines.push(`Response status: ${this.response.status}`);
      logLines.push(`Response correlation ID: ${this.response.headers['x-correlation-id'] ?? '(none)'}`);
      logLines.push('Response body:');
      logLines.push(JSON.stringify(this.response.body, null, 2));
    }
  }

  // Adds the log as a plain-text attachment on this scenario in the
  // Cucumber HTML report.
  await this.attach(logLines.join('\n'), 'text/plain');

  // Remove the fake Open-Meteo responses and allow real network calls
  // again, so nothing leaks into the next scenario.
  nock.cleanAll();
  nock.enableNetConnect();
});
