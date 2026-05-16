import { Link, NavLink, useLocation } from "react-router-dom";
import { LogIn, LogOut, LayoutDashboard, Map } from "lucide-react";
import { useAuth } from "../hooks/useAuth.jsx";

export default function Navbar() {
  const { user, signIn, signOut } = useAuth();
  const loc = useLocation();
  const hideOnTrip = loc.pathname.startsWith("/trip/");

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backdropFilter: "blur(14px) saturate(160%)",
        WebkitBackdropFilter: "blur(14px) saturate(160%)",
        background: "rgba(10, 15, 26, 0.7)",
        borderBottom: "1px solid var(--border-glass)",
        padding: "12px 0",
      }}
    >
      <div className="container row" style={{ justifyContent: "space-between" }}>
        <Link to="/" className="row" style={{ textDecoration: "none", color: "white" }}>
          <div
            className="center"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #14BDEB, #0D7377)",
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              color: "#042027",
            }}
          >
            K
          </div>
          <strong style={{ fontFamily: "var(--font-display)", letterSpacing: "0.02em" }}>
            KUPE
          </strong>
        </Link>

        <div className="row hidden-mobile">
          <NavLink
            to="/plan"
            className={({ isActive }) => `chip ${isActive ? "brand" : ""}`}
            style={{ textDecoration: "none" }}
          >
            <Map size={14} /> Plan
          </NavLink>
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `chip ${isActive ? "brand" : ""}`}
            style={{ textDecoration: "none" }}
          >
            <LayoutDashboard size={14} /> Dashboard
          </NavLink>
        </div>

        <div className="row">
          {user ? (
            <>
              <div className="row hidden-mobile">
                {user.photoURL && (
                  <img
                    src={user.photoURL}
                    alt=""
                    style={{ width: 28, height: 28, borderRadius: "50%" }}
                  />
                )}
                <span className="text-secondary" style={{ fontSize: "0.85rem" }}>
                  {user.displayName || user.email || "Traveller"}
                </span>
              </div>
              <button className="btn ghost" onClick={signOut} style={{ padding: "8px 14px" }}>
                <LogOut size={16} /> Sign out
              </button>
            </>
          ) : (
            <button className="btn primary" onClick={signIn}>
              <LogIn size={16} /> Sign in with Google
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
