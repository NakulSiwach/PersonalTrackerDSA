import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <ThemeToggle className="absolute top-3 right-3" />
      <h1 className="text-2xl font-bold">Not found</h1>
      <p className="text-neutral-500">This folder or question doesn&apos;t exist, or it isn&apos;t yours.</p>
      <Link href="/" className="text-indigo-600 hover:underline dark:text-indigo-400">
        Back to folders
      </Link>
    </main>
  );
}
