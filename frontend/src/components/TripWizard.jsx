import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Calendar, Mic, Sparkles, Wand2 } from "lucide-react";

import ConstraintPicker from "./ConstraintPicker.jsx";
import VoiceCapture from "./VoiceCapture.jsx";

const PREFS = ["outdoor", "cultural", "shopping", "food", "photography", "nature", "skyline", "wellness", "history"];
const PACES = ["relaxed", "moderate", "adventurous"];
const BUDGETS = ["budget", "mid", "premium"];

function StepDots({ step, total }) {
  return (
    <div className="row mb-5" style={{ gap: 8 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 6,
            flex: 1,
            borderRadius: 999,
            background:
              i < step
                ? "linear-gradient(90deg, #14BDEB, #0D7377)"
                : i === step
                ? "rgba(20,189,235,0.5)"
                : "rgba(255,255,255,0.08)",
            transition: "background 0.3s ease",
          }}
        />
      ))}
    </div>
  );
}

function todayISO(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export default function TripWizard({ onSubmit }) {
  const [step, setStep] = useState(0);
  const [city] = useState("Kuala Lumpur");
  const [start, setStart] = useState(todayISO(1));
  const [end, setEnd] = useState(todayISO(2));
  const [constraints, setConstraints] = useState(["halal"]);
  const [preferences, setPreferences] = useState(["cultural", "food"]);
  const [pace, setPace] = useState("moderate");
  const [budget, setBudget] = useState("mid");
  const [partySize, setPartySize] = useState(2);
  const [notes, setNotes] = useState("");

  const total = 5;

  const valid = useMemo(() => {
    if (step === 1) return Boolean(start && end && start <= end);
    return true;
  }, [step, start, end]);

  const next = () => setStep((s) => Math.min(s + 1, total - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const submit = () => {
    onSubmit({
      city,
      start_date: start,
      end_date: end,
      constraints,
      preferences,
      pace,
      budget,
      party_size: Number(partySize) || 1,
      notes: notes || undefined,
    });
  };

  const onVoice = (parsed) => {
    if (!parsed) return;
    if (Array.isArray(parsed.constraints)) setConstraints(parsed.constraints);
    if (Array.isArray(parsed.preferences)) setPreferences(parsed.preferences);
    if (parsed.pace) setPace(parsed.pace);
    if (parsed.budget) setBudget(parsed.budget);
    if (parsed.party_size) setPartySize(parsed.party_size);
    if (parsed.notes) setNotes(parsed.notes);
  };

  return (
    <div className="card">
      <StepDots step={step} total={total} />
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="s0" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
            <h2>Where to?</h2>
            <p className="text-secondary mt-2">Kuala Lumpur is loaded for the demo. More cities scale via the same engine.</p>
            <div className="card mt-4" style={{ background: "rgba(20,189,235,0.06)" }}>
              <div className="row">
                <div
                  className="center"
                  style={{ width: 60, height: 60, borderRadius: 16, background: "rgba(20,189,235,0.18)", color: "#B8E6F5" }}
                >
                  <Wand2 size={28} />
                </div>
                <div>
                  <strong style={{ fontSize: "1.25rem" }}>Kuala Lumpur · Malaysia</strong>
                  <div className="text-muted" style={{ fontSize: "0.9rem" }}>
                    40+ JAKIM-certified & wheelchair-accessible POIs seeded.
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
            <h2>When?</h2>
            <p className="text-secondary mt-2">Pick your travel dates.</p>
            <div className="grid-2 mt-4">
              <div>
                <label className="label">Start</label>
                <div className="row mt-2">
                  <Calendar size={16} color="#B8E6F5" />
                  <input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">End</label>
                <div className="row mt-2">
                  <Calendar size={16} color="#B8E6F5" />
                  <input className="input" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
            <h2>Your non-negotiables</h2>
            <p className="text-secondary mt-2">These are HARD constraints. KUPE never compromises on them.</p>
            <div className="mt-4">
              <ConstraintPicker value={constraints} onChange={setConstraints} />
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="s3" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
            <h2>Preferences & pace</h2>
            <p className="text-secondary mt-2">Soft preferences shape ranking but don't block matches.</p>

            <div className="mt-4">
              <label className="label">Interests</label>
              <div className="row mt-2">
                {PREFS.map((p) => {
                  const active = preferences.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      className={`chip ${active ? "brand" : ""}`}
                      onClick={() =>
                        setPreferences(active ? preferences.filter((x) => x !== p) : [...preferences, p])
                      }
                      style={{ cursor: "pointer", border: 0 }}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid-2 mt-5">
              <div>
                <label className="label">Pace</label>
                <select className="select mt-2" value={pace} onChange={(e) => setPace(e.target.value)}>
                  {PACES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Budget</label>
                <select className="select mt-2" value={budget} onChange={(e) => setBudget(e.target.value)}>
                  {BUDGETS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>

            <div className="grid-2 mt-5">
              <div>
                <label className="label">Party size</label>
                <input
                  className="input mt-2"
                  type="number"
                  min={1}
                  max={20}
                  value={partySize}
                  onChange={(e) => setPartySize(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Notes</label>
                <input
                  className="input mt-2"
                  placeholder="Anything else? e.g. quiet venues, kid-friendly"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="card mt-5" style={{ background: "rgba(20,189,235,0.06)" }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div className="row">
                  <Mic size={16} color="#B8E6F5" />
                  <strong>Or just talk to it</strong>
                </div>
              </div>
              <p className="text-muted mt-2" style={{ fontSize: "0.85rem" }}>
                Hold to record. Speech-to-Text (Chirp 2) + Gemini will fill these fields.
              </p>
              <div className="mt-3">
                <VoiceCapture onParsed={onVoice} />
              </div>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div key="s4" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
            <h2>Review & generate</h2>
            <p className="text-secondary mt-2">Last look. Click generate when ready.</p>
            <div className="card mt-4" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="stack">
                <Row label="Destination" value={city} />
                <Row label="Dates" value={`${start} → ${end}`} />
                <Row label="Constraints" value={<>{constraints.map((c) => <span key={c} className="chip success">{c}</span>)}</>} />
                <Row label="Preferences" value={<>{preferences.map((p) => <span key={p} className="chip">{p}</span>)}</>} />
                <Row label="Pace · Budget" value={`${pace} · ${budget}`} />
                <Row label="Party · Notes" value={`${partySize} ${notes ? "· " + notes : ""}`} />
              </div>
            </div>
            <div className="row mt-5">
              <button type="button" className="btn primary pulse" onClick={submit} style={{ padding: "14px 26px" }}>
                <Sparkles size={18} /> Generate my trip
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="row mt-5" style={{ justifyContent: "space-between" }}>
        <button className="btn ghost" onClick={back} disabled={step === 0}>
          <ArrowLeft size={16} /> Back
        </button>
        {step < total - 1 && (
          <button className="btn primary" onClick={next} disabled={!valid}>
            Next <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="row" style={{ justifyContent: "space-between" }}>
      <div className="text-muted">{label}</div>
      <div className="row" style={{ gap: 6 }}>{value || "—"}</div>
    </div>
  );
}
