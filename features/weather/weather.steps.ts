import { Given, Then, DataTable } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { mockCustomWeek, mockServiceUnavailable } from '../support/open-meteo-mock';
import { RankingWorld } from '../support/world';

// Builds a fake week of weather from the scenario's table, for whichever
// place the previous "there is exactly one place called..." step set up.
Given('every day this week has this weather:', function (this: RankingWorld, dataTable: DataTable) {
  const table = dataTable.rowsHash();
  this.log(`Faked a custom week of weather: ${JSON.stringify(table)}`);
  this.lastWeatherTable = table;
  mockCustomWeek(this.currentPlaceName!, table);
});

// Checks that one activity comes out on top every day.
Then('{string} should be ranked first on every day', function (this: RankingWorld, activityName: string) {
  this.log(`Checking that "${activityName}" is ranked first on every day`);
  for (const day of this.days) {
    const topActivity = day.activities[0].activity;
    assert.strictEqual(
      topActivity,
      activityName,
      `Expected "${activityName}" to be ranked first on ${day.date} but "${topActivity}" was`,
    );
  }
});

// Checks one activity's suitability label on every day.
Then(
  '{string} should be rated {string} on every day',
  function (this: RankingWorld, activityName: string, expectedSuitability: string) {
    this.log(`Checking that "${activityName}" is rated "${expectedSuitability}" on every day`);
    for (const day of this.days) {
      const activity = day.activities.find((a: any) => a.activity === activityName);
      assert.ok(activity, `Expected to find "${activityName}" in the activities for ${day.date}`);
      assert.strictEqual(
        activity.suitability,
        expectedSuitability,
        `Expected "${activityName}" to be rated "${expectedSuitability}" on ${day.date} but got "${activity.suitability}"`,
      );
    }
  },
);

// Checks that an activity's reason mentions the wave height set up
// earlier in this scenario's weather table.
Then('the reason for {string} should mention the wave height', function (this: RankingWorld, activityName: string) {
  const waveHeight = this.lastWeatherTable?.['wave height (m)'];
  this.log(`Checking that "${activityName}"'s reason mentions the wave height (${waveHeight})`);
  assert.ok(waveHeight, 'No wave height was set up for this scenario');

  for (const day of this.days) {
    const activity = day.activities.find((a: any) => a.activity === activityName);
    assert.ok(
      activity.reasoning.includes(waveHeight),
      `Expected ${activityName}'s reason ("${activity.reasoning}") to mention the wave height (${waveHeight})`,
    );
  }
});

// Checks that an activity's reason mentions a specific word or phrase.
Then(
  'the reason for {string} should mention {string}',
  function (this: RankingWorld, activityName: string, expectedText: string) {
    this.log(`Checking that "${activityName}"'s reason mentions "${expectedText}"`);
    for (const day of this.days) {
      const activity = day.activities.find((a: any) => a.activity === activityName);
      assert.ok(
        activity.reasoning.toLowerCase().includes(expectedText.toLowerCase()),
        `Expected ${activityName}'s reason ("${activity.reasoning}") to mention "${expectedText}"`,
      );
    }
  },
);

// Fakes the weather (forecast) or sea (marine) service being down.
Given('the {word} service is unavailable', function (this: RankingWorld, service: string) {
  this.log(`Faked the ${service} service as unavailable (returns 500)`);
  mockServiceUnavailable(service as 'weather' | 'sea');
});
