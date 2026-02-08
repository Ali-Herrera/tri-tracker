import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { format } from "date-fns";
import type { AdaptationSession, Discipline } from "../types";

type Filter = "All" | Discipline;
const FILTERS: Filter[] = ["All", "Bike", "Run", "Swim"];

interface Props {
  sessions: AdaptationSession[];
}

export default function TrendCharts({ sessions }: Props) {
  const [filter, setFilter] = useState<Filter>("All");

  const chartData = useMemo(() => {
    const filtered = filter === "All" ? sessions : sessions.filter((s) => s.discipline === filter);
    return [...filtered]
      .sort((a, b) => a.date.toDate().getTime() - b.date.toDate().getTime())
      .map((s) => ({
        date: format(s.date.toDate(), "MMM d"),
        ef: s.ef,
        decoupling: s.decoupling,
      }));
  }, [sessions, filter]);

  if (sessions.length === 0) return null;

  return (
    <section>
      <h2>Aerobic Progress Trends</h2>

      <div className="filter-row">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? "active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {chartData.length === 0 ? (
        <p className="muted">No {filter} data logged yet.</p>
      ) : (
        <>
          <h3>Efficiency Factor (EF)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fill: "#aaa", fontSize: 12 }} />
              <YAxis tick={{ fill: "#aaa", fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "#1e1e2e", border: "1px solid #333" }} />
              <Line type="monotone" dataKey="ef" stroke="#636EFA" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>

          <h3>Decoupling (Drift %)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fill: "#aaa", fontSize: 12 }} />
              <YAxis tick={{ fill: "#aaa", fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "#1e1e2e", border: "1px solid #333" }} />
              <ReferenceLine y={5} stroke="#00CC96" strokeDasharray="3 3" label={{ value: "Stable", fill: "#00CC96", fontSize: 12 }} />
              <Line type="monotone" dataKey="decoupling" stroke="#EF553B" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </section>
  );
}
