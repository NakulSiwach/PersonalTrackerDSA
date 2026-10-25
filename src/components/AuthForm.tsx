"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { ThemeToggle } from "./ThemeToggle";

// Shared by /login and /register (the simple centred card form from the spec).
export function AuthForm({ mode, showRegisterLink }: { mode: "login" | "register"; showRegisterLink?: boolean }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api(`/api/auth/${mode}`, { method: "POST", json: { username, password } });
      window.location.assign("/"); // full load so the new cookie is used everywhere
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-900";

  return (
    <main className="relative flex min-h-screen items-center justify-center p-4">
      <ThemeToggle className="absolute top-3 right-3" />
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div>
          <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">DSA Tracker</p>
          <h1 className="text-xl font-bold">{mode === "login" ? "Log in" : "Create account"}</h1>
        </div>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Username</span>
          <input
            className={field}
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Password</span>
          <input
            className={field}
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={mode === "register" ? 6 : undefined}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-indigo-600 px-3 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {mode === "login" ? "Log in" : "Register"}
        </button>
        <p className="text-center text-sm text-neutral-500">
          {mode === "login" ? (
            showRegisterLink && (
              <>
                No account?{" "}
                <Link href="/register" className="text-indigo-600 hover:underline dark:text-indigo-400">
                  Register
                </Link>
              </>
            )
          ) : (
            <>
              Have an account?{" "}
              <Link href="/login" className="text-indigo-600 hover:underline dark:text-indigo-400">
                Log in
              </Link>
            </>
          )}
        </p>
      </form>
    </main>
  );
}
