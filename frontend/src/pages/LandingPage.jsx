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
  Star,
} from "lucide-react";
import HeroSection from "../components/HeroSection.jsx";
import { useAuth } from "../hooks/useAuth.jsx";
import { getPhotoForBusiness } from "../utils/photos.js";

const trustSignals = [
  { icon: MoonStar, label: "JAKIM Halal", desc: "Verified certifications, not guesses" },
  { icon: Accessibility, label: "Wheelchair", desc: "Step-free verified routing" },
  { icon: Leaf, label: "Dietary", desc: "Vegan, vegetarian, allergy aware" },
  { icon: ShieldCheck, label: "Ethical AI", desc: "Transparency on every linkage" },
];

const steps = [
  {
    icon: HeartHandshake,
    title: "Tell us your constraints",
    body: "Pick what matters — Halal, wheelchair, dietary, pace. Hard constraints are non-negotiable.",
  },
  {
    icon: Sparkles,
    title: "AI builds your itinerary",
    body: "Gemini 2.5 ranks venues that already passed our deterministic constraint solver.",
  },
  {
    icon: Zap,
    title: "Self-heals on the go",
    body: "A restaurant closes? Tap once. AI finds a replacement that still meets every constraint.",
  },
];

const POPULAR_TRIPS = [
  {
    id: "biz_petronas_twin_towers",
    name: "Petronas Twin Towers",
    type: "attraction",
    tagline: "KL skyline icon · wheelchair accessible",
    rating: 4.7,
    avg_spend_myr: 80,
    constraints_met: { halal: { certified: true, body: "N/A" }, accessibility: { wheelchair: true } },
  },
  {
    id: "biz_islamic_arts_museum",
    name: "Islamic Arts Museum",
    type: "attraction",
    tagline: "Cultural · indoor · halal café onsite",
    rating: 4.7,
    avg_spend_myr: 25,
    constraints_met: { halal: { certified: true, body: "N/A" }, accessibility: { wheelchair: true } },
  },
  {
    id: "biz_batu_caves",
    name: "Batu Caves",
    type: "attraction",
    tagline: "Iconic temple · cultural heritage",
    rating: 4.5,
    avg_spend_myr: 0,
    constraints_met: { halal: { certified: true, body: "N/A" }, accessibility: { wheelchair: false } },
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
    <>
      <HeroSection onPrimary={handleStart} />

      <div className="container" style={{ paddingTop: 48 }}>
        <section>
          <div className="row mb-4" style={{ justifyContent: "space-between" }}>
            <div>
              <h2>Why KUPE</h2>
              <p className="mt-2">Built for travellers who can't compromise on what matters.</p>
            </div>
          </div>
          <div className="grid-4">
            {trustSignals.map((t, i) => (
              <motion.div
                key={t.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="card flat"
              >
                <div
                  className="center"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: "var(--brand-blue-soft)",
                    color: "var(--brand-blue)",
                    marginBottom: 10,
                  }}
                >
                  <t.icon size={22} />
                </div>
                <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{t.label}</div>
                <div className="text-secondary" style={{ fontSize: "0.875rem", marginTop: 4 }}>
                  {t.desc}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mt-6" id="how" style={{ marginTop: 56 }}>
          <div className="row mb-4">
            <h2>How it works</h2>
            <span className="chip orange">3 steps · 45 seconds</span>
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
                style={{ minHeight: 200 }}
              >
                <div
                  className="row-tight"
                  style={{ gap: 10, marginBottom: 12 }}
                >
                  <div
                    className="center"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 999,
                      background: "var(--brand-orange)",
                      color: "white",
                      fontFamily: "var(--font-display)",
                      fontWeight: 800,
                      fontSize: "0.9375rem",
                    }}
                  >
                    {i + 1}
                  </div>
                  <s.icon size={20} color="var(--brand-blue)" />
                </div>
                <h3>{s.title}</h3>
                <p className="mt-2">{s.body}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mt-6" style={{ marginTop: 56 }}>
          <div className="row mb-4" style={{ justifyContent: "space-between" }}>
            <div>
              <h2>Popular in KL</h2>
              <p className="mt-2">A taste of what KUPE will suggest for you.</p>
            </div>
            <button className="btn ghost sm" onClick={handleStart}>
              See all <ArrowRight size={14} />
            </button>
          </div>
          <div className="grid-3">
            {POPULAR_TRIPS.map((biz, i) => (
              <motion.div
                key={biz.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="photo-card"
                onClick={handleStart}
                style={{ cursor: "pointer" }}
              >
                <div className="photo">
                  <img src={getPhotoForBusiness(biz)} alt={biz.name} loading="lazy" />
                  <div className="photo-overlay-top">
                    <span className="badge orange">
                      <MoonStar size={11} /> Halal-friendly
                    </span>
                    {biz.rating > 0 && (
                      <span className="badge yellow">
                        <Star size={11} style={{ fill: "currentColor" }} /> {biz.rating}
                      </span>
                    )}
                  </div>
                </div>
                <div className="body">
                  <strong style={{ fontSize: "1rem" }}>{biz.name}</strong>
                  <div className="text-secondary" style={{ fontSize: "0.8125rem" }}>
                    {biz.tagline}
                  </div>
                  {biz.avg_spend_myr > 0 && (
                    <div style={{ fontSize: "0.875rem", marginTop: 2 }}>
                      From <span style={{ color: "var(--brand-orange)", fontWeight: 700 }}>RM{biz.avg_spend_myr}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mt-6" style={{ marginTop: 56, marginBottom: 16 }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="card"
            style={{
              background: "linear-gradient(135deg, var(--brand-blue) 0%, var(--brand-blue-hover) 100%)",
              color: "white",
              border: 0,
            }}
          >
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div>
                <h2 style={{ color: "white" }}>Ready to plan your KL trip?</h2>
                <p style={{ color: "rgba(255,255,255,0.85)", marginTop: 6 }}>
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
    </>
  );
}
