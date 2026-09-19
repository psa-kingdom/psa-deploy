import React, { useState } from "react";
import { MessageCircle, X } from "lucide-react";

export default function WhatsAppChatBubble() {
  const [isOpen, setIsOpen] = useState(false);

  const phoneNumber = "918743855527";
  const defaultMessage = "I want to know more about this";
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(defaultMessage)}`;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
      {/* Popover Bubble Card */}
      {isOpen && (
        <div className="mb-3 w-72 sm:w-80 bg-white dark:bg-[#0A2540] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300">
          {/* Header */}
          <div className="bg-[#25D366] text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">
                P
              </div>
              <div>
                <h4 className="font-semibold text-sm leading-tight">P Suman &amp; Associates</h4>
                <p className="text-[11px] text-white/90">Typically replies instantly</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Close chat"
            >
              <X size={18} />
            </button>
          </div>

          {/* Chat Bubble Body */}
          <div className="p-4 bg-slate-50 dark:bg-[#06182C]">
            <div className="bg-white dark:bg-[#0A2540] border border-slate-200/80 dark:border-white/10 rounded-2xl rounded-tl-sm p-3.5 shadow-sm text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
              Hello! 👋 How can we assist you with our audit, tax, or advisory services today?
            </div>
          </div>

          {/* Action CTA */}
          <div className="p-3 bg-white dark:bg-[#0A2540] border-t border-slate-100 dark:border-white/5">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-medium text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all"
            >
              <MessageCircle size={16} />
              <span>Chat on WhatsApp</span>
            </a>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center justify-center w-14 h-14 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-full shadow-[0_4px_20px_rgba(37,211,102,0.4)] hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
        aria-label="Chat with us on WhatsApp"
      >
        {isOpen ? (
          <X size={24} className="transition-transform duration-200" />
        ) : (
          <>
            <MessageCircle size={28} className="transition-transform duration-200" />
            {/* Small subtle online badge */}
            <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-400 border-2 border-white dark:border-[#06182C] rounded-full" />
          </>
        )}

        {/* Hover Tooltip when closed */}
        {!isOpen && (
          <span className="pointer-events-none absolute right-16 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900/90 text-white px-3 py-1.5 text-xs font-medium opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 hidden sm:block">
            Chat with us
          </span>
        )}
      </button>
    </div>
  );
}
