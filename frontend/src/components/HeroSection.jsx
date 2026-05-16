import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";

export default function HeroSection({ onPrimary }) {
  return (
    <section
      style={{
        position: "relative",
        padding: "80px 0 60px",
        overflow: "hidden",
      }}
    >
      {/* glow blobs */}
      <div
        style={{
          position: "absolute",
          top: "-100px",
          right: "-100px",
          width: 420,
          height: 420,
          background: "radial-gradient(circle, rgba(20,189,235,0.28), transparent 60%)",
          filter: "blur(40px)",
          zIndex: -1,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-120px",
          left: "-80px",
          width: 380,
          height: 380,
          background: "radial-gradient(circle, rgba(13,115,119,0.32), transparent 60%)",
          filter: "blur(50px)",
          zIndex: -1,
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <span className="chip brand">
          <Sparkles size={14} /> Powered by Gemini 2.5 Pro · Vertex AI
        </span>
        <h1 className="mt-4">
          Your perfect trip,
          <br />
          <span
            style={{
              background: "linear-gradient(135deg, #14BDEB, #32D583)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            auto-crafted by AI.
          </span>
        </h1>
        <p
          className="mt-4"
          style={{ fontSize: "1.1rem", maxWidth: 640 }}
        >
          KUPE turns your constraints — Halal, wheelchair-accessible, dietary — into
          a self-verified, self-healing itinerary. Linkages aren't recommendations.
          They're programmable promises.
        </p>
        <div className="row mt-5">
          <button className="btn primary pulse" onClick={onPrimary}>
            Plan my trip <ArrowRight size={18} />
          </button>
          <a href="#how" className="btn ghost">
            See how it works
          </a>
        </div>
      </motion.div>
    </section>
  );
}
