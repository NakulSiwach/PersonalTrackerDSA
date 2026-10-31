"use client";

import { useState } from "react";
import { Modal } from "./Modal";

export function LogoutButton() {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        Logout
      </button>
      <Modal open={confirming} title="Log out?" onClose={() => setConfirming(false)}>
        <p className="mb-5 text-sm text-neutral-600 dark:text-neutral-300">You&apos;ll need your username and password to log back in.</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setConfirming(false)} className="rounded-lg border px-3 py-2 text-sm dark:border-neutral-700">
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.assign("/login");
            }}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? "Logging out…" : "Log out"}
          </button>
        </div>
      </Modal>
    </>
  );
}
