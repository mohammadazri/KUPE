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
      body: `${deterministicChecks}/${constraintChecksTotal} checks (${verifiedRate}%) verified by code, not the LLM.`,
    },
    {
      icon: Lock,
      title: "No PII in prompts",
      body: "Your UID is anonymised before reaching Gemini. Names, emails, photos never leave this device.",
    },
    {
      icon: Eye,
      title: "Bias audit logging",
      body: "Every decision (chosen + rejected sample) is logged to audit_log for review.",
    },
    {
      icon: ScanLine,
      title: "Confidence transparency",
      body: "Every linkage card shows the AI's self-rated confidence. Low numbers = weak match — your call.",
    },
  ];

  return (
    <div className="card">
      <div className="row-tight">
        <ShieldCheck size={16} color="var(--brand-blue)" />
        <strong>Ethical AI · Transparency</strong>
      </div>
      <div className="stack mt-3" style={{ gap: 12 }}>
        {rows.map((r, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <div
              className="center"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "var(--brand-blue-soft)",
                color: "var(--brand-blue)",
                flexShrink: 0,
              }}
            >
              <r.icon size={16} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--text-primary)" }}>
                {r.title}
              </div>
              <div className="text-secondary" style={{ fontSize: "0.8125rem", marginTop: 2, lineHeight: 1.5 }}>
                {r.body}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
