# Build Spec: "NoteVault" — Personal DSA & CS Notes Web App

> **For the building agent:** Build this app from scratch in this directory, following this spec. Where the spec doesn't decide something, choose the simplest option that fits and write the decision down in `DECISIONS.md`. Build in the phase order in §12. Each phase must run end to end before you start the next one.

---

## 1. Product Summary

This is a private, single-user (multi-user ready) web app for storing study notes: DSA patterns, good questions, OS concepts, DBMS, CN, system design and so on.

- Notes are organised into **Folders** (e.g. `DSA`, `OS`, `DBMS`), and each folder holds **Files** (notes).
- A file is a **rich-text document**: headings, bold, italic, underline, strikethrough, text color, highlight color, lists, checklists, code blocks with syntax highlighting, images, links, tables, quotes and callouts.
- Files open in **View mode** by default. The user switches to **Edit mode** on purpose.
- The app must work and feel good on **mobile (≥360px), tablet (≥768px) and laptop (≥1024px)**, with both touch and mouse/keyboard.
- **Simple login** (username + password). Every page except login needs a session.

---

## 2. Tech Stack (use exactly this unless blocked)

| Concern | Choice | Notes |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | One codebase for UI and API |
| Styling | **Tailwind CSS v4** + **shadcn/ui** | Use Radix-based components for dialogs, dropdowns and sheets |
| Icons | **lucide-react** | |
| Rich text editor | **Tiptap v2** (ProseMirror) | Store content as Tiptap JSON |
| Code highlighting | `@tiptap/extension-code-block-lowlight` + `lowlight` | Languages: cpp, java, python, javascript, typescript, go, sql, bash |
| Database | **SQLite via Prisma** (dev and default prod) | Must switch to Postgres by changing `DATABASE_URL` + provider only |
| Auth | Credentials (username/password), **bcrypt** hashing, **iron-session** encrypted HTTP-only cookie | No OAuth in v1 |
| Image storage | Local disk `./uploads` served via an authenticated route | Put storage behind a `StorageAdapter` interface so S3/R2 can be added later |
| Validation | **zod** | On every API input |
| Data fetching | **TanStack Query** | Caching, optimistic updates |
| Testing | **Vitest** (unit) + **Playwright** (e2e, mobile + desktop viewports) | |
| Package manager | **pnpm** | |

---

## 3. Data Model (Prisma)

```prisma
model User {
  id           String   @id @default(cuid())
  username     String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  folders      Folder[]
}

model Folder {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name      String                 // 1–50 chars, unique per user (case-insensitive)
  icon      String   @default("folder")   // lucide icon name, e.g. "binary", "cpu", "database"
  color     String   @default("#6366f1")  // hex accent for the folder tile
  position  Int      @default(0)          // manual ordering on home page
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  files     File[]
  @@index([userId])
}

model File {
  id          String   @id @default(cuid())
  folderId    String
  folder      Folder   @relation(fields: [folderId], references: [id], onDelete: Cascade)
  title       String                // 1–120 chars
  content     String   @default("{\"type\":\"doc\",\"content\":[]}") // Tiptap JSON (string for SQLite)
  plainText   String   @default("")  // derived on save, used for search + previews
  tags        String   @default("")  // comma-separated in v1 (e.g. "sliding-window,medium")
  pinned      Boolean  @default(false)
  position    Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  images      Image[]
  @@index([folderId])
}

model Image {
  id        String   @id @default(cuid())
  fileId    String?
  file      File?    @relation(fields: [fileId], references: [id], onDelete: SetNull)
  userId    String
  path      String              // relative path within storage
  mimeType  String
  sizeBytes Int
  createdAt DateTime @default(now())
}
```

**Rules**
- Every query must be scoped by `userId` (ownership check). A user must never be able to read or change another user's data, even by guessing IDs.
- Deleting a folder cascades to its files. The UI must show a confirmation dialog that states how many files will be deleted.
- `plainText` is regenerated on the server from the Tiptap JSON on every save.

---

## 4. Authentication

