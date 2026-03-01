import { useMemo } from "react";
import {
  Bar,
  XAxis,
  YAxis,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart,
  Tooltip,
} from "recharts";
import { startOfWeek, format } from "date-fns";
import type { Workout } from "../types";

const COLORS: Record<string, string> = {
  Swim: "#00CC96",
  Bike: "#636EFA",
  Run: "#EF553B",
  Strength: "#AB63FA",
};

const SPORTS = ["Swim", "Bike", "Run", "Strength"] as const;

interface Props {
  workouts: Workout[];
  timeFrame: string;
}

interface TooltipPayloadItem {
  dataKey: string;
  value: number;
  payload: Record<string, number>;
}

interface CustomTooltipProps {
  active?: boolean;
  label?: string;
  payload?: TooltipPayloadItem[];
}

function CustomTooltip({ active, label, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  // payload[0].payload is the full original data row, including non-rendered fields
  const row = payload[0].payload;
  const dataPoint = payload.reduce<Record<string, number>>((acc, p) => {
    acc[p.dataKey] = p.value;
    return acc;
  }, {});

  const total = row["total"] ?? 0;
  const trend = row["trend"] ?? 0;

  return (
    <div style={{
      background: "#1e1e2e",
      border: "1px solid #333",
      borderRadius: 6,
      padding: "0.6rem 0.9rem",
      color: "#e0e0e0",
      fontSize: "0.85rem",
      minWidth: 160,
    }}>
      <p style={{ color: "#fff", fontWeight: 600, marginBottom: "0.4rem" }}>{label}</p>
      {SPORTS.map((sport) => {
        const val = dataPoint[sport];
        if (!val) return null;
        return (
          <div key={sport} style={{ display: "flex", justifyContent: "space-between", gap: "1.5rem", color: COLORS[sport] }}>
            <span>{sport}</span>
            <span>{val} hrs</span>
          </div>
        );
      })}
      <div style={{ borderTop: "1px solid #444", marginTop: "0.4rem", paddingTop: "0.4rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1.5rem", color: "#fff", fontWeight: 600 }}>
          <span>Week Total</span>
          <span>{total} hrs</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1.5rem", color: "#aaa" }}>
          <span>4-Week Avg</span>
          <span>{trend} hrs</span>
        </div>
      </div>
    </div>
  );
}

export default function WeeklyVolumeChart({ workouts, timeFrame }: Props) {
  const data = useMemo(() => {
    const weekMap = new Map<string, { sports: Record<string, number>; date: Date }>();

    for (const w of workouts) {
      const d = w.date.toDate();
      const weekStart = startOfWeek(d, { weekStartsOn: 1 });
      const weekKey = format(weekStart, "MMM d");
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, { sports: { Swim: 0, Bike: 0, Run: 0, Strength: 0 }, date: weekStart });
      }
      const entry = weekMap.get(weekKey)!;
      entry.sports[w.sport] = (entry.sports[w.sport] || 0) + w.duration / 60;
    }

    const round2 = (n: number) => Math.round(n * 100) / 100;

    const rows = Array.from(weekMap.entries())
      .sort((a, b) => a[1].date.getTime() - b[1].date.getTime())
      .map(([week, { sports }]) => ({
        week,
        Swim: round2(sports.Swim),
        Bike: round2(sports.Bike),
        Run: round2(sports.Run),
        Strength: round2(sports.Strength),
        total: round2(sports.Swim + sports.Bike + sports.Run + sports.Strength),
        trend: 0,
      }));

    // 4-week rolling average
    for (let i = 0; i < rows.length; i++) {
      const start = Math.max(0, i - 3);
      const slice = rows.slice(start, i + 1);
      rows[i].trend = round2(slice.reduce((s, r) => s + r.total, 0) / slice.length);
    }

    return rows;
  }, [workouts]);

  if (data.length === 0) return null;

  return (
    <section>
      <h2>Weekly Volume: {timeFrame}</h2>
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={data}>
          <XAxis dataKey="week" tick={{ fill: "#aaa", fontSize: 12 }} />
          <YAxis tick={{ fill: "#aaa", fontSize: 12 }} label={{ value: "Hours", angle: -90, position: "insideLeft", fill: "#aaa" }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend formatter={(value) => value === "trend" ? "4-Week Avg" : value} />
          <Bar dataKey="Swim" stackId="a" fill={COLORS.Swim} />
          <Bar dataKey="Bike" stackId="a" fill={COLORS.Bike} />
          <Bar dataKey="Run" stackId="a" fill={COLORS.Run} />
          <Bar dataKey="Strength" stackId="a" fill={COLORS.Strength} />
          <Line
            type="monotone"
            dataKey="trend"
            name="trend"
            stroke="#fff"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </section>
  );
}
