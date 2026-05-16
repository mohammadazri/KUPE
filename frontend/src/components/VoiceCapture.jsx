import { useEffect } from "react";
import { Mic, MicOff, Loader } from "lucide-react";
import { useVoice } from "../hooks/useVoice.js";

export default function VoiceCapture({ onParsed }) {
  const { recording, processing, result, error, start, stop } = useVoice();

  useEffect(() => {
    if (result?.parsed) onParsed?.(result.parsed);
  }, [result, onParsed]);

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row" style={{ gap: 10 }}>
        {!recording ? (
          <button type="button" className="btn primary" onClick={start} disabled={processing}>
            <Mic size={16} /> Hold and speak
          </button>
        ) : (
          <button type="button" className="btn danger pulse" onClick={stop}>
            <MicOff size={16} /> Stop & transcribe
          </button>
        )}
        {processing && (
          <span className="chip brand">
            <Loader size={14} className="pulse" /> Transcribing…
          </span>
        )}
      </div>

      {result?.transcript && (
        <div
          className="card"
          style={{ background: "rgba(20,189,235,0.06)", padding: 10, fontSize: "0.85rem" }}
        >
          <div className="text-muted" style={{ fontSize: "0.75rem" }}>
            Heard ({result.language || "auto"}):
          </div>
          <div className="mt-2">"{result.transcript}"</div>
        </div>
      )}

      {error && (
        <div className="text-danger" style={{ fontSize: "0.85rem" }}>
          ⚠ {error}
        </div>
      )}
    </div>
  );
}
