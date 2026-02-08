import { format } from "date-fns";
import type { Workout } from "../types";

interface Props {
  workouts: Workout[];
  timeFrame: string;
}

export default function ActivityLog({ workouts, timeFrame }: Props) {
  if (workouts.length === 0) return <p className="muted">No workouts logged yet.</p>;

  return (
    <section>
      <h2>Activity Log ({timeFrame})</h2>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Sport</th>
              <th>Duration</th>
              <th>Distance</th>
              <th>Load</th>
            </tr>
          </thead>
          <tbody>
            {workouts.map((w) => (
              <tr key={w.id}>
                <td>{format(w.date.toDate(), "MMM d, yyyy")}</td>
                <td>{w.sport}</td>
                <td>{w.duration} min</td>
                <td>{w.distance}</td>
                <td>{w.load}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
