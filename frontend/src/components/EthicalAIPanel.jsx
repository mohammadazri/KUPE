import { ShieldCheck, Lock, Eye, ScanLine } from "lucide-react";

export default function EthicalAIPanel({ trip, linkages }) {
  const constraintChecksTotal = linkages.reduce(
    (acc, l) => acc + (l.constraint_checks?.length || 0),
    0
  );
  const deterministicChecks = linkages.reduce(
    (acc, l) => acc + (l.constraint_checks?.filter((c) => c.method !== "ai_verified").length || 0),
    0
  );
  const verifiedRate = constraintChecksTotal
    ? Math.round((deterministicChecks / constraintChecksTotal) * 100)
    : 0;

  const rows = [
    {
      icon: ShieldCheck,
      title: "Hard constraints are deterministic",
      body: `${deterministicChecks}/${constraintChecksTotal} checks (${verifiedRate}%) were verified by code, not the LLM.`,
    },
    {
      icon: Lock,
      title: "No PII in prompts",
      body: "We anonymise your UID before passing anything to Gemini. Names, emails, photos never leave this device.",
    },
    {
      icon: Eye,
      title: "Bias audit logging",
      body: `Every decision (chosen + rejected sample) is logged to the audit_log collection for later review.`,
    },
    {
      icon: ScanLine,
      title: "Confidence transparency",
      body: "Every linkage card shows the AI's self-rated confidence. Low numbers mean weak matches — your call.",
    },
  ];

  return (
    <div className="card">
      <div className="row">
        <ShieldCheck size={18} color="#B8E6F5" />
        <strong>Ethical AI · Transparency</strong>
      </div>
      <div className="stack mt-3">
        {rows.map((r, i) => (
          <div className="row" key={i} style={{ alignItems: "flex-start" }}>
            <div
              className="center"
              style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(20,189,235,0.12)", color: "#B8E6F5", flexShrink: 0 }}
            >
              <r.icon size={16} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{r.title}</div>
              <div className="text-muted" style={{ fontSize: "0.82rem" }}>{r.body}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
