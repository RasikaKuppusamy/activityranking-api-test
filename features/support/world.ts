import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';
import type { Response } from 'supertest';

// The "notebook" each scenario carries.
// The When steps save the response here, and the Then steps read it.
export class RankingWorld extends World {
  response?: Response;

  // The name of the place a "Given there is exactly one place called..."
  // step set up, so a later step (like the weather table) knows which
  // place to fake weather for without being told again.
  currentPlaceName?: string;

  // The raw key/value table from the last "every day this week has this
  // weather:" step, so a later step can check a reason against the exact
  // value that was set (e.g. the wave height).
  lastWeatherTable?: Record<string, string>;

  // The method, URL and headers of the last request a When step sent, so
  // the After hook can log it even if the scenario fails.
  lastRequest?: { method: string; url: string; headers: Record<string, string> };

  constructor(options: IWorldOptions) {
    super(options);
  }

  // A shortcut to the response body, with a clear error
  // if a Then step runs before any request was sent.
  get body(): any {
    if (!this.response) {
      throw new Error('No request has been sent yet');
    }
    return this.response.body;
  }

  // A shortcut to the response's `days` array, with a clear error if the
  // response doesn't have rankings at all (e.g. it was an error response).
  // Several scenarios check rankings content without checking the status
  // code first, so this keeps those failures readable instead of a raw
  // "cannot read properties of undefined" crash.
  get days(): any[] {
    const days = this.body.days;
    if (!Array.isArray(days)) {
      throw new Error(
        `Expected a rankings response with a "days" array, but got: ${JSON.stringify(this.body)}`,
      );
    }
    return days;
  }
}

setWorldConstructor(RankingWorld);