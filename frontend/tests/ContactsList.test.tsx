import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ContactsList } from "../src/pages/contacts/ContactsList";
import * as api from "../src/lib/api/contacts";
import type { Contact } from "../src/lib/contact-schemas";

const fixture: Contact[] = [
  { id: "1", userId: "u", name: "Anna", email: null, phone: null, createdAt: "", updatedAt: "" },
  { id: "2", userId: "u", name: "Zoe", email: "zoe@example.com", phone: null, createdAt: "", updatedAt: "" },
];

beforeEach(() => {
  vi.restoreAllMocks();
});

function renderList() {
  return render(
    <MemoryRouter>
      <ContactsList />
    </MemoryRouter>,
  );
}

describe("ContactsList", () => {
  it("renders the empty state when there are no contacts", async () => {
    vi.spyOn(api, "listContacts").mockResolvedValue([]);
    renderList();
    expect(await screen.findByText(/no contacts yet/i)).toBeInTheDocument();
  });

  it("renders a row per contact", async () => {
    vi.spyOn(api, "listContacts").mockResolvedValue(fixture);
    renderList();
    expect(await screen.findByText("Anna")).toBeInTheDocument();
    expect(await screen.findByText("Zoe")).toBeInTheDocument();
  });

  it("filters by name case-insensitively as the user types", async () => {
    vi.spyOn(api, "listContacts").mockResolvedValue(fixture);
    const user = userEvent.setup();
    renderList();
    await screen.findByText("Anna");
    await user.type(screen.getByPlaceholderText(/search/i), "ZO");
    await waitFor(() => expect(screen.queryByText("Anna")).not.toBeInTheDocument());
    expect(screen.getByText("Zoe")).toBeInTheDocument();
  });
});
