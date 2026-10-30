import { handler, notFound, requireUserId } from "@/lib/api";
import { buildFolderExport } from "@/lib/export-folder";

type Params = { id: string };

/**
 * Download every note in a folder.
 * - ?format=html  → a single .html file (notes + embedded images), downloaded straight away
 * - ?format=print → the same page shown in the browser, which opens the print dialog
 *                   ("Save as PDF" gives a PDF)
 */
export const GET = handler<Params>(async (req, { params }) => {
  const userId = await requireUserId();
  const { id } = await params;
  const format = new URL(req.url).searchParams.get("format") === "print" ? "print" : "html";
  const result = await buildFolderExport(userId, id, { print: format === "print" });
  if (!result) throw notFound();

  const safeName = result.folderName.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "folder";
  const headers: Record<string, string> = {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  };
  if (format === "html") {
    headers["Content-Disposition"] = `attachment; filename="${safeName}-notes.html"`;
  }
  return new Response(result.html, { headers });
});
