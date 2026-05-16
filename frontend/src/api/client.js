import axios from "axios";
import { auth } from "../firebase.js";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL,
  timeout: 100_000,
});

api.interceptors.request.use(async (config) => {
  try {
    const user = auth?.currentUser;
    if (user) {
      const token = await user.getIdToken(false);
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (err) {
    console.warn("token attach failed", err);
  }
  return config;
});

// ---------- Endpoint wrappers ----------

export const TripsAPI = {
  generate(payload) {
    return api.post("/api/trips/generate", payload).then((r) => r.data);
  },
  get(tripId) {
    return api.get(`/api/trips/${tripId}`).then((r) => r.data);
  },
  heal(tripId, dayIndex, slotIndex, reason) {
    return api
      .post(`/api/trips/${tripId}/heal/${dayIndex}/${slotIndex}`, {
        reason: reason || "Business closed (demo)",
      })
      .then((r) => r.data);
  },
  rate(tripId, score) {
    return api.post(`/api/trips/${tripId}/rate`, null, { params: { score } }).then((r) => r.data);
  },
};

export const LinkagesAPI = {
  get(id) {
    return api.get(`/api/linkages/${id}`).then((r) => r.data);
  },
};

export const BusinessesAPI = {
  list(activeOnly = true) {
    return api.get(`/api/businesses?active_only=${activeOnly}`).then((r) => r.data);
  },
  toggle(id) {
    return api.patch(`/api/businesses/${id}/toggle`).then((r) => r.data);
  },
};

export const PlacesAPI = {
  autocomplete(q, session, region = "MY") {
    return api
      .get("/api/places/autocomplete", { params: { q, session, region } })
      .then((r) => r.data);
  },
  details(placeId, session) {
    return api
      .get(`/api/places/details/${placeId}`, { params: { session } })
      .then((r) => r.data);
  },
  geocode(city) {
    return api.get("/api/places/geocode", { params: { city } }).then((r) => r.data);
  },
  discoverNearby({ lat, lng, bucket_type = "restaurant", constraints = [], radius_m = 2500, max_results = 10, city_label = "nearby" }) {
    return api
      .post("/api/places/discover-nearby", { lat, lng, bucket_type, constraints, radius_m, max_results, city_label })
      .then((r) => r.data);
  },
};

export const VoiceAPI = {
  transcribe(blob) {
    const form = new FormData();
    form.append("audio", blob, "voice.webm");
    return api
      .post("/api/voice/transcribe", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
};

export const TranslateAPI = {
  text(text, target, source) {
    return api.post("/api/translate", { text, target, source }).then((r) => r.data);
  },
};

export const VisionAPI = {
  halal({ imageBase64, imageUrl }) {
    return api
      .post("/api/vision/halal-logo", { image_base64: imageBase64, image_url: imageUrl })
      .then((r) => r.data);
  },
};

export const AdminAPI = {
  stats() {
    return api.get("/api/admin/stats").then((r) => r.data);
  },
  blueprints() {
    return api.get("/api/admin/blueprints").then((r) => r.data);
  },
};
