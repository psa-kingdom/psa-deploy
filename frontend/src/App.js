import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import Home from "@/pages/Home";
import Services from "@/pages/Services";
import Industries from "@/pages/Industries";
import About from "@/pages/About";
import Insights from "@/pages/Insights";
import InsightDetail from "@/pages/InsightDetail";
import Contact from "@/pages/Contact";
import Connect from "@/pages/Connect";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminCommunication from "@/pages/AdminCommunication";
import AdminInquiries from "@/pages/AdminInquiries";
import AdminAuthGuard from "@/components/admin/AdminAuthGuard";

function AppContent() {
  const location = useLocation();
  const isConnectPage = location.pathname === "/connect";
  const isAdminPage = location.pathname.startsWith("/admin");
  const hideHeaderFooter = isConnectPage || isAdminPage;

  return (
    <div className="App bg-ivory text-ink">
      <ScrollToTop />
      {!hideHeaderFooter && <Header />}
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/services" element={<Services />} />
        <Route path="/industries" element={<Industries />} />
        <Route path="/about" element={<About />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/insights/:slug" element={<InsightDetail />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/connect" element={<Connect />} />

        {/* Admin portal — login is public */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Admin portal — all protected routes require authentication */}
        {/* AdminAuthGuard checks the session cookie on mount; redirects to /admin/login if invalid */}
        <Route
          path="/admin"
          element={
            <AdminAuthGuard>
              <AdminDashboard />
            </AdminAuthGuard>
          }
        />
        <Route
          path="/admin/communication"
          element={
            <AdminAuthGuard>
              <AdminCommunication />
            </AdminAuthGuard>
          }
        />
        <Route
          path="/admin/inquiries"
          element={
            <AdminAuthGuard>
              <AdminInquiries />
            </AdminAuthGuard>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Home />} />
      </Routes>
      {!hideHeaderFooter && <Footer />}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
