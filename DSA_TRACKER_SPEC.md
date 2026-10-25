# DSA Questions Tracker — Build Spec

> **For the building agent:** Read this whole document before writing code. Build in the phase order in §7. Keep the app **minimal**: no features beyond what's listed here unless this spec says so. When a detail isn't specified, pick the simplest option and leave a short comment saying so.

---

## 1. What we're building

A personal web app for tracking DSA (Data Structures & Algorithms) questions.

- The user logs in.
- The user makes **folders**, one per topic (e.g. "Arrays", "Graphs", "DP").
- Each folder holds **question pages**. A page is a small rich-text document: problem link, notes, code, images, highlighted text.
- Each page has **metadata**: topic tags, difficulty, and a **last revised** date that the app sets.
- Each folder shows its questions as **cards**. The **first card is always the Revision Suggestion card**. It shows the question revised longest ago. When the user marks that question as revised, its date becomes today and the card moves on to the next-oldest question.

---

## 2. Tech stack (fixed — don't substitute)

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | One project for UI and API |
| Styling | **Tailwind CSS** | Minimal, no component library needed |
| Database | **SQLite** via **Prisma** | Zero setup, single file (`prisma/dev.db`) |
| Rich text editor | **TipTap** (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-highlight`, `@tiptap/extension-image`, `@tiptap/extension-link`, `@tiptap/extension-placeholder`) | Highlighting, images and links out of the box |
| Auth | Username + password, **bcryptjs** hashing, session as a signed JWT (**jose**) in an httpOnly cookie | Simple, no external provider |
| Image storage | Local disk: `./uploads/` (gitignored), served by an API route | Minimal |
| Date formatting | Native `Intl.DateTimeFormat` | No extra dependency |

Package manager: `npm`. Node 20+.

---

## 3. Data model (Prisma)

`prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

model User {
  id           String     @id @default(cuid())
  username     String     @unique
  passwordHash String
  createdAt    DateTime   @default(now())
  folders      Folder[]
}

model Folder {
  id        String     @id @default(cuid())
  name      String
  userId    String
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  questions Question[]
  createdAt DateTime   @default(now())

  @@unique([userId, name])
}

model Question {
  id            String   @id @default(cuid())
  folderId      String
  folder        Folder   @relation(fields: [folderId], references: [id], onDelete: Cascade)
  title         String
  link          String?            // problem URL (LeetCode, GFG, etc.)
  content       String   @default("{}")  // TipTap JSON, stringified
  difficulty    String   @default("Medium") // "Easy" | "Medium" | "Hard"
  tags          String   @default("[]")    // JSON array of strings, e.g. ["two-pointers","sorting"]
  lastRevisedAt DateTime @default(now())
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([folderId, lastRevisedAt])
}
```

Notes:
- SQLite in Prisma has no enums or scalar lists, so `difficulty` is a validated string and `tags` is a JSON string. Validate both in the API (see §5).
- `lastRevisedAt` starts at the creation time. **Only "Mark as revised" changes it.** Editing a page does not.
- `lastRevisedAt` holds a full timestamp. The UI shows it as a **day only** (e.g. "25 Oct 2026"). Sorting uses the full timestamp, so ties within one day break correctly.

---

## 4. Authentication

Minimal, single-app, cookie-based.

### Files
- `src/lib/auth.ts`
  - `hashPassword(pw)` / `verifyPassword(pw, hash)` with bcryptjs (10 rounds).
  - `createSession(userId)` signs a JWT with `jose` (HS256, secret from `AUTH_SECRET` env, 30-day expiry) and sets cookie `session` (httpOnly, sameSite=lax, secure in production, path=/).
  - `getSessionUserId()` reads and verifies the cookie and returns `userId | null`.
  - `destroySession()` clears the cookie.
- `src/middleware.ts`: for every route except `/login`, `/register`, `/api/auth/*` and static assets, verify the JWT. If it's missing or invalid, redirect pages to `/login` and return `401` for API routes.

### Pages
- `/register`: username + password (min 6 chars). Creates the user, logs them in, redirects to `/`.
  - Env flag `ALLOW_REGISTRATION` (default `true`). When `false`, `/register` returns 404. The user can turn it off after making their own account.
- `/login`: username + password. On success, redirect to `/`. On failure, show "Invalid username or password".
- A **Logout** button in the top bar calls `POST /api/auth/logout`.

### Env (`.env`)
```
AUTH_SECRET=<random 32+ char string>
ALLOW_REGISTRATION=true
```
Provide `.env.example` with the same keys.

**Every API route that touches folders or questions must check ownership**: the folder (or the question's folder) must belong to `getSessionUserId()`. Otherwise return 404.

---

## 5. API routes (Next.js Route Handlers under `src/app/api`)

All return JSON. Validate input with **zod**. Errors: `{ error: string }` with the correct status code.

### Auth
| Method | Path | Body | Result |
|---|---|---|---|
| POST | `/api/auth/register` | `{ username, password }` | 201, sets cookie |
| POST | `/api/auth/login` | `{ username, password }` | 200, sets cookie |
| POST | `/api/auth/logout` | — | 200, clears cookie |

### Folders
| Method | Path | Body | Result |
|---|---|---|---|
| GET | `/api/folders` | — | `[{ id, name, questionCount }]`, sorted by name |
| POST | `/api/folders` | `{ name }` (1–50 chars, trimmed, unique per user) | created folder |
| PATCH | `/api/folders/:id` | `{ name }` | renamed folder |
| DELETE | `/api/folders/:id` | — | 204 (cascades to its questions) |

### Questions
| Method | Path | Body | Result |
|---|---|---|---|
| GET | `/api/folders/:id/questions` | — | `{ suggestion: Question \| null, questions: Question[] }` (see below) |
| POST | `/api/folders/:id/questions` | `{ title, link?, difficulty?, tags? }` | created question |
| GET | `/api/questions/:id` | — | full question incl. `content` |
| PATCH | `/api/questions/:id` | any of `{ title, link, content, difficulty, tags }` | updated question. **Must not change `lastRevisedAt`.** |
| DELETE | `/api/questions/:id` | — | 204 |
| POST | `/api/questions/:id/revise` | — | sets `lastRevisedAt = now()` and returns `{ question, nextSuggestion }` |

Validation:
- `difficulty` ∈ `["Easy","Medium","Hard"]`.
- `tags`: array of strings. Each tag is trimmed, lowercased, spaces turned into `-`, 1–30 chars. Remove duplicates. Max 10 tags.
- `link`: valid http(s) URL or empty/null.
- `content`: string, max ~2 MB.

Parse `tags` from JSON before sending it to the client. The client never sees the raw JSON string.

### Revision suggestion logic (core feature)
In `GET /api/folders/:id/questions` and after `POST /revise`:

```ts
suggestion = await prisma.question.findFirst({
  where: { folderId },
  orderBy: [{ lastRevisedAt: "asc" }, { createdAt: "asc" }],
});
```

- The suggestion is the question with the **oldest `lastRevisedAt`** in that folder.
- An empty folder gives `suggestion = null`.
- `questions` holds **all** questions, including the suggested one, sorted by `lastRevisedAt` ascending by default.

### Images
| Method | Path | Body | Result |
|---|---|---|---|
| POST | `/api/upload` | `multipart/form-data` with `file` | `{ url: "/api/uploads/<filename>" }` |
| GET | `/api/uploads/:filename` | — | streams the file with the correct content-type |

- Accept only `image/png`, `image/jpeg`, `image/gif`, `image/webp`. Max 5 MB.
- Filename: `<cuid>.<ext>`. Never use the client's filename. Reject path traversal.
- The GET route also needs a valid session.

---

## 6. UI / pages

Keep it plain and clean: white or neutral background, one accent color, system font, Tailwind only. Make it responsive, with cards in a grid (1 column on mobile, 2–3 on desktop). Support dark mode via Tailwind's `dark:` classes following the system preference.

### Layout (`src/app/(app)/layout.tsx`)
- Top bar: app name "DSA Tracker" (links to `/`) on the left, Logout button on the right.
- No sidebar. Navigation is Home → Folder → Question, with a breadcrumb on inner pages.

### 6.1 Home `/` — Folders
- Heading "Folders" and a **"+ New folder"** button. The button opens a small inline input or modal: type a name, press Enter to create.
- Grid of folder cards. Each card shows the folder name and "N questions". Click to open.
- Each folder card has a `⋯` menu with **Rename** and **Delete**. Delete asks for confirmation: "Delete folder and all N questions?"
- Empty state: "No folders yet. Create one for each topic (e.g. Arrays, Graphs)."

### 6.2 Folder `/folders/[folderId]` — Question cards
- Breadcrumb: `Folders / <Folder name>`.
- Header: folder name and a **"+ New question"** button. The button opens a modal with Title (required), Link, Difficulty (Easy/Medium/Hard select), and Tags (chip input). On create, go to the new question's page.
- **Card grid. The first card is always the Revision Suggestion card:**
  - Visually distinct: accent border or tinted background, plus a label like "🔁 Revise next".
  - Shows the suggested question's title, difficulty badge, tags, and "Last revised: 12 Sep 2026 (43 days ago)".
  - Clicking the card opens that question's page with `?from=suggestion` in the URL.
  - The card itself also has a **"Mark as revised"** button for a quick action without opening the page.
  - If the folder is empty, show "Add a question to get revision suggestions."
- **Remaining cards: every question in the folder** (the suggested one included, so the list is complete). Each shows:
  - Title
  - Difficulty badge (Easy = green, Medium = amber, Hard = red)
  - Tags as small chips
  - "Revised 43d ago"
  - Clicking opens the question page.
- Minimal filter bar above the grid: a text search on title and a tag dropdown. Filtering is client-side and **does not affect the suggestion card**.

### 6.3 Question page `/folders/[folderId]/questions/[questionId]`
- Breadcrumb: `Folders / <Folder> / <Question title>`.
- **Metadata panel** at the top:
  - Title: editable inline.
  - Link: editable. When set, shows an "Open problem ↗" link (target `_blank`, `rel="noopener noreferrer"`).
  - Difficulty: select.
  - Tags: chip input. Enter or comma adds a tag, × removes one. Suggest tags already used in this user's other questions (a simple datalist is fine).
  - **Last revised: 25 Oct 2026**. Read-only. The user can't edit this field directly.
  - **"Mark as revised today"** button. **Always visible.** Make it a prominent primary button when the URL has `?from=suggestion`.
- **Editor** (TipTap) below the metadata:
  - Toolbar: Bold, Italic, Strike, Inline code, Code block, H2, H3, Bullet list, Ordered list, Link, **Highlight** (3–4 preset colors: yellow, green, pink, blue), Image upload, Undo/Redo.
  - Images: toolbar button opens a file picker. **Paste** and **drag-and-drop** of images also upload. Each upload goes to `POST /api/upload` and the returned URL is inserted.
  - Placeholder: "Write the problem, approach, complexity, code…"
- **Autosave**: debounce changes by 1s, then `PATCH /api/questions/:id`. Show a small "Saving… / Saved" indicator. Also save on page unload where possible. Autosave **never** changes `lastRevisedAt`.
- **Delete question** goes in a `⋯` menu with confirmation.

### 6.4 "Mark as revised" flow (must behave exactly like this)
1. The user clicks "Mark as revised", either on the suggestion card or on the question page.
2. Client calls `POST /api/questions/:id/revise`.
3. The server sets `lastRevisedAt = now()` and returns the updated question and `nextSuggestion` (the folder's new oldest question).
4. UI:
   - On the **folder page**: update that question's card ("Revised today") and **replace the suggestion card at once** with `nextSuggestion`. Show a toast: "Marked as revised ✓".
   - On the **question page**: update "Last revised" to today and show a toast. If the user came from the suggestion (`?from=suggestion`), show a **"Next suggestion →"** link to `nextSuggestion` (keeping `?from=suggestion`). This lets them work through revisions one after another.
5. If every question was revised today, the suggestion is still the oldest of those. That's fine; don't add special handling.

### Shared components (`src/components/`)
- `FolderCard`, `QuestionCard`, `SuggestionCard`
- `DifficultyBadge`, `TagChips`, `TagInput`
- `Editor` (TipTap wrapper + `EditorToolbar`)
- `Modal`, `ConfirmDialog`, `Toast` (a minimal custom one is fine, no library needed)
- `RelativeDate` (shows "25 Oct 2026" plus "43 days ago")

---

## 7. Implementation steps (build in this order)

### Phase 0 — Scaffold
1. `npx create-next-app@latest dsa-tracker --ts --tailwind --eslint --app --src-dir --import-alias "@/*"`
2. Install:
   `npm i prisma @prisma/client bcryptjs jose zod @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-highlight @tiptap/extension-image @tiptap/extension-link @tiptap/extension-placeholder`
   `npm i -D @types/bcryptjs`
3. `npx prisma init --datasource-provider sqlite`, paste the schema from §3, then run `npx prisma migrate dev --name init`.
4. Create `src/lib/db.ts` with the standard Prisma client singleton.
5. Add `.env`, `.env.example`, and gitignore entries for `uploads/`, `prisma/dev.db*` and `.env`.

**Done when:** `npm run dev` serves the default page and the migration has run.

### Phase 1 — Auth
1. `src/lib/auth.ts` as in §4.
2. The `register`, `login` and `logout` route handlers.
3. The `/login` and `/register` pages (simple centered card forms).
4. `src/middleware.ts` route protection.

**Done when:** a logged-out user hitting `/` is redirected to `/login`. Register, login and logout all work. The cookie is httpOnly.

### Phase 2 — Folders
1. Folder API routes with ownership checks.
2. Home page with the folder grid, create, rename and delete.

**Done when:** the user can create "Arrays" and "Graphs", rename one, delete one, and the data persists across a server restart.

### Phase 3 — Questions CRUD and metadata
1. Question API routes (except `revise`).
2. "New question" modal on the folder page.
3. Question page with the metadata panel (title, link, difficulty, tags, read-only last revised).
4. `QuestionCard` grid on the folder page with search and tag filter.

**Done when:** questions can be created, edited and deleted. Tags are normalized. Editing doesn't change "last revised".

### Phase 4 — Rich text editor and images
1. `Editor` component with the toolbar from §6.3.
2. Upload and serve routes for images.
3. Paste and drag-drop image handling.
4. Debounced autosave with status indicator.

**Done when:** text, code blocks, highlights in several colors and images persist after a reload.

### Phase 5 — Revision suggestion (core)
1. Suggestion query in `GET /api/folders/:id/questions`.
2. `POST /api/questions/:id/revise`.
3. `SuggestionCard` as the first card, with its own "Mark as revised" button.
4. Question page "Mark as revised today", plus the `?from=suggestion` → "Next suggestion →" flow.

**Done when:** all the acceptance tests in §8 pass.

### Phase 6 — Polish (minimal)
1. Empty states, loading skeletons or spinners, toasts.
2. Dark mode.
3. 404 page for missing or foreign folders and questions.
4. A `README.md` with setup steps: `npm i`, copy `.env.example` to `.env`, `npx prisma migrate dev`, `npm run dev`.

---

## 8. Acceptance tests (check these by hand or with Playwright)

1. **Auth:** Without logging in, `/folders/x` redirects to `/login`. After login it loads.
2. **Isolation:** User B can't read or edit User A's folders, questions or images (404).
3. **Folders:** Creating, renaming and deleting work. Deleting a folder removes its questions.
4. **Metadata:** A new question shows "Last revised: <today>". Changing tags, difficulty or content **doesn't change** that date.
5. **Suggestion ordering:** Make Q1, Q2, Q3 in that order. The suggestion is Q1. Mark Q1 revised and the suggestion becomes Q2 right away, with no page reload. Mark Q2 and it becomes Q3. Mark Q3 and it becomes Q1 again (the oldest timestamp).
6. **Suggestion with a manually set older date:** Using a DB script, set Q3's `lastRevisedAt` to 30 days ago. The suggestion is Q3.
7. **Revise from page:** Open the suggestion and click "Mark as revised today". The date updates and "Next suggestion →" goes to the new oldest question.
8. **Editor:** Bold, a code block, a yellow highlight, a green highlight, a pasted image and a link all persist after a reload.
9. **Upload safety:** Uploading a `.txt` or a file over 5 MB is rejected. `GET /api/uploads/../.env` doesn't serve the file.
10. **Empty folder:** The suggestion card shows the empty-state message.

---

## 9. Suggested file structure

```
dsa-tracker/
├─ prisma/
│  └─ schema.prisma
├─ uploads/                      # gitignored
├─ src/
│  ├─ middleware.ts
│  ├─ lib/
│  │  ├─ db.ts
│  │  ├─ auth.ts
│  │  ├─ validation.ts           # zod schemas, tag normalization
│  │  └─ dates.ts                # formatDay(), daysAgo()
│  ├─ components/
│  │  ├─ FolderCard.tsx
│  │  ├─ QuestionCard.tsx
│  │  ├─ SuggestionCard.tsx
│  │  ├─ DifficultyBadge.tsx
│  │  ├─ TagChips.tsx
│  │  ├─ TagInput.tsx
│  │  ├─ Editor.tsx
│  │  ├─ EditorToolbar.tsx
│  │  ├─ Modal.tsx
│  │  ├─ ConfirmDialog.tsx
│  │  ├─ Toast.tsx
│  │  └─ RelativeDate.tsx
│  └─ app/
│     ├─ login/page.tsx
│     ├─ register/page.tsx
│     ├─ (app)/
│     │  ├─ layout.tsx
│     │  ├─ page.tsx                                   # folders
│     │  └─ folders/[folderId]/
│     │     ├─ page.tsx                                # question cards
│     │     └─ questions/[questionId]/page.tsx         # question page
│     └─ api/
│        ├─ auth/{register,login,logout}/route.ts
│        ├─ folders/route.ts
│        ├─ folders/[id]/route.ts
│        ├─ folders/[id]/questions/route.ts
│        ├─ questions/[id]/route.ts
│        ├─ questions/[id]/revise/route.ts
│        ├─ upload/route.ts
│        └─ uploads/[filename]/route.ts
├─ .env.example
└─ README.md
```

---

## 10. Out of scope (don't build in v1)

Sharing, multiple editors, OAuth, email or password reset, spaced-repetition algorithms, cloud storage, nested folders, notifications, mobile app. See §11 for how these could be added later.

---

## 11. Ideas for future improvements

Ordered from most to least useful for DSA prep.

### Revision quality
1. **Confidence rating on revise.** When marking as revised, ask "How well did you remember?" (Again / Hard / Good / Easy). Use it to compute a `nextReviewAt` with a simple spaced-repetition rule (SM-2 or "double the interval on Good"). Then suggest by **most overdue** instead of oldest date.
2. **Revision count and history.** Add a `Revision` table (`questionId`, `revisedAt`, `rating`) to show "Revised 5 times" and a history list.
3. **Global "Today's revision" page.** The top N oldest or overdue questions across all folders, as a daily queue.
4. **Snooze / skip suggestion.** "Not today" moves to the next suggestion without marking as revised.
5. **Hide-answer mode.** Mark a section of the note as "Solution" and keep it collapsed while revising, so recall is tested first.

### Organization and search
6. **Global search** across titles, tags and note content (SQLite FTS5).
7. **Tag pages.** Click a tag to see all questions with it across folders (e.g. every "sliding-window" problem).
8. **Status field:** Todo / Attempted / Solved / Needs review.
9. **Pin or star** important questions.
10. **Sort options** on the folder page: oldest revised, difficulty, newest, A–Z.

### Content
11. **Code blocks with syntax highlighting and language select** (TipTap `CodeBlockLowlight`).
12. **Problem import from link.** Paste a LeetCode URL to auto-fill the title, difficulty and tags.
13. **Templates** for new questions: "Problem / Intuition / Approach / Complexity / Code / Mistakes".
14. **Time and space complexity fields** in the metadata.

### Insights
15. **Dashboard:** counts by difficulty and topic, revision streak, a heatmap of revision activity, and "stale" questions (not revised in 30+ days).
16. **Folder health indicator** on folder cards, e.g. "4 questions not revised in 2+ weeks".

### Data and ops
17. **Export / import** everything as JSON or Markdown (backup).
18. **Deploy:** move to Postgres (Neon or Supabase) and S3/R2 for images, then host on Vercel. Prisma makes the database switch mostly a provider change.
19. **PWA / offline** support for revising on the phone.
20. **Keyboard shortcuts:** `N` for a new question, `R` to mark as revised, `/` to search, `J`/`K` for the next or previous card.
