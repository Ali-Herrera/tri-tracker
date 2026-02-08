import { useMemo, useState } from 'react';
import Papa from 'papaparse';
import { useWorkouts } from '../hooks/useWorkouts';
import type { Sport } from '../types';

type CsvRow = Record<string, string>;

type DurationUnit = 'seconds' | 'minutes';

type DistanceUnit = 'meters' | 'kilometers' | 'miles' | 'yards';

const DISTANCE_UNITS: DistanceUnit[] = [
  'meters',
  'kilometers',
  'miles',
  'yards',
];

const DURATION_UNITS: DurationUnit[] = ['seconds', 'minutes'];

const metersPerMile = 1609.34;
const metersPerYard = 0.9144;

const guessColumn = (fields: string[], options: string[]) => {
  const lowerFields = fields.map((field) => field.toLowerCase());
  for (const option of options) {
    const matchIndex = lowerFields.findIndex((field) => field.includes(option));
    if (matchIndex >= 0) return fields[matchIndex];
  }
  return '';
};

const parseNumber = (value: string) => {
  if (!value) return 0;
  const cleaned = value.replace(/[^0-9.-]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseDurationValue = (value: string, unit: DurationUnit) => {
  if (!value) return 0;
  const trimmed = value.trim();
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':').map((part) => Number(part));
    if (parts.some((part) => Number.isNaN(part))) return 0;
    if (parts.length === 3) {
      const [hours, minutes, seconds] = parts;
      return hours * 60 + minutes + seconds / 60;
    }
    if (parts.length === 2) {
      const [minutes, seconds] = parts;
      return minutes + seconds / 60;
    }
  }
  const numeric = parseNumber(trimmed);
  if (unit === 'seconds') return numeric / 60;
  return numeric;
};

const convertDistance = (
  distance: number,
  unit: DistanceUnit,
  sport: Sport,
) => {
  if (!distance || sport === 'Strength') return 0;
  let meters = distance;
  switch (unit) {
    case 'kilometers':
      meters = distance * 1000;
      break;
    case 'miles':
      meters = distance * metersPerMile;
      break;
    case 'yards':
      meters = distance * metersPerYard;
      break;
    default:
      meters = distance;
  }
  if (sport === 'Swim') {
    return meters / metersPerYard;
  }
  return meters / metersPerMile;
};

const normalizeSport = (value: string) => {
  const label = value.toLowerCase();
  if (label.includes('swim')) return 'Swim';
  if (
    label.includes('ride') ||
    label.includes('bike') ||
    label.includes('cycle')
  ) {
    return 'Bike';
  }
  if (
    label.includes('run') ||
    label.includes('walk') ||
    label.includes('hike')
  ) {
    return 'Run';
  }
  if (
    label.includes('strength') ||
    label.includes('weight') ||
    label.includes('gym') ||
    label.includes('workout')
  ) {
    return 'Strength';
  }
  return null;
};

