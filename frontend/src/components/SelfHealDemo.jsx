import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Sparkles, ArrowRightLeft, Loader } from "lucide-react";
import { useTrip } from "../hooks/useTrip.jsx";
import BusinessCard from "./BusinessCard.jsx";

export default function SelfHealDemo({ trip, linkages, businesses }) {
  const { heal } = useTrip();
  const [stage, setStage] = useState("idle"); // idle | breaking | searching | done
  const [result, setResult] = useState(null);
  const [picked, setPicked] = useState(null);

  const candidateSlots = useMemo(() => {
    const out = [];
    trip?.itinerary?.forEach((day, di) =>
      day.slots.forEach((s, si) => {
        if (s.linkage_id && s.business_id && s.status !== "broken") {
          out.push({ day: di, slot: si, slotData: s });
        }
      })
    );
    return out;
  }, [trip]);

  const handlePick = (pick) => {
    setPicked(pick);
    setStage("idle");
    setResult(null);
  };

  const trigger = async () => {
    if (!picked) return;
    setStage("breaking");
    setTimeout(async () => {
      setStage("searching");
      try {
        const res = await heal(trip.id, picked.day, picked.slot, "Demo: simulated closure");
        setResult(res);
        setStage("done");
      } catch (e) {
        console.error("heal failed", e);
        setStage("idle");
      }
    }, 700);
  };

  const slotData = picked ? trip.itinerary[picked.day]?.slots[picked.slot] : null;
  const oldBiz = slotData ? businesses[slotData.business_id] : null;

  return (
    <div className="card glow">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="row">
          <Flame size={18} color="#FF6B35" />
          <strong>Self-Heal Demo</strong>
        </div>
        <span className="chip warn">The wow moment</span>
      </div>
      <p className="text-secondary mt-2" style={{ fontSize: "0.9rem" }}>
        Pick any slot. We'll simulate the business closing and watch KUPE re-link with a verified replacement in real time.
      </p>

      <div className="mt-3">
        <label className="label">Slot to break</label>
        <select
          className="select mt-2"
          value={picked ? `${picked.day}:${picked.slot}` : ""}
          onChange={(e) => {
            const [d, s] = e.target.value.split(":").map(Number);
            const found = candidateSlots.find((c) => c.day === d && c.slot === s);
            if (found) handlePick(found);
          }}
        >
          <option value="">— pick a slot —</option>
          {candidateSlots.map(({ day, slot, slotData }) => (
            <option key={`${day}-${slot}`} value={`${day}:${slot}`}>
              Day {day + 1} · {slotData.time} · {slotData.business_name || slotData.type}
            </option>
          ))}
        </select>
      </div>

      <AnimatePresence>
        {picked && stage === "idle" && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
            <div className="card" style={{ background: "rgba(255,255,255,0.02)" }}>
              <BusinessCard business={oldBiz} compact />
            </div>
            <button className="btn danger mt-3 w-100" onClick={trigger}>
              <Flame size={16} /> Simulate closure
            </button>
          </motion.div>
        )}

        {stage === "breaking" && (
          <motion.div
            key="break"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="card mt-4 break-out"
          >
            <div className="row">
              <span className="chip danger">💔 Broken</span>
              <span>{oldBiz?.name} closed</span>
            </div>
          </motion.div>
        )}

        {stage === "searching" && (
          <motion.div
            key="searching"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="card mt-4"
          >
            <div className="row">
              <Loader className="pulse" size={18} color="#B8E6F5" />
              <span>Re-running linkage engine…</span>
            </div>
            <div className="stack mt-3">
              <div className="skeleton" style={{ height: 14, width: "85%" }} />
              <div className="skeleton" style={{ height: 14, width: "60%" }} />
              <div className="skeleton" style={{ height: 14, width: "75%" }} />
            </div>
          </motion.div>
        )}

        {stage === "done" && result && (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", damping: 18 }}
            className="card mt-4 heal-in"
            style={{ borderColor: "rgba(50,213,131,0.5)" }}
          >
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="chip success"><Sparkles size={12} /> HEALED</span>
              <ArrowRightLeft size={14} color="#B8E6F5" />
            </div>
            <div className="mt-3">
              <BusinessCard business={result.new_business} compact />
            </div>
            <div
              className="mt-3"
              style={{
                background: "rgba(50,213,131,0.08)",
                borderLeft: "3px solid #32D583",
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: "0.9rem",
              }}
            >
              {result.reasoning}
            </div>
            <button
              className="btn ghost w-100 mt-3"
              onClick={() => {
                setStage("idle");
                setResult(null);
                setPicked(null);
              }}
            >
              Reset demo
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
