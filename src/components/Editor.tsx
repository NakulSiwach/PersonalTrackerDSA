"use client";

import { useEffect, useRef } from "react";
import { EditorContent, useEditor, type Editor as TiptapEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorToolbar } from "./EditorToolbar";
import { MathWithPreview } from "./MathPreview";
import "katex/dist/katex.min.css";

const MAX_UPLOAD = 4 * 1024 * 1024; // same as the server (Vercel caps request bodies at 4.5 MB)
const MAX_EDGE = 2400; // px; plenty for reading code/diagrams in a screenshot

/** `content` is stringified TipTap JSON; the DB default "{}" means an empty document. */
function parseContent(raw: string) {
  try {
    const doc = JSON.parse(raw);
    return doc && doc.type === "doc" ? doc : "";
  } catch {
    return "";
  }
}

/**
 * Image files from a paste/drop. Screenshots arrive as clipboard *items* in some browsers and
 * as *files* in others, so both are checked.
 */
function imagesFromTransfer(data: DataTransfer | null | undefined): File[] {
  if (!data) return [];
  const files = Array.from(data.files ?? []).filter((f) => f.type.startsWith("image/"));
  if (files.length) return files;
  return Array.from(data.items ?? [])
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter((f): f is File => f !== null);
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Big screenshots (e.g. a full 4K screen as PNG) can be well over the upload limit, so large
 * images are scaled to ≤2400px and re-encoded as WebP (JPEG if the browser can't). GIFs are
 * left alone to keep their animation.
 */
async function shrinkIfNeeded(file: File): Promise<Blob> {
  if (file.type === "image/gif" || file.size <= 1.5 * 1024 * 1024) return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  let scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  let blob: Blob | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    blob = await canvasToBlob(canvas, "image/webp", 0.85);
    if (!blob || blob.type !== "image/webp") blob = await canvasToBlob(canvas, "image/jpeg", 0.88);
    if (blob && blob.size <= MAX_UPLOAD) break;
    scale *= 0.75;
  }
  bitmap.close();
  return blob && blob.size < file.size ? blob : file;
}

async function uploadImage(file: File): Promise<string> {
  const blob = await shrinkIfNeeded(file);
  if (blob.size > MAX_UPLOAD) throw new Error("Image must be 4 MB or smaller");
  const ext = blob.type.split("/")[1] ?? "png";
  const form = new FormData();
  form.append("file", blob, `image.${ext}`);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Upload failed");
  return data.url as string;
}

export function Editor({
  content,
  onChange,
  onError,
}: {
  content: string;
  onChange: (json: string) => void;
  onError: (message: string) => void;
}) {
  const editorRef = useRef<TiptapEditor | null>(null);

  const insertImages = async (files: File[], pos?: number) => {
    for (const file of files) {
      try {
        const src = await uploadImage(file);
        const editor = editorRef.current;
        if (!editor) return;
        const node = { type: "image", attrs: { src } };
        if (pos !== undefined) editor.chain().focus().insertContentAt(pos, node).run();
        else editor.chain().focus().insertContent(node).run();
      } catch (err) {
        onError((err as Error).message);
      }
    }
  };
  const insertRef = useRef(insertImages);
  insertRef.current = insertImages;

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Highlight.configure({ multicolor: true }),
      Image,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
        isAllowedUri: (url) => /^https?:\/\//i.test(url),
      }),
      Placeholder.configure({ placeholder: "Write the problem, approach, complexity, code…" }),
      MathWithPreview,
    ],
    content: parseContent(content),
    editorProps: {
      attributes: { class: "tiptap px-4 py-3", "aria-label": "Notes", "data-testid": "editor" },
      handlePaste: (_view, event) => {
        const files = imagesFromTransfer(event.clipboardData);
        if (!files.length) return false;
        void insertRef.current(files);
        return true;
      },
      handleDrop: (view, event, _slice, moved) => {
        const files = imagesFromTransfer(event.dataTransfer);
        if (moved || !files.length) return false;
        event.preventDefault();
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        void insertRef.current(files, pos);
        return true;
      },
    },
    onCreate: ({ editor }) => {
      editorRef.current = editor;
    },
    onUpdate: ({ editor }) => onChange(JSON.stringify(editor.getJSON())),
  });

  // Pasting a screenshot anywhere on the page (e.g. while the title field is focused, where an
  // image can't go) still adds it to the notes, at the last cursor position.
  useEffect(() => {
    if (!editor) return;
    const onPaste = (e: ClipboardEvent) => {
      if (e.defaultPrevented || editor.view.dom.contains(e.target as Node)) return;
      const files = imagesFromTransfer(e.clipboardData);
      if (!files.length) return;
      e.preventDefault();
      void insertRef.current(files);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [editor]);

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      {editor && <EditorToolbar editor={editor} onPickImage={(f) => void insertRef.current([f])} />}
      <EditorContent editor={editor} />
    </div>
  );
}
