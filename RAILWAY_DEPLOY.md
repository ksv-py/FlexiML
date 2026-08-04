# Deploying the FastAPI backend to Railway

Prerequisites:
- Install the `railway` CLI: https://railway.app/docs/cli
- Commit your repository to Git/GitHub (Railway can also deploy via CLI `railway up`).
- Use a hosted MongoDB like MongoDB Atlas and note the connection string.

Quick steps (GitHub-connected deploy):

1. Create a Railway project and connect your GitHub repo via the Railway dashboard.

2. Set environment variables (in Railway dashboard -> Variables) e.g.:

- `MONGO_URI` = your MongoDB connection string
- `DB_NAME` = fleximl
- `RAZORPAY_KEY` = your_key_or_dummy
- `RAZORPAY_SECRET` = your_secret

3. Ensure `requirements.txt` is present (it is). Add `Procfile` at project root (already added).

4. Railway will detect your Python app and run the `web` command from the `Procfile`. If using the CLI, you can deploy directly:

```bash
railway login
railway init    # or create a project via dashboard and link
railway up
```

Notes:
- If building the image fails due to heavy ML packages, consider building with Docker locally and pushing the image to a registry, then configuring Railway to deploy that image.
- For training workloads, use Google Colab/Kaggle or an external worker; free Railway instances are resource-limited.

Testing after deploy:

```bash
# Get service URL from Railway dashboard or CLI
railway status
# then test endpoints
curl -X GET "https://<your-service>.railway.app/api/v1/health"
```

If you want, I can set up the `Procfile` (done), prepare a small `railway.toml` if you prefer CLI-first deployment, or walk you through running `railway up` now.
