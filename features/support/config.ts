// The API key our tests send by default. Override it with the TEST_API_KEY
// environment variable (e.g. in CI); otherwise this fixed value is used.
export const VALID_API_KEY = process.env.TEST_API_KEY ?? 'test-api-key';
