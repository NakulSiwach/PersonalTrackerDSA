// Browser-side signal that a study action just happened (question added or revised), so the
// streak button in the top bar can refresh without a page reload.
export const ACTIVITY_EVENT = "dsa:activity";

export function notifyActivity(): void {
  window.dispatchEvent(new Event(ACTIVITY_EVENT));
}
