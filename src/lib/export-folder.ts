import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import katex from "katex";
import katexPkg from "katex/package.json";
import { prisma } from "./db";
import { parseTags } from "./api";
import { formatDay } from "./dates";
import { MathNode, prettifyLatex } from "./tiptap-math";

// Same node types as the editor, so saved notes render the same way.
const EXTENSIONS = [
  StarterKit.configure({ heading: { levels: [2, 3] } }),
  Highlight.configure({ multicolor: true }),
  Image,
  Link,
  MathNode,
];

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const unescapeHtml = (s: string) =>
  s.replace(/&(amp|lt|gt|quot|#39);/g, (_, e) => ({ amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'" })[e as string]!);

function noteHtml(content: string): string {
  try {
    const doc = JSON.parse(content);
    if (!doc || doc.type !== "doc" || !Array.isArray(doc.content) || doc.content.length === 0) return "";
    return generateHTML(doc, EXTENSIONS);
  } catch {
    return "";
  }
}

/** Replace math placeholders with KaTeX output. */
function renderMath(html: string): string {
  return html.replace(/<span data-math(?:="")?([^>]*)>[\s\S]*?<\/span>/g, (_m, attrs: string) => {
    const latex = unescapeHtml(/data-latex="([^"]*)"/.exec(attrs)?.[1] ?? "");
    const display = /data-display="true"/.test(attrs);
    return katex.renderToString(prettifyLatex(latex), { throwOnError: false, displayMode: display });
  });
}

/** Builds one self-contained HTML document with every question (notes + images) in a folder. */
export async function buildFolderExport(userId: string, folderId: string, opts: { print: boolean }) {
  const folder = await prisma.folder.findFirst({ where: { id: folderId, userId } });
  if (!folder) return null;
  const questions = await prisma.question.findMany({
    where: { folderId },
    orderBy: [{ createdAt: "asc" }],
  });

  // Images are embedded as data URIs so the file works offline and without logging in.
  const images = await prisma.image.findMany({ where: { userId } });
  const dataUris = new Map(
    images.map((img) => [img.filename, `data:${img.mimeType};base64,${Buffer.from(img.data).toString("base64")}`]),
  );
  const embedImages = (html: string) =>
    html.replace(/src="\/api\/uploads\/([a-z0-9]+\.(?:png|jpg|gif|webp))"/g, (m, name: string) =>
      dataUris.has(name) ? `src="${dataUris.get(name)}"` : m,
    );

  const sections = questions
    .map((q, i) => {
      const tags = parseTags(q.tags);
      const body = embedImages(renderMath(noteHtml(q.content)));
      return `
<article class="q">
  <h2>${i + 1}. ${escapeHtml(q.title)}</h2>
  <p class="meta">
    <span class="badge ${q.difficulty.toLowerCase()}">${escapeHtml(q.difficulty)}</span>
    ${q.isPattern ? '<span class="badge pattern">★ Pattern</span>' : ""}
    ${tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join(" ")}
    <span class="date">Last revised: ${formatDay(q.lastRevisedAt)}</span>
  </p>
  ${q.link ? `<p class="link"><a href="${escapeHtml(q.link)}">${escapeHtml(q.link)}</a></p>` : ""}
  <div class="notes">${body || '<p class="empty">No notes.</p>'}</div>
</article>`;
    })
    .join("\n");

  const title = `${folder.name} — DSA Tracker notes`;
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@${katexPkg.version}/dist/katex.min.css" />
<style>
  body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #171717; max-width: 800px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; }
  header h1 { margin: 0 0 .25rem; } header p { margin: 0; color: #737373; }
  .q { border-top: 1px solid #e5e5e5; padding-top: 1rem; margin-top: 1.5rem; break-inside: avoid-page; }
  .q h2 { font-size: 1.3rem; margin: 0 0 .4rem; }
  .meta { display: flex; flex-wrap: wrap; gap: .4rem; align-items: center; margin: 0 0 .4rem; font-size: .85rem; }
  .badge { border-radius: 999px; padding: .05rem .55rem; font-weight: 600; font-size: .75rem; }
  .easy { background: #dcfce7; color: #166534; } .medium { background: #fef3c7; color: #92400e; } .hard { background: #fee2e2; color: #991b1b; }
  .pattern { background: #fef3c7; color: #92400e; }
  .tag { background: #f5f5f5; border-radius: .25rem; padding: .05rem .4rem; font-size: .75rem; }
  .date { color: #737373; }
  .link a { color: #4f46e5; word-break: break-all; font-size: .9rem; }
  .notes h2 { font-size: 1.15rem; } .notes h3 { font-size: 1.05rem; }
  .notes pre { background: #171717; color: #f5f5f5; padding: .75rem 1rem; border-radius: .5rem; overflow-x: auto; white-space: pre-wrap; }
  .notes code { font-family: ui-monospace, Menlo, monospace; font-size: .875em; }
  .notes :not(pre) > code { background: #f5f5f5; padding: .1em .3em; border-radius: .25rem; }
  .notes mark { color: #111; border-radius: .2em; padding: 0 .1em; }
  .notes img { max-width: 100%; height: auto; border-radius: .5rem; }
  .notes blockquote { border-left: 3px solid #d4d4d4; margin-left: 0; padding-left: 1rem; color: #525252; }
  .empty { color: #a3a3a3; font-style: italic; }
  @media print { body { margin: 0; } a { color: inherit; } }
</style>
</head>
<body>
<header>
  <h1>${escapeHtml(folder.name)}</h1>
  <p>${questions.length} ${questions.length === 1 ? "question" : "questions"} · exported ${formatDay(new Date())} from DSA Tracker</p>
</header>
${sections || '<p class="empty">This folder has no questions yet.</p>'}
${opts.print ? "<script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 400); });</script>" : ""}
</body>
</html>`;

  return { html, folderName: folder.name };
}
