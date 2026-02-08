import { FormEvent, useState, useEffect } from 'react';
import type {
  AdaptationCompletionInput,
  CalendarSport,
  Discipline,
  PlannedWorkout,
} from '../types';

const SPORTS: CalendarSport[] = ['Swim', 'Bike', 'Run', 'Lift', 'Other'];

const ADAPTATION_OPTIONS: Record<Discipline, string[]> = {
  Run: [
    'Aerobic Base Build',
    'Threshold Intervals',
    'Hill Repeats',
    'Easy Recovery Run',
    'Other',
  ],
  Bike: [
    'Steady State (Post-Intervals)',
    'Progressive Build (Ride 6)',
    'Pure Aerobic (Recovery)',
    'Other',
  ],
  Swim: ['Endurance Sets', 'Technique/Drills', 'Sprints', 'Other'],
};

const getDiscipline = (sport: CalendarSport): Discipline | null => {
  if (sport === 'Swim') return 'Swim';
  if (sport === 'Bike') return 'Bike';
  if (sport === 'Run') return 'Run';
  return null;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (workout: Omit<PlannedWorkout, 'id'>) => Promise<void>;
  onUpdate: (
    id: string,
    updates: Partial<Omit<PlannedWorkout, 'id'>>,
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCopy: (workout: PlannedWorkout) => Promise<void>;
  onComplete: (
    workout: PlannedWorkout,
    distance: number,
    adaptation?: AdaptationCompletionInput,
  ) => Promise<void>;
  initialDate: string;
  existingWorkout: PlannedWorkout | null;
}

export default function PlannedWorkoutModal({
  isOpen,
  onClose,
  onSave,
  onUpdate,
  onDelete,
  onCopy,
  onComplete,
  initialDate,
  existingWorkout,
}: Props) {
  const [date, setDate] = useState(initialDate);
  const [sport, setSport] = useState<CalendarSport>('Run');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [easyMinutes, setEasyMinutes] = useState(30);
  const [hardMinutes, setHardMinutes] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [distance, setDistance] = useState(0);
  const [adaptationType, setAdaptationType] = useState(
    ADAPTATION_OPTIONS.Bike[0],
  );
  const [avgPower, setAvgPower] = useState(130);
  const [paceMin, setPaceMin] = useState(9);
  const [paceSec, setPaceSec] = useState(30);
  const [swimSpeed, setSwimSpeed] = useState(100);
  const [avgHr, setAvgHr] = useState(120);
  const [drift, setDrift] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    setCompleting(false);
    setDistance(0);
    if (existingWorkout) {
      setDate(existingWorkout.date);
      setSport(existingWorkout.sport);
      setTitle(existingWorkout.title);
      setNotes(existingWorkout.notes);
      setEasyMinutes(existingWorkout.easyMinutes);
      setHardMinutes(existingWorkout.hardMinutes);
    } else {
      setDate(initialDate);
      setSport('Run');
      setTitle('');
      setNotes('');
      setEasyMinutes(30);
      setHardMinutes(0);
    }
    const discipline = getDiscipline(existingWorkout?.sport ?? 'Run');
    if (discipline) {
      setAdaptationType(ADAPTATION_OPTIONS[discipline][0]);
    }
    setAvgPower(130);
    setPaceMin(9);
    setPaceSec(30);
    setSwimSpeed(100);
    setAvgHr(120);
    setDrift(0);
  }, [existingWorkout, initialDate, isOpen]);

  if (!isOpen) return null;

  const totalDuration = easyMinutes + hardMinutes;
  const isEditing = !!existingWorkout;
  const adaptationDiscipline = getDiscipline(sport);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      if (isEditing) {
        await onUpdate(existingWorkout.id, {
          date,
          sport,
          title: title.trim(),
          notes: notes.trim(),
          easyMinutes,
          hardMinutes,
        });
      } else {
        await onSave({
          date,
          sport,
          title: title.trim(),
          notes: notes.trim(),
          easyMinutes,
          hardMinutes,
        });
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditing) return;
    setSubmitting(true);
    try {
      await onDelete(existingWorkout.id);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!isEditing) return;
    setSubmitting(true);
    try {
      await onCopy(existingWorkout);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteClick = () => {
    setCompleting(true);
  };

  const handleCompleteConfirm = async () => {
    if (!isEditing || existingWorkout.completed) return;
    setSubmitting(true);
    try {
      const adaptationInput = adaptationDiscipline
        ? {
            discipline: adaptationDiscipline,
            type: adaptationType,
            avgHr,
            drift,
            avgPower: adaptationDiscipline === 'Bike' ? avgPower : undefined,
            paceMin: adaptationDiscipline === 'Run' ? paceMin : undefined,
            paceSec: adaptationDiscipline === 'Run' ? paceSec : undefined,
            swimSpeed: adaptationDiscipline === 'Swim' ? swimSpeed : undefined,
          }
        : undefined;
      await onComplete(existingWorkout, distance, adaptationInput);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className='modal-overlay' onClick={onClose}>
      <div className='modal-card' onClick={(e) => e.stopPropagation()}>
        <form className='workout-form' onSubmit={handleSubmit}>
          <h3>{isEditing ? 'Edit Planned Workout' : 'Plan a Workout'}</h3>

          <label>
            Date
            <input
              type='date'
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>

          <label>
            Sport
            <select
              value={sport}
              onChange={(e) => {
                const nextSport = e.target.value as CalendarSport;
                setSport(nextSport);
                const nextDiscipline = getDiscipline(nextSport);
                if (nextDiscipline) {
                  setAdaptationType(ADAPTATION_OPTIONS[nextDiscipline][0]);
                }
              }}
            >
              {SPORTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label>
            Title
            <input
              type='text'
              placeholder='e.g. Long ride, Track intervals'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>

          <label>
            Notes (optional)
            <textarea
              className='modal-textarea'
              placeholder='Warm up:&#10;100 yd free&#10;Main set:&#10;100yd x 4 @ 60%...'
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
            />
          </label>

          <div className='pace-row'>
            <label>
              Easy Minutes
              <input
                type='number'
                min={0}
                step={1}
                value={easyMinutes}
                onChange={(e) => setEasyMinutes(Number(e.target.value))}
                required
              />
            </label>
            <label>
              Hard Minutes
              <input
                type='number'
                min={0}
                step={1}
                value={hardMinutes}
                onChange={(e) => setHardMinutes(Number(e.target.value))}
                required
              />
            </label>
          </div>

          <p className='muted' style={{ fontSize: '0.85rem' }}>
            Total: {totalDuration} min
          </p>

          <button type='submit' disabled={submitting}>
            {submitting
              ? 'Saving...'
              : isEditing
                ? 'Update Workout'
                : 'Add Workout'}
          </button>

          {isEditing && (
            <div className='modal-actions'>
              {!existingWorkout.completed && !completing && (
                <button
                  type='button'
                  className='complete-btn'
                  onClick={handleCompleteClick}
                  disabled={submitting}
                >
                  Completed
                </button>
              )}
              {!existingWorkout.completed && completing && (
                <div className='complete-prompt'>
                  <label>
                    Distance ({sport === 'Swim' ? 'yards' : 'miles'})
                    <input
                      type='number'
                      min={0}
                      step={0.1}
                      value={distance}
                      onChange={(e) => setDistance(Number(e.target.value))}
                      autoFocus
                    />
                  </label>
                  {adaptationDiscipline && (
                    <>
                      <label>
                        Workout Category
                        <select
                          value={adaptationType}
                          onChange={(e) => setAdaptationType(e.target.value)}
                        >
                          {ADAPTATION_OPTIONS[adaptationDiscipline].map(
                            (opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ),
                          )}
                        </select>
                      </label>
                      {adaptationDiscipline === 'Bike' && (
                        <label>
                          Avg Power (Watts)
                          <input
                            type='number'
                            min={0}
                            value={avgPower}
                            onChange={(e) =>
                              setAvgPower(Number(e.target.value))
                            }
                            required
                          />
                        </label>
                      )}
                      {adaptationDiscipline === 'Run' && (
                        <div className='pace-row'>
                          <label>
                            Pace Min
                            <input
                              type='number'
                              min={0}
                              max={20}
                              value={paceMin}
                              onChange={(e) =>
                                setPaceMin(Number(e.target.value))
                              }
                              required
                            />
                          </label>
                          <label>
                            Pace Sec
                            <input
                              type='number'
                              min={0}
                              max={59}
                              value={paceSec}
                              onChange={(e) =>
                                setPaceSec(Number(e.target.value))
                              }
                              required
                            />
                          </label>
                        </div>
                      )}
                      {adaptationDiscipline === 'Swim' && (
                        <label>
                          Avg Speed
                          <input
                            type='number'
                            min={0}
                            value={swimSpeed}
                            onChange={(e) =>
                              setSwimSpeed(Number(e.target.value))
                            }
                            required
                          />
                        </label>
                      )}
                      <label>
                        Avg Heart Rate (BPM)
                        <input
                          type='number'
                          min={1}
                          value={avgHr}
                          onChange={(e) => setAvgHr(Number(e.target.value))}
                          required
                        />
                      </label>
                      <label>
                        Decoupling / Drift (%)
                        <input
                          type='number'
                          min={-100}
                          max={100}
                          step={0.1}
                          value={drift}
                          onChange={(e) => setDrift(Number(e.target.value))}
                        />
                      </label>
                    </>
                  )}
                  <button
                    type='button'
                    className='complete-btn'
                    onClick={handleCompleteConfirm}
                    disabled={submitting}
                  >
                    {submitting
                      ? 'Logging...'
                      : adaptationDiscipline
                        ? 'Log to Dashboard + Lab'
                        : 'Log to Dashboard'}
                  </button>
                </div>
              )}
              {existingWorkout.completed && (
                <p className='completed-label'>Logged to Dashboard</p>
              )}
              <button
                type='button'
                className='copy-btn'
                onClick={handleCopy}
                disabled={submitting}
              >
                Copy
              </button>
              <button
                type='button'
                className='delete-btn'
                onClick={handleDelete}
                disabled={submitting}
              >
                Delete
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
