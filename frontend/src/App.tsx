import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/protected-route";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import { ContactsList } from "@/pages/contacts/ContactsList";
import ContactNew from "@/pages/contacts/ContactNew";
import ContactDetail from "@/pages/contacts/ContactDetail";
import ContactEdit from "@/pages/contacts/ContactEdit";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<ContactsList />} />
          <Route path="/contacts" element={<ContactsList />} />
          <Route path="/contacts/new" element={<ContactNew />} />
          <Route path="/contacts/:id" element={<ContactDetail />} />
          <Route path="/contacts/:id/edit" element={<ContactEdit />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
