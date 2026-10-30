import { nodeInputRule } from "@tiptap/core";
import katex from "katex";
import { MathNode, prettifyLatex } from "@/lib/tiptap-math";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    math: { insertMath: (latex: string, display?: boolean) => ReturnType };
  }
}

/** Asks for a formula; empty or cancelled → null. */
export function promptForLatex(current = ""): string | null {
  const value = window.prompt(
    "Formula, e.g.  O(n log n)   or   T(n) = 2T(n/2) + n   or   n^2   (LaTeX works too). Leave empty to remove.",
    current,
  );
  return value === null ? null : value.trim();
}

/**
 * Editor version of the math node: shows the formula drawn by KaTeX, and turns typed
 * $...$ (inline) or $$...$$ (own line) into a formula. Click a formula to edit it.
 */
export const MathWithPreview = MathNode.extend({
  addCommands() {
    return {
      insertMath:
        (latex, display = false) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { latex, display } }),
    };
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: /\$\$([^$\n]+)\$\$$/,
        type: this.type,
        getAttributes: (m) => ({ latex: m[1].trim(), display: true }),
      }),
      nodeInputRule({
        find: /(?<!\$)\$([^$\n]+)\$$/,
        type: this.type,
        getAttributes: (m) => ({ latex: m[1].trim(), display: false }),
      }),
    ];
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement("span");
      dom.className = "math-node";
      dom.contentEditable = "false";
      dom.setAttribute("data-testid", "math-node");

      const draw = (latex: string, display: boolean) => {
        dom.setAttribute("data-display", String(display));
        dom.setAttribute("data-latex", latex);
        dom.title = `${latex}  (click to edit)`;
        katex.render(prettifyLatex(latex) || "\\square", dom, { throwOnError: false, displayMode: display });
      };
      draw(node.attrs.latex as string, node.attrs.display as boolean);

      dom.addEventListener("click", () => {
        if (!editor.isEditable || typeof getPos !== "function") return;
        const pos = getPos();
        const current = editor.state.doc.nodeAt(pos);
        if (!current) return;
        const next = promptForLatex(current.attrs.latex as string);
        if (next === null) return;
        if (!next) {
          editor.chain().focus().deleteRange({ from: pos, to: pos + current.nodeSize }).run();
          return;
        }
        editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...current.attrs, latex: next }));
      });

      return {
        dom,
        update: (updated) => {
          if (updated.type.name !== this.name) return false;
          draw(updated.attrs.latex as string, updated.attrs.display as boolean);
          return true;
        },
      };
    };
  },
});
