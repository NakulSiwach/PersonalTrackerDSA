# DSA Tracker

A personal web app for tracking DSA questions. Make a folder per topic, add question pages (problem link, notes, code, images, highlights), and let the **Revision Suggestion** card tell you which question to revise next: the one revised longest ago.

Built to `DSA_TRACKER_SPEC.md`: Next.js 15 (App Router) + TypeScript, Tailwind CSS, Prisma, TipTap, bcryptjs + jose (JWT in an httpOnly cookie). It started on SQLite, as the spec says, and moved to Postgres so it can be hosted for free (the spec's §11 item 18).

## Hosting (free): Vercel + Neon

The app runs on **Vercel's free Hobby plan**, with a free **Neon Postgres** database created from inside Vercel. Uploaded images are stored in the database too, so there's no disk to manage. Neon pauses when idle and wakes automatically on the next request (about a second), so the site is always reachable.

Deploying from GitHub:

1. Push this repo to GitHub.
2. In Vercel: **Add New → Project**, import the repo, and add the environment variables `AUTH_SECRET` (32+ random characters) and `ALLOW_REGISTRATION=true`.
3. In the project: **Storage → Create Database → Neon (Serverless Postgres)**, then connect it to the project. This adds `DATABASE_URL` and `DATABASE_URL_UNPOOLED` for you.
4. **Deployments → Redeploy.** The build runs `prisma migrate deploy` (see `vercel.json`), which creates the tables.
5. Open the site and register. Then set `ALLOW_REGISTRATION=false` and redeploy.

Every `git push` to `main` deploys again automatically.

## Local development

Requires Node 20+.

```bash
npm i
cp .env.example .env     # set AUTH_SECRET and paste the two Neon connection strings
npm run dev              # http://localhost:3000
```

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Locally you use the same Neon database as the live site, so notes show up in both places. For a separate dev database, create a branch in Neon and use its connection strings.

To copy data from the old SQLite version (`prisma/dev.db` and `uploads/`) into Neon, run this once: `npm run import:sqlite`. It's safe to re-run; existing rows are skipped.

## Environment

| Variable | Meaning |
|---|---|
| `AUTH_SECRET` | Secret used to sign the session JWT (32+ characters). Required. |
| `ALLOW_REGISTRATION` | `true` (default) or `false`. When `false`, `/register` and `POST /api/auth/register` return 404. |
| `DATABASE_URL` | Neon pooled connection string (the host contains `-pooler`) |
| `DATABASE_URL_UNPOOLED` | Neon direct connection string, used for migrations |

## How revision works

- Each question has a **Last revised** date. It starts at creation time and only changes when you click **Mark as revised** (on the suggestion card) or **Mark as revised today** (on the question page). Editing a question never changes it.
- The first card in every folder is the question with the oldest *last revised* date.
- After you mark it revised, the card moves straight to the next-oldest question. If you opened the question from the suggestion card, a **Next suggestion →** link lets you work through revisions one after another.

## Additions beyond the spec

These were requested after the spec build:

- **Light/dark toggle** at the top right of every screen. Your choice is saved in the browser; until you pick one, the app follows your system theme.
- **Difficulty picker:** colored Easy / Medium / Hard buttons replace the plain dropdown. You can use the arrow keys.
- **Tag controls:** the tag filter is a styled dropdown that shows how many questions have each tag. The tag input suggests your existing tags as you type (↑/↓ to move, Enter to pick).
- **Pattern toggle and Famous Patterns:** every question card, and the question page, has a **☆ Pattern** switch. When it's on, the question also appears in the **★ Famous Patterns** folder at the top of the home screen. The question is *linked*, not copied: its notes and revision date are shared, so revising it in either place counts everywhere. Famous Patterns has its own Revise-next card, and "Next suggestion →" stays within Famous Patterns when you start there. Turning the switch off removes the question from Famous Patterns but keeps it in its own folder.
  - API: `PATCH /api/questions/:id { isPattern }`, `GET /api/patterns`, and `POST /api/questions/:id/revise?scope=patterns`.
- **Free hosting:** Postgres instead of SQLite, and images stored in the database.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Runs the spec's §8 acceptance tests and the extra feature tests with Playwright, at desktop and mobile sizes. Run `npm run build` first, and `npx playwright install chromium` once. It starts its own throwaway local Postgres, so your Neon data is never touched. |
| `npm run import:sqlite` | One-time copy of the old SQLite data into Neon |
| `npm run db:deploy` | Apply database migrations (Vercel's build does this automatically) |
| `npx tsx scripts/set-last-revised.ts <questionId> <daysAgo>` | DB helper for acceptance test 6: backdates a question's *last revised* date |

## Choices the spec left open

Each of these is also commented in the code where it happens.

- **Versions:** the spec says Next.js 15, so packages are pinned to Next 15, Prisma 6, TipTap 2 and zod 3.
- **Usernames** are trimmed and 3–32 characters long.
- **Tags:** each tag is normalised (trimmed, lowercased, spaces become `-`), then duplicates and empty tags are dropped. More than 10 tags, or a tag over 30 characters, is rejected with a 400 error.
- **Images** are stored in the database (an `Image` table) and served only to their owner; anyone else requesting the same `/api/uploads/<filename>` gets a 404. The upload route checks the file's real content, so a renamed `.txt` is rejected. The limit is **4 MB** instead of the spec's 5 MB, because Vercel rejects requests over 4.5 MB.
- **Extra routes:** `GET /api/tags` feeds the "suggest tags already used in your other questions" list. JWT signing lives in `src/lib/jwt.ts`, so the Edge middleware doesn't load bcrypt.
- **Folder card list:** `GET /api/folders/:id/questions` omits each question's `content`, since cards don't show the note body. `GET /api/questions/:id` returns it in full.
- **Shared UI pieces** not named in the spec: `Menu` (⋯ dropdown), `Breadcrumb`, `AuthForm`, `LogoutButton`, `NewQuestionModal`, `QuestionBoard`, `Select`, `DifficultyPicker`, `PatternToggle`, `ThemeToggle`.
