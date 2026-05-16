import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AdminAPI } from "../api/client.js";
import { Activity, GitBranch, ShieldCheck, BarChart3, TrendingUp } from "lucide-react";
import { getPhotoForBusiness } from "../utils/photos.js";

function Stat({ icon: Icon, label, value, hint, accent = "blue" }) {
  const accentBg =
    accent === "orange" ? "var(--brand-orange-soft)" :
    accent === "green" ? "var(--success-soft)" :
    "var(--brand-blue-soft)";
  const accentColor =
    accent === "orange" ? "var(--brand-orange)" :
    accent === "green" ? "var(--success)" :
    "var(--brand-blue)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="text-muted" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>{label}</div>
        <div
          className="center"
          style={{ width: 32, height: 32, borderRadius: 8, background: accentBg, color: accentColor }}
        >
          <Icon size={16} />
        </div>
      </div>
      <div
        style={{
          fontSize: "2rem",
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          marginTop: 8,
          color: "var(--text-primary)",
        }}
      >
        {value}
      </div>
      {hint && <div className="text-muted" style={{ fontSize: "0.8125rem", marginTop: 2 }}>{hint}</div>}
    </motion.div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [blueprints, setBlueprints] = useState([]);
  const [err, setErr] = useState(null);

  useEffect(() => {
    Promise.all([AdminAPI.stats(), AdminAPI.blueprints()])
      .then(([s, bp]) => {
        setStats(s);
        setBlueprints(bp);
      })
      .catch((e) => setErr(e?.response?.data?.detail || e.message));
  }, []);

  return (
    <div className="container" style={{ paddingTop: 32 }}>
      <header className="mb-5">
        <h1>Ecosystem Dashboard</h1>
        <p className="text-secondary mt-2">
          Real-time view of the KUPE linkage graph. All metrics aggregate from Firestore.
        </p>
      </header>

      {err && <div className="card tinted-danger mb-4 text-danger">Failed to load stats: {err}</div>}

      {stats ? (
        <>
          <div className="grid-3">
            <Stat icon={Activity} label="Total linkages" value={stats.total_linkages} />
            <Stat icon={ShieldCheck} label="Verified" value={stats.verified_linkages} accent="green" />
            <Stat
              icon={GitBranch}
              label="Healed"
              value={stats.healed_linkages}
              hint={`${(stats.self_heal_rate * 100).toFixed(1)}% self-heal rate`}
              accent="orange"
            />
          </div>

          <div className="grid-2 mt-5">
            <div className="card">
              <div className="row-tight">
                <TrendingUp size={16} color="var(--brand-blue)" />
                <strong>Average confidence</strong>
              </div>
              <div
                style={{
                  fontSize: "3rem",
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  color: "var(--brand-blue)",
                  marginTop: 8,
                  lineHeight: 1,
                }}
              >
                {(stats.avg_confidence * 100).toFixed(1)}%
              </div>
              <p className="text-secondary mt-2">Across all created linkages.</p>
            </div>
            <div className="card">
              <div className="row-tight">
                <BarChart3 size={16} color="var(--brand-blue)" />
                <strong>Top venues</strong>
              </div>
              <div className="stack mt-3" style={{ gap: 10 }}>
                {stats.leaderboard.slice(0, 6).map((b, i) => (
                  <div key={b.id} className="row" style={{ justifyContent: "space-between", gap: 10 }}>
                    <div className="row-tight" style={{ gap: 10 }}>
                      <img
                        src={getPhotoForBusiness({ id: b.id, type: b.type })}
                        alt=""
                        loading="lazy"
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 6,
                          objectFit: "cover",
                          border: "1px solid var(--border-subtle)",
                        }}
                      />
                      <div>
                        <strong style={{ fontSize: "0.875rem" }}>
                          {i + 1}. {b.name}
                        </strong>
                        <div className="text-muted" style={{ fontSize: "0.75rem" }}>{b.type}</div>
                      </div>
                    </div>
                    <span className="chip brand">{b.linkage_count}</span>
                  </div>
                ))}
                {!stats.leaderboard.length && (
                  <div className="text-muted" style={{ fontSize: "0.875rem" }}>
                    No linkages yet — generate a trip first.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card mt-5">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="row-tight">
                <Sparkle />
                <h3>Blueprint library</h3>
              </div>
              <span className="chip">{blueprints.length} saved</span>
            </div>
            <p className="text-secondary mt-2">
              Successful trip patterns saved for instant reuse on new travellers.
            </p>
            {blueprints.length ? (
              <div className="grid-3 mt-3">
                {blueprints.map((b) => (
                  <div
                    key={b.id}
                    className="card flat"
                    style={{ background: "var(--bg-page)", boxShadow: "none" }}
                  >
                    <div className="row-tight" style={{ flexWrap: "wrap", gap: 6 }}>
                      {b.constraint_profile.map((c) => (
                        <span className="chip success" key={c}>{c}</span>
                      ))}
                    </div>
                    <div className="text-secondary mt-2" style={{ fontSize: "0.8125rem" }}>
                      ★ {b.avg_satisfaction} · {b.city}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="card flat mt-3"
                style={{ background: "var(--bg-page)", boxShadow: "none", textAlign: "center", padding: 24 }}
              >
                <div className="text-secondary" style={{ fontSize: "0.875rem" }}>
                  Rate a trip 4.5+ to seed a reusable blueprint.
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="card skeleton" style={{ height: 320 }} />
      )}
    </div>
  );
}

function Sparkle() {
  return (
    <span style={{ width: 16, height: 16, display: "inline-flex", alignItems: "center", color: "var(--brand-orange)" }}>
      ✦
    </span>
  );
}
