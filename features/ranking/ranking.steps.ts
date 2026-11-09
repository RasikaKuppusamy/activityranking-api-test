import { Given, Then, DataTable } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { mockNormalWeek } from '../support/open-meteo-mock';
import { RankingWorld } from '../support/world';

// Fakes a realistic week of weather for a place, using a real fixture
// captured from Open-Meteo (see fixtures/ and the README).
Given(
  'the weather and sea services return a normal week for {string}',
  function (this: RankingWorld, placeName: string) {
    this.log(`Faked weather: a normal captured week for "${placeName}"`);
    mockNormalWeek(placeName);
  },
);

// Checks that the 7 days returned are consecutive calendar dates.
Then('the rankings should cover 7 consecutive days', function (this: RankingWorld) {
  const dates: string[] = this.days.map((day: any) => day.date);
  this.log(`Checking that these 7 days are consecutive: ${dates.join(', ')}`);
  assert.strictEqual(dates.length, 7, `Expected 7 days but got ${dates.length}`);

  for (let i = 1; i < dates.length; i++) {
    const previousDay = new Date(dates[i - 1]);
    const thisDay = new Date(dates[i]);
    const daysApart = (thisDay.getTime() - previousDay.getTime()) / (1000 * 60 * 60 * 24);
    assert.strictEqual(
      daysApart,
      1,
      `Expected "${dates[i]}" to be exactly one day after "${dates[i - 1]}"`,
    );
  }
});

// Checks that the first day in the response is today.
// Note: we compare against today's date on the test machine. A full
// timezone conversion needs a real API, so this is a simplification
// (see the README's assumptions).
Then("the first day should be today in the location's timezone", function (this: RankingWorld) {
  const today = new Date().toISOString().slice(0, 10);
  const firstDay = this.days[0].date;
  this.log(`Checking first day: expected today (${today}), got "${firstDay}"`);
  assert.strictEqual(
    firstDay,
    today,
    `Expected the first day to be today (${today}) but got "${firstDay}"`,
  );
});

// Checks that every day lists exactly the given activities (in any order).
Then('every day should include exactly these activities:', function (this: RankingWorld, dataTable: DataTable) {
  const expectedActivities = dataTable.raw().map((row) => row[0]);
  this.log(`Checking activities on each day: expected ${JSON.stringify(expectedActivities)}`);

  for (const day of this.days) {
    const actualActivities = day.activities.map((activity: any) => activity.activity).sort();
    assert.deepStrictEqual(
      actualActivities,
      [...expectedActivities].sort(),
      `Expected day ${day.date} to have activities ${JSON.stringify(expectedActivities)} but got ${JSON.stringify(actualActivities)}`,
    );
  }
});

// Checks that each day's activities are ordered from highest score to lowest.
Then('on every day the activities should be sorted by score, highest first', function (this: RankingWorld) {
  this.log('Checking that scores are sorted highest first on every day');
  for (const day of this.days) {
    const scores = day.activities.map((activity: any) => activity.score);
    const sortedHighestFirst = [...scores].sort((a, b) => b - a);
    assert.deepStrictEqual(
      scores,
      sortedHighestFirst,
      `Expected day ${day.date}'s scores ${JSON.stringify(scores)} to be sorted highest first`,
    );
  }
});

// Checks that any activities tied on score come out in alphabetical order.
Then('wherever two activities share a score, they should be in alphabetical order', function (this: RankingWorld) {
  this.log('Checking alphabetical order for any activities that share a score');
  for (const day of this.days) {
    const activities = day.activities;
    for (let i = 1; i < activities.length; i++) {
      if (activities[i].score === activities[i - 1].score) {
        assert.ok(
          activities[i].activity >= activities[i - 1].activity,
          `Expected "${activities[i - 1].activity}" and "${activities[i].activity}" (same score, day ${day.date}) to be in alphabetical order`,
        );
      }
    }
  }
});

// Checks that every activity's score is a whole number between 0 and 100.
Then('every score should be a whole number from 0 to 100', function (this: RankingWorld) {
  this.log('Checking that every score is a whole number from 0 to 100');
  for (const day of this.days) {
    for (const activity of day.activities) {
      const score = activity.score;
      assert.ok(
        Number.isInteger(score),
        `Expected ${activity.activity}'s score to be a whole number but got ${score}`,
      );
      assert.ok(
        score >= 0 && score <= 100,
        `Expected ${activity.activity}'s score to be between 0 and 100 but got ${score}`,
      );
    }
  }
});

// Checks that each activity's suitability label matches the score range
// given in the table, e.g. a score of 80 should be "Excellent".
Then('every suitability should match its score:', function (this: RankingWorld, dataTable: DataTable) {
  const ranges = dataTable.hashes().map((row) => {
    const [min, max] = row.score.split(' - ').map(Number);
    return { min, max, suitability: row.suitability };
  });
  this.log(`Checking that suitability matches score, using ranges: ${JSON.stringify(ranges)}`);

  for (const day of this.days) {
    for (const activity of day.activities) {
      const range = ranges.find((r) => activity.score >= r.min && activity.score <= r.max);
      assert.ok(range, `No defined suitability range covers a score of ${activity.score}`);
      assert.strictEqual(
        activity.suitability,
        range!.suitability,
        `Expected a score of ${activity.score} to be rated "${range!.suitability}" but got "${activity.suitability}"`,
      );
    }
  }
});

// Checks that every activity comes with a non-empty reason.
Then("every activity should have a reason that isn't empty", function (this: RankingWorld) {
  this.log('Checking that every activity has a non-empty reason');
  for (const day of this.days) {
    for (const activity of day.activities) {
      assert.ok(
        activity.reasoning && activity.reasoning.trim().length > 0,
        `Expected ${activity.activity} on ${day.date} to have a non-empty reason`,
      );
    }
  }
});

// Checks that an inland place's days have no wave data at all.
Then('every day should have empty wave height and wave period values', function (this: RankingWorld) {
  this.log('Checking that wave height and wave period are null on every day');
  for (const day of this.days) {
    assert.strictEqual(
      day.weather.maxWaveHeightM,
      null,
      `Expected day ${day.date} to have no wave height, but got ${day.weather.maxWaveHeightM}`,
    );
    assert.strictEqual(
      day.weather.maxWavePeriodS,
      null,
      `Expected day ${day.date} to have no wave period, but got ${day.weather.maxWavePeriodS}`,
    );
  }
});

// Checks that each day's activities are numbered 1 to 4, in list order.
// This also covers "unique per day", since [1, 2, 3, 4] in order can only
// match if every rank appears exactly once.
Then('on every day the activities should be ranked 1, 2, 3 and 4 in order', function (this: RankingWorld) {
  this.log('Checking that ranks are 1, 2, 3, 4 in order on every day');
  for (const day of this.days) {
    const ranks = day.activities.map((activity: any) => activity.rank);
    assert.deepStrictEqual(
      ranks,
      [1, 2, 3, 4],
      `Expected day ${day.date}'s ranks to be [1, 2, 3, 4] in order but got ${JSON.stringify(ranks)}`,
    );
  }
});
