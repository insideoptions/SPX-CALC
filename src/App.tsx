import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
} from "react-router-dom";
import "./App.css";
import IronCondorCalculator from "./IronCondorCalculator";
import MatrixCompounding from "./MatrixCompounding";
import SpxMatrixUser from "./SpxMatrixUser";
import { GoogleAuthProvider, useAuth } from "./GoogleAuthContext";
import GoogleProtectedRoute from "./GoogleProtectedRoute";
import TradeLedger from "./TradeLedger";
import TradeForm from "./TradeForm";
import TestTradeAdd from "./TestTradeAdd";
import TestTradeLedger from "./TestTradeLedger";

// Header component with user info and logout
const AppHeader: React.FC = () => {
  const { user, signOut } = useAuth();

  return (
    <nav className="app-nav">
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <NavLink
          to="/"
          className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }
        >
          Matrix Calculator
        </NavLink>
        <NavLink
          to="/compounding"
          className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }
        >
          Matrix Compounding
        </NavLink>
        <NavLink
          to="/spx-matrix"
          className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }
        >
          SPX Matrix
        </NavLink>

        <NavLink
          to="/ledger"
          className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }
        >
          Trade Ledger
        </NavLink>
        <NavLink
          to="/test-trade"
          className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }
        >
          Test Trade Add
        </NavLink>
        <NavLink
          to="/test-ledger"
          className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }
        >
          Test Ledger
        </NavLink>
      </div>

      <div
        className="user-section"
        style={{ display: "flex", alignItems: "center", gap: "1rem" }}
      >
        {/* User profile info */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "rgba(255, 255, 255, 0.9)",
          }}
        >
          {user?.picture && (
            <img
              src={user.picture}
              alt={user.name}
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                border: "1px solid rgba(255, 255, 255, 0.3)",
              }}
            />
          )}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              lineHeight: "1.2",
            }}
          >
            <span
              style={{
                fontSize: "0.85rem",
                fontWeight: "500",
              }}
            >
              {user?.name}
            </span>
            <span
              style={{
                fontSize: "0.75rem",
                color: "rgba(255, 255, 255, 0.7)",
              }}
            >
              {user?.email}
            </span>
          </div>
        </div>

        <button
          onClick={signOut}
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.2)",
            color: "white",
            border: "none",
            padding: "0.5rem 1rem",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "0.9rem",
            fontWeight: "500",
            transition: "background-color 0.2s",
          }}
          onMouseOver={(e) => {
            const target = e.target as HTMLButtonElement;
            target.style.backgroundColor = "rgba(255, 255, 255, 0.3)";
          }}
          onMouseOut={(e) => {
            const target = e.target as HTMLButtonElement;
            target.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
          }}
        >
          Sign Out
        </button>
      </div>
    </nav>
  );
};

// Main App Content (protected)
const AppContent: React.FC = () => {
  return (
    <div className="app">
      <AppHeader />
      <Routes>
        <Route path="/" element={<IronCondorCalculator />} />
        <Route path="/ledger" element={<TradeLedger />} />
        <Route path="/compounding" element={<MatrixCompounding />} />
        <Route path="/test-trade" element={<TestTradeAdd />} />
        <Route path="/test-ledger" element={<TestTradeLedger />} />
        <Route
          path="/spx-matrix"
          element={
            <div className="spx-matrix-user">
              <SpxMatrixUser />
            </div>
          }
        />
      </Routes>
    </div>
  );
};

function App() {
  return (
    <GoogleAuthProvider>
      <Router>
        <GoogleProtectedRoute>
          <AppContent />
        </GoogleProtectedRoute>
      </Router>
    </GoogleAuthProvider>
  );
}

export default App;
