import { Link, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { signOut, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function AppHeader() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const user = session?.user;

  async function handleLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 text-foreground">
          <img src="/quorum-logo.svg" alt="" width={23} height={24} className="shrink-0" />
          <span className="text-base font-semibold tracking-tight">Quorum Copilot Training</span>
        </Link>
        <div className="flex items-center gap-3">
          {user && (
            <div className="text-right leading-tight">
              <div className="text-sm font-medium text-foreground">{user.name ?? user.email}</div>
              {user.name && (
                <div className="text-xs text-muted-foreground">{user.email}</div>
              )}
            </div>
          )}
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" aria-hidden />
            Log out
          </Button>
        </div>
      </div>
    </header>
  );
}
