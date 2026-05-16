import { useRef, useState } from "react";
import { Camera, Loader, CheckCircle2, XCircle } from "lucide-react";
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
        <div className="row">
          <Camera size={18} color="#B8E6F5" />
          <strong>Halal logo scanner</strong>
        </div>
        <span className="chip">Cloud Vision · logo detection</span>
      </div>
      <p className="text-secondary mt-2" style={{ fontSize: "0.85rem" }}>
        Snap a storefront sign or menu. KUPE detects JAKIM / Halal certification logos.
      </p>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={onChange} hidden />
      <button className="btn ghost w-100 mt-3" onClick={() => inputRef.current?.click()} disabled={busy}>
        {busy ? <Loader size={16} className="pulse" /> : <Camera size={16} />}{" "}
        {busy ? "Analysing…" : "Upload / take photo"}
      </button>

      {error && <div className="text-danger mt-3" style={{ fontSize: "0.85rem" }}>⚠ {error}</div>}

      {result && (
        <div
          className="card mt-3"
          style={{
            background: result.halal_detected ? "rgba(50,213,131,0.10)" : "rgba(245,166,35,0.10)",
            borderColor: result.halal_detected ? "rgba(50,213,131,0.4)" : "rgba(245,166,35,0.4)",
          }}
        >
          <div className="row">
            {result.halal_detected ? <CheckCircle2 size={18} color="#32D583" /> : <XCircle size={18} color="#F5A623" />}
            <strong>
              {result.halal_detected ? "Halal certification detected" : "No halal logo detected"}
            </strong>
          </div>
          <div className="text-muted mt-2" style={{ fontSize: "0.82rem" }}>
            Confidence: {(result.confidence * 100).toFixed(1)}%
          </div>
          {result.matched_logos?.length > 0 && (
            <ul className="mt-2" style={{ fontSize: "0.82rem", paddingLeft: 18 }}>
              {result.matched_logos.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
