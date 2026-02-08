import { useMemo } from "react";
import {
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from "recharts";
import { startOfWeek, format } from "date-fns";
import type { Workout } from "../types";

const COLORS: Record<string, string> = {
  Swim: "#00CC96",
  Bike: "#636EFA",
  Run: "#EF553B",
  Strength: "#AB63FA",
};

interface Props {
  workouts: Workout[];
  timeFrame: string;
}

export default function WeeklyVolumeChart({ workouts, timeFrame }: Props) {
  const data = useMemo(() => {
    const weekMap = new Map<string, Record<string, number>>();

    for (const w of workouts) {
      const d = w.date.toDate();
      const weekKey = format(startOfWeek(d, { weekStartsOn: 1 }), "MMM d");
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, { Swim: 0, Bike: 0, Run: 0, Strength: 0 });
      }
      const entry = weekMap.get(weekKey)!;
      entry[w.sport] = (entry[w.sport] || 0) + w.duration / 60;
    }

    const rows = Array.from(weekMap.entries()).map(([week, sports]) => ({
      week,
      ...sports,
      total: sports.Swim + sports.Bike + sports.Run + sports.Strength,
      trend: 0,
    }));

    // Compute 4-week rolling avg
    for (let i = 0; i < rows.length; i++) {
      const start = Math.max(0, i - 3);
      const slice = rows.slice(start, i + 1);
      rows[i].trend = slice.reduce((s, r) => s + r.total, 0) / slice.length;
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
          <Tooltip
            contentStyle={{ background: "#1e1e2e", border: "1px solid #333" }}
            labelStyle={{ color: "#fff" }}
          />
          <Legend />
          <Bar dataKey="Swim" stackId="a" fill={COLORS.Swim} />
          <Bar dataKey="Bike" stackId="a" fill={COLORS.Bike} />
          <Bar dataKey="Run" stackId="a" fill={COLORS.Run} />
          <Bar dataKey="Strength" stackId="a" fill={COLORS.Strength} />
          <Line
            type="monotone"
            dataKey="trend"
            name="4-Week Avg"
            stroke="#fff"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={true}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </section>
  );
}
