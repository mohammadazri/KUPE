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
          <div className="card glow row" style={{ justifyContent: "space-between" }}>
            <div className="row">
              <div
                className="center"
                style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: "rgba(20,189,235,0.16)", color: "#B8E6F5",
                }}
              >
                <Smartphone size={20} />
              </div>
              <div>
                <strong>Install KUPE</strong>
                <div className="text-muted" style={{ fontSize: "0.85rem" }}>
                  Add to home screen — works offline.
                </div>
              </div>
            </div>
            <div className="row">
              <button className="btn primary" onClick={install} style={{ padding: "8px 14px" }}>
                Install
              </button>
              <button
                className="btn ghost"
                onClick={() => setVisible(false)}
                style={{ padding: "8px 10px" }}
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
