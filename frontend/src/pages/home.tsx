import { Link, useNavigate } from "react-router-dom";
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
      <Link
        to="/contacts"
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Go to contacts
      </Link>
      <Button variant="outline" onClick={handleLogout}>
        Log out
      </Button>
    </div>
  );
}
