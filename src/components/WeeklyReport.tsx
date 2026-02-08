import { subDays } from "date-fns";
import type { AdaptationSession } from "../types";

interface Props {
  sessions: AdaptationSession[];
}

export default function WeeklyReport({ sessions }: Props) {
  const cutoff = subDays(new Date(), 7);
  const last7 = sessions.filter((s) => s.date.toDate() >= cutoff);

  const stableSessions = last7.filter((s) => s.decoupling <= 5.0).length;
  const avgEf = last7.length > 0
    ? last7.reduce((sum, s) => sum + s.ef, 0) / last7.length
    : 0;

  return (
    <section>
      <h2>Weekly Performance Report</h2>
      <div className="metrics-row">
        <div className="metric-card">
          <span className="metric-label">Sessions (7d)</span>
          <span className="metric-value">{last7.length}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Stable Sessions</span>
          <span className="metric-value">{stableSessions}</span>
        </div>
        {last7.length > 0 && (
          <div className="metric-card">
            <span className="metric-label">Avg Weekly EF</span>
            <span className="metric-value">{avgEf.toFixed(2)}</span>
          </div>
        )}
      </div>
    </section>
  );
}
