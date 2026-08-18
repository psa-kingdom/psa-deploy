import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  Linkedin, 
  Mail, 
  MailCheck, 
  Phone, 
  PhoneCall, 
  MapPin, 
  ArrowRight, 
  ArrowUpRight, 
  Calendar, 
  X, 
  ExternalLink,
  Building2,
  Clock,
  ShieldCheck
} from "lucide-react";
import { FIRM, OFFICES } from "../data/site";
import { API_URL as API } from "../config";

const SERVICES_OPTS = [
  "Internal Audit & Assurance",
  "Inventory Intelligence",
  "Risk Advisory",
  "Process & Performance Improvement",
  "Tax & Regulatory Advisory",
  "Other Direct Practice Inquiry",
];

const CAL_BOOKING_URL = "https://cal.com/psumanassociates/15min";

export default function Contact() {
  const [form, setForm] = useState({
    name: "",
    company: "",
    designation: "",
    email: "",
    phone: "",
    service_of_interest: "",
    message: "",
  });
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [error, setError] = useState("");
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsBookingModalOpen(false);
      }
    };
    if (isBookingModalOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isBookingModalOpen]);

  const onChange = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setStatus("submitting");
    setError("");
    try {
      await axios.post(`${API}/contact`, form);
      setStatus("success");
      setForm({
        name: "",
        company: "",
        designation: "",
        email: "",
        phone: "",
        service_of_interest: "",
        message: "",
      });
      // Automatically open the Cal.com booking modal for the visitor
      setIsBookingModalOpen(true);
    } catch (err) {
      setStatus("error");
      setError(
        err?.response?.data?.detail?.[0]?.msg ||
          "Submission failed. Please check your details and try again."
      );
    }
  };

  return (
    <main className="bg-ivory">
      {/* HERO / HEADER */}
      <section className="bg-ink text-ivory relative overflow-hidden pt-36 pb-20 md:pt-44 md:pb-24">
        <div className="absolute inset-0 grain pointer-events-none opacity-30" />
        <div className="relative container-px mx-auto max-w-[1440px]">
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-10">
              <p className="eyebrow-light mb-5">Start a Conversation</p>
              <h1 className="font-display-bold text-4xl sm:text-6xl md:text-7xl lg:text-[84px] text-ivory tracking-[-0.025em] leading-[1.02]">
                Begin a conversation.
              </h1>
              <p className="font-body text-base sm:text-lg md:text-xl text-ivory/75 mt-8 max-w-3xl leading-relaxed">
                A 15–30 minute consultation with our partner team. No obligation. Independent perspective on your internal audit, inventory intelligence, risk advisory, and process priorities.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TWO-COLUMN CONTACT BODY */}
      <section className="py-16 md:py-24">
        <div className="container-px mx-auto max-w-[1440px]">
          <div className="grid grid-cols-12 gap-10 lg:gap-14 items-start">
            
            {/* LEFT COLUMN: START A CONVERSATION */}
            <div className="col-span-12 lg:col-span-7">
              <div className="bg-white border border-borderline p-8 md:p-12 shadow-[0_4px_24px_rgba(10,37,64,0.03)]">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <p className="eyebrow">Request a Consultation</p>
                  <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-body text-ink/50 uppercase tracking-[0.14em]">
                    <Clock className="w-3.5 h-3.5 text-sky" /> 15 Min Partner Call
                  </span>
                </div>
                <h2 className="font-display text-3xl md:text-4xl text-ink tracking-tight">
                  Tell us about your engagement.
                </h2>

                {status === "success" ? (
                  <div className="mt-8 border border-sky/30 bg-sky/5 p-8" data-testid="contact-success">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-sky" />
                      <p className="eyebrow">Enquiry Logged</p>
                    </div>
                    <h3 className="font-display text-2xl md:text-3xl text-ink mt-3">
                      Thank you — your enquiry has been received.
                    </h3>
                    <p className="font-body text-base text-ink/75 mt-3 leading-relaxed">
                      Our partner team reviews every brief within one business day. If you haven&apos;t scheduled your slot yet, you can pick a time directly on our calendar.
                    </p>
                    
                    <div className="mt-8 flex flex-wrap items-center gap-4">
                      <button
                        type="button"
                        onClick={() => setIsBookingModalOpen(true)}
                        className="btn-primary inline-flex items-center gap-2"
                      >
                        <Calendar className="w-4 h-4" /> Pick a Time on Cal.com
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatus("idle")}
                        data-testid="contact-success-reset"
                        className="btn-secondary"
                      >
                        Submit Another
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={submit} data-testid="contact-form" className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field label="Name *" testid="contact-name" value={form.name} onChange={onChange("name")} required placeholder="e.g. Rajesh Sharma" />
                    <Field label="Company" testid="contact-company" value={form.company} onChange={onChange("company")} placeholder="e.g. Apex Enterprises" />
                    <Field label="Designation" testid="contact-designation" value={form.designation} onChange={onChange("designation")} placeholder="e.g. Chief Financial Officer" />
                    <Field label="Email *" type="email" testid="contact-email" value={form.email} onChange={onChange("email")} required placeholder="e.g. rajesh@apex.com" />
                    <Field label="Phone" testid="contact-phone" value={form.phone} onChange={onChange("phone")} placeholder="e.g. +91 98765 43210" />
                    
                    <div className="flex flex-col">
                      <label className="font-body text-[11px] uppercase tracking-[0.2em] text-ink/55 mb-2 font-medium">
                        Service of Interest
                      </label>
                      <select
                        data-testid="contact-service"
                        value={form.service_of_interest}
                        onChange={onChange("service_of_interest")}
                        className="bg-transparent border-b border-ink/20 py-3 font-body text-base text-ink focus:outline-none focus:border-sky transition-colors duration-300"
                      >
                        <option value="">Select practice area…</option>
                        {SERVICES_OPTS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2 flex flex-col">
                      <label className="font-body text-[11px] uppercase tracking-[0.2em] text-ink/55 mb-2 font-medium">
                        Message / Brief *
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={form.message}
                        onChange={onChange("message")}
                        data-testid="contact-message"
                        placeholder="Please describe your audit scope, key timelines, or risk advisory objectives…"
                        className="bg-transparent border-b border-ink/20 py-3 font-body text-base text-ink focus:outline-none focus:border-sky transition-colors duration-300 resize-none"
                      />
                    </div>

                    <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-borderline/60">
                      <p className="font-body text-xs text-ink/55">
                        Direct Partner Review · Response within 1 business day
                      </p>
                      <button
                        type="submit"
                        disabled={status === "submitting"}
                        data-testid="contact-submit"
                        className="btn-primary disabled:opacity-60 inline-flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {status === "submitting" ? (
                          "Connecting…"
                        ) : (
                          <>
                            <Calendar className="w-4 h-4" />
                            <span>Book a Call</span>
                          </>
                        )}
                      </button>
                    </div>

                    {error && (
                      <p data-testid="contact-error" className="md:col-span-2 font-body text-sm text-red-600 bg-red-50 p-3 border border-red-200">
                        {error}
                      </p>
                    )}
                  </form>
                )}
              </div>

              {/* Direct Cal.com trigger link */}
              <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2">
                <button
                  type="button"
                  onClick={() => setIsBookingModalOpen(true)}
                  data-testid="contact-schedule-call"
                  className="inline-flex items-center gap-2 font-body text-sm text-ink hover:text-sky transition-colors duration-300 font-medium text-left"
                >
                  <span>Prefer to pick a time slot immediately?</span>
                  <span className="text-sky underline underline-offset-4 inline-flex items-center gap-1 font-semibold">
                    Open Cal.com Scheduler <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN: THE FIRM */}
            <div className="col-span-12 lg:col-span-5 space-y-8">
              
              {/* DIRECT CHANNELS CARD */}
              <div className="bg-[#06182C] border border-[#0E2D55] text-ivory p-8 md:p-10 shadow-[0_4px_24px_rgba(6,24,44,0.1)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-sky/5 rounded-full blur-2xl pointer-events-none" />
                <p className="eyebrow-light mb-2">Direct Communication</p>
                <h3 className="font-display text-3xl text-ivory tracking-tight">The Firm.</h3>
                <p className="font-body text-sm text-ivory/70 mt-2 leading-relaxed">
                  Direct contact channels for corporate inquiries, statutory notices, and partner consultations.
                </p>

                <div className="mt-8 space-y-6">
                  {/* PHONE NUMBERS */}
                  <div className="space-y-3">
                    <p className="font-body text-[10px] uppercase tracking-[0.2em] text-ivory/45 font-medium">
                      Direct Voice Lines
                    </p>
                    {FIRM.phones.map((p, idx) => (
                      <a
                        key={p}
                        href={`tel:${p.replace(/\s|-/g, "")}`}
                        className="group flex items-center justify-between p-3 bg-white/5 border border-white/10 hover:border-sky/50 transition-all duration-300"
                      >
                        <div className="flex items-center gap-3">
                          {idx === 0 ? (
                            <PhoneCall className="w-4 h-4 text-sky shrink-0" strokeWidth={1.5} />
                          ) : (
                            <Phone className="w-4 h-4 text-sky shrink-0" strokeWidth={1.5} />
                          )}
                          <span className="font-body text-sm text-ivory/90 group-hover:text-white font-medium">
                            {p}
                          </span>
                        </div>
                        <span className="text-[10px] uppercase tracking-[0.14em] text-ivory/40 group-hover:text-sky transition-colors font-medium">
                          {idx === 0 ? "Mobile / Direct" : "Board Line"}
                        </span>
                      </a>
                    ))}
                  </div>

                  {/* EMAILS */}
                  <div className="space-y-3">
                    <p className="font-body text-[10px] uppercase tracking-[0.2em] text-ivory/45 font-medium">
                      Electronic Mail
                    </p>
                    {FIRM.emails.map((e, idx) => (
                      <a
                        key={e}
                        href={`mailto:${e}`}
                        className="group flex items-center justify-between p-3 bg-white/5 border border-white/10 hover:border-sky/50 transition-all duration-300"
                      >
                        <div className="flex items-center gap-3 truncate">
                          {idx === 0 ? (
                            <Mail className="w-4 h-4 text-sky shrink-0" strokeWidth={1.5} />
                          ) : (
                            <MailCheck className="w-4 h-4 text-sky shrink-0" strokeWidth={1.5} />
                          )}
                          <span className="font-body text-sm text-ivory/90 group-hover:text-white truncate font-medium">
                            {e}
                          </span>
                        </div>
                        <span className="text-[10px] uppercase tracking-[0.14em] text-ivory/40 group-hover:text-sky transition-colors shrink-0 ml-2 font-medium">
                          {idx === 0 ? "Official" : "Practice"}
                        </span>
                      </a>
                    ))}
                  </div>

                  {/* LINKEDIN */}
                  <div className="space-y-3">
                    <p className="font-body text-[10px] uppercase tracking-[0.2em] text-ivory/45 font-medium">
                      Corporate Network
                    </p>
                    <a
                      href={FIRM.linkedin}
                      target="_blank"
                      rel="noreferrer"
                      data-testid="contact-linkedin"
                      className="group flex items-center justify-between p-3 bg-white/5 border border-white/10 hover:border-sky/50 transition-all duration-300"
                    >
                      <div className="flex items-center gap-3">
                        <Linkedin className="w-4 h-4 text-sky shrink-0" strokeWidth={1.5} />
                        <span className="font-body text-sm text-ivory/90 group-hover:text-white font-medium">
                          P Suman &amp; Associates
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-ivory/40 group-hover:text-sky transition-colors font-medium">
                        LinkedIn <ArrowUpRight className="w-3 h-3" />
                      </span>
                    </a>
                  </div>
                </div>
              </div>

              {/* PRACTICE LOCATIONS / OFFICE CARDS */}
              <div>
                <div className="flex items-center justify-between mb-4 px-1">
                  <p className="eyebrow">Practice Locations</p>
                  <span className="font-body text-xs text-ink/50 uppercase tracking-[0.14em]">
                    Pan-India Presence
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {OFFICES.map((o) => {
                    const isHq = o.role === "Headquarters" || o.city === "Kolkata";
                    return (
                      <div
                        key={o.city}
                        className={`bg-white border p-6 flex flex-col justify-between min-h-[148px] transition-all duration-300 hover:border-sky hover:shadow-[0_4px_16px_rgba(14,165,233,0.06)] group relative ${
                          isHq ? "border-sky/40 bg-gradient-to-br from-white to-sky/[0.02]" : "border-borderline"
                        }`}
                      >
                        {/* Top Area */}
                        <div className="flex items-center justify-between">
                          <div className="w-8 h-8 rounded-none bg-ink/5 flex items-center justify-center text-sky group-hover:bg-sky group-hover:text-white transition-colors duration-300">
                            {isHq ? (
                              <Building2 className="w-4 h-4" strokeWidth={1.5} />
                            ) : (
                              <MapPin className="w-4 h-4" strokeWidth={1.5} />
                            )}
                          </div>
                          {isHq && (
                            <span className="font-body text-[9px] uppercase tracking-[0.2em] font-semibold text-sky bg-sky/10 border border-sky/30 px-2 py-0.5">
                              HQ · Principal
                            </span>
                          )}
                        </div>

                        {/* Lower / Center Area */}
                        <div className="mt-6 pt-3 border-t border-borderline/60">
                          <h4 className="font-heading text-2xl text-ink group-hover:text-navy transition-colors font-semibold tracking-tight">
                            {o.city}
                          </h4>
                          <p className="font-body text-[11px] uppercase tracking-[0.18em] text-ink/45 mt-0.5 font-medium">
                            {isHq ? "Headquarters · West Bengal" : "Practice Location"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* CAL.COM BOOKING MODAL */}
      {isBookingModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Cal.com Booking Scheduler"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-ink/80 backdrop-blur-sm animate-fade-up"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsBookingModalOpen(false);
            }
          }}
        >
          <div className="bg-white w-full max-w-4xl h-[90vh] max-h-[720px] rounded-none border border-borderline shadow-2xl flex flex-col overflow-hidden relative">
            {/* Modal Header */}
            <div className="bg-ink text-ivory px-6 py-4 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-sky rounded-full animate-pulse" />
                <div>
                  <h3 className="font-heading text-lg text-ivory leading-tight font-semibold">
                    P Suman &amp; Associates · 15-Min Consultation
                  </h3>
                  <p className="font-body text-xs text-ivory/60">
                    Schedule directly with our partner team
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBookingModalOpen(false)}
                className="p-1.5 text-ivory/70 hover:text-white hover:bg-white/10 transition-colors rounded-none cursor-pointer"
                aria-label="Close booking modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Iframe */}
            <div className="flex-1 bg-white relative">
              <iframe
                src={CAL_BOOKING_URL}
                title="Schedule a consultation with P Suman & Associates"
                className="w-full h-full border-0"
                allow="camera; microphone; autoplay; fullscreen"
              />
            </div>

            {/* Modal Footer */}
            <div className="bg-offwhite px-6 py-3 border-t border-borderline flex items-center justify-between text-xs font-body text-ink/60">
              <span>Press Escape or click outside to close</span>
              <a
                href={CAL_BOOKING_URL}
                target="_blank"
                rel="noreferrer"
                className="text-sky hover:underline inline-flex items-center gap-1 font-medium"
              >
                Open in new tab <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Field({ label, type = "text", testid, value, onChange, required, placeholder }) {
  return (
    <div className="flex flex-col">
      <label className="font-body text-[11px] uppercase tracking-[0.2em] text-ink/55 mb-2 font-medium">
        {label}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={onChange}
        data-testid={testid}
        placeholder={placeholder}
        className="bg-transparent border-b border-ink/20 py-3 font-body text-base text-ink placeholder:text-ink/30 focus:outline-none focus:border-sky transition-colors duration-300"
      />
    </div>
  );
}

