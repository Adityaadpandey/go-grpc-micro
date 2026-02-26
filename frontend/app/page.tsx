import { redirect } from "next/navigation";

/**
 * Root page – redirect to dashboard.
 * Middleware handles auth protection; unauthenticated users
 * will be redirected to /login from the dashboard route.
 */
export default function RootPage() {
  redirect("/dashboard");
}
