import { startOfWeek, subWeeks } from "date-fns";
import type { Workout } from "../types";

interface Props {
  workouts: Workout[];
}

export default function CoachAnalysis({ workouts }: Props) {
  if (workouts.length === 0) return null;

  const now = new Date();
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 }); // Mon of current week
  const lastWeekStart = subWeeks(thisWeekStart, 1);             // Mon of last complete week
  const twoWeeksAgoStart = subWeeks(thisWeekStart, 2);          // Mon of week before that

  let currentWeekLoad = 0;
  let lastWeekLoad = 0;
  let prevWeekLoad = 0;

  for (const w of workouts) {
    const d = w.date.toDate();
    if (d >= thisWeekStart) {
      currentWeekLoad += w.load;
    } else if (d >= lastWeekStart) {
      lastWeekLoad += w.load;
    } else if (d >= twoWeeksAgoStart) {
      prevWeekLoad += w.load;
    }
  }

  // Mon=0 … Sun=6
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;

  // Compare the two most recently completed Mon–Sun weeks
  const increase = prevWeekLoad > 0
    ? ((lastWeekLoad - prevWeekLoad) / prevWeekLoad) * 100
    : 0;

  return (
    <section className="coach-analysis">
      <h2>Coach's Analysis</h2>

      {dayOfWeek !== 0 && (
        <div className="card accent-blue">
          Mid-Week Status: {Math.round(currentWeekLoad)} load points built. Check back Monday for your weekly grade!
        </div>
      )}

      {dayOfWeek === 0 && lastWeekLoad > 0 && (
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
