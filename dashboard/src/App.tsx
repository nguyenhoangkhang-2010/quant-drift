import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import Heatmap from "./pages/Heatmap";
import Examples from "./pages/Examples";
import Report from "./pages/Report";

function App() {
  return (
    <BrowserRouter>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <nav
          style={{
            width: 220,
            padding: "2rem 1rem",
            background: "var(--bg-secondary)",
          }}
        >
          <h1 style={{ fontSize: "1.25rem", marginBottom: "2rem" }}>
            QuantDrift
          </h1>
          <ul style={{ listStyle: "none" }}>
            <li style={{ marginBottom: "0.75rem" }}>
              <NavLink to="/">Heatmap</NavLink>
            </li>
            <li style={{ marginBottom: "0.75rem" }}>
              <NavLink to="/examples">Examples</NavLink>
            </li>
            <li style={{ marginBottom: "0.75rem" }}>
              <NavLink to="/report">Report</NavLink>
            </li>
          </ul>
        </nav>
        <main style={{ flex: 1, padding: "2rem" }}>
          <Routes>
            <Route path="/" element={<Heatmap />} />
            <Route path="/examples" element={<Examples />} />
            <Route path="/report" element={<Report />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
