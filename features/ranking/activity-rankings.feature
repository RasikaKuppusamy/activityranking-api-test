@rankings
Feature: Activity rankings
  As someone planning my week
  I want a clear, complete ranking of activities for each day
  So that I can easily compare my options

  # These scenarios check the shape and rules of a successful response,
  # using a real week of weather captured from Open-Meteo for Newquay.

  Background:
    Given there is exactly one place called "Newquay" in "England, United Kingdom"
    And the weather and sea services return a normal week for "Newquay"

  @smoke
  Scenario: The rankings cover 7 consecutive days starting today
    When I request activity rankings for the city "Newquay"
    Then the response status should be 200
    And the rankings should cover 7 consecutive days
    And the first day should be today in the location's timezone

  Scenario: Every day includes all four activities
    When I request activity rankings for the city "Newquay"
    Then every day should include exactly these activities:
      | Skiing              |
      | Surfing             |
      | Outdoor sightseeing |
      | Indoor sightseeing  |

  Scenario: Activities are sorted from best to worst by score
    When I request activity rankings for the city "Newquay"
    Then on every day the activities should be sorted by score, highest first

  Scenario: Activities with equal scores are sorted alphabetically
    When I request activity rankings for the city "Newquay"
    Then wherever two activities share a score, they should be in alphabetical order

  Scenario: Each activity's suitability label matches its score
    When I request activity rankings for the city "Newquay"
    Then every score should be a whole number from 0 to 100
    And every suitability should match its score:
      | score    | suitability |
      | 75 - 100 | Excellent   |
      | 50 - 74  | Good        |
      | 25 - 49  | Fair        |
      | 0 - 24   | Poor        |

  Scenario: Every activity has a reason for its ranking
    When I request activity rankings for the city "Newquay"
    Then every activity should have a reason that isn't empty

  Scenario: Each day's activities are ranked 1 to 4 in order
    When I request activity rankings for the city "Newquay"
    Then on every day the activities should be ranked 1, 2, 3 and 4 in order

  Scenario: Inland places return empty wave values
    Given there is exactly one place called "Birmingham" in "England, United Kingdom"
    And the sea service has no data for "Birmingham"
    When I request activity rankings for the city "Birmingham"
    Then the response status should be 200
    And every day should have empty wave height and wave period values
