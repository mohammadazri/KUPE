import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth.jsx";
import { TripProvider } from "./hooks/useTrip.jsx";
import { LanguageProvider } from "./hooks/useTranslation.jsx";

import Navbar from "./components/Navbar.jsx";
import PWAInstallPrompt from "./components/PWAInstallPrompt.jsx";

import LandingPage from "./pages/LandingPage.jsx";
import PlannerPage from "./pages/PlannerPage.jsx";
import ItineraryPage from "./pages/ItineraryPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <TripProvider>
          <Navbar />
          <main className="page">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/plan" element={<PlannerPage />} />
              <Route path="/trip/:tripId" element={<ItineraryPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <PWAInstallPrompt />
        </TripProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}
