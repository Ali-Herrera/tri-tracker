import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
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

const renderLabel = ({
  name,
  percent,
}: {
  name?: string;
  percent?: number;
}) => `${name ?? ''} ${Math.round((percent ?? 0) * 100)}%`;

export default function DisciplineBreakdown({ workouts, timeFrame }: Props) {
  const data = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const w of workouts) {
      totals[w.sport] = (totals[w.sport] || 0) + w.duration;
    }
    return Object.entries(totals).map(([name, value]) => ({ name, value }));
  }, [workouts]);

  if (data.length === 0) return null;

  return (
    <section>
      <h2>Discipline Breakdown: {timeFrame}</h2>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            label={renderLabel}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={COLORS[entry.name] || "#888"} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: "#1e1e2e", border: "1px solid #333", color: "#e0e0e0" }}
            itemStyle={{ color: "#e0e0e0" }}
            formatter={(value) => `${Math.round(value as number)} min`}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </section>
  );
}
