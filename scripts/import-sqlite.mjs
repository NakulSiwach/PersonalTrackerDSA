// One-time copy of the old local SQLite data (prisma/dev.db + uploads/) into the Postgres
// database in DATABASE_URL (Neon). Safe to re-run: rows that already exist are skipped.
//
// Usage: npm run import:sqlite              (reads prisma/dev.db)
//        npm run import:sqlite -- other.db
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { PrismaClient } from "@prisma/client";

const file = path.resolve(process.argv[2] ?? "prisma/dev.db");
if (!existsSync(file)) {
  console.error(`No SQLite database at ${file}`);
  process.exit(1);
}
if (!process.env.DATABASE_URL?.startsWith("postgres")) {
  console.error("Set DATABASE_URL (and DATABASE_URL_UNPOOLED) to your Neon Postgres connection strings first.");
  process.exit(1);
}

const sqlite = new DatabaseSync(file, { readOnly: true });
const prisma = new PrismaClient();
const all = (table) => sqlite.prepare(`SELECT * FROM "${table}"`).all();
const date = (v) => new Date(typeof v === "number" ? v : String(v).replace(" ", "T"));
const hasColumn = (table, col) => sqlite.prepare(`PRAGMA table_info("${table}")`).all().some((c) => c.name === col);

const users = all("User").map((u) => ({
  id: u.id,
  username: u.username,
  passwordHash: u.passwordHash,
  createdAt: date(u.createdAt),
}));
const folders = all("Folder").map((f) => ({
  id: f.id,
  name: f.name,
  userId: f.userId,
  createdAt: date(f.createdAt),
}));
const withPattern = hasColumn("Question", "isPattern");
const questions = all("Question").map((q) => ({
  id: q.id,
  folderId: q.folderId,
  title: q.title,
  link: q.link,
  content: q.content,
  difficulty: q.difficulty,
  tags: q.tags,
  isPattern: withPattern ? Boolean(q.isPattern) : false,
  lastRevisedAt: date(q.lastRevisedAt),
  createdAt: date(q.createdAt),
  updatedAt: date(q.updatedAt),
}));

// Images used to be files in uploads/<userId>/<filename>.
const images = [];
const uploads = path.resolve("uploads");
const TYPES = { png: "image/png", jpg: "image/jpeg", gif: "image/gif", webp: "image/webp" };
if (existsSync(uploads)) {
  for (const userId of readdirSync(uploads)) {
    const dir = path.join(uploads, userId);
    for (const filename of readdirSync(dir)) {
      const mimeType = TYPES[filename.split(".").pop()];
      if (mimeType) images.push({ filename, userId, mimeType, data: readFileSync(path.join(dir, filename)) });
    }
  }
}

try {
  const r1 = await prisma.user.createMany({ data: users, skipDuplicates: true });
  const r2 = await prisma.folder.createMany({ data: folders, skipDuplicates: true });
  const r3 = await prisma.question.createMany({ data: questions, skipDuplicates: true });
  const r4 = images.length ? await prisma.image.createMany({ data: images, skipDuplicates: true }) : { count: 0 };
  console.log(`Imported ${r1.count}/${users.length} users, ${r2.count}/${folders.length} folders, ` +
    `${r3.count}/${questions.length} questions, ${r4.count}/${images.length} images.`);
} finally {
  await prisma.$disconnect();
}
