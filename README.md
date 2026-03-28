# March Mania — Web (Next.js)

Interactive UI to explore matchup win probabilities. This repository is **frontend-only**: it talks to the inference API (sibling repo **march-mania-backend**) over HTTP.

## Stack

- [Next.js App Router](https://nextjs.org/docs) (React 19)
- [shadcn/ui](https://ui.shadcn.com/) + Tailwind CSS v4
- [TanStack Form](https://ui.shadcn.com/docs/forms/tanstack-form) + Zod for validation

## Prerequisites

- Node.js 22+
- A running backend (see `march-mania-backend`) or any compatible API implementing `POST /predict` and the health contract

## Setup

```bash
npm install
```

## Environment

Copy `.env.example` to `.env.local`:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | Base URL of the inference API (no trailing slash), e.g. `http://127.0.0.1:8000` |

## Team list (`teams.json`)

Dropdown labels come from `public/data/teams.json`, generated from Kaggle `MTeams.csv` / `WTeams.csv`. After updating those files under `data/`:

```bash
npm run generate:teams
```

For a standalone checkout, place the two CSVs in `data/` at the **repository root** (same level as `public/`), then run the command above.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server (default http://localhost:3000) |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit tests |
| `npm run generate:teams` | Regenerate `public/data/teams.json` |

## Tests

- **Unit:** [Vitest](https://vitest.dev/) — `src/**/*.test.ts` (see `src/lib/utils.test.ts`)
- **CI:** lint + unit tests + `next build` (see `.github/workflows/ci.yml`)

## Deploying

Build a static or Node deployment as usual for Next.js. Set `NEXT_PUBLIC_API_BASE_URL` to your production API URL (and enable CORS on the API for your web origin).

## Related repositories

| Repo | Role |
|------|------|
| `march-mania-backend` | FastAPI inference service |
| `march-mania-ml` | Training notebooks, feature pipeline, model artifacts |

## License

MIT — see `LICENSE`.
