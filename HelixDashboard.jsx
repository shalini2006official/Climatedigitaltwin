import { useState, useEffect, useCallback } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import CityMap from "./CityMap";

const API_BASE = "http://127.0.0.1:8000";

const fetchAPI = async (endpoint) => {
  const res = await fetch(`${API_BASE}${endpoint}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

// ── Design tokens ──────────────────────────────────────────────────────────────
// Deep space navy + electric cyan + risk-amber palette
// Display: monospace for data-heavy feel; body: system-ui
// Signature: animated "live pulse" ring around real-time temp globe

const RISK_COLOR = { Low: "#22d3a5", Medium: "#f59e0b", High: "#f87171", Critical: "#dc2626" };
const RISK_BG    = { Low: "#052e1e", Medium: "#292500", High: "#2d0a0a", Critical: "#3b0000" };

function PulseRing({ active }) {
  return active ? (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        width: 56, height: 56, borderRadius: "50%",
        border: "2px solid #06b6d4",
        animation: "pulse 2s ease-out infinite",
        pointerEvents: "none"
      }} />
    </span>
  ) : null;
}

function StatCard({ icon, label, value, unit, sub, color = "#06b6d4" }) {
  return (
    <div style={{
      background: "#0d1b2a",
      border: "1px solid #1e3448",
      borderRadius: 12,
      padding: "20px 24px",
      display: "flex", flexDirection: "column", gap: 6,
      position: "relative", overflow: "hidden"
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: color, borderRadius: "0 2px 2px 0" }} />
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div style={{ color: "#64748b", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ color, fontSize: 28, fontWeight: 700, fontFamily: "monospace", lineHeight: 1 }}>
        {value ?? "—"}<span style={{ fontSize: 14, color: "#64748b", fontFamily: "system-ui", marginLeft: 4 }}>{unit}</span>
      </div>
      {sub && <div style={{ color: "#475569", fontSize: 12 }}>{sub}</div>}
    </div>
  );
}

function RiskBadge({ level }) {
  const c = RISK_COLOR[level] || "#94a3b8";
  const bg = RISK_BG[level] || "#1e293b";
  return (
    <span style={{
      background: bg, color: c, border: `1px solid ${c}`,
      borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 700,
      letterSpacing: "0.05em", display: "inline-block"
    }}>{level || "—"}</span>
  );
}

function AlertItem({ alert }) {
  return (
    <div style={{
      background: "#0d1b2a", border: "1px solid #f59e0b22",
      borderLeft: "3px solid #f59e0b",
      borderRadius: 8, padding: "12px 16px",
      display: "flex", alignItems: "center", gap: 12
    }}>
      <span style={{ fontSize: 20 }}>⚠️</span>
      <div>
        <div style={{ color: "#f8fafc", fontWeight: 600, fontSize: 13 }}>{alert.type || alert.message}</div>
        {alert.description && <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{alert.description}</div>}
      </div>
    </div>
  );
}

function SectionTitle({ children, icon }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <h2 style={{ color: "#f8fafc", fontSize: 15, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", margin: 0 }}>{children}</h2>
      <div style={{ flex: 1, height: 1, background: "#1e3448", marginLeft: 8 }} />
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0d1b2a", border: "1px solid #1e3448", borderRadius: 8, padding: "10px 14px" }}>
      <div style={{ color: "#64748b", fontSize: 11, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontSize: 13, fontFamily: "monospace" }}>
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
};

function getAIAssessment(temp, hum, riskLvl) {
  if (!temp || !hum) {
    return {
      status: "Analyzing...",
      impact: "Waiting for climate data",
      recommendation: "Collecting information"
    };
  }

  if (riskLvl === "Critical") {
    return {
      status: "Critical Climate Risk",
      impact: "Extreme weather conditions may affect infrastructure and public safety.",
      recommendation: "Activate emergency response protocols."
    };
  }

  if (riskLvl === "High") {
    return {
      status: "High Climate Risk",
      impact: "Potential flooding, heat stress, and environmental disruptions.",
      recommendation: "Avoid vulnerable areas and monitor alerts."
    };
  }

  if (riskLvl === "Medium") {
    return {
      status: "Moderate Climate Risk",
      impact: "Localized weather disturbances may occur.",
      recommendation: "Monitor conditions and prepare precautions."
    };
  }

  return {
    status: "Stable Climate Conditions",
    impact: "No significant climate threats detected.",
    recommendation: "Continue monitoring."
  };
}

export default function HelixDashboard() {
  const [city, setCity] = useState("coimbatore");
  const [inputCity, setInputCity] = useState("coimbatore");
  const [weather, setWeather]     = useState(null);
  const [risk, setRisk]           = useState(null);
  const [insights, setInsights]   = useState(null);
  const [simulation, setSimulation] = useState(null);
  const [alerts, setAlerts]       = useState(null);
  const [history, setHistory]     = useState([]);
  const [health, setHealth]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const cityCoordinates = {
    coimbatore: { lat: 11.0168, lon: 76.9558 },
    trichy: { lat: 10.7905, lon: 78.7047 },
    madurai: { lat: 9.9252, lon: 78.1198 },
    chennai: { lat: 13.0827, lon: 80.2707 },
    salem: { lat: 11.6643, lon: 78.1460 }
  };

  const coords =
    cityCoordinates[city.toLowerCase()] ||
    cityCoordinates.coimbatore;
  const loadData = useCallback(async (c) => {
    setLoading(true);
    setError(null);
    try {
      const [w, r, ins, sim, al, hist, h] = await Promise.allSettled([
        fetchAPI(`/weather/${c}`),
        fetchAPI(`/risk/${c}`),
        fetchAPI(`/insights`),
        fetchAPI(`/simulate/${c}`),
        fetchAPI(`/alerts/${c}`),
        fetchAPI(`/history/${c}`),
        fetchAPI(`/health`),
      ]);
      if (w.status === "fulfilled") {
        console.log("Weather API:", w.value);
        setWeather(w.value);
        }
        if (h.status === "fulfilled") {
      setHealth(h.value);
      console.log("HEALTH API:", h.value);
    }
      if (r.status === "fulfilled") setRisk(r.value);
      if (ins.status === "fulfilled") setInsights(ins.value);
      if (sim.status === "fulfilled") setSimulation(sim.value);
      if (al.status === "fulfilled") setAlerts(al.value);
      if (hist.status === "fulfilled") {
        const arr = Array.isArray(hist.value) ? hist.value : hist.value?.records || [];
        setHistory(arr.slice(-12).map((d, i) => ({
          label: `R${i + 1}`,
          temperature: d.temperature ?? d.temp,
          humidity: d.humidity,
          risk_score: d.risk_score ?? null,
        })));
      }
    const temp    = weather?.main?.temp ?? weather?.temperature;
const hum     = weather?.main?.humidity ?? weather?.humidity;
const wind    = weather?.wind?.speed ?? weather?.wind_speed;
console.log("weather =", weather);
console.log("temp =", temp);
console.log("hum =", hum);
console.log("wind =", wind);
        // console.log("Health:", h);
        // console.log("Weather:", w);
        // console.log("Risk:", r);
        // console.log("Simulation:", sim);
        // console.log("Alerts:", al);
        // console.log("History:", hist);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(city); }, [city, loadData]);

  const handleSearch = () => {
    const c = inputCity.trim();
    if (c) setCity(c.toLowerCase());
  };

  const temp = weather?.temperature;
const hum = weather?.humidity;
const wind = weather?.wind_speed;

console.log("WEATHER =", weather);
console.log("TEMP =", temp);
console.log("HUM =", hum);
console.log("WIND =", wind);
  const desc =
  weather?.weather?.[0]?.description ??
  weather?.weather ??
  weather?.description ??
  "";
  const riskLvl = risk?.risk_level ?? risk?.level;
  const aiAssessment = getAIAssessment(
  temp,
  hum,
  riskLvl
);
  const riskScore = risk?.risk_score ?? risk?.score;
  const alertList = Array.isArray(alerts) ? alerts : alerts?.alerts || [];

  const TABS = ["overview", "simulation", "history", "alerts"];

  return (
    <div style={{
      minHeight: "100vh", background: "#040d18",
      fontFamily: "system-ui, -apple-system, sans-serif",
      color: "#f8fafc"
    }}>
      <style>{`
        @keyframes pulse {
          0% { transform: translate(-50%,-50%) scale(1); opacity: 0.9; }
          100% { transform: translate(-50%,-50%) scale(2.2); opacity: 0; }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #0d1b2a; }
        ::-webkit-scrollbar-thumb { background: #1e3448; border-radius: 3px; }
      `}</style>

      {/* ── Header ── */}
      <header style={{
        background: "#040d18",
        borderBottom: "1px solid #1e3448",
        padding: "0 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 64, position: "sticky", top: 0, zIndex: 100
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 900
          }}>🌍</div>
          <div>
            <div style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 800, letterSpacing: "0.12em", color: "#06b6d4" }}>HELIX</div>
            <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase" }}>Climate Digital Twin</div>
          </div>
        </div>

        {/* Search */}
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={inputCity}
            onChange={e => setInputCity(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Enter city…"
            style={{
              background: "#0d1b2a", border: "1px solid #1e3448", borderRadius: 8,
              color: "#f8fafc", padding: "8px 14px", fontSize: 13, width: 180,
              outline: "none"
            }}
          />
          <button onClick={handleSearch} style={{
            background: "#06b6d4", color: "#040d18", border: "none",
            borderRadius: 8, padding: "8px 18px", fontWeight: 700, fontSize: 13,
            cursor: "pointer"
          }}>Search</button>
          <button onClick={() => loadData(city)} style={{
            background: "#1e3448", color: "#94a3b8", border: "none",
            borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontSize: 16
          }}>↻</button>
        </div>

        {/* Health */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: health ? "#22d3a5" : "#f87171" }} />
          <span style={{ fontSize: 12, color: "#64748b" }}>{health ? "API Online" : "API Offline"}</span>
        </div>
      </header>

      {/* ── City banner ── */}
      <div style={{
        background: "linear-gradient(to right, #040d18, #091929, #040d18)",
        borderBottom: "1px solid #1e3448",
        padding: "20px 32px",
        display: "flex", alignItems: "center", gap: 24
      }}>
        <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}>
          <PulseRing active={!loading} />
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: "linear-gradient(135deg, #0e2a3d, #06b6d420)",
            border: "2px solid #06b6d440",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 32, position: "relative", zIndex: 2
          }}>
            {loading ? "⏳" : temp !== undefined ? (temp > 35 ? "🌤" : temp > 25 ? "⛅" : "🌥") : "🌍"}
          </div>
        </div>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, textTransform: "capitalize", lineHeight: 1 }}>
            {city}
          </h1>
          <div style={{ color: "#64748b", fontSize: 14, marginTop: 4, textTransform: "capitalize" }}>{desc}</div>
        </div>
        {riskLvl && (
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase", marginBottom: 6 }}>Climate Risk</div>
            <RiskBadge level={riskLvl} />
            {riskScore !== undefined && (
              <div style={{ color: "#475569", fontSize: 12, marginTop: 4 }}>Score: {riskScore}</div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div style={{ background: "#2d0a0a", border: "1px solid #f87171", color: "#f87171", padding: "10px 32px", fontSize: 13 }}>
          ⚠ Could not reach backend: {error} — make sure FastAPI is running at {API_BASE}
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ padding: "0 32px", borderBottom: "1px solid #1e3448", display: "flex", gap: 4, marginTop: 4 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            background: activeTab === t ? "#0d1b2a" : "transparent",
            color: activeTab === t ? "#06b6d4" : "#64748b",
            border: "none", borderBottom: activeTab === t ? "2px solid #06b6d4" : "2px solid transparent",
            padding: "12px 20px", fontSize: 13, fontWeight: 600,
            textTransform: "capitalize", cursor: "pointer",
            letterSpacing: "0.04em"
          }}>{t}</button>
        ))}
      </div>

      {/* ── Main content ── */}
      <main style={{ padding: "28px 32px", maxWidth: 1280, margin: "0 auto" }}>

        {/* ─ OVERVIEW ─ */}
        {activeTab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <CityMap
                 lat={11.0168}
                 lon={76.9558}
                  city={city}/>
        {/* AI Climate Assessment */}
    <div
      style={{
        background: "#0d1b2a",
        border: "1px solid #1e3448",
        borderRadius: "12px",
        padding: "24px"
      }}
    >
      <h2
        style={{
          color: "#06b6d4",
          marginBottom: "16px"
        }}
      >
        🤖 AI Climate Assessment
      </h2>

      <div style={{ marginBottom: "12px" }}>
        <strong>Status:</strong> {aiAssessment.status}
      </div>

      <div style={{ marginBottom: "12px" }}>
        <strong>Predicted Impact:</strong>
        <br />
        {aiAssessment.impact}
      </div>

      <div>
        <strong>Recommendation:</strong>
        <br />
        {aiAssessment.recommendation}
      </div>
    </div>
            {/* Stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
              <StatCard icon="🌡" label="Temperature" value={temp?.toFixed(1)} unit="°C" color="#06b6d4" />
              <StatCard icon="💧" label="Humidity" value={hum} unit="%" color="#818cf8" />
              <StatCard icon="💨" label="Wind Speed" value={wind?.toFixed(1)} unit="m/s" color="#34d399" />
              <StatCard icon="📊" label="Total Records" value={insights?.total_records} color="#f59e0b" />
              <StatCard icon="📈" label="Avg Temperature" value={insights?.average_temperature?.toFixed(2)} unit="°C" color="#06b6d4"
                sub={`Max ${insights?.highest_temperature?.toFixed(1)}° / Min ${insights?.lowest_temperature?.toFixed(1)}°`} />
            </div>

            {/* Risk + Insights row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div style={{ background: "#0d1b2a", border: "1px solid #1e3448", borderRadius: 12, padding: 24 }}>
                <SectionTitle icon="⚠️">Risk Analysis</SectionTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {[
                    { label: "Risk Level", value: <RiskBadge level={riskLvl} /> },
                    { label: "Risk Score", value: <span style={{ fontFamily: "monospace", color: "#f59e0b", fontWeight: 700 }}>{riskScore ?? "—"}</span> },
                    ...(risk ? Object.entries(risk).filter(([k]) => !["risk_level","level","risk_score","score"].includes(k)).map(([k, v]) => ({
                      label: k.replace(/_/g, " "),
                      value: <span style={{ fontFamily: "monospace", color: "#94a3b8" }}>{String(v)}</span>
                    })) : [])
                  ].map(({ label, value }, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #1e3448" }}>
                      <span style={{ color: "#64748b", fontSize: 13, textTransform: "capitalize" }}>{label}</span>
                      {value}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: "#0d1b2a", border: "1px solid #1e3448", borderRadius: 12, padding: 24 }}>
                <SectionTitle icon="📊">Database Insights</SectionTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {[
                    { label: "Total Records", value: insights?.total_records },
                    { label: "Average Temperature", value: `${insights?.average_temperature?.toFixed(2)} °C` },
                    { label: "Highest Temperature", value: `${insights?.highest_temperature?.toFixed(1)} °C` },
                    { label: "Lowest Temperature", value: `${insights?.lowest_temperature?.toFixed(1)} °C` },
                  ].map(({ label, value }, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #1e3448" }}>
                      <span style={{ color: "#64748b", fontSize: 13 }}>{label}</span>
                      <span style={{ fontFamily: "monospace", color: "#06b6d4", fontWeight: 600 }}>{value ?? "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Temperature history chart */}
            {history.length > 0 && (
              <div style={{ background: "#0d1b2a", border: "1px solid #1e3448", borderRadius: 12, padding: 24 }}>
                <SectionTitle icon="📉">Temperature & Humidity Trend</SectionTitle>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="humGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#1e3448" strokeDasharray="3 3" />
                    <XAxis dataKey="label" stroke="#334155" tick={{ fill: "#64748b", fontSize: 11 }} />
                    <YAxis stroke="#334155" tick={{ fill: "#64748b", fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, color: "#64748b" }} />
                    <Area type="monotone" dataKey="temperature" name="Temp °C" stroke="#06b6d4" fill="url(#tempGrad)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="humidity" name="Humidity %" stroke="#818cf8" fill="url(#humGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* ─ SIMULATION ─ */}
        {activeTab === "simulation" && simulation && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* Current */}
              <div style={{ background: "#0d1b2a", border: "1px solid #1e3448", borderRadius: 12, padding: 28 }}>
                <div style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Current State</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <div>
                    <div style={{ color: "#475569", fontSize: 12 }}>Temperature</div>
                    <div style={{ color: "#06b6d4", fontFamily: "monospace", fontSize: 36, fontWeight: 700 }}>
                      {simulation.current_temperature?.toFixed(1)}<span style={{ fontSize: 16 }}>°C</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#475569", fontSize: 12 }}>Humidity</div>
                    <div style={{ color: "#818cf8", fontFamily: "monospace", fontSize: 36, fontWeight: 700 }}>
                      {simulation.current_humidity}<span style={{ fontSize: 16 }}>%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Future */}
              <div style={{ background: "#0d1b2a", border: "1px solid #f59e0b22", borderRadius: 12, padding: 28, borderLeft: "3px solid #f59e0b" }}>
                <div style={{ color: "#f59e0b", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>
                  {simulation.prediction_days}-Day Forecast
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <div>
                    <div style={{ color: "#475569", fontSize: 12 }}>Future Temperature</div>
                    <div style={{ fontFamily: "monospace", fontSize: 36, fontWeight: 700, color: "#f59e0b" }}>
                      {simulation.future_temperature?.toFixed(1)}<span style={{ fontSize: 16 }}>°C</span>
                    </div>
                    <div style={{ color: "#f59e0b88", fontSize: 12 }}>
                      ▲ +{(simulation.future_temperature - simulation.current_temperature)?.toFixed(1)}°C increase
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#475569", fontSize: 12 }}>Future Humidity</div>
                    <div style={{ fontFamily: "monospace", fontSize: 36, fontWeight: 700, color: "#fb923c" }}>
                      {simulation.future_humidity}<span style={{ fontSize: 16 }}>%</span>
                    </div>
                    <div style={{ color: "#fb923c88", fontSize: 12 }}>
                      ▲ +{simulation.future_humidity - simulation.current_humidity}% increase
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Comparison bar chart */}
            <div style={{ background: "#0d1b2a", border: "1px solid #1e3448", borderRadius: 12, padding: 24 }}>
              <SectionTitle icon="📊">Current vs Predicted</SectionTitle>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={[
                  { name: "Temperature (°C)", Current: simulation.current_temperature, Future: simulation.future_temperature },
                  { name: "Humidity (%)", Current: simulation.current_humidity, Future: simulation.future_humidity },
                ]}>
                  <CartesianGrid stroke="#1e3448" strokeDasharray="3 3" />
                  <XAxis dataKey="name" stroke="#334155" tick={{ fill: "#64748b", fontSize: 12 }} />
                  <YAxis stroke="#334155" tick={{ fill: "#64748b", fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#64748b" }} />
                  <Bar dataKey="Current" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Future" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ─ HISTORY ─ */}
        {activeTab === "history" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {history.length > 0 ? (
              <>
                <div style={{ background: "#0d1b2a", border: "1px solid #1e3448", borderRadius: 12, padding: 24 }}>
                  <SectionTitle icon="🌡">Temperature History</SectionTitle>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={history}>
                      <CartesianGrid stroke="#1e3448" strokeDasharray="3 3" />
                      <XAxis dataKey="label" stroke="#334155" tick={{ fill: "#64748b", fontSize: 11 }} />
                      <YAxis stroke="#334155" tick={{ fill: "#64748b", fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="temperature" name="Temp °C" stroke="#06b6d4" strokeWidth={2} dot={{ fill: "#06b6d4", r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ background: "#0d1b2a", border: "1px solid #1e3448", borderRadius: 12, padding: 24 }}>
                  <SectionTitle icon="💧">Humidity History</SectionTitle>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={history}>
                      <defs>
                        <linearGradient id="humG2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#1e3448" strokeDasharray="3 3" />
                      <XAxis dataKey="label" stroke="#334155" tick={{ fill: "#64748b", fontSize: 11 }} />
                      <YAxis stroke="#334155" tick={{ fill: "#64748b", fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="humidity" name="Humidity %" stroke="#818cf8" fill="url(#humG2)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <div style={{ color: "#475569", textAlign: "center", padding: "60px 0" }}>
                No history records found for <strong style={{ color: "#94a3b8" }}>{city}</strong>. Hit a few <code style={{ background: "#1e3448", padding: "2px 6px", borderRadius: 4 }}>/weather/{city}</code> calls to populate data.
              </div>
            )}
          </div>
        )}

        {/* ─ ALERTS ─ */}
        {activeTab === "alerts" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <SectionTitle icon="🚨">Active Climate Alerts</SectionTitle>
            {alertList.length > 0 ? (
              alertList.map((a, i) => <AlertItem key={i} alert={typeof a === "string" ? { message: a } : a} />)
            ) : (
              <div style={{
                background: "#0d1b2a", border: "1px solid #22d3a522",
                borderLeft: "3px solid #22d3a5",
                borderRadius: 8, padding: "20px 24px",
                color: "#22d3a5", display: "flex", alignItems: "center", gap: 10
              }}>
                <span style={{ fontSize: 20 }}>✅</span>
                <div>
                  <div style={{ fontWeight: 600 }}>No active alerts</div>
                  <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>Climate conditions in {city} are within normal parameters.</div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer style={{ borderTop: "1px solid #1e3448", padding: "16px 32px", display: "flex", justifyContent: "space-between", marginTop: 40 }}>
        <span style={{ color: "#334155", fontSize: 12, fontFamily: "monospace" }}>HELIX © 2024 — Climate Digital Twin</span>
        <span style={{ color: "#334155", fontSize: 12 }}>Powered by FastAPI · PostgreSQL · OpenWeatherMap</span>
      </footer>
    </div>
  );
}