import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listContacts } from "@/lib/api/contacts";
import type { Contact } from "@/lib/contact-schemas";
import { Input } from "@/components/ui/input";

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
  if (contacts === null) return <div className="p-8">Loading…</div>;

  return (
    <div className="mx-auto max-w-3xl p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Contacts</h1>
        <Link
          to="/contacts/new"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          New contact
        </Link>
      </div>

      {contacts.length === 0 ? (
        <p className="text-muted-foreground">No contacts yet.</p>
      ) : (
        <>
          <Input
            placeholder="Search by name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <table className="w-full text-left">
            <thead>
              <tr className="border-b">
                <th className="py-2">Name</th>
                <th className="py-2">Email</th>
                <th className="py-2">Phone</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b">
                  <td className="py-2">
                    <Link className="underline" to={`/contacts/${c.id}`}>
                      {c.name}
                    </Link>
                  </td>
                  <td className="py-2">{c.email ?? "—"}</td>
                  <td className="py-2">{c.phone ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
