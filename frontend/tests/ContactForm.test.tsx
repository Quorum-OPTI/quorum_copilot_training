import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContactForm } from "../src/pages/contacts/ContactForm";

describe("ContactForm", () => {
  it("renders name, email, and phone inputs and a submit button", () => {
    render(<ContactForm onSubmit={vi.fn()} submitLabel="Save" />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
  });

  it("shows a required-field error when submitting with an empty name", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ContactForm onSubmit={onSubmit} submitLabel="Save" />);
    await user.click(screen.getByRole("button", { name: /save/i }));
    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows an email-format error when email is malformed", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ContactForm onSubmit={onSubmit} submitLabel="Save" />);
    await user.type(screen.getByLabelText(/name/i), "Alice");
    await user.type(screen.getByLabelText(/email/i), "not-an-email");
    await user.click(screen.getByRole("button", { name: /save/i }));
    expect(await screen.findByText(/must be a valid email/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("calls onSubmit with the parsed values on a valid submission", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ContactForm onSubmit={onSubmit} submitLabel="Save" />);
    await user.type(screen.getByLabelText(/name/i), "Alice");
    await user.type(screen.getByLabelText(/email/i), "alice@example.com");
    await user.click(screen.getByRole("button", { name: /save/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Alice", email: "alice@example.com" }),
    );
  });

  it("pre-fills initialValues", () => {
    render(
      <ContactForm
        onSubmit={vi.fn()}
        submitLabel="Save"
        initialValues={{ name: "Zoe", email: "zoe@example.com", phone: "555" }}
      />,
    );
    expect(screen.getByLabelText(/name/i)).toHaveValue("Zoe");
    expect(screen.getByLabelText(/email/i)).toHaveValue("zoe@example.com");
    expect(screen.getByLabelText(/phone/i)).toHaveValue("555");
  });
});
