# Manual GitHub and Vercel Deploy

## Upload to GitHub

1. Open your empty GitHub repo.
2. Upload these files and folders:
   - `api/`
   - `public/`
   - `.gitignore`
   - `package.json`
   - `README.md`
   - `vercel.json`
3. Commit to the `main` branch.

## Deploy to Vercel

1. Open https://vercel.com/new.
2. Import the GitHub repo.
3. Keep the default framework as Other or leave it unconfigured.
4. Deploy.

The site frontend is static, and the backend runs from `api/posts.js`.

