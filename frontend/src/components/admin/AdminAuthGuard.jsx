/**
 * AdminAuthGuard
 *
 * Wraps protected admin routes. On mount, calls GET /api/admin/auth/me
 * to verify the HttpOnly session cookie is active. If not authenticated,
 * redirects to /admin/login. Never reads or stores the session token in JS.
 */

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { BACKEND_URL } from "../../config";

export default function AdminAuthGuard({ children }) {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get(`${BACKEND_URL}/api/admin/auth/me`, { withCredentials: true })
      .then(() => {
        setAuthenticated(true);
      })
      .catch(() => {
        navigate("/admin/login", { replace: true });
      })
      .finally(() => {
        setChecking(false);
      });
  }, [navigate]);

  if (checking) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0f",
        color: "#6b7280",
        fontFamily: "'Inter', sans-serif",
        fontSize: "14px"
      }}>
        Verifying session…
      </div>
    );
  }

  if (!authenticated) return null;

  return children;
}
