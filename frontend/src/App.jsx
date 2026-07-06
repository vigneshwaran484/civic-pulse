import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Anomalies from "./pages/Anomalies";
import FeedbackExplorer from "./pages/FeedbackExplorer";
import AskCivicPulse from "./pages/AskCivicPulse";
import Setup from "./pages/Setup";
import { Activity, AlertTriangle, List, MessageSquare, Settings } from "lucide-react";

const NAV = [
  { to: "/", icon: Activity, label: "Dashboard" },
  { to: "/anomalies", icon: AlertTriangle, label: "Anomalies" },
  { to: "/explore", icon: List, label: "Feedback" },
  { to: "/ask", icon: MessageSquare, label: "Ask AI" },
  { to: "/setup", icon: Settings, label: "Setup" },
];

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col text-slate-100" style={{ width: "100%", textAlign: "left" }}>
        <header className="glass-panel border-t-0 border-x-0 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-[0_0_15px_rgba(139,92,246,0.5)]">
                <Activity className="text-white" size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold tracking-tight text-white">Civic Pulse</div>
                <div className="text-blue-300/80 text-xs tracking-wider uppercase font-semibold">AI Decision Platform</div>
              </div>
            </div>
            
            <nav className="hidden md:flex gap-2">
              {NAV.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                >
                  {({ isActive }) => (
                    <div className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ${
                      isActive
                        ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] border border-white/10"
                        : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                    }`}>
                      <Icon size={16} className={isActive ? "text-purple-400" : ""} />
                      {label}
                    </div>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/anomalies" element={<Anomalies />} />
            <Route path="/explore" element={<FeedbackExplorer />} />
            <Route path="/ask" element={<AskCivicPulse />} />
            <Route path="/setup" element={<Setup />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
