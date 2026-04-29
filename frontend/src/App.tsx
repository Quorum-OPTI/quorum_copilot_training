import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/protected-route";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import HomePage from "@/pages/home";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<HomePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