### 4.1 Behaviour
- `/login` page: username + password fields, a "Remember me" checkbox, and a submit button.
- **No public sign-up in v1.** The first user is created in one of two ways:
  - a CLI seed script: `pnpm user:create <username> <password>`, **or**
  - a first-run setup: if there are no users in the DB, `/login` shows "Create your account" instead. That form disappears once one user exists.
- Session cookie: HTTP-only, `Secure` in production, `SameSite=Lax`. Lifetime is 7 days, or 30 days with "Remember me".
- `/logout` clears the session.
- Next.js `middleware.ts` redirects unauthenticated requests to `/login?next=<path>`. API routes return `401` JSON.

### 4.2 Security requirements
- bcrypt cost 12.
- Rate-limit login: 5 failed attempts per username+IP per 15 minutes, then return `429`. An in-memory limiter is fine for v1.
- Use the same generic error for a wrong username and a wrong password ("Invalid username or password").
- `SESSION_SECRET` comes from env (≥32 chars). Refuse to start without it.
- CSRF: rely on SameSite=Lax and check the `Origin` header on all mutating API routes.

---

## 5. Pages & Routes

| Route | Purpose |
|---|---|
| `/login` | Login / first-run account creation |
| `/` | **Home**: grid of folder tiles |
| `/f/[folderId]` | **Folder view**: list of files in the folder |
| `/f/[folderId]/[fileId]` | **File view/edit** |
| `/search?q=` | Global search results |
| `/settings` | Change password, theme, export data, logout |

### API (Route Handlers under `/app/api`)
```
POST   /api/auth/login            { username, password, remember }
POST   /api/auth/logout
POST   /api/auth/setup            (only works when 0 users exist)
GET    /api/folders               → folders with fileCount, updatedAt
POST   /api/folders               { name, icon, color }
PATCH  /api/folders/:id           { name?, icon?, color?, position? }
DELETE /api/folders/:id
POST   /api/folders/reorder       { orderedIds: string[] }
GET    /api/folders/:id/files     → files (id, title, tags, pinned, updatedAt, preview[0..160 chars of plainText])
POST   /api/folders/:id/files     { title }
GET    /api/files/:id             → full file incl. content
PATCH  /api/files/:id             { title?, content?, tags?, pinned?, folderId? (move) }
DELETE /api/files/:id
POST   /api/files/:id/duplicate
POST   /api/uploads               multipart image → { id, url }
GET    /api/uploads/:id           streams image (auth + ownership checked)
GET    /api/search?q=             → matches across title, tags, plainText with highlighted snippet
GET    /api/export                → zip of all notes as Markdown + images
```

---

## 6. Screens in Detail

### 6.1 Home (`/`)
- Header: app name/logo on the left. On the right: a search icon (it expands to a search bar on tablet and laptop), a theme toggle and an avatar menu (Settings, Logout).
- Title: **"Choose your folder"**.
- **Big folder tiles** in a responsive grid:
  - Mobile: 2 columns. Tablet: 3–4 columns. Laptop: 4–6 columns.
  - Each tile is at least 140×140px on mobile, with a large icon (48px+), the folder name, a file count and "updated X ago".
  - The tile uses the folder's accent color (soft tinted background, colored icon).
  - The whole tile is the tap target. It shows hover/press feedback.
- **"+ Add Folder" tile** is always the last tile, with a dashed border. It opens a dialog with:
  - Name (required).
  - Icon picker: a grid of about 30 curated lucide icons suited to CS topics (binary, cpu, database, network, layers, git-branch, tree-pine, brain, code, terminal, book, puzzle, …).
  - Color picker: 10 preset swatches plus a custom hex value.
- **Tile actions** come from a kebab menu on the tile (long-press on touch): Rename, Change icon/color, Delete.
- **Reorder mode**: an "Edit layout" button. When on, tiles wiggle or show handles and can be dragged to reorder with `@dnd-kit` (works with touch).
- **Recently edited** strip under the grid: the 5 most recently updated files across all folders, shown as horizontally scrollable cards.
- **Empty state** for a new user: a friendly illustration or icon, the text "Create your first folder", and suggested quick-add chips: `DSA`, `OS`, `DBMS`, `CN`, `System Design`, `OOP`.

