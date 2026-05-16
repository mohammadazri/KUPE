import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Smartphone, X } from "lucide-react";

export default function PWAInstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onPrompt(e) {
      e.preventDefault();
      setDeferred(e);
      setVisible(true);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setVisible(false);
    setDeferred(null);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", damping: 18 }}
          style={{
            position: "fixed",
            bottom: 16,
            left: 16,
            right: 16,
            zIndex: 100,
            maxWidth: 460,
            margin: "0 auto",
          }}
        >
          <div className="card row" style={{ justifyContent: "space-between", boxShadow: "var(--shadow-widget)" }}>
            <div className="row-tight" style={{ gap: 12 }}>
              <div
                className="center"
                style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: "var(--brand-blue-soft)", color: "var(--brand-blue)",
                }}
              >
                <Smartphone size={20} />
              </div>
              <div>
                <strong style={{ fontSize: "0.9375rem" }}>Install KUPE</strong>
                <div className="text-secondary" style={{ fontSize: "0.8125rem" }}>
                  Add to home screen — works offline.
                </div>
              </div>
            </div>
            <div className="row-tight" style={{ gap: 6 }}>
              <button className="btn primary sm" onClick={install}>
                Install
              </button>
              <button
                className="btn ghost sm"
                onClick={() => setVisible(false)}
                style={{ padding: "8px 10px", minHeight: "auto" }}
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
