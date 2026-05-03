import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import { format } from "date-fns";
import type { AdaptationSession, Discipline } from "../types";

type Filter = "All" | Discipline;
const FILTERS: Filter[] = ["All", "Bike", "Run", "Swim"];

type LoadFilter = "Combined" | Discipline;
const LOAD_FILTERS: LoadFilter[] = ["Combined", "Swim", "Bike", "Run"];

interface LoadPoint {
  date: string;
  atl: number;
  ctl: number;
  tsb: number;
}

interface Props {
  sessions: AdaptationSession[];
  loadData?: Array<{
    date: string;
    combined: { atl: number; ctl: number; tsb: number };
    swim: { atl: number; ctl: number; tsb: number };
    bike: { atl: number; ctl: number; tsb: number };
    run: { atl: number; ctl: number; tsb: number };
  }>;
}

export default function TrendCharts({ sessions, loadData }: Props) {
  const [filter, setFilter] = useState<Filter>("All");
  const [loadFilter, setLoadFilter] = useState<LoadFilter>("Combined");

  const sessionChartData = useMemo(() => {
    const filtered = filter === "All" ? sessions : sessions.filter((s) => s.discipline === filter);
    return [...filtered]
      .sort((a, b) => a.date.toDate().getTime() - b.date.toDate().getTime())
      .map((s) => ({
        date: format(s.date.toDate(), "MMM d"),
        ef: s.ef,
        decoupling: s.decoupling,
      }));
  }, [sessions, filter]);

  const loadChartData = useMemo(() => {
    if (!loadData) return [] as LoadPoint[];
    const key = loadFilter.toLowerCase() as "combined" | "swim" | "bike" | "run";

    return [...loadData]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((d) => ({
        date: format(new Date(d.date), "MMM d"),
        atl: d[key].atl,
        ctl: d[key].ctl,
        tsb: d[key].tsb,
      }));
  }, [loadData, loadFilter]);

  if (sessions.length === 0 && (!loadData || loadData.length === 0)) return null;

  return (
    <section>
      <h2>Adaptation Charts</h2>

      {loadData && loadData.length > 0 && (
        <>
          <div className="filter-row">
            {LOAD_FILTERS.map((f) => (
              <button
                key={f}
                className={`filter-btn ${loadFilter === f ? "active" : ""}`}
                onClick={() => setLoadFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>

          <h3>{loadFilter} Training Load (ATL/CTL/TSB)</h3>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={loadChartData}>
              <XAxis dataKey="date" tick={{ fill: "#aaa", fontSize: 12 }} />
              <YAxis tick={{ fill: "#aaa", fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "#1e1e2e", border: "1px solid #333" }} />
              <Legend />
              <Line type="monotone" dataKey="ctl" stroke="#636EFA" strokeWidth={2} dot={{ r: 3 }} name="CTL" />
              <Line type="monotone" dataKey="atl" stroke="#00CC96" strokeWidth={2} dot={{ r: 3 }} name="ATL" />
              <Line type="monotone" dataKey="tsb" stroke="#EF553B" strokeWidth={2} dot={{ r: 3 }} name="TSB" />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}

      {sessions.length > 0 && (
        <>
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

          {sessionChartData.length === 0 ? (
            <p className="muted">No {filter} data logged yet.</p>
          ) : (
            <>
              <h3>Efficiency Factor (EF)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={sessionChartData}>
                  <XAxis dataKey="date" tick={{ fill: "#aaa", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#aaa", fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: "#1e1e2e", border: "1px solid #333" }} />
                  <Line type="monotone" dataKey="ef" stroke="#636EFA" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>

              <h3>Decoupling (Drift %)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={sessionChartData}>
                  <XAxis dataKey="date" tick={{ fill: "#aaa", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#aaa", fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: "#1e1e2e", border: "1px solid #333" }} />
                  <ReferenceLine y={5} stroke="#00CC96" strokeDasharray="3 3" label={{ value: "Stable", fill: "#00CC96", fontSize: 12 }} />
                  <Line type="monotone" dataKey="decoupling" stroke="#EF553B" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </>
          )}
        </>
      )}
    </section>
  );
}
