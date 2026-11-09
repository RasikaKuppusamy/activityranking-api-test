@location
Feature: Location search
  As someone planning my week
  I want to find the town or city I'm interested in
  So that I can see which activities suit the weather there

  Background:
    Given the weather and sea services are available

  @smoke
  Scenario: A name that matches one place returns its 7-day rankings
    Given there is exactly one place called "Londonderry" in "Northern Ireland, United Kingdom"
    When I request activity rankings for the city "Londonderry"
    Then the response status should be 200
    And the rankings should be for "Londonderry, Northern Ireland, United Kingdom"
    And the rankings should cover 7 days

  @smoke
  Scenario: A name that matches several places returns a list to choose from
    Given the location search finds these places for "Lon":
      | id      | name        | region           | country        |
      | 2643743 | London      | England          | United Kingdom |
      | 6058560 | London      | Ontario          | Canada         |
      | 2643736 | Londonderry | Northern Ireland | United Kingdom |
    When I request activity rankings for the city "Lon"
    Then the response status should be 300
    And the response should list 3 places to choose from
    And each place in the list should have an id, name, region and country
    And no rankings should be returned

  Scenario: Choosing a place from the list returns its 7-day rankings
    Given the location search knows place 6058560 as "London, Ontario, Canada"
    When I request activity rankings for location 6058560
    Then the response status should be 200
    And the rankings should be for "London, Ontario, Canada"
    And the rankings should cover 7 days

  @negative
  Scenario: Searching without a name is rejected
    When I request activity rankings without a city or location
    Then the response status should be 400
    And the error code should be "INVALID_INPUT"
    And the error message should not be empty

  @negative
  Scenario: A name shorter than 2 characters is rejected
    When I request activity rankings for the city "L"
    Then the response status should be 400
    And the error code should be "INVALID_INPUT"
    And the error message should not be empty

  @negative
  Scenario: An invalid location ID is rejected
    When I request activity rankings for location "abc"
    Then the response status should be 400
    And the error code should be "INVALID_INPUT"
    And the error message should not be empty

  @negative
  Scenario: A name that matches no places returns "not found"
    Given the location search finds no places for "Zzzzzz"
    When I request activity rankings for the city "Zzzzzz"
    Then the response status should be 404
    And the error code should be "LOCATION_NOT_FOUND"
    And the error message should mention "Zzzzzz"

  @negative
  Scenario: A location ID that doesn't exist returns "not found"
    Given the location search doesn't know place 999999999
    When I request activity rankings for location 999999999
    Then the response status should be 404
    And the error code should be "LOCATION_NOT_FOUND"
    And the error message should not be empty