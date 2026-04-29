import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "@/lib/auth-client";

export function ProtectedRoute() {
  const { data: session, isPending } = useSession();

  if (isPending) return <div className="p-8">Loading…</div>;
  if (!session?.user) return <Navigate to="/login" replace />;

  return <Outlet />;
}
