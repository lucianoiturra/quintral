import { cookies } from "next/headers";
import AdminPanel from "@/app/admin/AdminPanel";
import LoginForm from "@/app/admin/LoginForm";
import { isValidSession } from "@/lib/server/adminAuth";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session")?.value;
  const authenticated = await isValidSession(session);

  if (!authenticated) {
    return <LoginForm />;
  }

  return <AdminPanel />;
}
