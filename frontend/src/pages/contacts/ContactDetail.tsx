import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import { ApiError, deleteContact, getContact } from "@/lib/api/contacts";
import type { Contact } from "@/lib/contact-schemas";
import { PageTitle } from "@/components/page-title";
import { Breadcrumbs } from "@/components/breadcrumbs";

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contact, setContact] = useState<Contact | null | "not-found">(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getContact(id)
      .then(setContact)
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 404) setContact("not-found");
        else setError(e instanceof Error ? e.message : "Failed to load contact");
      });
  }, [id]);

  async function onDelete() {
    if (!id) return;
    if (!window.confirm("Delete this contact?")) return;
    try {
      await deleteContact(id);
      navigate("/contacts");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete contact");
    }
  }

  if (error) return <div className="p-8 text-destructive">{error}</div>;
  if (contact === null) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (contact === "not-found") {
    return (
      <div className="mx-auto max-w-md px-6 py-8 space-y-4">
        <p>Contact not found.</p>
        <Link className="font-medium text-primary underline underline-offset-2" to="/contacts">
          Back to contacts
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 space-y-6">
      <Breadcrumbs items={[{ label: "Contacts", to: "/contacts" }, { label: contact.name }]} />
      <PageTitle
        title={contact.name}
        actions={[
          { label: "Edit", to: `/contacts/${contact.id}/edit`, icon: Pencil, variant: "outline" },
          { label: "Delete", onClick: onDelete, icon: Trash2, variant: "destructive" },
        ]}
      />
      <dl className="space-y-3">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</dt>
          <dd className="text-base">{contact.email ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Phone</dt>
          <dd className="text-base">{contact.phone ?? "—"}</dd>
        </div>
      </dl>
    </div>
  );
}
