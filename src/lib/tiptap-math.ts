import { Node, mergeAttributes } from "@tiptap/core";

/**
 * Inline math in notes, e.g. $O(n \log n)$ or $$T(n) = 2T(n/2) + n$$ (display style).
 * Stored as LaTeX in the `latex` attribute and drawn with KaTeX. This base definition has no
 * browser code, so the server can use it to export notes; the editor adds the live preview.
 */
export const MathNode = Node.create({
  name: "math",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      latex: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-latex") ?? "",
        renderHTML: (attrs) => ({ "data-latex": attrs.latex }),
      },
      display: {
        default: false,
        parseHTML: (el) => el.getAttribute("data-display") === "true",
        renderHTML: (attrs) => (attrs.display ? { "data-display": "true" } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-math]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return ["span", mergeAttributes({ "data-math": "" }, HTMLAttributes), node.attrs.latex as string];
  },
});

/**
 * Lets people type plain forms: `log n` → \log n, `sqrt(n)` → \sqrt{n}, plus ln/min/max.
 * Already-escaped commands (\log) are left alone.
 */
export function prettifyLatex(input: string): string {
  return input
    .replace(/(?<!\\)\bsqrt\(([^()]*)\)/g, "\\sqrt{$1}")
    .replace(/(?<![\\a-zA-Z])(log|ln|min|max)(?![a-zA-Z])/g, "\\$1");
}
