import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "@/lib/auth-client";
import { AppHeader } from "@/components/app-header";

export function ProtectedRoute() {
  const { data: session, isPending } = useSession();

  if (isPending) return <div className="p-8">Loading…</div>;
  if (!session?.user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main>
        <Outlet />
      </main>
    </div>
  );
}