const parseDate = (value: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

export default function ImportWorkouts() {
  const { addWorkoutsBatch } = useWorkouts();
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [importing, setImporting] = useState(false);

  const [dateColumn, setDateColumn] = useState('');
  const [sportColumn, setSportColumn] = useState('');
  const [durationColumn, setDurationColumn] = useState('');
  const [distanceColumn, setDistanceColumn] = useState('');
  const [durationUnit, setDurationUnit] = useState<DurationUnit>('seconds');
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>('meters');
  const [intensity, setIntensity] = useState(5);

  const preview = useMemo(() => {
    if (!rows.length || !dateColumn || !sportColumn || !durationColumn) {
      return { workouts: [], skipped: rows.length };
    }

    const workouts = rows
      .map((row) => {
        const date = parseDate(row[dateColumn]);
        const sport = normalizeSport(row[sportColumn]);
        if (!date || !sport) return null;
        const duration = parseDurationValue(row[durationColumn], durationUnit);
        const distanceRaw = distanceColumn
          ? parseNumber(row[distanceColumn])
          : 0;
        const distance = convertDistance(distanceRaw, distanceUnit, sport);
        return {
          date,
          sport,
          duration: Math.max(1, Math.round(duration)),
          distance: Math.max(0, Math.round(distance * 100) / 100),
          intensity,
        };
      })
      .filter(Boolean) as Array<{
      date: Date;
      sport: Sport;
      duration: number;
      distance: number;
      intensity: number;
    }>;

    return { workouts, skipped: rows.length - workouts.length };
  }, [
    rows,
    dateColumn,
    sportColumn,
    durationColumn,
    distanceColumn,
    durationUnit,
    distanceUnit,
    intensity,
  ]);

  const handleFile = (file?: File) => {
    if (!file) return;
    setError('');
    setStatus('');

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result: Papa.ParseResult<CsvRow>) => {
        const fields = result.meta.fields ?? [];
        setRows(result.data);
        setHeaders(fields);
        setDateColumn(
          guessColumn(fields, ['activity date', 'start date', 'date']),
        );
        setSportColumn(guessColumn(fields, ['activity type', 'sport', 'type']));
        setDurationColumn(
          guessColumn(fields, [
            'moving time',
            'elapsed time',
            'duration',
            'time',
          ]),
        );
        setDistanceColumn(guessColumn(fields, ['distance']));
      },
      error: (err: Papa.ParseError) => {
        setError(err.message);
      },
    });
  };

  const handleImport = async () => {
    setError('');
    setStatus('');
    if (!preview.workouts.length) {
      setError('No valid rows to import.');
      return;
    }

    setImporting(true);
    try {
      await addWorkoutsBatch(preview.workouts);
      setStatus(`Imported ${preview.workouts.length} workouts.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Import failed.';
      setError(message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className='dashboard'>
      <div className='page-header'>
        <h1>Import Workouts</h1>
      </div>

      <form className='workout-form'>
        <h3>Upload CSV</h3>
        <label>
          File
          <input
            type='file'
            accept='.csv,text/csv'
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>

        {headers.length > 0 && (
          <div className='import-grid'>
            <label>
              Date Column
              <select
                value={dateColumn}
                onChange={(e) => setDateColumn(e.target.value)}
              >
                <option value=''>Select...</option>
                {headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Sport Column
              <select
                value={sportColumn}
                onChange={(e) => setSportColumn(e.target.value)}
              >
                <option value=''>Select...</option>
                {headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Duration Column
              <select
                value={durationColumn}
                onChange={(e) => setDurationColumn(e.target.value)}
              >
                <option value=''>Select...</option>
                {headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Distance Column
              <select
                value={distanceColumn}
                onChange={(e) => setDistanceColumn(e.target.value)}
              >
                <option value=''>None</option>
                {headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Duration Unit
              <select
                value={durationUnit}
                onChange={(e) =>
                  setDurationUnit(e.target.value as DurationUnit)
                }
              >
                {DURATION_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Distance Unit
              <select
                value={distanceUnit}
                onChange={(e) =>
                  setDistanceUnit(e.target.value as DistanceUnit)
                }
              >
                {DISTANCE_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Import Intensity ({intensity}/10)
              <input
                type='range'
                min={1}
                max={10}
                value={intensity}
                onChange={(e) => setIntensity(Number(e.target.value))}
              />
            </label>
          </div>
        )}

        {error && <p className='error-text'>{error}</p>}
        {status && <p className='success-text'>{status}</p>}

        {rows.length > 0 && (
          <div className='import-actions'>
            <button
              type='button'
              className='filter-btn'
              onClick={handleImport}
              disabled={importing}
            >
              {importing
                ? 'Importing...'
                : `Import ${preview.workouts.length} Workouts`}
            </button>
            <span className='muted'>Skipped: {preview.skipped}</span>
          </div>
        )}
      </form>

      {preview.workouts.length > 0 && (
        <section>
          <h2>Preview</h2>
          <div className='table-wrapper import-preview'>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Sport</th>
                  <th>Duration (min)</th>
                  <th>Distance</th>
                </tr>
              </thead>
              <tbody>
                {preview.workouts.slice(0, 8).map((row, idx) => (
                  <tr key={`${row.date.toISOString()}-${idx}`}>
                    <td>{row.date.toLocaleDateString()}</td>
                    <td>{row.sport}</td>
                    <td>{row.duration}</td>
                    <td>{row.distance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
