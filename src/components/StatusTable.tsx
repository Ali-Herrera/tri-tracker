import { useState } from 'react';
import { format } from 'date-fns';
import type { AdaptationSession } from '../types';

interface Props {
  sessions: AdaptationSession[];
  onDelete?: (id: string) => void;
}

function getStatus(tsb: number): { label: string; className: string } {
  if (tsb >= 15)
    return { label: 'Peaking Recovery', className: 'status-green' };
  if (tsb >= 0) return { label: 'Balanced', className: 'status-blue' };
  if (tsb >= -10)
    return { label: 'Light Training', className: 'status-yellow' };
  if (tsb >= -30) return { label: 'Productive', className: 'status-orange' };
  return { label: 'High Fatigue', className: 'status-red' };
}

export default function StatusTable({ sessions, onDelete }: Props) {
  const [expanded, setExpanded] = useState(true);
  if (sessions.length === 0)
    return <p className='muted'>No sessions logged yet.</p>;

  return (
    <section>
      <div className='section-header'>
        <h2>Recent Raw Data</h2>
        <button
          type='button'
          className={`filter-btn ${expanded ? 'active' : ''}`}
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? 'Hide' : 'Show'} raw data
        </button>
      </div>

      {expanded && (
        <div className='table-wrapper activity-log-table'>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Discipline</th>
                <th>Type</th>
                <th>EF</th>
                <th>TSB</th>
                <th>Status</th>
                {onDelete && <th></th>}
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const tsb = s.tsb ?? s.decoupling ?? 0;
                const status = getStatus(tsb);
                return (
                  <tr key={s.id}>
                    <td>{format(s.date.toDate(), 'MMM d, yyyy')}</td>
                    <td>{s.discipline}</td>
                    <td>{s.type}</td>
                    <td>{s.ef.toFixed(4)}</td>
                    <td>{tsb.toFixed(1)}</td>
                    <td>
                      <span className={`status-badge ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                    {onDelete && (
                      <td>
                        <button
                          type='button'
                          className='filter-btn'
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
      )}
    </section>
  );
}
