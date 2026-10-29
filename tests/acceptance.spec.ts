import { execSync } from "node:child_process";
import http from "node:http";
import path from "node:path";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { E2E_DB_URL } from "../playwright.config";

// One fresh user per test keeps tests independent.
const uid = () => Math.random().toString(36).slice(2, 10);
const PNG = path.resolve(__dirname, "fixtures", "dot.png");

async function register(request: APIRequestContext) {
  const username = `user_${uid()}`;
  const res = await request.post("/api/auth/register", { data: { username, password: "secret123" } });
  expect(res.status()).toBe(201);
  return username;
}

async function createFolder(request: APIRequestContext, name = `Folder ${uid()}`) {
  const res = await request.post("/api/folders", { data: { name } });
  expect(res.status()).toBe(201);
  return (await res.json()) as { id: string; name: string };
}

async function createQuestion(request: APIRequestContext, folderId: string, title: string, extra = {}) {
  const res = await request.post(`/api/folders/${folderId}/questions`, { data: { title, ...extra } });
  expect(res.status()).toBe(201);
  return (await res.json()) as { id: string; lastRevisedAt: string };
}

const todayLabel = () =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date());

test("1. Auth: protected routes redirect to /login; after login the page loads", async ({ page }) => {
  await page.goto("/folders/x");
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get("/api/folders")).status()).toBe(401);

  // Register through the UI, log out, log back in.
  const username = `user_${uid()}`;
  await page.goto("/register");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill("secret123");
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page.getByRole("heading", { name: "Folders" })).toBeVisible();
  const folder = await createFolder(page.request);

  const cookie = (await page.context().cookies()).find((c) => c.name === "session")!;
  expect(cookie.httpOnly).toBe(true);
  expect(cookie.sameSite).toBe("Lax");

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto(`/folders/${folder.id}`);
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("Invalid username or password")).toBeVisible();
  await page.getByLabel("Password").fill("secret123");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "Folders" })).toBeVisible();
  await page.goto(`/folders/${folder.id}`);
  await expect(page.getByRole("heading", { name: folder.name })).toBeVisible();
});

test("2. Isolation: user B gets 404 for user A's folders, questions and images", async ({ browser }) => {
  const a = await browser.newContext();
  const b = await browser.newContext();
  await register(a.request);
  await register(b.request);

  const folder = await createFolder(a.request);
  const q = await createQuestion(a.request, folder.id, "Secret question");
  const upload = await a.request.post("/api/upload", {
    multipart: { file: { name: "dot.png", mimeType: "image/png", buffer: require("fs").readFileSync(PNG) } },
  });
  expect(upload.status()).toBe(201);
  const { url } = await upload.json();
  expect((await a.request.get(url)).status()).toBe(200);

  const checks: [string, Promise<{ status(): number }>][] = [
    ["GET folder questions", b.request.get(`/api/folders/${folder.id}/questions`)],
    ["PATCH folder", b.request.patch(`/api/folders/${folder.id}`, { data: { name: "x" } })],
    ["DELETE folder", b.request.delete(`/api/folders/${folder.id}`)],
    ["POST question", b.request.post(`/api/folders/${folder.id}/questions`, { data: { title: "x" } })],
    ["GET question", b.request.get(`/api/questions/${q.id}`)],
    ["PATCH question", b.request.patch(`/api/questions/${q.id}`, { data: { title: "x" } })],
    ["DELETE question", b.request.delete(`/api/questions/${q.id}`)],
    ["POST revise", b.request.post(`/api/questions/${q.id}/revise`)],
    ["GET image", b.request.get(url)],
  ];
  for (const [label, req] of checks) expect((await req).status(), label).toBe(404);
  expect(await (await b.request.get("/api/folders")).json()).toEqual([]);

  const page = await b.newPage();
  await page.goto(`/folders/${folder.id}`);
  await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible();
  await page.goto(`/folders/${folder.id}/questions/${q.id}`);
  await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible();
  await a.close();
  await b.close();
});

