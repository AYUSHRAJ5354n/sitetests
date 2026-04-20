# Anime Current

Automatic anime episode posts powered by the SubsPlease RSS feed.

## What it does

- Fetches `https://subsplease.org/rss/` from a Vercel serverless backend.
- Groups releases into clean episode posts.
- Shows every available quality such as 480p, 720p, and 1080p.
- Adds magnet download buttons and torrent links when the RSS includes them.
- Adds AniList search links without using the AniList API.

## Files

- `public/index.html` is the frontend.
- `public/styles.css` is the visual system.
- `public/script.js` loads posts and handles search/refresh.
- `api/posts.js` is the backend RSS parser.

