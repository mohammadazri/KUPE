import { Link, NavLink, useLocation } from "react-router-dom";
import { LogIn, LogOut, LayoutDashboard, Map } from "lucide-react";
import { useAuth } from "../hooks/useAuth.jsx";

export default function Navbar() {
  const { user, signIn, signOut } = useAuth();
  const loc = useLocation();

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border-subtle)",
        padding: "12px 0",
      }}
    >
      <div className="container row" style={{ justifyContent: "space-between" }}>
        <Link to="/" className="row" style={{ textDecoration: "none", gap: 10 }}>
          <div
            className="center"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #0194F3, #0770CD)",
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              color: "white",
              position: "relative",
            }}
          >
            K
            <span
              style={{
                position: "absolute",
                top: -3,
                right: -3,
                width: 10,
                height: 10,
                borderRadius: 999,
                background: "var(--brand-orange)",
                border: "2px solid var(--bg-surface)",
              }}
            />
          </div>
          <strong
            style={{
              fontFamily: "var(--font-display)",
              letterSpacing: "0.02em",
              color: "var(--text-primary)",
              fontSize: "1.0625rem",
            }}
          >
            KUPE
          </strong>
        </Link>

        <div className="row hidden-mobile" style={{ gap: 4 }}>
          <NavLink
            to="/plan"
            style={({ isActive }) => ({
              textDecoration: "none",
              padding: "8px 14px",
              borderRadius: 8,
              fontSize: "0.875rem",
              fontWeight: 600,
              color: isActive ? "var(--brand-blue)" : "var(--text-secondary)",
              background: isActive ? "var(--brand-blue-soft)" : "transparent",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            })}
          >
            <Map size={14} /> Plan
          </NavLink>
          <NavLink
            to="/dashboard"
            style={({ isActive }) => ({
              textDecoration: "none",
              padding: "8px 14px",
              borderRadius: 8,
              fontSize: "0.875rem",
              fontWeight: 600,
              color: isActive ? "var(--brand-blue)" : "var(--text-secondary)",
              background: isActive ? "var(--brand-blue-soft)" : "transparent",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            })}
          >
            <LayoutDashboard size={14} /> Dashboard
          </NavLink>
        </div>

        <div className="row">
          {user ? (
            <>
              <div className="row hidden-mobile" style={{ gap: 8 }}>
                {user.photoURL && (
                  <img
                    src={user.photoURL}
                    alt=""
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      border: "1px solid var(--border-subtle)",
                    }}
                  />
                )}
                <span
                  className="text-secondary"
                  style={{ fontSize: "0.85rem", fontWeight: 500 }}
                >
                  {user.displayName || user.email || "Traveller"}
                </span>
              </div>
              <button
                className="btn ghost sm"
                onClick={signOut}
              >
                <LogOut size={14} /> Sign out
              </button>
            </>
          ) : (
            <button className="btn primary sm" onClick={signIn}>
              <LogIn size={14} /> Sign in
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
