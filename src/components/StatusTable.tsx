import { format } from "date-fns";
import type { AdaptationSession } from "../types";

interface Props {
  sessions: AdaptationSession[];
  onDelete?: (id: string) => void;
}

function getStatus(decoupling: number): { label: string; className: string } {
  if (decoupling <= 5.0) return { label: "Aerobically Stable", className: "status-green" };
  if (decoupling <= 8.0) return { label: "Developing", className: "status-yellow" };
  return { label: "High Fatigue", className: "status-red" };
}

export default function StatusTable({ sessions, onDelete }: Props) {
  if (sessions.length === 0) return <p className="muted">No sessions logged yet.</p>;

  return (
    <section>
      <h2>Recent Raw Data</h2>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Discipline</th>
              <th>Type</th>
              <th>EF</th>
              <th>Decoupling</th>
              <th>Status</th>
              {onDelete && <th></th>}
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => {
              const status = getStatus(s.decoupling);
              return (
                <tr key={s.id}>
                  <td>{format(s.date.toDate(), "MMM d, yyyy")}</td>
                  <td>{s.discipline}</td>
                  <td>{s.type}</td>
                  <td>{s.ef.toFixed(4)}</td>
                  <td>{s.decoupling.toFixed(1)}%</td>
                  <td><span className={`status-badge ${status.className}`}>{status.label}</span></td>
                  {onDelete && (
                    <td>
                      <button
                        type="button"
                        className="filter-btn"
                        onClick={() => onDelete(s.id)}
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
