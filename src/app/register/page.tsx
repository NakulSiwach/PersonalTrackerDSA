import { notFound, redirect } from "next/navigation";
import { getSessionUserId, registrationAllowed } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  if (!registrationAllowed()) notFound();
  if (await getSessionUserId()) redirect("/");
  return <AuthForm mode="register" />;
}
