import { format } from "date-fns";
import type { Workout } from "../types";

interface Props {
  workouts: Workout[];
}

export default function LifetimeTotals({ workouts }: Props) {
  if (workouts.length === 0) return null;

  const totalHours = workouts.reduce((s, w) => s + w.duration, 0) / 60;
  const swimYds = workouts.filter((w) => w.sport === "Swim").reduce((s, w) => s + w.distance, 0);
  const bikeMi = workouts.filter((w) => w.sport === "Bike").reduce((s, w) => s + w.distance, 0);
  const runMi = workouts.filter((w) => w.sport === "Run").reduce((s, w) => s + w.distance, 0);

  const oldest = workouts.reduce((min, w) => {
    const d = w.date.toDate();
    return d < min ? d : min;
  }, workouts[0].date.toDate());

  return (
    <section>
      <h2>Lifetime Totals</h2>
      <p className="muted">Since {format(oldest, "MMMM d, yyyy")}</p>
      <div className="metrics-row">
        <div className="metric-card">
          <span className="metric-label">Total Hours</span>
          <span className="metric-value">{totalHours.toFixed(1)}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Total Swim</span>
          <span className="metric-value">{Math.round(swimYds)} yds</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Total Bike</span>
          <span className="metric-value">{Math.round(bikeMi)} mi</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Total Run</span>
          <span className="metric-value">{Math.round(runMi)} mi</span>
        </div>
      </div>
    </section>
  );
}
