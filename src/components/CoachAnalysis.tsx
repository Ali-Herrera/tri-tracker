import { startOfWeek, subWeeks, isAfter } from "date-fns";
import type { Workout } from "../types";

interface Props {
  workouts: Workout[];
}

export default function CoachAnalysis({ workouts }: Props) {
  if (workouts.length === 0) return null;

  const now = new Date();
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = subWeeks(thisWeekStart, 1);

  let thisWeekLoad = 0;
  let lastWeekLoad = 0;

  for (const w of workouts) {
    const d = w.date.toDate();
    if (isAfter(d, thisWeekStart)) {
      thisWeekLoad += w.load;
    } else if (isAfter(d, lastWeekStart)) {
      lastWeekLoad += w.load;
    }
  }

  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1; // Mon=0
  const increase = lastWeekLoad > 0 ? ((thisWeekLoad - lastWeekLoad) / lastWeekLoad) * 100 : 0;

  return (
    <section className="coach-analysis">
      <h2>Coach's Analysis</h2>

      {dayOfWeek < 4 && (
        <div className="card accent-blue">
          Mid-Week Status: {Math.round(thisWeekLoad)} load points built. Check back Friday for your weekly grade!
        </div>
      )}

      {dayOfWeek >= 4 && (
        <div
          className={`card ${
            increase > 25
              ? "accent-red"
              : increase > 15
              ? "accent-yellow"
              : increase < -20
              ? "accent-green"
              : "accent-green"
          }`}
        >
          {increase > 25
            ? `DANGER: Load jumped ${Math.round(increase)}%. Risk of injury is high.`
            : increase > 15
            ? `PUSHING: Load up ${Math.round(increase)}%. Hold steady next week.`
            : increase < -20
            ? "RECOVERY: Body is absorbing the work."
            : `SWEET SPOT: Steady ${Math.round(increase)}% progression.`}
        </div>
      )}
    </section>
  );
}
