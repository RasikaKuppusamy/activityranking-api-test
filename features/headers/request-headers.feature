@headers
Feature: Request headers
  As the team running the API
  I want every request to be authenticated and traceable
  So that only our apps can use it and any request can be followed through the logs

  Background:
    Given the weather and sea services are available
    And there is exactly one place called "Londonderry" in "Northern Ireland, United Kingdom"

  @negative
  Scenario: A request without an API key is rejected
    When I request activity rankings for the city "Londonderry" without an API key
    Then the response status should be 401
    And the error code should be "UNAUTHORIZED"
    And the error message should not be empty

  @negative
  Scenario: A request with an invalid API key is rejected
    When I request activity rankings for the city "Londonderry" with the API key "not-a-real-key"
    Then the response status should be 401
    And the error code should be "UNAUTHORIZED"
    And the error message should not be empty

  Scenario: A request with a valid API key is accepted
    When I request activity rankings for the city "Londonderry"
    Then the response status should be 200

  Scenario: A correlation ID sent with the request is returned
    When I request activity rankings for the city "Londonderry" with the correlation ID "test-correlation-123"
    Then the response should include the correlation ID "test-correlation-123"

  Scenario: A correlation ID is created when none is sent
    When I request activity rankings for the city "Londonderry"
    Then the response should include a correlation ID

  Scenario: Error responses also include the correlation ID
    Given the location search finds no places for "Zzzzzz"
    When I request activity rankings for the city "Zzzzzz" with the correlation ID "test-correlation-456"
    Then the response status should be 404
    And the response should include the correlation ID "test-correlation-456"
