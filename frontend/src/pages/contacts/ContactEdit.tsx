import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ContactForm } from "./ContactForm";
import { ApiError, getContact, updateContact } from "@/lib/api/contacts";
import type { Contact, CreateContactInput } from "@/lib/contact-schemas";
import { PageTitle } from "@/components/page-title";
import { Breadcrumbs } from "@/components/breadcrumbs";

export default function ContactEdit() {
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

  async function onSubmit(values: CreateContactInput) {
    if (!id) return;
    setError(null);
    try {
      await updateContact(id, values);
      navigate(`/contacts/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    }
  }

  if (error && contact === null) return <div className="p-8 text-destructive">{error}</div>;
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
    <div className="mx-auto max-w-md px-6 py-8 space-y-6">
      <Breadcrumbs
        items={[
          { label: "Contacts", to: "/contacts" },
          { label: contact.name, to: `/contacts/${contact.id}` },
          { label: "Edit" },
        ]}
      />
      <PageTitle title="Edit contact" />
      <ContactForm
        initialValues={{
          name: contact.name,
          email: contact.email ?? "",
          phone: contact.phone ?? "",
        }}
        submitLabel="Save"
        onSubmit={onSubmit}
        serverError={error}
      />
    </div>
  );
}
