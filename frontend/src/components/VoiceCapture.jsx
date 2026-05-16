import { useEffect } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useVoice } from "../hooks/useVoice.js";

export default function VoiceCapture({ onParsed }) {
  const { recording, processing, result, error, start, stop } = useVoice();

  useEffect(() => {
    if (result?.parsed) onParsed?.(result.parsed);
  }, [result, onParsed]);

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row-tight" style={{ gap: 10 }}>
        {!recording ? (
          <button type="button" className="btn primary sm" onClick={start} disabled={processing}>
            <Mic size={14} /> Tap to speak
          </button>
        ) : (
          <button type="button" className="btn danger sm pulse-orange" onClick={stop}>
            <MicOff size={14} /> Stop & transcribe
          </button>
        )}
        {processing && (
          <span className="chip brand">
            <Loader2 size={12} className="pulse-orange" /> Transcribing…
          </span>
        )}
      </div>

      {result?.transcript && (
        <div
          className="card flat"
          style={{
            background: "var(--bg-surface)",
            padding: 10,
            fontSize: "0.8125rem",
            boxShadow: "none",
          }}
        >
          <div className="text-muted" style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Heard ({result.language || "auto"})
          </div>
          <div className="mt-2" style={{ color: "var(--text-primary)" }}>
            "{result.transcript}"
          </div>
        </div>
      )}

      {error && (
        <div className="text-danger" style={{ fontSize: "0.8125rem" }}>
          ⚠ {error}
        </div>
      )}
    </div>
  );
}