### 6.2 Folder view (`/f/[folderId]`)
- Breadcrumb: `Home / DSA`.
- Folder header shows the icon, the name and the file count.
- **"+ New File"** button: a primary button on desktop and a floating action button on mobile.
- File list:
  - Cards on mobile and a list/grid toggle on larger screens. Each item shows the title, tags as chips, a preview line and the updated time.
  - Pinned files come first, under a "Pinned" subheading.
  - Sort options: Manual, Last updated, Title A–Z, Created.
  - Filter by tag (chips across the top).
- Per-file actions: Open, Rename, Pin/Unpin, Duplicate, Move to folder…, Delete (with confirmation).
- On laptop (≥1024px) the app may use a **two-pane layout**: a collapsible sidebar with the folder tree and the file list on the left, and the open file on the right. On tablet the sidebar is collapsible. On mobile it is a slide-in sheet.

### 6.3 File view / edit (`/f/[folderId]/[fileId]`)

**View mode (default)**
- Clean reading layout. Max content width is about 760px, centred, with a comfortable font size (17–18px on mobile).
- The editor is rendered read-only (`editable: false`) so the rendering matches edit mode exactly.
- Links open in a new tab. Tapping an image opens a fullscreen lightbox with pinch-zoom.
- A floating **auto-generated Table of Contents** built from H1–H3 headings: a sidebar on laptop and a dropdown button on mobile/tablet.
- Top bar: back button, title, **Edit** button (pencil icon), and a kebab menu (Pin, Duplicate, Move, Export as Markdown, Print, Delete).
- Keyboard: `E` switches to edit mode.

**Edit mode**
- Toggle with the Edit/Done button. On desktop, `Ctrl/Cmd+E` also toggles. The mode is reflected in the URL as `?mode=edit` so it survives a refresh.
- The title becomes an editable inline input.
- **Toolbar**:
  - Desktop/tablet: sticky at the top of the editor.
  - Mobile: sticky **above the on-screen keyboard** (use the `visualViewport` API), horizontally scrollable, with grouped dropdowns.
- Toolbar features:
  - Undo / Redo
  - Block type: Paragraph, H1, H2, H3
  - **Bold**, *Italic*, Underline, Strikethrough, Inline code
  - **Text color**: palette of about 10 colors plus reset
  - **Highlight**: palette of about 6 highlight colors (yellow, green, blue, pink, orange, purple) plus remove
  - Bullet list, Numbered list, Checklist (task list)
  - Blockquote, **Callout** (custom node with variants: 💡 Tip, ⚠️ Warning, 📌 Key Idea, ❌ Mistake). Each variant has its own tinted background.
  - Code block with a language dropdown
  - Link (insert/edit/remove via popover; validate the URL and auto-prefix `https://`)
  - Image (upload from device or camera on mobile, paste from clipboard, drag & drop)
  - Table (insert 3×3, add/remove rows and columns)
  - Horizontal rule
  - Clear formatting
