import { useNavigate } from "react-router-dom";
import { signOut, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const { data: session } = useSession();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Welcome, {session?.user?.name ?? "friend"}</h1>
      <p className="text-sm text-muted-foreground">
        This is a placeholder home page. Contact features ship in the next PR.
      </p>
      <Button variant="outline" onClick={handleLogout}>
        Log out
      </Button>
    </div>
  );
}
