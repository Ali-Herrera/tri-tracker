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
    duration: number,
    intensity: number,
    adaptation?: AdaptationCompletionInput,
  ) => Promise<void>;
  onUpdateCompleted: (
    workout: PlannedWorkout,
    distance: number,
    duration: number,
    intensity: number,
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
  onUpdateCompleted,
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
  const [duration, setDuration] = useState(0);
  const [intensity, setIntensity] = useState(5);
  const [adaptationType, setAdaptationType] = useState(
    ADAPTATION_OPTIONS.Bike[0],
  );
  const [avgPower, setAvgPower] = useState(130);
  const [paceMin, setPaceMin] = useState(9);
  const [paceSec, setPaceSec] = useState(30);
  const [swimPaceMin, setSwimPaceMin] = useState(2);
  const [swimPaceSec, setSwimPaceSec] = useState(0);
  const [avgHr, setAvgHr] = useState(120);
  const [drift, setDrift] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    setCompleting(false);
    setDistance(existingWorkout?.completedDistance ?? 0);
    setDuration(
      existingWorkout?.completedDuration ??
        (existingWorkout
          ? existingWorkout.easyMinutes + existingWorkout.hardMinutes
          : 30),
    );
    setIntensity(existingWorkout?.completedIntensity ?? 5);
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
    const baseDiscipline = getDiscipline(existingWorkout?.sport ?? 'Run');
    const completedAdaptation = existingWorkout?.completedAdaptation;
    if (completedAdaptation) {
      setAdaptationType(completedAdaptation.type);
      setAvgPower(completedAdaptation.avgPower ?? 0);
      setPaceMin(completedAdaptation.paceMin ?? 0);
      setPaceSec(completedAdaptation.paceSec ?? 0);
      setSwimPaceMin(completedAdaptation.swimPaceMin ?? 0);
      setSwimPaceSec(completedAdaptation.swimPaceSec ?? 0);
      setAvgHr(completedAdaptation.avgHr ?? 0);
      setDrift(completedAdaptation.drift ?? 0);
    } else {
      if (baseDiscipline) {
        setAdaptationType(ADAPTATION_OPTIONS[baseDiscipline][0]);
      }
      setAvgPower(130);
      setPaceMin(9);
      setPaceSec(30);
      setSwimPaceMin(2);
      setSwimPaceSec(0);
      setAvgHr(120);
      setDrift(0);
    }
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
            swimPaceMin: adaptationDiscipline === 'Swim' ? swimPaceMin : undefined,
            swimPaceSec: adaptationDiscipline === 'Swim' ? swimPaceSec : undefined,
          }
        : undefined;
      await onComplete(existingWorkout, distance, duration, intensity, adaptationInput);
    } finally {
      setSubmitting(false);
      onClose();
    }
  };

  const handleUpdateCompleted = async () => {
    if (!isEditing || !existingWorkout.completed) return;
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
            swimPaceMin: adaptationDiscipline === 'Swim' ? swimPaceMin : undefined,
            swimPaceSec: adaptationDiscipline === 'Swim' ? swimPaceSec : undefined,
          }
        : undefined;
      await onUpdateCompleted(existingWorkout, distance, duration, intensity, adaptationInput);
    } finally {
      setSubmitting(false);
      onClose();
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
                value={easyMinutes || ''}
                placeholder='0'
                onChange={(e) => setEasyMinutes(Number(e.target.value) || 0)}
                required
              />
            </label>
            <label>
              Hard Minutes
              <input
                type='number'
                min={0}
                step={1}
                value={hardMinutes || ''}
                placeholder='0'
                onChange={(e) => setHardMinutes(Number(e.target.value) || 0)}
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
                    Duration (min)
                    <input
                      type='number'
                      min={0}
                      step={1}
                      value={duration || ''}
                      placeholder='0'
                      onChange={(e) => setDuration(Number(e.target.value) || 0)}
                      autoFocus
                    />
                  </label>
                  <label>
                    Distance ({sport === 'Swim' ? 'yd' : 'miles'})
                    <input
                      type='number'
                      min={0}
                      step={0.1}
                      value={distance || ''}
                      placeholder='0'
                      onChange={(e) => setDistance(Number(e.target.value) || 0)}
                    />
                  </label>
                  <label>
                    Intensity (1-10 RPE)
                    <input
                      type='number'
                      min={1}
                      max={10}
                      step={1}
                      value={intensity || ''}
                      placeholder='5'
                      onChange={(e) => setIntensity(Number(e.target.value) || 0)}
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
                            value={avgPower || ''}
                            placeholder='0'
                            onChange={(e) =>
                              setAvgPower(Number(e.target.value) || 0)
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
                              value={paceMin || ''}
                              placeholder='0'
                              onChange={(e) =>
                                setPaceMin(Number(e.target.value) || 0)
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
                              value={paceSec || ''}
                              placeholder='0'
                              onChange={(e) =>
                                setPaceSec(Number(e.target.value) || 0)
                              }
                              required
                            />
                          </label>
                        </div>
                      )}
                      {adaptationDiscipline === 'Swim' && (
                        <div className='pace-row'>
                          <label>
                            Pace /100yd Min
                            <input
                              type='number'
                              min={0}
                              max={20}
                              value={swimPaceMin || ''}
                              placeholder='0'
                              onChange={(e) =>
                                setSwimPaceMin(Number(e.target.value) || 0)
                              }
                              required
                            />
                          </label>
                          <label>
                            Pace /100yd Sec
                            <input
                              type='number'
                              min={0}
                              max={59}
                              value={swimPaceSec || ''}
                              placeholder='0'
                              onChange={(e) =>
                                setSwimPaceSec(Number(e.target.value) || 0)
                              }
                              required
                            />
                          </label>
                        </div>
                      )}
                      <label>
                        Avg Heart Rate (BPM)
                        <input
                          type='number'
                          min={1}
                          value={avgHr || ''}
                          placeholder='0'
                          onChange={(e) => setAvgHr(Number(e.target.value) || 0)}
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
                          value={drift || ''}
                          placeholder='0'
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            if (e.target.value === '' || Number.isFinite(v)) setDrift(v || 0);
                          }}
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
              {existingWorkout.completed && !completing && (
                <div className='complete-prompt'>
                  <p className='completed-label'>Logged to Dashboard</p>
                  <button
                    type='button'
                    className='complete-btn'
                    onClick={handleCompleteClick}
                    disabled={submitting}
                  >
                    Edit Logged Workout
                  </button>
                </div>
              )}
              {existingWorkout.completed && completing && (
                <div className='complete-prompt'>
                  <label>
                    Duration (min)
                    <input
                      type='number'
                      min={0}
                      step={1}
                      value={duration || ''}
                      placeholder='0'
                      onChange={(e) => setDuration(Number(e.target.value) || 0)}
                      autoFocus
                    />
                  </label>
                  <label>
                    Distance ({sport === 'Swim' ? 'yd' : 'miles'})
                    <input
                      type='number'
                      min={0}
                      step={0.1}
                      value={distance || ''}
                      placeholder='0'
                      onChange={(e) => setDistance(Number(e.target.value) || 0)}
                    />
                  </label>
                  <label>
                    Intensity (1-10 RPE)
                    <input
                      type='number'
                      min={1}
                      max={10}
                      step={1}
                      value={intensity || ''}
                      placeholder='5'
                      onChange={(e) => setIntensity(Number(e.target.value) || 0)}
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
                            value={avgPower || ''}
                            placeholder='0'
                            onChange={(e) =>
                              setAvgPower(Number(e.target.value) || 0)
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
                              value={paceMin || ''}
                              placeholder='0'
                              onChange={(e) =>
                                setPaceMin(Number(e.target.value) || 0)
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
                              value={paceSec || ''}
                              placeholder='0'
                              onChange={(e) =>
                                setPaceSec(Number(e.target.value) || 0)
                              }
                              required
                            />
                          </label>
                        </div>
                      )}
                      {adaptationDiscipline === 'Swim' && (
                        <div className='pace-row'>
                          <label>
                            Pace /100yd Min
                            <input
                              type='number'
                              min={0}
                              max={20}
                              value={swimPaceMin || ''}
                              placeholder='0'
                              onChange={(e) =>
                                setSwimPaceMin(Number(e.target.value) || 0)
                              }
                              required
                            />
                          </label>
                          <label>
                            Pace /100yd Sec
                            <input
                              type='number'
                              min={0}
                              max={59}
                              value={swimPaceSec || ''}
                              placeholder='0'
                              onChange={(e) =>
                                setSwimPaceSec(Number(e.target.value) || 0)
                              }
                              required
                            />
                          </label>
                        </div>
                      )}
                      <label>
                        Avg Heart Rate (BPM)
                        <input
                          type='number'
                          min={1}
                          value={avgHr || ''}
                          placeholder='0'
                          onChange={(e) => setAvgHr(Number(e.target.value) || 0)}
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
                          value={drift || ''}
                          placeholder='0'
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            if (e.target.value === '' || Number.isFinite(v))
                              setDrift(v || 0);
                          }}
                        />
                      </label>
                    </>
                  )}
                  <button
                    type='button'
                    className='complete-btn'
                    onClick={handleUpdateCompleted}
                    disabled={submitting}
                  >
                    {submitting ? 'Updating...' : 'Update Logged Workout'}
                  </button>
                </div>
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
