"use client";

import { useRef } from "react";
import { EditorContent, useEditor, type Editor as TiptapEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorToolbar } from "./EditorToolbar";

/** `content` is stringified TipTap JSON; the DB default "{}" means an empty document. */
function parseContent(raw: string) {
  try {
    const doc = JSON.parse(raw);
    return doc && doc.type === "doc" ? doc : "";
  } catch {
    return "";
  }
}

async function uploadImage(file: File): Promise<string> {
  // Same limit as the server (Vercel caps request bodies at 4.5 MB).
  if (file.size > 4 * 1024 * 1024) throw new Error("Image must be 4 MB or smaller");
  const form = new FormData();
  form.append("file", file);
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

  const imagesFrom = (list: FileList | null | undefined) =>
    Array.from(list ?? []).filter((f) => f.type.startsWith("image/"));

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
    ],
    content: parseContent(content),
    editorProps: {
      attributes: { class: "tiptap px-4 py-3", "aria-label": "Notes", "data-testid": "editor" },
      handlePaste: (_view, event) => {
        const files = imagesFrom(event.clipboardData?.files);
        if (!files.length) return false;
        void insertImages(files);
        return true;
      },
      handleDrop: (view, event, _slice, moved) => {
        const files = imagesFrom(event.dataTransfer?.files);
        if (moved || !files.length) return false;
        event.preventDefault();
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        void insertImages(files, pos);
        return true;
      },
    },
    onCreate: ({ editor }) => {
      editorRef.current = editor;
    },
    onUpdate: ({ editor }) => onChange(JSON.stringify(editor.getJSON())),
  });

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      {editor && <EditorToolbar editor={editor} onPickImage={(f) => void insertImages([f])} />}
      <EditorContent editor={editor} />
    </div>
  );
}
