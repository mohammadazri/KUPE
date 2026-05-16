import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MoonStar,
  Accessibility,
  Leaf,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  HeartHandshake,
} from "lucide-react";
import HeroSection from "../components/HeroSection.jsx";
import { useAuth } from "../hooks/useAuth.jsx";

const trustSignals = [
  { icon: MoonStar, label: "JAKIM Halal", desc: "Verified certifications, not guesses" },
  { icon: Accessibility, label: "Wheelchair", desc: "Step-free verified routing" },
  { icon: Leaf, label: "Dietary", desc: "Vegan, vegetarian, allergy aware" },
  { icon: ShieldCheck, label: "Ethical AI", desc: "Transparency on every linkage" },
];

const steps = [
  {
    icon: HeartHandshake,
    title: "1. Tell us your constraints",
    body: "Pick what matters — Halal, wheelchair, dietary, pace. Hard constraints are non-negotiable.",
  },
  {
    icon: Sparkles,
    title: "2. AI builds your itinerary",
    body: "Gemini 3.1 Pro ranks businesses that already passed our deterministic constraint solver.",
  },
  {
    icon: Zap,
    title: "3. Self-heals on the go",
    body: "A restaurant closes? Tap once. AI finds a replacement that still meets every constraint.",
  },
];

export default function LandingPage() {
  const nav = useNavigate();
  const { user, signIn } = useAuth();

  const handleStart = async () => {
    if (!user) await signIn();
    nav("/plan");
  };

  return (
    <div className="container">
      <HeroSection onPrimary={handleStart} />

      {/* Trust signals */}
      <section className="mt-5">
        <div className="grid-3">
          {trustSignals.map((t, i) => (
            <motion.div
              key={t.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="card"
            >
              <div className="row">
                <div
                  className="center"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: "rgba(20,189,235,0.12)",
                    color: "#B8E6F5",
                  }}
                >
                  <t.icon size={22} />
                </div>
                <div>
                  <div style={{ fontWeight: 700 }}>{t.label}</div>
                  <div className="text-muted" style={{ fontSize: "0.85rem" }}>
                    {t.desc}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mt-5">
        <div className="row mb-4">
          <h2>How KUPE works</h2>
          <span className="chip brand">3 steps · 45 seconds</span>
        </div>
        <div className="grid-3">
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="card"
              style={{ minHeight: 220 }}
            >
              <div
                className="center"
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: "linear-gradient(135deg, rgba(20,189,235,0.18), rgba(13,115,119,0.18))",
                  color: "#B8E6F5",
                  marginBottom: 16,
                }}
              >
                <s.icon size={28} />
              </div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section className="mt-5">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="card glow"
          style={{
            background:
              "linear-gradient(135deg, rgba(20,189,235,0.10), rgba(13,115,119,0.16))",
          }}
        >
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <h2>Ready to plan your KL trip?</h2>
              <p className="text-secondary mt-2">
                AI-crafted in under a minute. Constraints respected. Linkages programmable.
              </p>
            </div>
            <button className="btn primary" onClick={handleStart}>
              Plan my trip <ArrowRight size={18} />
            </button>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
