/**
 * AdminLogin
 *
 * Simple login form for the PSA Admin Portal.
 * On submit: POST /api/admin/auth/login — backend sets HttpOnly session cookie.
 * Frontend never touches the session token.
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // If already logged in, go straight to dashboard
  useEffect(() => {
    axios
      .get(`${BACKEND_URL}/api/admin/auth/me`, { withCredentials: true })
      .then(() => navigate("/admin", { replace: true }))
      .catch(() => {});
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await axios.post(
        `${BACKEND_URL}/api/admin/auth/login`,
        { username: username.trim(), password },
        { withCredentials: true }
      );
      navigate("/admin", { replace: true });
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(detail || "Login failed. Check credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#0a0a0f",
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      {/* Card */}
      <div style={{
        width: "100%",
        maxWidth: "380px",
        background: "#0d0d14",
        border: "1px solid #1f1f2e",
        borderRadius: "12px",
        padding: "40px 36px",
      }}>
        {/* Logo mark */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "32px" }}>
          <div style={{
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "13px",
            fontWeight: "700",
            color: "#fff",
          }}>
            P
          </div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "#e5e7eb" }}>PSA Admin Portal</div>
            <div style={{ fontSize: "11px", color: "#4b5563" }}>P Suman &amp; Associates</div>
          </div>
        </div>

        <h1 style={{ fontSize: "20px", fontWeight: "700", color: "#f9fafb", marginBottom: "6px" }}>
          Sign in
        </h1>
        <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "28px" }}>
          Admin access only. Session expires after 8 hours.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", color: "#9ca3af", marginBottom: "6px", fontWeight: "500" }}>
              Username
            </label>
            <input
              id="admin-username"
              type="text"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              style={{
                width: "100%",
                background: "#131320",
                border: "1px solid #252535",
                borderRadius: "8px",
                padding: "10px 12px",
                color: "#f3f4f6",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
              onFocus={e => e.target.style.borderColor = "#6366f1"}
              onBlur={e => e.target.style.borderColor = "#252535"}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", color: "#9ca3af", marginBottom: "6px", fontWeight: "500" }}>
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                background: "#131320",
                border: "1px solid #252535",
                borderRadius: "8px",
                padding: "10px 12px",
                color: "#f3f4f6",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
              onFocus={e => e.target.style.borderColor = "#6366f1"}
              onBlur={e => e.target.style.borderColor = "#252535"}
            />
          </div>

          {error && (
            <div style={{
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              borderRadius: "6px",
              padding: "10px 12px",
              fontSize: "13px",
              color: "#fca5a5",
            }}>
              {error}
            </div>
          )}

          <button
            id="admin-login-btn"
            type="submit"
            disabled={loading || !username || !password}
            style={{
              background: loading ? "#3730a3" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "11px 0",
              fontSize: "14px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "opacity 0.15s",
              opacity: loading || !username || !password ? 0.7 : 1,
              marginTop: "4px",
            }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
