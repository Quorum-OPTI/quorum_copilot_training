import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError, deleteContact, getContact } from "@/lib/api/contacts";
import type { Contact } from "@/lib/contact-schemas";

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
  if (contact === null) return <div className="p-8">Loading…</div>;
  if (contact === "not-found") {
    return (
      <div className="mx-auto max-w-md p-8 space-y-4">
        <p>Contact not found.</p>
        <Link className="font-medium text-primary underline underline-offset-2" to="/contacts">Back to contacts</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md p-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{contact.name}</h1>
      <dl className="space-y-2">
        <div>
          <dt className="text-sm text-muted-foreground">Email</dt>
          <dd>{contact.email ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Phone</dt>
          <dd>{contact.phone ?? "—"}</dd>
        </div>
      </dl>
      <div className="flex gap-2">
        <Link
          to={`/contacts/${contact.id}/edit`}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Edit
        </Link>
        <button
          onClick={onDelete}
          className="inline-flex items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
        >
          Delete
        </button>
        <Link
          to="/contacts"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
        >
          Back
        </Link>
      </div>
    </div>
  );
}
