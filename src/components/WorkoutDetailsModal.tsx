import { format } from 'date-fns';
import type { Workout } from '../types';

interface Props {
  isOpen: boolean;
  workout: Workout | null;
  onClose: () => void;
  title?: string;
}

export default function WorkoutDetailsModal({
  isOpen,
  workout,
  onClose,
  title = 'Workout Details',
}: Props) {
  if (!isOpen || !workout) return null;

  return (
    <div className='modal-overlay' onClick={onClose}>
      <div className='modal-card' onClick={(event) => event.stopPropagation()}>
        <h3>{title}</h3>
        <div className='ref-list'>
          <div className='ref-item-row'>
            <strong>Date</strong>
            <span>{format(workout.date.toDate(), 'MMM d, yyyy')}</span>
          </div>
          <div className='ref-item-row'>
            <strong>Sport</strong>
            <span>{workout.sport}</span>
          </div>
          <div className='ref-item-row'>
            <strong>Duration</strong>
            <span>{workout.duration} min</span>
          </div>
          <div className='ref-item-row'>
            <strong>Distance</strong>
            <span>{workout.distance}</span>
          </div>
          <div className='ref-item-row'>
            <strong>Intensity</strong>
            <span>{workout.intensity}/10</span>
          </div>
          <div className='ref-item-row'>
            <strong>Load</strong>
            <span>{workout.load}</span>
          </div>
        </div>
        <div className='modal-actions'>
          <button type='button' className='filter-btn' onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
