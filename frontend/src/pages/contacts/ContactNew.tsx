import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ContactForm } from "./ContactForm";
import { createContact } from "@/lib/api/contacts";
import type { CreateContactInput } from "@/lib/contact-schemas";

export default function ContactNew() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  async function onSubmit(values: CreateContactInput) {
    setServerError(null);
    try {
      const contact = await createContact(values);
      navigate(`/contacts/${contact.id}`);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Failed to create contact");
    }
  }

  return (
    <div className="mx-auto max-w-md p-8 space-y-6">
      <h1 className="text-2xl font-semibold">New contact</h1>
      <ContactForm onSubmit={onSubmit} submitLabel="Create" serverError={serverError} />
    </div>
  );
}
