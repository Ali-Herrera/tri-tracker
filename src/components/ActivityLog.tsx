import { useState } from 'react';
import { format } from 'date-fns';
import type { Workout } from '../types';

interface Props {
  workouts: Workout[];
  timeFrame: string;
  onClearAll?: () => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onWorkoutClick?: (workout: Workout) => void;
}

export default function ActivityLog({
  workouts,
  timeFrame,
  onClearAll,
  onDelete,
  onWorkoutClick,
}: Props) {
  const [confirming, setConfirming] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const hasWorkouts = workouts.length > 0;

  const handleClearClick = () => {
    setConfirming(true);
  };

  const handleCancelClear = () => {
    setConfirming(false);
  };

  const handleConfirmClear = async () => {
    if (!onClearAll) return;
    setClearing(true);
    try {
      await onClearAll();
      setConfirming(false);
    } finally {
      setClearing(false);
    }
  };

  const handleDeleteWorkout = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!onDelete) return;
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  const handleRowKeyDown = (
    event: React.KeyboardEvent<HTMLTableRowElement>,
    workout: Workout,
  ) => {
    if (!onWorkoutClick) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onWorkoutClick(workout);
    }
  };

  return (
    <section>
      <div className='page-header'>
        <h2>Activity Log ({timeFrame})</h2>
        {onClearAll && (
          <button
            type='button'
            className='filter-btn btn-danger'
            onClick={handleClearClick}
            disabled={clearing}
          >
            Clear All Workouts
          </button>
        )}
      </div>
      {confirming && (
        <div className='danger-zone'>
          <p>
            This will permanently delete all workouts in your account. This
            cannot be undone.
          </p>
          <div className='danger-actions'>
            <button
              type='button'
              className='filter-btn btn-danger'
              onClick={handleConfirmClear}
              disabled={clearing}
            >
              {clearing ? 'Clearing...' : 'Yes, delete everything'}
            </button>
            <button
              type='button'
              className='filter-btn'
              onClick={handleCancelClear}
              disabled={clearing}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {!hasWorkouts && <p className='muted'>No workouts logged yet.</p>}
      {hasWorkouts && (
        <div className='table-wrapper activity-log-table'>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Sport</th>
                <th>Duration</th>
                <th>Distance</th>
                <th>Load</th>
                {onDelete && <th></th>}
              </tr>
            </thead>
            <tbody>
              {workouts.map((w) => (
                <tr
                  key={w.id}
                  className={onWorkoutClick ? 'activity-log-row clickable' : ''}
                  onClick={() => onWorkoutClick?.(w)}
                  onKeyDown={(event) => handleRowKeyDown(event, w)}
                  tabIndex={onWorkoutClick ? 0 : undefined}
                >
                  <td>{format(w.date.toDate(), 'MMM d, yyyy')}</td>
                  <td>{w.sport}</td>
                  <td>{w.duration} min</td>
                  <td>{w.distance}</td>
                  <td>{w.load}</td>
                  {onDelete && (
                    <td>
                      <button
                        type='button'
                        className='delete-btn delete-btn-sm'
                        onClick={(e) => handleDeleteWorkout(e, w.id)}
                        disabled={deletingId === w.id}
                        title='Delete workout'
                      >
                        {deletingId === w.id ? '...' : '×'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
