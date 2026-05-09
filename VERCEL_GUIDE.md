# Vercel Deployment Guide

This project can run on Vercel with the static HTML frontend and Vercel serverless API routes.

## 1. Push the Vercel files

Commit and push these files before importing the repo in Vercel:

```bash
git add vercel.json api/health.js api/jobs/search.js VERCEL_GUIDE.md
git commit -m "add vercel deployment support"
git push
```

## 2. Import in Vercel

1. Open https://vercel.com/new
2. Choose the GitHub repository: `vinayvanapallimaverick-oss/jobserch-beats-`
3. Keep Framework Preset as `Other`
4. Set Build Command to `npm run build`
5. Set Output Directory to `public`
6. Click Deploy

If Vercel shows `vite build`, change it to `npm run build`. This project is not a Vite app.

## 3. Add environment variables

In the Vercel project, open Settings -> Environment Variables and add:

```text
RAPIDAPI_KEY=your_rapidapi_key_here
RAPIDAPI_HOST=jsearch.p.rapidapi.com
```

Add them for Production, Preview, and Development if you want every deployment to work.

## 4. Redeploy

After adding environment variables, open Deployments and click Redeploy on the latest deployment.

## 5. Test

Open the Vercel URL and search for a job, for example:

```text
software engineer
United States
```

The app should show `RapidAPI JSearch results loaded` and display live job cards.

## Important

Do not commit `.env`. The local `.env` file contains your private RapidAPI key and is ignored by git.