- **Bubble menu** on text selection with Bold, Italic, Underline, Color, Highlight and Link. This is important on touch devices.
- **Slash command menu**: typing `/` at the start of a line opens a filterable menu of block types.
- **Markdown shortcuts**: `# `, `## `, `- `, `1. `, `[] `, `> `, ``` ``` ```, `**bold**`, `==highlight==`.
- Keyboard shortcuts: Ctrl/Cmd + B / I / U, Ctrl+K (link), Ctrl+Shift+H (highlight), Ctrl+Z / Ctrl+Shift+Z.
- **Images**:
  - Client-side resize/compress before upload: max 2000px on the long edge, WebP at quality 0.85.
  - Max upload 10MB after compression. Allowed types: png, jpg, jpeg, webp, gif.
  - Show an upload progress placeholder inside the editor.
  - The image can be resized (small / medium / full width) and given an optional caption.
- **Autosave**:
  - Debounced 1.5s after the last change, plus a save on blur and on `visibilitychange` to hidden.
  - Status indicator: "Saving…", "Saved ✓", "Offline – changes kept locally".
  - Keep a draft in `localStorage` keyed by fileId until the server confirms the save. If a newer local draft is found on load, offer to restore it.
- **Unsaved-changes guard** on navigation while a save is pending.
- Tab/Shift+Tab indents and outdents list items.

---

## 7. Responsive & Touch Requirements

| Breakpoint | Layout |
|---|---|
| < 640px (mobile) | Single column, bottom-safe-area-aware FAB, sheets instead of popovers/side panels, toolbar above keyboard |
| 640–1023px (tablet) | 3–4 col grid, collapsible sidebar, toolbar sticky top, supports both portrait & landscape |
| ≥ 1024px (laptop) | Optional persistent sidebar, two-pane folder/file layout, keyboard shortcuts with hint tooltips |

- All tap targets ≥ 44×44px.
- Respect `env(safe-area-inset-*)` on iOS.
- No hover-only features: everything available on hover must also be reachable by tap or long-press.
- Test in Playwright on viewports **390×844 (iPhone)**, **820×1180 (iPad)** and **1440×900 (laptop)**.
- **PWA**: web manifest, app icons, installable, with a service worker that caches the app shell and the last-opened files for offline reading (`@serwist/next` or equivalent).

---

## 8. Design System

- **Light and dark themes**, defaulting to the system setting, with a toggle in the header and in settings. Use `next-themes`.
- Fonts: **Inter** for UI and body text, **JetBrains Mono** for code.
- Use neutral greys for the base and the folder accent colors for personality.
- Text colors and highlight colors in notes must stay readable in **both** themes. Store semantic color names (e.g. `red`, `yellow`) in marks, not raw hex, and map each name to theme-appropriate hex in CSS.
- Subtle motion only: 150–200ms transitions, and honour `prefers-reduced-motion`.
- Accessibility: WCAG AA contrast, full keyboard navigation, visible focus rings, ARIA labels on icon buttons, and screen-reader text on the save status.

---

## 9. Search

- Global search is reachable from the header and with `Ctrl/Cmd+K`, which opens a command palette (shadcn `Command`).
- It searches folder names, file titles, tags and `plainText`.
- v1: SQL `LIKE` over lowercased text is acceptable. Structure the code so SQLite FTS5 or Postgres `tsvector` can be swapped in later.
- Results are grouped by folder and show the matched snippet with the query highlighted. Selecting a result opens the file and scrolls to the first match.

---

## 10. Non-Functional Requirements

- **Performance**: home page LCP < 1.5s on a mid-range phone. Lazy-load the editor bundle (`next/dynamic`) so view mode stays light. Lazy-load images.
- **Reliability**: no data loss on refresh, tab close or a brief offline period (see Autosave).
- **Sanitisation**: content is Tiptap JSON rendered through the schema, so raw HTML is never injected. On save, the server validates that the JSON parses against the Tiptap schema and caps its size at 2MB. Link `href`s are limited to `http`, `https` and `mailto`.
- **Backups**: `GET /api/export` produces a zip with `/<Folder>/<File>.md` plus an `/images` folder. Also provide `pnpm db:backup`, which copies the SQLite file to `./backups/<timestamp>.db`.
- **Config** via `.env`:
  ```
  DATABASE_URL="file:./data/app.db"
  SESSION_SECRET="<32+ random chars>"
  UPLOAD_DIR="./uploads"
  NODE_ENV=development
  ```
  Provide `.env.example`.

---

## 11. Project Structure

```
/app
  /(auth)/login/page.tsx
  /(app)/layout.tsx              # header, sidebar, providers
  /(app)/page.tsx                # home
  /(app)/f/[folderId]/page.tsx
  /(app)/f/[folderId]/[fileId]/page.tsx
  /(app)/search/page.tsx
  /(app)/settings/page.tsx
  /api/...                       # route handlers (see §5)
/components
  /folders  (FolderTile, AddFolderDialog, IconPicker, ColorPicker)
  /files    (FileCard, FileList, MoveFileDialog)
  /editor   (NoteEditor, Toolbar, BubbleMenu, SlashMenu, extensions/Callout.ts, ImageUpload.ts, TOC)
  /ui       (shadcn components)
/lib
  auth.ts, session.ts, db.ts, storage/ (StorageAdapter, LocalStorage), tiptap-to-markdown.ts, plaintext.ts, rate-limit.ts, validators.ts
