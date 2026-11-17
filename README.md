# Ingreedy

Find recipes using ingredients in your pantry. Recipes using more of your main ingredients rank first. Within that group, fewer missing items rank higher, with TF-IDF similarity breaking ties. Staples count toward what you have. Listed ingredient alternatives and common rice preparations are recognized. No staples are assumed.

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

## Recipe details and matching limits

The demo includes four Ingreedy kitchen basics with authored ingredient quantities and cooking steps. Existing catalog entries retain their Food.com IDs and link to the original recipe for quantities and directions. The bundled CSV does not include original instructions, quantities, dietary labels or verified cooking times.

The ingredient matcher normalizes selected plurals, everyday pasta shapes and common ingredient names. It treats generic rice as available for cooked-rice recipes, so preparation is still required. It does not check pantry quantities or dietary restrictions. Distinct products such as rice flour, eggplant and chicken broth keep separate names.

Run the regression checks from backend with `python -m unittest -v test_recipe_search`. The container workflow also runs these checks.