test("3. Folders: create, rename and delete (cascades to questions)", async ({ page }) => {
  await register(page.request);
  await page.goto("/");
  await expect(page.getByText("No folders yet. Create one for each topic (e.g. Arrays, Graphs).")).toBeVisible();

  for (const name of ["Arrays", "Graphs"]) {
    await page.getByRole("button", { name: "+ New folder" }).click();
    await page.getByLabel("Folder name").fill(name);
    await page.getByLabel("Folder name").press("Enter");
    await expect(page.getByRole("link", { name: new RegExp(`^${name}`) })).toBeVisible();
  }

  await page.getByRole("button", { name: "Actions for Graphs" }).click();
  await page.getByRole("menuitem", { name: "Rename" }).click();
  await page.getByLabel("Folder name").fill("Trees");
  await page.getByLabel("Folder name").press("Enter");
  await expect(page.getByRole("link", { name: /^Trees/ })).toBeVisible();

  // Persisted
  await page.reload();
  await expect(page.getByRole("link", { name: /^Arrays/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Trees/ })).toBeVisible();

  // Delete a folder with questions → its questions are gone too
  const folders = (await (await page.request.get("/api/folders")).json()) as { id: string; name: string }[];
  const arrays = folders.find((f) => f.name === "Arrays")!;
  const q = await createQuestion(page.request, arrays.id, "Two Sum");
  await page.reload();
  await page.getByRole("button", { name: "Actions for Arrays" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await expect(page.getByText("Delete folder and all 1 questions?")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("link", { name: /^Arrays/ })).toHaveCount(0);
  expect((await page.request.get(`/api/questions/${q.id}`)).status()).toBe(404);
});

test("4. Metadata: new question shows today; editing tags/difficulty/content keeps the date", async ({ page }) => {
  await register(page.request);
  const folder = await createFolder(page.request);
  await page.goto(`/folders/${folder.id}`);

  await page.getByRole("button", { name: "+ New question" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title").fill("Valid Parentheses");
  await dialog.getByLabel("Link").fill("https://leetcode.com/problems/valid-parentheses/");
  await dialog.getByRole("radio", { name: "Easy" }).click();
  await expect(dialog.getByRole("radio", { name: "Easy" })).toHaveAttribute("aria-checked", "true");
  await dialog.getByLabel("Add tag").fill("Stack");
  await dialog.getByLabel("Add tag").press("Enter");
  await dialog.getByRole("button", { name: "Create" }).click();

  await expect(page).toHaveURL(/\/questions\//);
  await expect(page.getByTestId("last-revised")).toHaveText(`Last revised: ${todayLabel()}`);
  await expect(page.getByRole("link", { name: "Open problem ↗" })).toHaveAttribute("target", "_blank");
  const questionId = page.url().split("/questions/")[1].split("?")[0];
  const before = (await (await page.request.get(`/api/questions/${questionId}`)).json()).lastRevisedAt;

  // Tags are normalized by the API
  const patched = await page.request.patch(`/api/questions/${questionId}`, {
    data: { tags: ["  Two Pointers ", "two pointers", "HASHING"] },
  });
  expect((await patched.json()).tags).toEqual(["two-pointers", "hashing"]);

  // Edit through the UI: difficulty, tags, content
  await page.reload();
  await expect(page.getByRole("radio", { name: "Easy" })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("radio", { name: "Hard" }).click();
  await page.getByLabel("Add tag").fill("strings");
  await page.getByLabel("Add tag").press("Enter");
  await page.getByTestId("editor").click();
  await page.keyboard.type("Use a stack of open brackets.");
  await expect(page.getByTestId("save-status")).toHaveText("Saved");

  const after = await (await page.request.get(`/api/questions/${questionId}`)).json();
  expect(after.difficulty).toBe("Hard");
  expect(after.tags).toContain("strings");
  expect(after.lastRevisedAt).toBe(before);

  // PATCH can't set lastRevisedAt directly
  const sneaky = await page.request.patch(`/api/questions/${questionId}`, {
    data: { lastRevisedAt: "2000-01-01T00:00:00.000Z" },
  });
  expect(sneaky.status()).toBe(400);
  expect((await (await page.request.get(`/api/questions/${questionId}`)).json()).lastRevisedAt).toBe(before);
});

test("5. Suggestion ordering: Q1 → Q2 → Q3 → Q1, updated without reloading", async ({ page }) => {
  await register(page.request);
  const folder = await createFolder(page.request);
  for (const t of ["Q1", "Q2", "Q3"]) await createQuestion(page.request, folder.id, t);

  await page.goto(`/folders/${folder.id}`);
  const card = page.getByTestId("suggestion-card");
  const title = page.getByTestId("suggestion-title");
  await expect(title).toHaveText("Q1");

  let navigations = 0;
  page.on("framenavigated", (f) => f === page.mainFrame() && navigations++);

  for (const nextTitle of ["Q2", "Q3", "Q1"]) {
    await card.getByRole("button", { name: "Mark as revised" }).click();
    await expect(page.getByText("Marked as revised ✓").last()).toBeVisible();
    await expect(title).toHaveText(nextTitle);
  }
  expect(navigations).toBe(0);
  // All questions are still listed, and the revised ones say so
  await expect(page.getByTestId("question-card")).toHaveCount(3);
  await expect(page.getByTestId("question-card").first()).toContainText("Revised today");
});

test("6. Suggestion picks a question with a manually set older date", async ({ page }) => {
  await register(page.request);
  const folder = await createFolder(page.request);
  await createQuestion(page.request, folder.id, "Q1");
  await createQuestion(page.request, folder.id, "Q2");
  const q3 = await createQuestion(page.request, folder.id, "Q3");

  execSync(`npx tsx scripts/set-last-revised.ts ${q3.id} 30`, {
    env: { ...process.env, DATABASE_URL: E2E_DB_URL, DATABASE_URL_UNPOOLED: E2E_DB_URL },
  });

  await page.goto(`/folders/${folder.id}`);
  await expect(page.getByTestId("suggestion-title")).toHaveText("Q3");
  await expect(page.getByTestId("suggestion-card")).toContainText("(30 days ago)");
  const api = await (await page.request.get(`/api/folders/${folder.id}/questions`)).json();
  expect(api.suggestion.title).toBe("Q3");
  expect(api.questions.map((q: { title: string }) => q.title)).toEqual(["Q3", "Q1", "Q2"]);
});

test("7. Revise from page: date updates and Next suggestion goes to the new oldest", async ({ page }) => {
  await register(page.request);
  const folder = await createFolder(page.request);
  const q1 = await createQuestion(page.request, folder.id, "Q1");
  await createQuestion(page.request, folder.id, "Q2");
  execSync(`npx tsx scripts/set-last-revised.ts ${q1.id} 10`, {
    env: { ...process.env, DATABASE_URL: E2E_DB_URL, DATABASE_URL_UNPOOLED: E2E_DB_URL },
  });

  await page.goto(`/folders/${folder.id}`);
  await page.getByRole("link", { name: "Open suggested question: Q1" }).click();
  await expect(page).toHaveURL(new RegExp(`/questions/${q1.id}\\?from=suggestion$`));
  await expect(page.getByTestId("last-revised")).not.toContainText(todayLabel());

  await page.getByRole("button", { name: "Mark as revised today" }).click();
  await expect(page.getByText("Marked as revised ✓")).toBeVisible();
  await expect(page.getByTestId("last-revised")).toHaveText(`Last revised: ${todayLabel()}`);

  await page.getByRole("link", { name: "Next suggestion →" }).click();
  await expect(page).toHaveURL(/from=suggestion$/);
  await expect(page.getByLabel("Title")).toHaveValue("Q2");

  // Without ?from=suggestion the button is still there, but no "Next suggestion" link appears
  await page.goto(`/folders/${folder.id}/questions/${q1.id}`);
  await page.getByRole("button", { name: "Mark as revised today" }).click();
  await expect(page.getByText("Marked as revised ✓")).toBeVisible();
  await expect(page.getByRole("link", { name: "Next suggestion →" })).toHaveCount(0);
});

async function pasteImage(page: Page) {
  const b64 = require("fs").readFileSync(PNG).toString("base64");
  await page.getByTestId("editor").evaluate((el, data) => {
    const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    const dt = new DataTransfer();
    dt.items.add(new File([bytes], "pasted.png", { type: "image/png" }));
    el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  }, b64);
}

test("8. Editor: bold, code block, two highlights, pasted image and link persist", async ({ page }) => {
  await register(page.request);
  const folder = await createFolder(page.request);
  const q = await createQuestion(page.request, folder.id, "Editor test");
  await page.goto(`/folders/${folder.id}/questions/${q.id}`);

  const editor = page.getByTestId("editor");
  await editor.click();
  const toolbar = page.getByRole("toolbar", { name: "Formatting" });

  await toolbar.getByRole("button", { name: "Bold" }).click();
  await page.keyboard.type("boldword");
  await toolbar.getByRole("button", { name: "Bold" }).click();
  await page.keyboard.press("Enter");

  await toolbar.getByRole("button", { name: "Highlight yellow" }).click();
  await page.keyboard.type("yellowtext");
  await toolbar.getByRole("button", { name: "Highlight yellow" }).click();
  await page.keyboard.type(" ");
  await toolbar.getByRole("button", { name: "Highlight green" }).click();
  await page.keyboard.type("greentext");
  await toolbar.getByRole("button", { name: "Highlight green" }).click();
  await page.keyboard.press("Enter");

  page.once("dialog", (d) => d.accept("example.com"));
  await toolbar.getByRole("button", { name: "Link" }).click();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");

  await toolbar.getByRole("button", { name: "Code block" }).click();
  await page.keyboard.type("int main() { return 0; }");

  await pasteImage(page);
  await expect(editor.locator('img[src^="/api/uploads/"]')).toBeVisible();
  await expect(page.getByTestId("save-status")).toHaveText("Saved");

  await page.reload();
  await expect(editor.locator("strong", { hasText: "boldword" })).toBeVisible();
  await expect(editor.locator('mark[data-color="#fef08a"]', { hasText: "yellowtext" })).toBeVisible();
  await expect(editor.locator('mark[data-color="#bbf7d0"]', { hasText: "greentext" })).toBeVisible();
  await expect(editor.locator('a[href="https://example.com"]')).toBeVisible();
  await expect(editor.locator("pre code")).toContainText("int main()");
  await expect(editor.locator('img[src^="/api/uploads/"]')).toBeVisible();
});

test("9. Upload safety: .txt, >5 MB and path traversal are rejected", async ({ page, baseURL }) => {
  await register(page.request);
  const txt = await page.request.post("/api/upload", {
    multipart: { file: { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") } },
  });
  expect(txt.status()).toBe(415);

  // A .txt renamed and labelled as PNG is also rejected (content is checked)
  const fake = await page.request.post("/api/upload", {
    multipart: { file: { name: "x.png", mimeType: "image/png", buffer: Buffer.from("not an image") } },
  });
  expect(fake.status()).toBe(415);

  const big = Buffer.alloc(5 * 1024 * 1024 + 1);
  require("fs").readFileSync(PNG).copy(big);
  const tooBig = await page.request.post("/api/upload", {
    multipart: { file: { name: "big.png", mimeType: "image/png", buffer: big } },
  });
  expect(tooBig.status()).toBe(413);

  // Raw paths (not normalised by the client) must never serve .env
  const cookie = (await page.context().cookies()).find((c) => c.name === "session")!;
  const url = new URL(baseURL!);
  for (const p of ["/api/uploads/../.env", "/api/uploads/..%2F.env", "/api/uploads/..%2F..%2F.env"]) {
    const { status, body } = await new Promise<{ status: number; body: string }>((resolve, reject) => {
      http
        .get({ host: url.hostname, port: url.port, path: p, headers: { Cookie: `session=${cookie.value}` } }, (res) => {
          let body = "";
          res.on("data", (c) => (body += c));
          res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
        })
        .on("error", reject);
    });
    expect(status, p).not.toBe(200);
    expect(body, p).not.toContain("AUTH_SECRET");
  }
});

test("10. Empty folder: the suggestion card shows the empty-state message", async ({ page }) => {
  await register(page.request);
  const folder = await createFolder(page.request);
  await page.goto(`/folders/${folder.id}`);
  await expect(page.getByTestId("suggestion-card")).toContainText(
    "Add a question to get revision suggestions.",
  );
  const api = await (await page.request.get(`/api/folders/${folder.id}/questions`)).json();
  expect(api).toEqual({ suggestion: null, questions: [] });
});

test("Filters don't affect the suggestion card", async ({ page }) => {
  await register(page.request);
  const folder = await createFolder(page.request);
  await createQuestion(page.request, folder.id, "Binary Search", { tags: ["search"] });
  await createQuestion(page.request, folder.id, "Merge Intervals", { tags: ["sorting"] });
  await page.goto(`/folders/${folder.id}`);

  await page.getByLabel("Search questions by title").fill("merge");
  await expect(page.getByTestId("question-card")).toHaveCount(1);
  await expect(page.getByTestId("suggestion-title")).toHaveText("Binary Search");

  await page.getByLabel("Search questions by title").fill("");
  await page.getByRole("button", { name: "Filter by tag" }).click();
  await page.getByRole("option", { name: /sorting/ }).click();
  await expect(page.getByRole("button", { name: "Filter by tag" })).toHaveText("sorting");
  await expect(page.getByTestId("question-card")).toHaveCount(1);
  await expect(page.getByTestId("suggestion-title")).toHaveText("Binary Search");
});

test("Register requires a password of at least 6 characters", async ({ request }) => {
  const short = await request.post("/api/auth/register", { data: { username: `u_${uid()}`, password: "12345" } });
  expect(short.status()).toBe(400);
});

test("Theme toggle: top right on every screen, remembered across reloads", async ({ page }) => {
  await page.goto("/login");
  const html = page.locator("html");
  const toggle = page.getByTestId("theme-toggle");
  await expect(toggle).toBeVisible();
  const startsDark = (await html.getAttribute("class"))?.includes("dark") ?? false;

  await toggle.click();
  await expect(html).toHaveClass(startsDark ? /^(?!.*dark)/ : /dark/);
  await page.reload();
  await expect(html).toHaveClass(startsDark ? /^(?!.*dark)/ : /dark/);

  // Also in the app's top bar, next to Logout
  await register(page.request);
  await page.goto("/");
  const box = await page.getByTestId("theme-toggle").boundingBox();
  const viewport = page.viewportSize()!;
  expect(box!.x).toBeGreaterThan(viewport.width / 2);
  expect(box!.y).toBeLessThan(60);
  await page.getByTestId("theme-toggle").click();
  await expect(html).toHaveClass(startsDark ? /dark/ : /^(?!.*dark)/);
});

test("Pattern toggle adds/removes a question from Famous Patterns (linked, not copied)", async ({ page }) => {
  await register(page.request);
  const arrays = await createFolder(page.request, "Arrays");
  const graphs = await createFolder(page.request, "Graphs");
  const twoSum = await createQuestion(page.request, arrays.id, "Two Sum");
  await createQuestion(page.request, arrays.id, "Rotate Array");
  const bfs = await createQuestion(page.request, graphs.id, "BFS Grid");

  await page.goto("/");
  await expect(page.getByTestId("patterns-card")).toContainText("0 questions");

  // Toggle on from the folder's question cards
  await page.goto(`/folders/${arrays.id}`);
  const twoSumCard = page.getByTestId("question-card").filter({ hasText: "Two Sum" });
  await twoSumCard.getByTestId("pattern-toggle").click();
  await expect(page.getByText("Added to Famous Patterns ★")).toBeVisible();
  await expect(twoSumCard.getByTestId("pattern-toggle")).toHaveAttribute("aria-checked", "true");
  await expect(page).toHaveURL(new RegExp(`/folders/${arrays.id}$`)); // the toggle didn't open the card

  // Toggle on from the question page
  await page.goto(`/folders/${graphs.id}/questions/${bfs.id}`);
  await page.getByTestId("pattern-toggle").click();
  await expect(page.getByTestId("pattern-toggle")).toHaveAttribute("aria-checked", "true");

  await page.goto("/");
  await expect(page.getByTestId("patterns-card")).toContainText("2 questions");
  await page.getByTestId("patterns-card").click();
  await expect(page.getByRole("heading", { name: /Famous Patterns/ })).toBeVisible();
  await expect(page.getByTestId("question-card")).toHaveCount(2);
  await expect(page.getByTestId("question-card").filter({ hasText: "BFS Grid" })).toContainText("in Graphs");

  // Same question in both places: the original folder still has it, nothing was copied
  const arraysList = await (await page.request.get(`/api/folders/${arrays.id}/questions`)).json();
  expect(arraysList.questions).toHaveLength(2);

  // Revising from Famous Patterns moves its own suggestion and updates the original question
  await expect(page.getByTestId("suggestion-title")).toHaveText("Two Sum");
  await page.getByTestId("suggestion-card").getByRole("button", { name: "Mark as revised" }).click();
  await expect(page.getByTestId("suggestion-title")).toHaveText("BFS Grid");
  const revised = await (await page.request.get(`/api/questions/${twoSum.id}`)).json();
  expect(revised.lastRevisedAt > twoSum.lastRevisedAt).toBe(true);

  // Next suggestion from a pattern question stays within Famous Patterns
  await page.getByRole("link", { name: "Open suggested question: BFS Grid" }).click();
  await expect(page).toHaveURL(/from=patterns$/);
  await page.getByRole("button", { name: "Mark as revised today" }).click();
  await page.getByRole("link", { name: "Next suggestion →" }).click();
  await expect(page.getByLabel("Title")).toHaveValue("Two Sum");

  // Toggle off from Famous Patterns: it leaves the list but stays in its folder
  await page.goto("/patterns");
  await page.getByTestId("question-card").filter({ hasText: "Two Sum" }).getByTestId("pattern-toggle").click();
  await expect(page.getByText("Removed from Famous Patterns")).toBeVisible();
  await expect(page.getByTestId("question-card")).toHaveCount(1);
  expect((await page.request.get(`/api/questions/${twoSum.id}`)).status()).toBe(200);
});

test("Famous Patterns only shows the logged-in user's questions", async ({ browser }) => {
  const a = await browser.newContext();
  const b = await browser.newContext();
  await register(a.request);
  await register(b.request);
  const folder = await createFolder(a.request);
  const q = await createQuestion(a.request, folder.id, "A's pattern");
  await a.request.patch(`/api/questions/${q.id}`, { data: { isPattern: true } });

  expect((await (await a.request.get("/api/patterns")).json()).questions).toHaveLength(1);
  expect(await (await b.request.get("/api/patterns")).json()).toEqual({ suggestion: null, questions: [] });
  await a.close();
  await b.close();
});

/** Dispatches a paste event carrying a big PNG "screenshot" (random noise, so it compresses badly). */
async function pasteBigScreenshot(page: Page, target: "editor" | "title") {
  return page.evaluate(async (where) => {
    const canvas = document.createElement("canvas");
    canvas.width = 2560;
    canvas.height = 1440;
    const ctx = canvas.getContext("2d")!;
    const img = ctx.createImageData(canvas.width, canvas.height);
    for (let i = 0; i < img.data.length; i++) img.data[i] = i % 4 === 3 ? 255 : (Math.random() * 255) | 0;
    ctx.putImageData(img, 0, 0);
    const blob: Blob = await new Promise((r) => canvas.toBlob((b) => r(b!), "image/png"));
    const dt = new DataTransfer();
    dt.items.add(new File([blob], "image.png", { type: "image/png" }));
    const el = where === "editor" ? document.querySelector(".tiptap")! : document.querySelector('input[aria-label="Title"]')!;
    (el as HTMLElement).focus();
    el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
    return blob.size;
  }, target);
}

test("Pasting a large screenshot works (shrunk below the upload limit first)", async ({ page }) => {
  await register(page.request);
  const folder = await createFolder(page.request);
  const q = await createQuestion(page.request, folder.id, "Screenshot test");
  await page.goto(`/folders/${folder.id}/questions/${q.id}`);
  await page.getByTestId("editor").click();

  const original = await pasteBigScreenshot(page, "editor");
  expect(original).toBeGreaterThan(4 * 1024 * 1024); // bigger than the upload limit as-is
  const img = page.getByTestId("editor").locator('img[src^="/api/uploads/"]');
  await expect(img).toBeVisible({ timeout: 30_000 });
  expect(await img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByTestId("save-status")).toHaveText("Saved");
  await page.reload();
  await expect(img).toBeVisible();
});

test("Pasting a screenshot while the title field is focused adds it to the notes", async ({ page }) => {
  await register(page.request);
  const folder = await createFolder(page.request);
  const q = await createQuestion(page.request, folder.id, "Title paste");
  await page.goto(`/folders/${folder.id}/questions/${q.id}`);
  await expect(page.getByTestId("editor")).toBeVisible();
  await pasteBigScreenshot(page, "title");
  await expect(page.getByTestId("editor").locator('img[src^="/api/uploads/"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByLabel("Title")).toHaveValue("Title paste");
});

test("Highlighted text is black in dark mode too", async ({ page }) => {
  await register(page.request);
  const folder = await createFolder(page.request);
  const q = await createQuestion(page.request, folder.id, "Dark highlight");
  const doc = {
    type: "doc",
    content: [{ type: "paragraph", content: [
      { type: "text", text: "plain", marks: [{ type: "highlight", attrs: { color: "#fef08a" } }] },
      { type: "text", text: "bold", marks: [{ type: "bold" }, { type: "highlight", attrs: { color: "#bfdbfe" } }] },
    ] }],
  };
  await page.request.patch(`/api/questions/${q.id}`, { data: { content: JSON.stringify(doc) } });
  await page.goto(`/folders/${folder.id}/questions/${q.id}`);

  for (const theme of ["dark", "light"]) {
    await page.evaluate((t) => document.documentElement.classList.toggle("dark", t === "dark"), theme);
    await expect(page.getByTestId("editor").locator("mark")).toHaveCount(2);
    // Bold may wrap the highlight or sit inside it, so check every highlight and its contents.
    const colors = await page.getByTestId("editor").evaluate((root) =>
      [...root.querySelectorAll("mark, mark *")].map((el) => getComputedStyle(el).color),
    );
    expect(colors.length, theme).toBeGreaterThanOrEqual(2);
    for (const c of colors) expect(c, theme).toBe("rgb(17, 17, 17)");
  }
});

test("TaskFlow link sits left of the theme toggle and opens the to-do app in a new tab", async ({ page }) => {
  await register(page.request);
  await page.goto("/");
  const link = page.getByTestId("taskflow-link");
  await expect(link).toHaveAttribute("href", "https://agentic-todo-personal.vercel.app/");
  await expect(link).toHaveAttribute("target", "_blank");
  const linkBox = (await link.boundingBox())!;
  const toggleBox = (await page.getByTestId("theme-toggle").boundingBox())!;
  expect(linkBox.x + linkBox.width).toBeLessThanOrEqual(toggleBox.x);
  expect(Math.abs(linkBox.y + linkBox.height / 2 - (toggleBox.y + toggleBox.height / 2))).toBeLessThan(4);
});
