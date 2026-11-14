# Ingreedy

Find recipes using ingredients in your pantry. Similarity ranks the candidates; each result also lists estimated missing ingredients.

## Run the portfolio demo

From the repository root:

```sh
docker build -t ingreedy .
docker run --rm -p 8000:8000 ingreedy
```

Open http://localhost:8000. Try rice and eggs. The image serves both the React app and FastAPI. On startup it indexes the bundled recipe CSV. Recipe search works without API keys. Gemini instructions/chat and YouTube tutorials require their respective server environment variables, GEMINI_API_KEY and YOUTUBE_API_KEY. For a public portfolio demo, start without keys.

## Deploy

Create a Docker web service from this repository, using the root Dockerfile and its default start command. Set the health check to /health. The process listens on the host-provided PORT or 8000. Verify the home page, then search for eggs. A successful /health response includes a positive recipe count.

## Local development

Use Python 3.12. From backend, install requirements.txt and run `uvicorn main:app --reload`. From frontend, use Node 22.12 or newer and run `npm ci` followed by `npm run dev`. Vite forwards /api to the local backend.
