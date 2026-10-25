import { NextResponse } from "next/server";
import { handler, requireUserId } from "@/lib/api";
import { getUserTags } from "@/lib/server-data";

// Not in the spec's route table; it backs the spec's "suggest tags already used in this
// user's other questions" datalist on the question page and the new-question modal.
export const GET = handler(async () => {
  const userId = await requireUserId();
  return NextResponse.json(await getUserTags(userId));
});
