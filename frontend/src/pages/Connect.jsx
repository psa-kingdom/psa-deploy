import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  Phone, 
  Mail, 
  MapPin, 
  Globe, 
  Linkedin, 
  UserPlus, 
  X, 
  ExternalLink, 
  QrCode,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "qrcode";
import Logo from "@/components/Logo";

// Card details
const CONTACT = {
  name: "CA Prem Suman",
  title: "Founder & Managing Partner",
  company: "P Suman & Associates",
  badge: "FCA · ICAI",
  mobile: "+91 98315 46721",
  email: "info@psumanassociates.com",
  address: "PSA Headquarters, Kolkata, West Bengal, India",
  website: "www.psumanassociates.com",
  whatsapp: "+919831546721",
  linkedin: "https://www.linkedin.com/company/p-suman-associates/",
  mapsUrl: "https://maps.google.com/?q=P+Suman+%26+Associates+Kolkata",
};

export default function Connect() {
  const [searchParams] = useSearchParams();
  const [showQrModal, setShowQrModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const canvasRef = useRef(null);

  // vCard VCF content
  const vcardData = `BEGIN:VCARD
VERSION:3.0
N:Suman;Prem;;CA;
FN:CA Prem Suman
ORG:P Suman & Associates
TITLE:Founder & Managing Partner
TEL;TYPE=CELL,VOICE:+919831546721
EMAIL;TYPE=INTERNET,WORK:info@psumanassociates.com
URL;TYPE=WORK:https://psumanassociates.com
ADR;TYPE=WORK,POSTAL:;;P Suman & Associates, Kolkata Headquarters;Kolkata;West Bengal;;India
NOTE:Chartered Accountants · ICAI Firm
END:VCARD`;

  // Check if current browser is mobile
  const isMobileDevice = () => {
    if (typeof window === "undefined") return false;
    const isSmallScreen = window.innerWidth < 768;
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
    const hasTouch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
    return isSmallScreen || (isMobileUA && hasTouch);
  };

  // Trigger direct download of VCF file
  const downloadVcf = () => {
    try {
      const blob = new Blob([vcardData], { type: "text/vcard;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "CA_Prem_Suman.vcf");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("VCF download failed:", err);
    }
  };

  // Save contact button action
  const handleSaveContact = () => {
    if (isMobileDevice()) {
      downloadVcf();
    } else {
      setShowQrModal(true);
    }
  };

  // Check for auto-download parameter on load (primarily scanned from QR)
  useEffect(() => {
    if (searchParams.get("download") === "vcf") {
      downloadVcf();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Render QR Code in modal
  useEffect(() => {
    if (showQrModal && canvasRef.current) {
      // The QR code contains the link to auto-download Prem's contact details when scanned on a mobile phone
      const qrUrl = `${window.location.origin}/connect?download=vcf`;
      QRCode.toCanvas(
        canvasRef.current,
        qrUrl,
        {
          width: 256,
          margin: 1.5,
          color: {
            dark: "#0A2540", // Ink
            light: "#FFFFFF",
          },
        },
        (err) => {
          if (err) console.error("Error generating QR code:", err);
        }
      );
    }
  }, [showQrModal]);

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.6, 
        ease: "easeOut",
        staggerChildren: 0.1 
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  return (
    <div className="min-h-screen bg-[#06182C] relative overflow-hidden font-body text-white flex flex-col justify-between py-12 px-4 selection:bg-sky-500 selection:text-white">
      {/* Background ambient lighting effects */}
      <div className="absolute top-[-10%] left-[-20%] w-[80%] h-[60%] rounded-full bg-sky-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-20%] w-[80%] h-[60%] rounded-full bg-sky-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 grain pointer-events-none opacity-[0.03]" />

      <main className="flex-1 flex items-center justify-center">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-[420px] bg-[#0E2D55]/30 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col"
        >
          {/* Card Cover Banner */}
          <div className="h-36 bg-gradient-to-br from-[#0A2540] via-[#0E2D55] to-sky-950 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-500/20 via-transparent to-transparent opacity-70" />
            <div className="absolute top-6 left-6 z-10 scale-90 origin-left opacity-90">
              <Logo variant="dark" size="sm" />
            </div>
            <div className="absolute top-6 right-6 text-white/30 hover:text-white/60 transition-colors cursor-pointer" onClick={() => setShowQrModal(true)} title="Show QR Code">
              <QrCode className="w-5 h-5" strokeWidth={1.5} />
            </div>
          </div>

          {/* Profile Area */}
          <div className="px-6 pb-8 relative flex flex-col items-center">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full border-4 border-sky-500/80 shadow-[0_0_20px_rgba(14,165,233,0.35)] overflow-hidden -mt-12 bg-[#0A2540] relative z-10 transition-transform duration-500 hover:scale-105">
              <img 
                src="/founder.jpg" 
                alt={CONTACT.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=srgb&fm=jpg&w=400&q=80";
                }}
              />
            </div>

            {/* Profile Info */}
            <h1 className="font-display text-3xl text-white mt-4 font-semibold tracking-tight leading-tight">
              {CONTACT.name}
            </h1>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-400 mt-2">
              {CONTACT.title}
            </p>
            <p className="text-sm text-white/50 mt-1">
              {CONTACT.company}
            </p>
            <span className="mt-3 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] tracking-wider text-white/60 uppercase">
              {CONTACT.badge}
            </span>

            {/* Save Contact CTA */}
            <button 
              onClick={handleSaveContact}
              className="mt-6 w-full py-4 bg-sky-500 hover:bg-sky-400 text-white font-semibold text-[13px] uppercase tracking-[0.18em] rounded-xl transition-all duration-300 shadow-[0_4px_25px_rgba(14,165,233,0.3)] hover:shadow-[0_4px_30px_rgba(14,165,233,0.45)] hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" strokeWidth={1.5} />
              Save Contact
            </button>

            {/* Grid of Contact Elements */}
            <div className="w-full mt-6 space-y-3">
              {/* Phone */}
              <motion.a 
                variants={itemVariants}
                href={`tel:${CONTACT.mobile.replace(/\s/g, "")}`}
                className="bg-white/[0.03] border border-white/[0.08] hover:border-sky-500/40 rounded-2xl p-4 transition-all duration-300 hover:bg-white/[0.06] flex items-center gap-4 group"
              >
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 group-hover:bg-sky-500 group-hover:text-white transition-colors duration-300">
                  <Phone className="w-4.5 h-4.5" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-white/40">Mobile</p>
                  <p className="text-sm font-medium text-white group-hover:text-sky-300 transition-colors">{CONTACT.mobile}</p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 ml-auto text-white/10 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all" strokeWidth={1.5} />
              </motion.a>

              {/* Email */}
              <motion.a 
                variants={itemVariants}
                href={`mailto:${CONTACT.email}`}
                className="bg-white/[0.03] border border-white/[0.08] hover:border-sky-500/40 rounded-2xl p-4 transition-all duration-300 hover:bg-white/[0.06] flex items-center gap-4 group"
              >
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 group-hover:bg-sky-500 group-hover:text-white transition-colors duration-300">
                  <Mail className="w-4.5 h-4.5" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-white/40">Email</p>
                  <p className="text-sm font-medium text-white group-hover:text-sky-300 transition-colors break-all pr-2">{CONTACT.email}</p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 ml-auto text-white/10 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all" strokeWidth={1.5} />
              </motion.a>

              {/* Office Address */}
              <motion.a 
                variants={itemVariants}
                href={CONTACT.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="bg-white/[0.03] border border-white/[0.08] hover:border-sky-500/40 rounded-2xl p-4 transition-all duration-300 hover:bg-white/[0.06] flex items-start gap-4 group"
              >
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 group-hover:bg-sky-500 group-hover:text-white transition-colors duration-300 shrink-0 mt-0.5">
                  <MapPin className="w-4.5 h-4.5" strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <p className="text-[9px] uppercase tracking-wider text-white/40">Office Address</p>
                  <p className="text-xs font-medium text-white group-hover:text-sky-300 transition-colors leading-relaxed mt-0.5">{CONTACT.address}</p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 ml-auto text-white/10 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-3" strokeWidth={1.5} />
              </motion.a>

              {/* Website */}
              <motion.a 
                variants={itemVariants}
                href={`https://${CONTACT.website}`}
                target="_blank"
                rel="noreferrer"
                className="bg-white/[0.03] border border-white/[0.08] hover:border-sky-500/40 rounded-2xl p-4 transition-all duration-300 hover:bg-white/[0.06] flex items-center gap-4 group"
              >
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 group-hover:bg-sky-500 group-hover:text-white transition-colors duration-300">
                  <Globe className="w-4.5 h-4.5" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-white/40">Website</p>
                  <p className="text-sm font-medium text-white group-hover:text-sky-300 transition-colors">{CONTACT.website}</p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 ml-auto text-white/10 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all" strokeWidth={1.5} />
              </motion.a>

              {/* Social Channels Row */}
              <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
                {/* WhatsApp */}
                <a 
                  href={`https://wa.me/${CONTACT.whatsapp}`}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-white/[0.03] border border-white/[0.08] hover:border-emerald-500/40 rounded-2xl p-3.5 transition-all duration-300 hover:bg-white/[0.06] flex items-center gap-3 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
                    <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.713-1.455L0 24zm6.59-4.846c1.6.95 3.197 1.451 4.811 1.452 5.518 0 10.006-4.485 10.01-10.007.002-2.675-1.041-5.19-2.937-7.09C16.637 1.628 14.122.582 11.45.582c-5.523 0-10.01 4.484-10.014 10.008-.002 1.83.483 3.614 1.404 5.176l-.92 3.37 3.447-.905c1.512.825 3.018 1.223 4.63 1.223zm10.742-7.558c-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-[8px] uppercase tracking-wider text-white/40">WhatsApp</p>
                    <p className="text-xs font-semibold text-white group-hover:text-emerald-300 transition-colors">Chat Now</p>
                  </div>
                </a>

                {/* LinkedIn */}
                <a 
                  href={CONTACT.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-white/[0.03] border border-white/[0.08] hover:border-blue-500/40 rounded-2xl p-3.5 transition-all duration-300 hover:bg-white/[0.06] flex items-center gap-3 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                    <Linkedin className="w-4 h-4" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-[8px] uppercase tracking-wider text-white/40">LinkedIn</p>
                    <p className="text-xs font-semibold text-white group-hover:text-blue-300 transition-colors">Connect</p>
                  </div>
                </a>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Page Footer */}
      <footer className="w-full text-center mt-8 z-10">
        <p className="text-[10px] tracking-[0.18em] text-white/30 uppercase">
          © {new Date().getFullYear()} P Suman & Associates · Chartered Accountants
        </p>
      </footer>

      {/* Desktop QR Modal */}
      <AnimatePresence>
        {showQrModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQrModal(false)}
              className="absolute inset-0 bg-[#06182C]/80 backdrop-blur-md"
            />

            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="bg-[#0A2540] border border-white/10 rounded-3xl p-8 max-w-sm w-full relative z-10 flex flex-col items-center shadow-2xl text-center"
            >
              {/* Close Button */}
              <button 
                onClick={() => setShowQrModal(false)}
                className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors p-1.5 hover:bg-white/5 rounded-full"
              >
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>

              <div className="w-10 h-10 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-400 mb-4">
                <QrCode className="w-5 h-5" strokeWidth={1.5} />
              </div>

              <h2 className="font-display text-2xl font-bold tracking-tight text-white mb-2">
                Download Prem&apos;s Card
              </h2>
              <p className="text-sm text-white/60 mb-6 max-w-[260px] leading-relaxed">
                Point your phone&apos;s camera to download Prem&apos;s contact details directly.
              </p>

              {/* Canvas Container */}
              <div className="p-3 bg-white rounded-2xl shadow-inner mb-6 relative group transition-transform duration-500 hover:scale-[1.02]">
                <canvas ref={canvasRef} className="rounded-lg" />
              </div>

              {/* Action Buttons */}
              <div className="w-full grid grid-cols-1 gap-2">
                <button 
                  onClick={downloadVcf}
                  className="w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-xs font-semibold uppercase tracking-wider text-white transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" strokeWidth={1.5} />
                  Download VCF Direct
                </button>
                <button
                  onClick={() => copyToClipboard(`${window.location.origin}/connect`, "URL")}
                  className="w-full py-3 bg-transparent text-white/40 hover:text-white text-xs font-semibold tracking-wider transition-all flex items-center justify-center gap-1.5"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" strokeWidth={2} />
                      Copied!
                    </>
                  ) : (
                    <>
                      Copy Card Link
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Simple internal helper for download icon (not present in standard imports sometimes)
function Download({ className, ...props }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      className={className} 
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}
