import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { listContacts } from "@/lib/api/contacts";
import type { Contact } from "@/lib/contact-schemas";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { PageTitle } from "@/components/page-title";

export function ContactsList() {
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listContacts()
      .then(setContacts)
      .catch((e: Error) => setError(e.message));
  }, []);

  const filtered = useMemo(() => {
    if (!contacts) return [];
    const q = query.toLowerCase();
    return q ? contacts.filter((c) => c.name.toLowerCase().includes(q)) : contacts;
  }, [contacts, query]);

  if (error) return <div className="p-8 text-destructive">Failed to load contacts: {error}</div>;
  if (contacts === null) return <div className="p-8 text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 space-y-6">
      <PageTitle
        title="Contacts"
        actions={[{ label: "New contact", to: "/contacts/new", icon: Plus }]}
      />

      {contacts.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No contacts yet.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="border-b p-4">
            <Input
              placeholder="Search by name"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b last:border-b-0 transition-colors hover:bg-accent">
                  <td className="px-4 py-3">
                    <Link
                      className="font-medium text-primary underline-offset-2 hover:underline"
                      to={`/contacts/${c.id}`}
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{c.email ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{c.phone ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
