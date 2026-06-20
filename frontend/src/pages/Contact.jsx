import React, { useState } from "react";
import axios from "axios";
import { Linkedin, Mail, Phone, MapPin, ArrowRight } from "lucide-react";
import { FIRM, OFFICES } from "../data/site";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SERVICES_OPTS = [
  "Internal Audit",
  "Inventory Intelligence",
  "Risk Advisory",
  "Process Improvement",
  "Tax Advisory",
  "Other",
];

export default function Contact() {
  const [form, setForm] = useState({
    name: "", company: "", designation: "", email: "", phone: "",
    service_of_interest: "", message: "",
  });
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [error, setError] = useState("");

  const onChange = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setStatus("submitting");
    setError("");
    try {
      await axios.post(`${API}/contact`, form);
      setStatus("success");
      setForm({ name: "", company: "", designation: "", email: "", phone: "", service_of_interest: "", message: "" });
    } catch (err) {
      setStatus("error");
      setError(err?.response?.data?.detail?.[0]?.msg || "Submission failed. Please try again.");
    }
  };

  return (
    <main className="bg-ivory">
      <section className="bg-ink text-ivory relative overflow-hidden pt-40 pb-24">
        <div className="absolute inset-0 grain pointer-events-none opacity-40" />
        <div className="relative container-px mx-auto max-w-[1440px]">
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-10">
              <p className="eyebrow-light mb-6">Contact</p>
              <h1 className="font-display-bold text-5xl md:text-7xl lg:text-[88px] text-ivory tracking-[-0.02em] leading-[1.02]">
                Begin a conversation.
              </h1>
              <p className="font-body text-lg md:text-xl text-ivory/70 mt-10 max-w-3xl leading-relaxed">
                A 30-minute consultation with our partner team. No obligation. Independent perspective on your audit, risk, and process priorities.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-24 md:pb-32">
        <div className="container-px mx-auto max-w-[1440px]">
          <div className="grid grid-cols-12 gap-10">
            {/* FORM */}
            <div className="col-span-12 lg:col-span-7">
              <div className="bg-white border border-borderline p-8 md:p-12">
                <p className="eyebrow mb-2">Request a Consultation</p>
                <h2 className="font-display text-3xl md:text-4xl text-ink tracking-tight">Tell us about your engagement.</h2>

                {status === "success" ? (
                  <div className="mt-10 border border-gold/40 bg-gold/5 p-8" data-testid="contact-success">
                    <p className="eyebrow">Received</p>
                    <h3 className="font-display text-3xl text-ink mt-3">Thank you — we&apos;ll be in touch shortly.</h3>
                    <p className="font-body text-base text-ink/70 mt-3 leading-relaxed">
                      Our partner team typically responds within one business day. For urgent matters, call <a href={`tel:${FIRM.phones[0].replace(/\s|-/g,'')}`} className="text-gold underline">{FIRM.phones[0]}</a>.
                    </p>
                    <button onClick={() => setStatus("idle")} data-testid="contact-success-reset" className="btn-secondary mt-8">Submit Another</button>
                  </div>
                ) : (
                  <form onSubmit={submit} data-testid="contact-form" className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field label="Name *" testid="contact-name" value={form.name} onChange={onChange("name")} required />
                    <Field label="Company" testid="contact-company" value={form.company} onChange={onChange("company")} />
                    <Field label="Designation" testid="contact-designation" value={form.designation} onChange={onChange("designation")} />
                    <Field label="Email *" type="email" testid="contact-email" value={form.email} onChange={onChange("email")} required />
                    <Field label="Phone" testid="contact-phone" value={form.phone} onChange={onChange("phone")} />
                    <div className="flex flex-col">
                      <label className="font-body text-[11px] uppercase tracking-[0.2em] text-ink/55 mb-2">Service of Interest</label>
                      <select
                        data-testid="contact-service"
                        value={form.service_of_interest}
                        onChange={onChange("service_of_interest")}
                        className="bg-transparent border-b border-ink/20 py-3 font-body text-base text-ink focus:outline-none focus:border-gold transition-colors duration-300"
                      >
                        <option value="">Select…</option>
                        {SERVICES_OPTS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2 flex flex-col">
                      <label className="font-body text-[11px] uppercase tracking-[0.2em] text-ink/55 mb-2">Message *</label>
                      <textarea
                        required
                        rows={5}
                        value={form.message}
                        onChange={onChange("message")}
                        data-testid="contact-message"
                        className="bg-transparent border-b border-ink/20 py-3 font-body text-base text-ink focus:outline-none focus:border-gold transition-colors duration-300 resize-none"
                      />
                    </div>
                    <div className="md:col-span-2 flex items-center justify-between gap-6 mt-4">
                      <p className="font-body text-xs text-ink/50">We respond within one business day.</p>
                      <button
                        type="submit"
                        disabled={status === "submitting"}
                        data-testid="contact-submit"
                        className="btn-primary disabled:opacity-60"
                      >
                        {status === "submitting" ? "Sending…" : "Submit"} <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                      </button>
                    </div>
                    {error && <p data-testid="contact-error" className="md:col-span-2 font-body text-sm text-red-600">{error}</p>}
                  </form>
                )}
              </div>

              <a
                href={`mailto:${FIRM.emails[0]}`}
                data-testid="contact-schedule-call"
                className="mt-8 inline-flex items-center gap-2 font-body text-sm text-ink hover:text-gold transition-colors duration-300 link-underline"
              >
                Or schedule a call directly → {FIRM.emails[0]}
              </a>
            </div>

            {/* SIDEBAR */}
            <div className="col-span-12 lg:col-span-5">
              <div className="bg-ink text-ivory p-8 md:p-12">
                <p className="eyebrow-light mb-2">Direct</p>
                <h3 className="font-display text-3xl text-ivory tracking-tight">Reach the firm.</h3>

                <div className="mt-8 space-y-5">
                  {FIRM.phones.map((p) => (
                    <a key={p} href={`tel:${p.replace(/\s|-/g,'')}`} className="flex items-center gap-3 font-body text-base text-ivory/85 hover:text-gold transition-colors duration-300">
                      <Phone className="w-4 h-4 text-gold" strokeWidth={1.5} /> {p}
                    </a>
                  ))}
                  {FIRM.emails.map((e) => (
                    <a key={e} href={`mailto:${e}`} className="flex items-center gap-3 font-body text-base text-ivory/85 hover:text-gold transition-colors duration-300">
                      <Mail className="w-4 h-4 text-gold" strokeWidth={1.5} /> {e}
                    </a>
                  ))}
                  <a href={FIRM.linkedin} target="_blank" rel="noreferrer" data-testid="contact-linkedin" className="flex items-center gap-3 font-body text-base text-ivory/85 hover:text-gold transition-colors duration-300">
                    <Linkedin className="w-4 h-4 text-gold" strokeWidth={1.5} /> LinkedIn
                  </a>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                {OFFICES.map((o) => (
                  <div key={o.city} className="bg-white border border-borderline p-6 hover:border-gold transition-colors duration-500">
                    <MapPin className="w-4 h-4 text-gold" strokeWidth={1.5} />
                    <h4 className="font-heading text-xl text-ink mt-4">
                      {o.city}
                      {o.role === "Headquarters" && <span className="text-gold text-[9px] ml-2 align-middle uppercase tracking-[0.2em]">HQ</span>}
                    </h4>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Field({ label, type = "text", testid, value, onChange, required }) {
  return (
    <div className="flex flex-col">
      <label className="font-body text-[11px] uppercase tracking-[0.2em] text-ink/55 mb-2">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={onChange}
        data-testid={testid}
        className="bg-transparent border-b border-ink/20 py-3 font-body text-base text-ink focus:outline-none focus:border-gold transition-colors duration-300"
      />
    </div>
  );
}
