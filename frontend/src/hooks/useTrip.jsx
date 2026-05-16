import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { TripsAPI } from "../api/client.js";

const TripCtx = createContext(null);

export function TripProvider({ children }) {
  const [trip, setTrip] = useState(null);
  const [linkages, setLinkages] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generate = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const res = await TripsAPI.generate(payload);
      setTrip(res.trip);
      setLinkages(res.linkages || []);
      setBusinesses(res.businesses || []);
      return res;
    } catch (e) {
      const msg = e?.response?.data?.detail || e.message || "Generate failed";
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const heal = useCallback(async (tripId, dayIdx, slotIdx, reason) => {
    setError(null);
    const res = await TripsAPI.heal(tripId, dayIdx, slotIdx, reason);
    // Update local state: replace the broken linkage, add the new one, update slot
    setLinkages((prev) => {
      const next = prev.map((l) => (l.id === res.old_linkage.id ? res.old_linkage : l));
      next.push(res.new_linkage);
      return next;
    });
    setBusinesses((prev) => {
      if (prev.some((b) => b.id === res.new_business.id)) return prev;
      return [...prev, res.new_business];
    });
    setTrip((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      const slot = next.itinerary[dayIdx]?.slots?.[slotIdx];
      if (slot) {
        slot.linkage_id = res.new_linkage.id;
        slot.business_id = res.new_business.id;
        slot.business_name = res.new_business.name;
        slot.status = "healed";
      }
      return next;
    });
    return res;
  }, []);

  const loadById = useCallback(async (tripId) => {
    setLoading(true);
    try {
      const res = await TripsAPI.get(tripId);
      setTrip(res.trip);
      setLinkages(res.linkages || []);
      setBusinesses(res.businesses || []);
      return res;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setTrip(null);
    setLinkages([]);
    setBusinesses([]);
    setError(null);
  }, []);

  const value = useMemo(
    () => ({ trip, linkages, businesses, loading, error, generate, heal, loadById, reset }),
    [trip, linkages, businesses, loading, error, generate, heal, loadById, reset]
  );

  return <TripCtx.Provider value={value}>{children}</TripCtx.Provider>;
}

export function useTrip() {
  const ctx = useContext(TripCtx);
  if (!ctx) throw new Error("useTrip must be used inside TripProvider");
  return ctx;
}
