import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AdminAPI } from "../api/client.js";
import { Activity, GitBranch, ShieldCheck, BarChart3 } from "lucide-react";

function Stat({ icon: Icon, label, value, hint }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="text-muted" style={{ fontSize: "0.85rem" }}>{label}</div>
        <Icon size={18} color="#B8E6F5" />
      </div>
      <div style={{ fontSize: "2rem", fontFamily: "var(--font-display)", fontWeight: 800, marginTop: 8 }}>
        {value}
      </div>
      {hint && <div className="text-muted" style={{ fontSize: "0.8rem" }}>{hint}</div>}
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
    <div className="container">
      <header className="mb-5">
        <h1>Ecosystem Dashboard</h1>
        <p className="text-secondary mt-2">
          Real-time view of the KUPE linkage graph. All metrics aggregate from Firestore.
        </p>
      </header>

      {err && <div className="card mb-4 text-danger">Failed to load stats: {err}</div>}

      {stats ? (
        <>
          <div className="grid-3">
            <Stat icon={Activity} label="Total linkages" value={stats.total_linkages} />
            <Stat icon={ShieldCheck} label="Verified" value={stats.verified_linkages} />
            <Stat icon={GitBranch} label="Healed" value={stats.healed_linkages} hint={`${(stats.self_heal_rate * 100).toFixed(1)}% self-heal rate`} />
          </div>

          <div className="grid-2 mt-5">
            <div className="card">
              <h3>Average Confidence</h3>
              <div style={{ fontSize: "3rem", fontFamily: "var(--font-display)", fontWeight: 800 }}>
                {(stats.avg_confidence * 100).toFixed(1)}%
              </div>
              <p className="text-muted">Across all created linkages.</p>
            </div>
            <div className="card">
              <h3>Business Leaderboard</h3>
              <div className="stack mt-3">
                {stats.leaderboard.map((b, i) => (
                  <div key={b.id} className="row" style={{ justifyContent: "space-between" }}>
                    <div>
                      <strong>{i + 1}. {b.name}</strong>
                      <div className="text-muted" style={{ fontSize: "0.8rem" }}>{b.type}</div>
                    </div>
                    <span className="chip brand">{b.linkage_count} linkages</span>
                  </div>
                ))}
                {!stats.leaderboard.length && <div className="text-muted">No linkages yet — generate a trip first.</div>}
              </div>
            </div>
          </div>

          <div className="card mt-5">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h3>Blueprints library</h3>
              <BarChart3 size={20} color="#B8E6F5" />
            </div>
            <p className="text-muted mt-2">Successful trip patterns saved for instant reuse.</p>
            {blueprints.length ? (
              <div className="grid-3 mt-3">
                {blueprints.map((b) => (
                  <div key={b.id} className="card" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <div className="row">
                      {b.constraint_profile.map((c) => (
                        <span className="chip success" key={c}>{c}</span>
                      ))}
                    </div>
                    <div className="text-muted mt-2" style={{ fontSize: "0.85rem" }}>
                      ★ {b.avg_satisfaction} · {b.city}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted mt-3">Rate a trip 4.5+ to seed a reusable blueprint.</div>
            )}
          </div>
        </>
      ) : (
        <div className="card skeleton" style={{ height: 320 }} />
      )}
    </div>
  );
}
