import type { Contact, CreateContactInput, UpdateContactInput } from "@/lib/contact-schemas";

const BASE = "/api/contacts";

export class ApiError extends Error {
  constructor(public status: number, message: string, public issues?: unknown) {
    super(message);
  }
}

async function request<T>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: {
      ...(init.body !== undefined && { "Content-Type": "application/json" }),
      ...(init.headers ?? {}),
    },
    ...init,
  });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, body?.error ?? `HTTP ${res.status}`, body?.issues);
  }
  return body as T;
}

export async function listContacts(): Promise<Contact[]> {
  const data = await request<{ contacts: Contact[] }>(BASE);
  return data.contacts;
}

export async function getContact(id: string): Promise<Contact> {
  const data = await request<{ contact: Contact }>(`${BASE}/${id}`);
  return data.contact;
}

export async function createContact(input: CreateContactInput): Promise<Contact> {
  const data = await request<{ contact: Contact }>(BASE, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.contact;
}

export async function updateContact(id: string, input: UpdateContactInput): Promise<Contact> {
  const data = await request<{ contact: Contact }>(`${BASE}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data.contact;
}

export async function deleteContact(id: string): Promise<void> {
  await request<void>(`${BASE}/${id}`, { method: "DELETE" });
}
