@weather
Feature: Weather-based ranking
  As someone planning my week
  I want the rankings to reflect the actual weather
  So that I can trust the recommendations

  # Any weather value not listed in a scenario defaults to a calm,
  # dry, 12°C day. Wave values default to none (an inland place).

  @smoke
  Scenario: Heavy snow and freezing temperatures rank Skiing first
    Given there is exactly one place called "Zermatt" in "Valais, Switzerland"
    And every day this week has this weather:
      | weather          | Heavy snow |
      | min temp (°C)    | -9         |
      | max temp (°C)    | -3         |
      | snowfall (cm)    | 15         |
    When I request activity rankings for the city "Zermatt"
    Then "Skiing" should be ranked first on every day
    And "Skiing" should be rated "Excellent" on every day

  Scenario: Heavy rain all day ranks Indoor sightseeing first
    Given there is exactly one place called "Manchester" in "England, United Kingdom"
    And every day this week has this weather:
      | weather          | Heavy rain |
      | max temp (°C)    | 9          |
      | rain (mm)        | 20         |
      | sunshine (hours) | 0          |
    When I request activity rankings for the city "Manchester"
    Then "Indoor sightseeing" should be ranked first on every day
    And "Outdoor sightseeing" should be rated "Poor" on every day

  Scenario: Clear sky, 22°C and light wind rank Outdoor sightseeing first
    Given there is exactly one place called "Seville" in "Andalusia, Spain"
    And every day this week has this weather:
      | weather          | Clear sky |
      | min temp (°C)    | 14        |
      | max temp (°C)    | 22        |
      | sunshine (hours) | 10        |
      | wind (km/h)      | 8         |
    When I request activity rankings for the city "Seville"
    Then "Outdoor sightseeing" should be ranked first on every day
    And "Outdoor sightseeing" should be rated "Excellent" on every day

  Scenario: Big, clean waves and light wind rate Surfing as Excellent
    Given there is exactly one place called "Newquay" in "England, United Kingdom"
    And every day this week has this weather:
      | weather          | Partly cloudy |
      | max temp (°C)    | 15            |
      | wind (km/h)      | 10            |
      | wave height (m)  | 2.3           |
      | wave period (s)  | 11            |
    When I request activity rankings for the city "Newquay"
    Then "Surfing" should be rated "Excellent" on every day
    And the reason for "Surfing" should mention the wave height

  Scenario: A thunderstorm rates Surfing and Outdoor sightseeing as Poor
    Given there is exactly one place called "Newquay" in "England, United Kingdom"
    And every day this week has this weather:
      | weather          | Thunderstorm |
      | rain (mm)        | 15           |
      | wind (km/h)      | 50           |
      | wave height (m)  | 2            |
      | wave period (s)  | 10           |
    When I request activity rankings for the city "Newquay"
    Then "Surfing" should be rated "Poor" on every day
    And "Outdoor sightseeing" should be rated "Poor" on every day

  Scenario: An inland place rates Surfing as Poor
    Given there is exactly one place called "Birmingham" in "England, United Kingdom"
    And every day this week has this weather:
      | weather          | Clear sky |
      | max temp (°C)    | 20        |
    And the sea service has no data for "Birmingham"
    When I request activity rankings for the city "Birmingham"
    Then "Surfing" should be rated "Poor" on every day
    And the reason for "Surfing" should mention "coastline"

  @negative
  Scenario Outline: An unavailable weather service returns a friendly error
    Given there is exactly one place called "Newquay" in "England, United Kingdom"
    And the <service> service is unavailable
    When I request activity rankings for the city "Newquay"
    Then the response status should be 503
    And the error code should be "WEATHER_UNAVAILABLE"
    And the error message should not be empty

    Examples:
      | service |
      | weather |
      | sea     |
