import { format } from 'date-fns';
import type { PlannedWorkout } from '../types';

interface Props {
  isOpen: boolean;
  workout: PlannedWorkout | null;
  onClose: () => void;
  title?: string;
}

export default function PlannedWorkoutDetailsModal({
  isOpen,
  workout,
  onClose,
  title = 'Planned Workout (Read Only)',
}: Props) {
  if (!isOpen || !workout) return null;

  const totalMinutes = workout.easyMinutes + workout.hardMinutes;

  return (
    <div className='modal-overlay' onClick={onClose}>
      <div className='modal-card' onClick={(event) => event.stopPropagation()}>
        <h3>{title}</h3>
        <div className='ref-list'>
          <div className='ref-item-row'>
            <strong>Date</strong>
            <span>
              {format(new Date(workout.date + 'T12:00:00'), 'MMM d, yyyy')}
            </span>
          </div>
          <div className='ref-item-row'>
            <strong>Sport</strong>
            <span>{workout.sport}</span>
          </div>
          <div className='ref-item-row'>
            <strong>Title</strong>
            <span>{workout.title}</span>
          </div>
          <div className='ref-item-row'>
            <strong>Total</strong>
            <span>{totalMinutes} min</span>
          </div>
          <div className='ref-item-row'>
            <strong>Status</strong>
            <span>{workout.completed ? 'Completed' : 'Planned'}</span>
          </div>
        </div>
        {workout.notes && (
          <div>
            <h4>Notes</h4>
            <p className='workout-notes'>{workout.notes}</p>
          </div>
        )}
        <div className='modal-actions'>
          <button type='button' className='filter-btn' onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
