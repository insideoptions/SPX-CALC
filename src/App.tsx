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

function App() {
  return (
    <Router>
      <div className="app">
        <nav className="app-nav">
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
        </nav>

        <Routes>
          <Route path="/" element={<IronCondorCalculator />} />
          <Route path="/compounding" element={<MatrixCompounding />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
