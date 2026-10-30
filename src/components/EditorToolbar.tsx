"use client";

import { useRef } from "react";
import type { Editor } from "@tiptap/react";
import { promptForLatex } from "./MathPreview";

export const HIGHLIGHT_COLORS = [
  { name: "Yellow", value: "#fef08a" },
  { name: "Green", value: "#bbf7d0" },
  { name: "Pink", value: "#fbcfe8" },
  { name: "Blue", value: "#bfdbfe" },
] as const;

function Btn({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} // keep the editor selection
      onClick={onClick}
      className={`h-8 min-w-8 rounded px-1.5 text-sm hover:bg-neutral-100 disabled:opacity-40 dark:hover:bg-neutral-800 ${
        active ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300" : ""
      }`}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="mx-1 h-5 w-px bg-neutral-200 dark:bg-neutral-700" aria-hidden />;

export function EditorToolbar({ editor, onPickImage }: { editor: Editor; onPickImage: (file: File) => void }) {
  const fileInput = useRef<HTMLInputElement>(null);

  function setLink() {
    const current = editor.getAttributes("link").href as string | undefined;
    const input = window.prompt("Link URL (leave empty to remove)", current ?? "https://");
    if (input === null) return;
    const value = input.trim();
    if (!value || value === "https://") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    // Simplest choice: add https:// when no protocol is typed; only http(s) links are accepted.
    const href = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    try {
      new URL(href);
    } catch {
      window.alert("That doesn't look like a valid link.");
      return;
    }
    if (editor.state.selection.empty && !editor.isActive("link")) {
      editor.chain().focus().insertContent({ type: "text", text: value, marks: [{ type: "link", attrs: { href } }] }).run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
  }

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-neutral-200 bg-white px-2 py-1.5 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <Btn label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <b>B</b>
      </Btn>
      <Btn label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <i>I</i>
      </Btn>
      <Btn label="Strike" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <s>S</s>
      </Btn>
      <Btn label="Inline code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
        <code>{"</>"}</code>
      </Btn>
      <Btn
        label="Code block"
        active={editor.isActive("codeBlock")}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        {"{ }"}
      </Btn>
      <Btn
        label="Math formula"
        onClick={() => {
          const latex = promptForLatex();
          if (latex) editor.chain().focus().insertMath(latex).run();
        }}
      >
        <span className="font-serif italic">∑</span>
      </Btn>
      <Sep />
      <Btn
        label="Heading 2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </Btn>
      <Btn
        label="Heading 3"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </Btn>
      <Btn
        label="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        • List
      </Btn>
      <Btn
        label="Ordered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1. List
      </Btn>
      <Sep />
      <Btn label="Link" active={editor.isActive("link")} onClick={setLink}>
        🔗
      </Btn>
      {HIGHLIGHT_COLORS.map((c) => (
        <Btn
          key={c.name}
          label={`Highlight ${c.name.toLowerCase()}`}
          active={editor.isActive("highlight", { color: c.value })}
          onClick={() => editor.chain().focus().toggleHighlight({ color: c.value }).run()}
        >
          <span className="inline-block h-4 w-4 rounded border border-black/10" style={{ background: c.value }} />
        </Btn>
      ))}
      <Btn label="Remove highlight" onClick={() => editor.chain().focus().unsetHighlight().run()}>
        ⌀
      </Btn>
      <Sep />
      <Btn label="Upload image" onClick={() => fileInput.current?.click()}>
        🖼
      </Btn>
      <input
        ref={fileInput}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        hidden
        data-testid="image-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPickImage(file);
          e.target.value = "";
        }}
      />
      <Sep />
      <Btn label="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
        ↶
      </Btn>
      <Btn label="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
        ↷
      </Btn>
    </div>
  );
}
