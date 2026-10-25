import { z } from "zod";

export const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

// Simplest choice (spec doesn't say): usernames are trimmed and 3–32 characters.
export const usernameSchema = z.string().trim().min(3, "Username must be at least 3 characters").max(32);

export const registerSchema = z.object({
  username: usernameSchema,
  password: z.string().min(6, "Password must be at least 6 characters").max(200),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1).max(32),
  password: z.string().min(1).max(200),
});

export const folderNameSchema = z
  .string()
  .trim()
  .min(1, "Folder name is required")
  .max(50, "Folder name must be at most 50 characters");

export const folderSchema = z.object({ name: folderNameSchema });

/** Trim, lowercase, spaces → "-". */
export function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, "-");
}

export const tagsSchema = z
  .array(z.string())
  .transform((tags) => [...new Set(tags.map(normalizeTag).filter(Boolean))])
  .pipe(
    z
      .array(z.string().min(1).max(30, "Each tag must be at most 30 characters"))
      .max(10, "At most 10 tags"),
  );

export const linkSchema = z
  .string()
  .trim()
  .nullable()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => {
    if (v === null) return true;
    try {
      const url = new URL(v);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }, "Link must be a valid http(s) URL");

export const titleSchema = z.string().trim().min(1, "Title is required").max(200);

// "~2 MB": measured in characters of the stringified TipTap JSON.
export const contentSchema = z.string().max(2 * 1024 * 1024, "Content is too large (max 2 MB)");

export const createQuestionSchema = z.object({
  title: titleSchema,
  link: linkSchema,
  difficulty: z.enum(DIFFICULTIES).optional(),
  tags: tagsSchema.optional(),
});

export const updateQuestionSchema = z
  .object({
    title: titleSchema.optional(),
    link: linkSchema,
    content: contentSchema.optional(),
    difficulty: z.enum(DIFFICULTIES).optional(),
    tags: tagsSchema.optional(),
    isPattern: z.boolean().optional(),
  })
  .strict(); // unknown keys (e.g. lastRevisedAt) are rejected, never applied
