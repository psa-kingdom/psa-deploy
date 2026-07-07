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

function AppContent() {
  const location = useLocation();
  const isConnectPage = location.pathname === "/connect";

  return (
    <div className="App bg-ivory text-ink">
      <ScrollToTop />
      {!isConnectPage && <Header />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/services" element={<Services />} />
        <Route path="/industries" element={<Industries />} />
        <Route path="/about" element={<About />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/insights/:slug" element={<InsightDetail />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/connect" element={<Connect />} />
        <Route path="*" element={<Home />} />
      </Routes>
      {!isConnectPage && <Footer />}
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
