<div align="center">


# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/fdbaec60-86a7-492b-ad80-9e888788ebf4

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. If you want the leaderboard to use Vercel Blob locally, set `BLOB_READ_WRITE_TOKEN` in `.env.local`.
4. Run the app:
   `npm run dev`

## Leaderboard Storage

- Local development uses `data/scoreboard.json` unless `BLOB_READ_WRITE_TOKEN` is present.
- Vercel deployments should set `BLOB_READ_WRITE_TOKEN` so `/api/scoreboard` reads and writes the shared Blob-backed leaderboard.
- The leaderboard writes to a single `scoreboard.json` blob and now overwrites that file in place.
