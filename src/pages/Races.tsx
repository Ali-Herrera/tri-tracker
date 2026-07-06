import { FormEvent, useState } from 'react';
import { useRaces } from '../hooks/useRaces';
import type { RaceEntry, RaceType } from '../types';

const RACE_TYPES: RaceType[] = [
  'Triathlon',
  'Duathlon',
  'Running',
  'Cycling',
  'Swimming',
  'Other',
];

const TODAY = new Date().toISOString().slice(0, 10);

function groupByYear(races: RaceEntry[]): { year: string; races: RaceEntry[] }[] {
  const map = new Map<string, RaceEntry[]>();
  for (const race of races) {
    const year = race.date.slice(0, 4);
    if (!map.has(year)) map.set(year, []);
    map.get(year)!.push(race);
  }
  return Array.from(map.entries()).map(([year, races]) => ({ year, races }));
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function daysUntil(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const race = new Date(year, month - 1, day);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.round((race.getTime() - now.getTime()) / 86400000);
  return diff;
}

interface ResultsFormState {
  finishTime: string;
  swimTime: string;
  bikeTime: string;
  runTime: string;
  resultNotes: string;
}

interface EditFormState {
  name: string;
  date: string;
  raceType: RaceType;
  distance: string;
  registered: boolean;
  link: string;
}

function RaceCard({
  race,
  onDelete,
  onUpdate,
}: {
  race: RaceEntry;
  onDelete: (id: string) => void;
  onUpdate: (id: string, partial: Partial<RaceEntry>) => Promise<void>;
}) {
  const [showResultsForm, setShowResultsForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  const [form, setForm] = useState<ResultsFormState>({
    finishTime: race.finishTime || '',
    swimTime: race.swimTime || '',
    bikeTime: race.bikeTime || '',
    runTime: race.runTime || '',
    resultNotes: race.resultNotes || '',
  });

  const [editForm, setEditForm] = useState<EditFormState>({
    name: race.name,
    date: race.date,
    raceType: race.raceType,
    distance: race.distance,
    registered: race.registered,
    link: race.link || '',
  });

  const isMultiDiscipline = race.raceType === 'Triathlon' || race.raceType === 'Duathlon';
  const days = daysUntil(race.date);
  const isPast = days < 0;

  const handleSaveResults = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdate(race.id, {
        completed: true,
        finishTime: form.finishTime || undefined,
        swimTime: form.swimTime || undefined,
        bikeTime: form.bikeTime || undefined,
        runTime: form.runTime || undefined,
        resultNotes: form.resultNotes || undefined,
      });
      setShowResultsForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    setEditSaving(true);
    try {
      await onUpdate(race.id, {
        name: editForm.name,
        date: editForm.date,
        raceType: editForm.raceType,
        distance: editForm.distance,
        registered: editForm.registered,
        link: editForm.link || undefined,
      });
      setShowEditForm(false);
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className={`race-card${race.completed ? ' race-card--completed' : ''}`}>
      <div className="race-card-header">
        <div className="race-card-meta">
          <span className={`race-type-badge race-type-badge--${race.raceType.toLowerCase()}`}>
            {race.raceType}
          </span>
          <span className={`race-registered-chip${race.registered ? ' race-registered-chip--yes' : ''}`}>
            {race.registered ? 'Registered' : 'Not Registered'}
          </span>
          {race.completed && <span className="race-completed-chip">Finished</span>}
        </div>
        <div className="race-card-actions">
          {race.link && (
            <a
              className="race-link"
              href={race.link}
              target="_blank"
              rel="noopener noreferrer"
              title="Race details"
            >
              ↗
            </a>
          )}
          <button
            className={`btn-icon race-edit${showEditForm ? ' active' : ''}`}
            onClick={() => { setShowEditForm((s) => !s); setShowResultsForm(false); }}
            title="Edit race"
          >
            ✎
          </button>
          <button
            className="btn-icon race-delete"
            onClick={() => onDelete(race.id)}
            title="Delete race"
          >
            ✕
          </button>
        </div>
      </div>

      <h3 className="race-card-name">{race.name}</h3>

      <div className="race-card-info">
        <span className="race-date">{formatDate(race.date)}</span>
        {race.distance && <span className="race-distance">{race.distance}</span>}
        {!isPast && !race.completed && (
          <span className="race-countdown">
            {days === 0 ? 'Today!' : `${days} day${days === 1 ? '' : 's'} away`}
          </span>
        )}
      </div>

      {race.completed && (race.finishTime || race.resultNotes) && (
        <div className="race-results">
          {race.finishTime && (
            <div className="race-results-times">
              <span className="race-result-item">
                <span className="race-result-label">Finish</span>
                <span className="race-result-value">{race.finishTime}</span>
              </span>
              {isMultiDiscipline && race.swimTime && (
                <span className="race-result-item">
                  <span className="race-result-label">Swim</span>
                  <span className="race-result-value">{race.swimTime}</span>
                </span>
              )}
              {isMultiDiscipline && race.bikeTime && (
                <span className="race-result-item">
                  <span className="race-result-label">Bike</span>
                  <span className="race-result-value">{race.bikeTime}</span>
                </span>
              )}
              {isMultiDiscipline && race.runTime && (
                <span className="race-result-item">
                  <span className="race-result-label">Run</span>
                  <span className="race-result-value">{race.runTime}</span>
                </span>
              )}
            </div>
          )}
          {race.resultNotes && <p className="race-result-notes">{race.resultNotes}</p>}
          <button
            className="btn-secondary btn-sm"
            onClick={() => { setShowResultsForm(true); setShowEditForm(false); }}
          >
            Edit Results
          </button>
        </div>
      )}

      {!race.completed && isPast && !showResultsForm && !showEditForm && (
        <button
          className="btn-secondary btn-sm race-complete-btn"
          onClick={() => { setShowResultsForm(true); setShowEditForm(false); }}
        >
          Mark Complete
        </button>
      )}

      {showEditForm && (
        <form className="race-edit-form" onSubmit={handleSaveEdit}>
          <label>
            Race Name
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </label>
          <label>
            Date
            <input
              type="date"
              value={editForm.date}
              onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
              required
            />
          </label>
          <label>
            Race Type
            <select
              value={editForm.raceType}
              onChange={(e) => setEditForm((f) => ({ ...f, raceType: e.target.value as RaceType }))}
            >
              {RACE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label>
            Distance
            <input
              type="text"
              value={editForm.distance}
              onChange={(e) => setEditForm((f) => ({ ...f, distance: e.target.value }))}
              placeholder="Sprint / Olympic / 70.3 / Marathon..."
            />
          </label>
          <label>
            Race Link
            <input
              type="url"
              value={editForm.link}
              onChange={(e) => setEditForm((f) => ({ ...f, link: e.target.value }))}
              placeholder="https://..."
            />
          </label>
          <label className="race-edit-checkbox">
            <input
              type="checkbox"
              checked={editForm.registered}
              onChange={(e) => setEditForm((f) => ({ ...f, registered: e.target.checked }))}
            />
            Registered
          </label>
          <div className="race-results-form-actions">
            <button type="submit" className="btn-primary btn-sm" disabled={editSaving}>
              {editSaving ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => setShowEditForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {showResultsForm && (
        <form className="race-results-form" onSubmit={handleSaveResults}>
          <label>
            Overall Finish Time
            <input
              type="text"
              placeholder="4:32:15"
              value={form.finishTime}
              onChange={(e) => setForm((f) => ({ ...f, finishTime: e.target.value }))}
            />
          </label>
          {isMultiDiscipline && (
            <>
              <label>
                Swim Split
                <input
                  type="text"
                  placeholder="32:45"
                  value={form.swimTime}
                  onChange={(e) => setForm((f) => ({ ...f, swimTime: e.target.value }))}
                />
              </label>
              <label>
                Bike Split
                <input
                  type="text"
                  placeholder="2:45:00"
                  value={form.bikeTime}
                  onChange={(e) => setForm((f) => ({ ...f, bikeTime: e.target.value }))}
                />
              </label>
              <label>
                Run Split
                <input
                  type="text"
                  placeholder="1:58:30"
                  value={form.runTime}
                  onChange={(e) => setForm((f) => ({ ...f, runTime: e.target.value }))}
                />
              </label>
            </>
          )}
          <label>
            Notes
            <textarea
              placeholder="Pacing, placement, conditions..."
              value={form.resultNotes}
              onChange={(e) => setForm((f) => ({ ...f, resultNotes: e.target.value }))}
              rows={3}
            />
          </label>
          <div className="race-results-form-actions">
            <button type="submit" className="btn-primary btn-sm" disabled={saving}>
              {saving ? 'Saving...' : 'Save Results'}
            </button>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => setShowResultsForm(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}


export default function Races() {
  const { races, loading, addRace, updateRace, deleteRace } = useRaces();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [raceType, setRaceType] = useState<RaceType>('Triathlon');
  const [distance, setDistance] = useState('');
  const [registered, setRegistered] = useState(false);
  const [link, setLink] = useState('');

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addRace({ name, date, raceType, distance, registered, link });
      setName('');
      setDate('');
      setRaceType('Triathlon');
      setDistance('');
      setRegistered(false);
      setLink('');
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const upcoming = races.filter((r) => !r.completed && r.date >= TODAY);
  const past = races.filter((r) => r.completed || r.date < TODAY);

  if (loading) return <p>Loading races...</p>;

  return (
    <div className="races-page">
      <div className="page-header">
        <h1>My Races</h1>
        <button
          className="btn-primary"
          onClick={() => setShowForm((s) => !s)}
        >
          {showForm ? 'Cancel' : '+ Add Race'}
        </button>
      </div>

      {showForm && (
        <form className="races-form" onSubmit={handleAdd}>
          <h3>New Race</h3>
          <div className="races-form-grid">
            <label>
              Race Name
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ironman Lake Placid"
                required
              />
            </label>
            <label>
              Date
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </label>
            <label>
              Race Type
              <select
                value={raceType}
                onChange={(e) => setRaceType(e.target.value as RaceType)}
              >
                {RACE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Distance
              <input
                type="text"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                placeholder="Sprint / Olympic / 70.3 / Marathon..."
              />
            </label>
            <label>
              Race Link
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://..."
              />
            </label>
            <label className="races-form-checkbox">
              <input
                type="checkbox"
                checked={registered}
                onChange={(e) => setRegistered(e.target.checked)}
              />
              Registered
            </label>
          </div>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Adding...' : 'Add Race'}
          </button>
        </form>
      )}

      {upcoming.length > 0 && (
        <section className="races-list">
          <h2 className="races-section-title">Upcoming</h2>
          {groupByYear(upcoming).map(({ year, races: group }) => (
            <div key={year}>
              <div className="races-year-label">{year}</div>
              {group.map((race) => (
                <RaceCard
                  key={race.id}
                  race={race}
                  onDelete={deleteRace}
                  onUpdate={updateRace}
                />
              ))}
            </div>
          ))}
        </section>
      )}

      {past.length > 0 && (
        <section className="races-list">
          <h2 className="races-section-title">Past Races</h2>
          {groupByYear(past).map(({ year, races: group }) => (
            <div key={year}>
              <div className="races-year-label">{year}</div>
              {group.map((race) => (
                <RaceCard
                  key={race.id}
                  race={race}
                  onDelete={deleteRace}
                  onUpdate={updateRace}
                />
              ))}
            </div>
          ))}
        </section>
      )}

      {races.length === 0 && (
        <p className="muted races-empty">No races added yet. Hit "Add Race" to get started.</p>
      )}
    </div>
  );
}
