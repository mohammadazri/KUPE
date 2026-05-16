import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShieldCheck, ChevronUp, ChevronDown } from "lucide-react";
import EthicalAIPanel from "./EthicalAIPanel.jsx";

export default function EthicalAIFooter({ trip, linkages }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="ethical-footer" role="region" aria-label="Ethical AI transparency">
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="ethical-footer__panel"
          >
            <div className="container" style={{ paddingTop: 16, paddingBottom: 16 }}>
              <EthicalAIPanel trip={trip} linkages={linkages} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        type="button"
        className="ethical-footer__bar"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="row-tight">
          <ShieldCheck size={14} color="var(--brand-blue)" />
          <strong style={{ fontSize: "0.8125rem" }}>Ethical AI · Transparency</strong>
          <span className="text-muted" style={{ fontSize: "0.75rem" }}>
            {open ? "Hide details" : "Tap for details"}
          </span>
        </span>
        {open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>
    </div>
  );
}
