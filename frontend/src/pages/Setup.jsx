import { useState } from "react";
import { api } from "../api";
import { CheckCircle, XCircle, Loader, Database, Cpu, RefreshCw } from "lucide-react";

function Step({ number, title, description, action, status, onRun }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
          status === "done" ? "bg-green-100 text-green-700" :
          status === "error" ? "bg-red-100 text-red-700" :
          status === "loading" ? "bg-blue-100 text-blue-700" :
          "bg-gray-100 text-gray-600"
        }`}>
          {status === "done" ? <CheckCircle size={18} /> :
           status === "error" ? <XCircle size={18} /> :
           status === "loading" ? <Loader size={18} className="animate-spin" /> :
           number}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
          {status?.message && (
            <p className={`text-sm mt-2 ${status === "error" ? "text-red-600" : "text-green-600"}`}>
              {status.message}
            </p>
          )}
        </div>
        <button
          onClick={onRun}
          disabled={status === "loading"}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {status === "loading" ? <Loader size={14} className="animate-spin" /> : null}
          {action}
        </button>
      </div>
    </div>
  );
}

export default function Setup() {
  const [steps, setSteps] = useState({
    health: null,
    ingest: null,
    process: null,
  });
  const [messages, setMessages] = useState({});

  const setStep = (key, status, msg) => {
    setSteps((s) => ({ ...s, [key]: status }));
    if (msg) setMessages((m) => ({ ...m, [key]: msg }));
  };

  const runHealth = async () => {
    setStep("health", "loading");
    try {
      const r = await api.health();
      setStep("health", "done", `API is healthy: ${JSON.stringify(r)}`);
    } catch (e) {
      setStep("health", "error", `Failed: ${e.message}`);
    }
  };

  const runIngest = async () => {
    setStep("ingest", "loading");
    try {
      const r = await api.ingest(true);
      setStep("ingest", "done", `Loaded ${r.inserted} feedback records into the database.`);
    } catch (e) {
      setStep("ingest", "error", `Failed: ${e.message}`);
    }
  };

  const runProcess = async () => {
    setStep("process", "loading");
    try {
      let total = 0;
      // Process in smaller batches of 15 to stay safe from rate limits and timeouts
      for (let i = 0; i < 35; i++) {
        const r = await api.process(15);
        total += r.processed || 0;
        if ((r.processed || 0) === 0) break;
      }
      setStep("process", "done", `AI processed ${total} feedback items. Dashboard is ready!`);
    } catch (e) {
      setStep("process", "error", `Failed: ${e.message}. Make sure GEMINI_API_KEY is set.`);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Setup & Data Pipeline</h2>
        <p className="text-gray-500 text-sm">
          Run these steps in order to populate the platform with data. Only needed once.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <strong>Prerequisites:</strong> Set <code className="bg-blue-100 px-1 rounded">GEMINI_API_KEY</code> and{" "}
        <code className="bg-blue-100 px-1 rounded">DATABASE_URL</code> in{" "}
        <code className="bg-blue-100 px-1 rounded">backend/.env</code>, then start the backend with{" "}
        <code className="bg-blue-100 px-1 rounded">uvicorn main:app --reload</code>.
      </div>

      <div className="space-y-4">
        <Step
          number="1"
          title="Health Check"
          description="Verify the backend API is running and reachable."
          action="Check Health"
          status={steps.health}
          onRun={runHealth}
        />
        {messages.health && (
          <p className={`text-sm px-2 ${steps.health === "error" ? "text-red-600" : "text-green-600"}`}>
            {messages.health}
          </p>
        )}

        <Step
          number="2"
          title="Load Synthetic Data"
          description="Generate ~500 realistic citizen feedback records with injected anomaly spikes and insert into the database."
          action="Load Data"
          status={steps.ingest}
          onRun={runIngest}
        />
        {messages.ingest && (
          <p className={`text-sm px-2 ${steps.ingest === "error" ? "text-red-600" : "text-green-600"}`}>
            {messages.ingest}
          </p>
        )}

        <Step
          number="3"
          title="AI Processing Pipeline"
          description="Run Gemini AI to classify each feedback item: category, sentiment, urgency score (1-10), and priority score. This may take 1-2 minutes."
          action="Run AI Processing"
          status={steps.process}
          onRun={runProcess}
        />
        {messages.process && (
          <p className={`text-sm px-2 ${steps.process === "error" ? "text-red-600" : "text-green-600"}`}>
            {messages.process}
          </p>
        )}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
            <RefreshCw size={16} />
            Reset Database
          </h3>
          <p className="text-sm text-gray-600">
            Wipe all raw and processed records from the database to start fresh.
          </p>
        </div>
        <button
          onClick={async () => {
            if (window.confirm("Are you sure you want to clear the entire database?")) {
              try {
                await api.reset();
                alert("Database reset successfully!");
                window.location.reload();
              } catch (e) {
                alert(`Reset failed: ${e.message}`);
              }
            }
          }}
          className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
        >
          Reset Database
        </button>
      </div>
    </div>
  );
}