/prisma
  schema.prisma, seed.ts
/scripts
  create-user.ts, backup-db.ts
/tests
  unit/, e2e/
middleware.ts
README.md
DECISIONS.md
```

---

## 12. Build Phases & Acceptance Criteria

### Phase 1: Foundation
- Next.js + TS + Tailwind + shadcn + Prisma (SQLite) set up. Lint and format pass.
- Auth: login, logout, first-run setup, middleware protection, rate limit, `user:create` script.
- ✅ *Accept:* An unauthenticated visit to `/` redirects to `/login`. After login the user lands on `/`. A wrong password shows a generic error. The 6th rapid failed attempt returns 429.

### Phase 2: Folders
- Home grid, add/rename/recolor/delete folder, reorder with drag & drop, empty state, quick-add chips.
- ✅ *Accept:* Folder CRUD works on all 3 viewports. Order persists after reload. Deleting a folder shows the file-count confirmation.

### Phase 3: Files + Editor
- Folder view, file CRUD, pin, duplicate, move, sort, tag filter.
- Tiptap editor with **all** toolbar features in §6.3, view/edit modes, autosave with local draft recovery, image upload.
- ✅ *Accept:* A file created with bold, underline, a red text color, a yellow highlight, a link, a C++ code block, an image, a table, a checklist and a callout renders identically after reload in view mode, in both light and dark themes. Content survives killing the tab 2s after typing.

### Phase 4: Search, Recents, TOC
- Command palette search, recent files strip, table of contents.
- ✅ *Accept:* Searching a word that appears only in a file body finds that file, shows the snippet and opens the file scrolled to the match.

### Phase 5: Polish
- PWA + offline reading, Markdown export (single file + full zip), print stylesheet, settings page (change password, theme), accessibility pass, Playwright e2e on 3 viewports.
- ✅ *Accept:* Lighthouse mobile scores: Performance ≥ 85, Accessibility ≥ 95, PWA installable. All e2e tests pass.

---

## 13. Deliverables
1. Working app in this directory, runnable with:
   ```
   pnpm install
   cp .env.example .env   # set SESSION_SECRET
   pnpm db:migrate
   pnpm user:create admin <password>
   pnpm dev
   ```
2. `README.md` with setup, scripts, deployment notes (Docker + a single-VPS guide; also note Vercel + Postgres + R2 as an alternative).
3. A `Dockerfile` with a volume for `/data` and `/uploads`.
4. `DECISIONS.md` recording every choice not dictated by this spec.
5. Tests: unit tests for `plaintext`, `tiptap-to-markdown`, the validators and the rate limiter. Playwright e2e for the login → create folder → create file → format → reload → verify flow on all 3 viewports.

## 14. Out of Scope for v1 (do NOT build yet)
- Sharing or public links, real-time collaboration, OAuth or email login, nested folders, spaced-repetition review, AI features. See §15 for the roadmap; keep the data model friendly to these additions.

---

## 15. Future Roadmap (for context only — design so these are easy to add later)
1. **Nested folders**: add `parentId` on Folder.
2. **Question-tracker template**: a file type with structured fields (problem link, difficulty, pattern, time/space complexity, status Solved/Revisit, last revised date).
3. **Spaced repetition / "Revise today"**: mark a file or a callout as a flashcard and schedule reviews (SM-2).
4. **Version history**: snapshot content every N minutes or on manual "Save version", with diff view and restore.
5. **Backlinks / wiki-links** `[[Two Pointers]]` between notes, plus a graph view.
6. **Excalidraw/whiteboard embed** for drawing trees, graphs and DP tables.
7. **Math (KaTeX)** for complexity formulas and recurrences.
8. **Mermaid diagrams** in code blocks.
9. **AI helpers**: "Summarize this note", "Generate 5 quiz questions", "Explain this code", plus semantic search over notes.
10. **Read-only share links** for a single file or folder.
11. **Progress dashboard**: problems solved per pattern, revision streaks, heatmap.
12. **Import** from Markdown or Notion export, and LeetCode problem auto-fill from a URL.
