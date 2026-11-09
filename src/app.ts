import express from 'express';

// Placeholder for the Activity Ranking API.
// The real implementation doesn't exist yet, so every request
// gets 501 Not Implemented. This lets each scenario run and fail
// at its own assertion. The real API should replace this file
// and keep exporting `app`.

export const app = express();

app.get('/activity-rankings', (_req, res) => {
  res.status(501).json({
    error: 'NOT_IMPLEMENTED',
    message: 'The Activity Ranking API has not been built yet.',
  });
});