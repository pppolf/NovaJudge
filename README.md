# NovaJudge

NovaJudge is a lightweight Online Judge platform designed for XCPC-style
training and onsite contests. It focuses on contest operations rather than only
standalone submissions: problem management, team accounts, realtime judging,
scoreboards, clarifications, balloon delivery, print queues, API keys, and ICPC
CCS-compatible data feeds are built into one Next.js application.

## Features

- Contest lifecycle management for public and private contests.
- Team account import, login, roles, seats, members, schools, coaches, and
  categories.
- Problem bank with Markdown/LaTeX statements, samples, assets, test data, and
  YAML judge configuration.
- Realtime submissions powered by Redis, BullMQ, worker processes, and
  [go-judge](https://github.com/criyle/go-judge).
- ACM/ICPC-style scoreboard with freeze and unfreeze support.
- Clarification and notice system for contestants and judges.
- Balloon delivery and print queue workflows for onsite contests.
- API key authentication and ICPC CCS-compatible endpoints for external tools.
- Training center and virtual participation support for logged-in global users.

## Tech Stack

- Next.js 16, React 19, TypeScript
- Tailwind CSS, Heroicons, Sonner, Monaco Editor
- PostgreSQL, Prisma 7
- Redis, BullMQ
- go-judge
- Docker Compose for local infrastructure

## Quick Start

Clone the repository and install dependencies:

```bash
git clone https://github.com/pppolf/NovaJudge.git
cd NovaJudge
npm install
```

Create an environment file:

```bash
cp .env.example .env
```

Common environment variables:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/xcpc_oj?schema=public"
REDIS_URL="redis://localhost:6379"
GO_JUDGE_API="http://localhost:5050"
JWT_SECRET="please-change-this-secret"
SUPER_ADMIN_USERNAME="admin"
SUPER_ADMIN_PASSWORD="123456"
JUDGE_CONCURRENCY=4
NOVAJUDGE_URL="http://localhost:3001"
```

Start PostgreSQL, Redis, and go-judge:

```bash
docker-compose up -d
```

Initialize Prisma and start the web app:

```bash
npx prisma db push
npm run prisma
npm run dev
```

Start the judge worker in another terminal:

```bash
npm run worker
```

The default development server runs at `http://localhost:3001`.

## Scripts

```bash
npm run dev          # Start the development server
npm run build        # Build for production
npm run start        # Start the production server
npm run lint         # Run ESLint
npm run prisma       # Generate Prisma Client
npm run worker       # Start the judge worker
npm run worker:dev   # Start the judge worker in watch mode
```

## Project Layout

```text
NovaJudge/
├─ app/              # Next.js App Router pages and API routes
├─ components/       # Shared UI components
├─ context/          # Frontend providers
├─ docs/             # API documentation and notes
├─ lib/              # Auth, judge, queue, Redis, Prisma, CCS helpers
├─ prisma/           # Database schema and migrations
├─ public/           # Static assets
├─ scripts/          # CLI and maintenance scripts
├─ uploads/          # Problem data and assets
├─ worker.ts         # Judge worker
└─ docker-compose.yml
```

## API And CCS

NovaJudge exposes platform APIs for contest/problem/submission workflows and
ICPC CCS-compatible endpoints for contest tooling, resolver workflows, and
onsite displays. API key authentication is available for trusted integrations.

See [docs/API_DOCS.md](docs/API_DOCS.md) for more details.

## License

NovaJudge is released under the [MIT License](LICENSE).
