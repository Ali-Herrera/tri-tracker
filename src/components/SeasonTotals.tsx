import type { Workout } from "../types";

interface Props {
  workouts: Workout[];
}

export default function SeasonTotals({ workouts }: Props) {
  const year = new Date().getFullYear();
  const yearWorkouts = workouts.filter((w) => w.date.toDate().getFullYear() === year);

  const swimYds = yearWorkouts
    .filter((w) => w.sport === "Swim")
    .reduce((sum, w) => sum + w.distance, 0);
  const bikeMi = yearWorkouts
    .filter((w) => w.sport === "Bike")
    .reduce((sum, w) => sum + w.distance, 0);
  const runMi = yearWorkouts
    .filter((w) => w.sport === "Run")
    .reduce((sum, w) => sum + w.distance, 0);

  return (
    <section>
      <h2>{year} Season Totals</h2>
      <div className="metrics-row">
        <div className="metric-card">
          <span className="metric-label">Swim</span>
          <span className="metric-value">{Math.round(swimYds)} yds</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Bike</span>
          <span className="metric-value">{bikeMi.toFixed(1)} mi</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Run</span>
          <span className="metric-value">{runMi.toFixed(1)} mi</span>
        </div>
      </div>
    </section>
  );
}
