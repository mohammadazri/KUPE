import { useRef, useState } from "react";
import { Camera, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { VisionAPI } from "../api/client.js";

export default function HalalLogoScanner() {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFile = async (file) => {
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const b64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await VisionAPI.halal({ imageBase64: b64 });
      setResult(res);
    } catch (e) {
      setError(e?.response?.data?.detail || e.message);
    } finally {
      setBusy(false);
    }
  };

  const onChange = (e) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="row-tight">
          <Camera size={16} color="var(--brand-blue)" />
          <strong>Halal logo scanner</strong>
        </div>
        <span className="chip">Cloud Vision</span>
      </div>
      <p className="text-secondary mt-2" style={{ fontSize: "0.875rem" }}>
        Snap a storefront sign or menu. KUPE detects JAKIM / Halal certification logos.
      </p>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={onChange} hidden />
      <button className="btn outline w-100 mt-3" onClick={() => inputRef.current?.click()} disabled={busy}>
        {busy ? <Loader2 size={16} className="pulse-orange" /> : <Camera size={16} />}{" "}
        {busy ? "Analysing…" : "Upload / take photo"}
      </button>

      {error && (
        <div className="text-danger mt-3" style={{ fontSize: "0.8125rem" }}>
          ⚠ {error}
        </div>
      )}

      {result && (
        <div
          className={`card ${result.halal_detected ? "tinted-success" : "tinted-orange"} mt-3 flat`}
          style={{ boxShadow: "none" }}
        >
          <div className="row-tight">
            {result.halal_detected ? (
              <CheckCircle2 size={18} color="var(--success)" />
            ) : (
              <XCircle size={18} color="var(--brand-orange)" />
            )}
            <strong style={{ fontSize: "0.9375rem" }}>
              {result.halal_detected ? "Halal certification detected" : "No halal logo detected"}
            </strong>
          </div>
          <div className="text-muted mt-2" style={{ fontSize: "0.8125rem" }}>
            Confidence: {(result.confidence * 100).toFixed(1)}%
          </div>
          {result.matched_logos?.length > 0 && (
            <ul className="mt-2" style={{ fontSize: "0.8125rem", paddingLeft: 18, color: "var(--text-primary)" }}>
              {result.matched_logos.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
