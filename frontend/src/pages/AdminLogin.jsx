/**
 * AdminLogin
 *
 * Secure login form for the PSA Admin Portal with self-service Password Reset
 * verified via verification code sent to psumanassociates@gmail.com.
 *
 * On login submit: POST /api/admin/auth/login -> backend sets HttpOnly session cookie.
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { BACKEND_URL } from "../config";
import ThemeToggle from "../components/ThemeToggle";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Forgot password modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1: Send Code, 2: Verify Code, 3: Set Password, 4: Success
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // If already logged in, go straight to dashboard
  useEffect(() => {
    axios
      .get(`${BACKEND_URL}/api/admin/auth/me`, { withCredentials: true })
      .then(() => navigate("/admin", { replace: true }))
      .catch(() => {});
  }, [navigate]);

  // Cooldown countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

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

  const handleOpenResetModal = () => {
    setShowResetModal(true);
    setResetStep(1);
    setResetError("");
    setVerificationCode("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleCloseResetModal = () => {
    setShowResetModal(false);
    setResetError("");
  };

  // Step 1: Request Code
  const handleRequestResetCode = async () => {
    setResetError("");
    setResetLoading(true);
    try {
      const res = await axios.post(
        `${BACKEND_URL}/api/admin/auth/forgot-password`,
        {},
        { withCredentials: true }
      );
      if (res.data?.masked_email) {
        setMaskedEmail(res.data.masked_email);
      }
      setResetStep(2);
      setResendCooldown(60);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setResetError(detail || "Failed to send verification code. Please try again.");
    } finally {
      setResetLoading(false);
    }
  };

  // Step 2: Verify Code
  const handleVerifyResetCode = async (e) => {
    e.preventDefault();
    setResetError("");
    const cleanCode = verificationCode.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      setResetError("Please enter a valid 6-digit verification code.");
      return;
    }

    setResetLoading(true);
    try {
      const res = await axios.post(
        `${BACKEND_URL}/api/admin/auth/verify-reset-code`,
        { code: cleanCode },
        { withCredentials: true }
      );
      if (res.data?.reset_token) {
        setResetToken(res.data.reset_token);
        setResetStep(3);
      } else {
        setResetError("Verification failed. Please try again.");
      }
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setResetError(detail || "Invalid code or expired code.");
    } finally {
      setResetLoading(false);
    }
  };

  // Step 3: Set New Password
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setResetError("");
    if (newPassword.length < 8) {
      setResetError("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError("Passwords do not match.");
      return;
    }

    setResetLoading(true);
    try {
      await axios.post(
        `${BACKEND_URL}/api/admin/auth/reset-password`,
        {
          reset_token: resetToken,
          new_password: newPassword,
        },
        { withCredentials: true }
      );
      setResetStep(4);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setResetError(detail || "Failed to update password. Please restart the process.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F0F4F8] dark:bg-[#06182C] text-ink dark:text-white transition-colors duration-300 relative p-4 font-body">
      {/* Top right Theme Toggle */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle size="md" />
      </div>

      {/* Card */}
      <div className="w-full max-w-[400px] bg-white dark:bg-[#0A2540] border border-borderline dark:border-white/10 rounded-2xl p-8 sm:p-10 shadow-[0_8px_30px_rgba(10,37,64,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] relative transition-all duration-300">
        {/* Logo mark */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-600 to-sky-400 flex items-center justify-center text-sm font-bold text-white shadow-sm">
            P
          </div>
          <div>
            <div className="text-sm font-semibold text-ink dark:text-white">PSA Admin Portal</div>
            <div className="text-[11px] text-ink/50 dark:text-slate-400">P Suman &amp; Associates</div>
          </div>
        </div>

        <h1 className="font-heading text-2xl font-bold text-ink dark:text-white mb-1.5">
          Sign in
        </h1>
        <p className="font-body text-xs text-ink/60 dark:text-slate-400 mb-7">
          Admin access only. Session expires after 8 hours.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink/60 dark:text-slate-300 mb-1.5">
              Username
            </label>
            <input
              id="admin-username"
              type="text"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full bg-slate-50 dark:bg-[#06182C] border border-borderline dark:border-white/15 rounded-lg px-3.5 py-2.5 text-sm text-ink dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-sky dark:focus:border-sky transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink/60 dark:text-slate-300">
                Password
              </label>
              <button
                type="button"
                onClick={handleOpenResetModal}
                className="text-xs text-sky hover:text-sky-dark dark:hover:text-sky-300 transition-colors cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-slate-50 dark:bg-[#06182C] border border-borderline dark:border-white/15 rounded-lg px-3.5 py-2.5 text-sm text-ink dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-sky dark:focus:border-sky transition-colors"
            />
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg p-3 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <button
            id="admin-login-btn"
            type="submit"
            disabled={loading || !username || !password}
            className="w-full bg-sky hover:bg-sky-dark text-white font-semibold text-sm uppercase tracking-wider py-3 rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-60 mt-2 cursor-pointer"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>

      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-[#0A2540] border border-borderline dark:border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl relative">
            {/* Close button */}
            <button
              onClick={handleCloseResetModal}
              className="absolute top-4 right-4 text-ink/40 dark:text-slate-400 hover:text-ink dark:hover:text-white transition-colors cursor-pointer p-1.5 rounded-lg"
              title="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="mb-6">
              <span className="inline-block px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider rounded-full bg-sky/10 text-sky dark:text-sky-300 mb-2">
                Security Recovery
              </span>
              <h2 className="text-xl font-bold font-heading text-ink dark:text-white">
                Admin Password Reset
              </h2>
              <p className="text-xs text-ink/60 dark:text-slate-300 mt-1">
                Verification codes are securely sent to the authorized admin email.
              </p>
            </div>

            {/* Error Message */}
            {resetError && (
              <div className="mb-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg p-3 text-xs text-red-600 dark:text-red-400">
                {resetError}
              </div>
            )}

            {/* STEP 1: Request Code */}
            {resetStep === 1 && (
              <div className="flex flex-col gap-4">
                <div className="bg-slate-50 dark:bg-[#06182C]/70 border border-borderline dark:border-white/10 rounded-xl p-4">
                  <div className="text-xs text-ink/60 dark:text-slate-400 mb-1">Target Recovery Email</div>
                  <div className="text-sm font-semibold text-ink dark:text-white flex items-center gap-2">
                    <svg className="w-4 h-4 text-sky" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {maskedEmail || "Registered Admin Email"}
                  </div>
                </div>

                <p className="text-xs text-ink/70 dark:text-slate-300 leading-relaxed">
                  Click below to generate a 6-digit verification code. The code will expire in 15 minutes.
                </p>

                <button
                  type="button"
                  onClick={handleRequestResetCode}
                  disabled={resetLoading}
                  className="w-full bg-sky hover:bg-sky-dark text-white font-semibold text-sm py-3 rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-60 cursor-pointer mt-1"
                >
                  {resetLoading ? "Sending Verification Code..." : "Send Verification Code"}
                </button>
              </div>
            )}

            {/* STEP 2: Verify Code */}
            {resetStep === 2 && (
              <form onSubmit={handleVerifyResetCode} className="flex flex-col gap-4">
                <div className="bg-sky/5 dark:bg-sky-950/30 border border-sky/20 rounded-xl p-3.5 text-xs text-ink/80 dark:text-slate-300 leading-relaxed">
                  A 6-digit code has been sent to <span className="font-semibold text-sky dark:text-sky-300">{maskedEmail}</span>.
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink/60 dark:text-slate-300 mb-1.5">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    placeholder="123456"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                    required
                    className="w-full bg-slate-50 dark:bg-[#06182C] border border-borderline dark:border-white/15 rounded-lg px-3.5 py-3 text-center text-xl tracking-[6px] font-mono text-ink dark:text-white placeholder:tracking-normal placeholder:font-sans placeholder:text-sm placeholder:text-slate-400 outline-none focus:border-sky dark:focus:border-sky"
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink/60 dark:text-slate-400">Didn't receive code?</span>
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || resetLoading}
                    onClick={handleRequestResetCode}
                    className="text-sky hover:text-sky-dark dark:hover:text-sky-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium cursor-pointer"
                  >
                    {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : "Resend Code"}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={resetLoading || verificationCode.length !== 6}
                  className="w-full bg-sky hover:bg-sky-dark text-white font-semibold text-sm py-3 rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-60 cursor-pointer mt-1"
                >
                  {resetLoading ? "Verifying Code..." : "Verify Code & Proceed"}
                </button>
              </form>
            )}

            {/* STEP 3: Set New Password */}
            {resetStep === 3 && (
              <form onSubmit={handleResetPasswordSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink/60 dark:text-slate-300 mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    autoFocus
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-[#06182C] border border-borderline dark:border-white/15 rounded-lg px-3.5 py-2.5 text-sm text-ink dark:text-white placeholder:text-slate-400 outline-none focus:border-sky dark:focus:border-sky"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink/60 dark:text-slate-300 mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-[#06182C] border border-borderline dark:border-white/15 rounded-lg px-3.5 py-2.5 text-sm text-ink dark:text-white placeholder:text-slate-400 outline-none focus:border-sky dark:focus:border-sky"
                  />
                </div>

                <button
                  type="submit"
                  disabled={resetLoading || !newPassword || !confirmPassword}
                  className="w-full bg-sky hover:bg-sky-dark text-white font-semibold text-sm py-3 rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-60 cursor-pointer mt-1"
                >
                  {resetLoading ? "Updating Password..." : "Update Password"}
                </button>
              </form>
            )}

            {/* STEP 4: Success */}
            {resetStep === 4 && (
              <div className="flex flex-col items-center text-center py-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-ink dark:text-white mb-1.5">
                  Password Reset Successfully!
                </h3>
                <p className="text-xs text-ink/60 dark:text-slate-300 mb-6 max-w-xs">
                  Your administrator credentials have been updated in the database. You may now log in with your new password.
                </p>
                <button
                  type="button"
                  onClick={handleCloseResetModal}
                  className="w-full bg-sky hover:bg-sky-dark text-white font-semibold text-sm py-2.5 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
                >
                  Return to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
