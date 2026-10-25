import { redirect } from "next/navigation";
import { getSessionUserId, registrationAllowed } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getSessionUserId()) redirect("/");
  return <AuthForm mode="login" showRegisterLink={registrationAllowed()} />;
}
