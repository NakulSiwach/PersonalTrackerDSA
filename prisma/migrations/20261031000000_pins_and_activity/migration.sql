-- Pinned folders
ALTER TABLE "Folder" ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false;

-- Activity log for the streak
CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ActivityEvent_userId_at_idx" ON "ActivityEvent"("userId", "at");

ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill from existing questions so streaks don't start from zero:
-- each question's creation, and its latest revision (earlier revisions were never stored).
INSERT INTO "ActivityEvent" ("id", "userId", "kind", "at")
SELECT gen_random_uuid()::text, f."userId", 'create', q."createdAt"
FROM "Question" q JOIN "Folder" f ON f."id" = q."folderId";

INSERT INTO "ActivityEvent" ("id", "userId", "kind", "at")
SELECT gen_random_uuid()::text, f."userId", 'revise', q."lastRevisedAt"
FROM "Question" q JOIN "Folder" f ON f."id" = q."folderId"
WHERE q."lastRevisedAt" > q."createdAt" + interval '1 second';
