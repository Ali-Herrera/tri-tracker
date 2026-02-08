import { useMemo, useState } from 'react';
import Papa from 'papaparse';
import { useWorkouts } from '../hooks/useWorkouts';
import type { Sport } from '../types';

type CsvRow = Record<string, string>;

type DurationUnit = 'seconds' | 'minutes';

type DistanceUnit = 'meters' | 'kilometers' | 'miles' | 'yards';
type SwimDistanceUnit = 'yards' | 'meters';

const BIKE_RUN_DISTANCE_UNITS: DistanceUnit[] = [
  'meters',
  'kilometers',
  'miles',
  'yards',
];

const SWIM_DISTANCE_UNITS: SwimDistanceUnit[] = ['yards', 'meters'];

const DURATION_UNITS: DurationUnit[] = ['minutes', 'seconds'];

const metersPerMile = 1609.34;
const metersPerYard = 0.9144;

const guessColumn = (fields: string[], options: string[]) => {
  const lowerFields = fields.map((field) => field.toLowerCase().trim());
  // Prefer exact matches first
  for (const option of options) {
    const exactIndex = lowerFields.findIndex((field) => field === option);
    if (exactIndex >= 0) return fields[exactIndex];
  }
  // Fall back to substring matches
  for (const option of options) {
    const matchIndex = lowerFields.findIndex((field) => field.includes(option));
    if (matchIndex >= 0) return fields[matchIndex];
  }
  return '';
};

const parseNumber = (value: string) => {
  if (!value) return 0;
  let cleaned = value.trim();
  if (cleaned.includes(',')) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    const afterComma = cleaned.slice(lastComma + 1);
    if (lastComma > lastDot && /^\d{3}$/.test(afterComma)) {
      // Exactly 3 digits after comma = thousands separator: "4,000" or "1,234,567"
      cleaned = cleaned.replace(/,/g, '');
    } else if (lastComma > lastDot) {
      // European decimal separator: "5,02" or "1.234,56"
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // Comma before dot = thousands separator: "1,234.56"
      cleaned = cleaned.replace(/,/g, '');
    }
  }
  cleaned = cleaned.replace(/[^0-9.-]/g, '');
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
  bikeRunUnit: DistanceUnit,
  swimUnit: SwimDistanceUnit,
  sport: Sport,
  autoDetectMetric: boolean,
) => {
  if (!distance || sport === 'Strength') return 0;
  if (sport === 'Swim') {
    if (swimUnit === 'yards') return distance;
    return distance / metersPerYard;
  }
  let unit = bikeRunUnit;
  if (autoDetectMetric && bikeRunUnit !== 'meters' && distance >= 1000) {
    unit = 'meters';
  }
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
  return meters / metersPerMile;
};

const normalizeSport = (value: string) => {
  const label = value.toLowerCase();
  if (label.includes('swim')) return 'Swim';
  if (
    label.includes('ride') ||
    label.includes('bike') ||
    label.includes('biking') ||
    label.includes('cycle') ||
    label.includes('cycling') ||
    label.includes('trainer') ||
    label.includes('spin')
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
    label.includes('workout') ||
    label.includes('yoga') ||
    label.includes('boulder') ||
    label.includes('climb') ||
    label.includes('cardio') ||
    label.includes('hiit') ||
    label.includes('pilates') ||
    label.includes('elliptical') ||
    label.includes('rowing') ||
    label.includes('row ')
  ) {
    return 'Strength';
  }
  return null;
};

const ALL_SPORTS: Sport[] = ['Swim', 'Bike', 'Run', 'Strength'];

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
  const [fileInputKey, setFileInputKey] = useState(0);

  const [dateColumn, setDateColumn] = useState('');
  const [sportColumn, setSportColumn] = useState('');
  const [durationColumn, setDurationColumn] = useState('');
  const [distanceColumn, setDistanceColumn] = useState('');
  const [durationUnit, setDurationUnit] = useState<DurationUnit>('minutes');
  const [bikeRunDistanceUnit, setBikeRunDistanceUnit] =
    useState<DistanceUnit>('miles');
  const [swimDistanceUnit, setSwimDistanceUnit] =
    useState<SwimDistanceUnit>('yards');
  const [autoDetectMetric, setAutoDetectMetric] = useState(true);
  const [intensity, setIntensity] = useState(5);

  const isFixedSport = ALL_SPORTS.includes(sportColumn as Sport);

  const preview = useMemo(() => {
    if (!rows.length || !dateColumn || !sportColumn || !durationColumn) {
      return { workouts: [], skipped: rows.length };
    }

    const workouts = rows
      .map((row) => {
        const date = parseDate(row[dateColumn]);
        const sport = isFixedSport
          ? (sportColumn as Sport)
          : normalizeSport(row[sportColumn]);
        if (!date || !sport) return null;
        const duration = parseDurationValue(row[durationColumn], durationUnit);
        const distanceRaw = distanceColumn
          ? parseNumber(row[distanceColumn])
          : 0;
        // Garmin uses meters for track workouts but miles for everything else
        const rawSportValue = !isFixedSport && sportColumn ? row[sportColumn] : '';
        const isTrackActivity = rawSportValue.toLowerCase().includes('track');
        const rowDistanceUnit: DistanceUnit = isTrackActivity
          ? 'meters'
          : bikeRunDistanceUnit;
        const distance = convertDistance(
          distanceRaw,
          rowDistanceUnit,
          swimDistanceUnit,
          sport,
          autoDetectMetric,
        );
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
    bikeRunDistanceUnit,
    swimDistanceUnit,
    autoDetectMetric,
    isFixedSport,
    intensity,
  ]);

  const handleFile = (file?: File) => {
    if (!file) return;
    setError('');
    setStatus('');

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const fields = result.meta.fields ?? [];
        setRows(result.data);
        setHeaders(fields);
        setDateColumn(
          guessColumn(fields, ['activity date', 'start date', 'date']),
        );
        setSportColumn(guessColumn(fields, ['activity type', 'sport', 'type']));
        const durCol = guessColumn(fields, [
          'moving time',
          'elapsed time',
          'duration',
          'time',
        ]);
        setDurationColumn(durCol);
        setDistanceColumn(guessColumn(fields, ['distance']));

        // Auto-detect duration unit from data patterns
        if (durCol) {
          const sampleValues = result.data
            .slice(0, 30)
            .map((row) => row[durCol]?.trim())
            .filter(Boolean);
          const hasColons = sampleValues.some((v) => v.includes(':'));
          if (!hasColons) {
            // Plain numbers: if average > 300, likely seconds
            const nums = sampleValues.map((v) => parseNumber(v)).filter((n) => n > 0);
            if (nums.length > 0) {
              const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
              setDurationUnit(avg > 300 ? 'seconds' : 'minutes');
            }
          }
          // HH:MM:SS is always parsed to minutes regardless of unit setting
        }

        // Auto-detect distance unit from data patterns
        const distCol = guessColumn(fields, ['distance']);
        const sportCol = guessColumn(fields, ['activity type', 'sport', 'type']);
        if (distCol) {
          const sampleDistances = result.data
            .slice(0, 50)
            .filter((row) => {
              if (!sportCol) return true;
              const sport = normalizeSport(row[sportCol] || '');
              return sport === 'Bike' || sport === 'Run';
            })
            .map((row) => parseNumber(row[distCol]))
            .filter((d) => d > 0);
          if (sampleDistances.length > 0) {
            const avg =
              sampleDistances.reduce((a, b) => a + b, 0) / sampleDistances.length;
            if (avg > 200) {
              // Values like 5000, 10000 → almost certainly meters
              setBikeRunDistanceUnit('meters');
            }
          }
        }
      },
      error: (err) => {
        const message = err instanceof Error ? err.message : 'Parse failed.';
        setError(message);
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

  const handleClear = () => {
    setRows([]);
    setHeaders([]);
    setDateColumn('');
    setSportColumn('');
    setDurationColumn('');
    setDistanceColumn('');
    setError('');
    setStatus('');
    setImporting(false);
    setFileInputKey((prev) => prev + 1);
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
            key={fileInputKey}
            type='file'
            accept='.csv,text/csv'
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>

        {headers.length > 0 && (
          <>
            <label>
              Garmin Auto-Detect (meters for large values)
              <input
                type='checkbox'
                checked={autoDetectMetric}
                onChange={(e) => setAutoDetectMetric(e.target.checked)}
              />
            </label>
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
                  <option disabled>───────────</option>
                  {ALL_SPORTS.map((sport) => (
                    <option key={sport} value={sport}>
                      All {sport}
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
                Bike/Run Distance Unit
                <select
                  value={bikeRunDistanceUnit}
                  onChange={(e) =>
                    setBikeRunDistanceUnit(e.target.value as DistanceUnit)
                  }
                >
                  {BIKE_RUN_DISTANCE_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Swim Distance Unit
                <select
                  value={swimDistanceUnit}
                  onChange={(e) =>
                    setSwimDistanceUnit(e.target.value as SwimDistanceUnit)
                  }
                >
                  {SWIM_DISTANCE_UNITS.map((unit) => (
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
          </>
        )}

        {error && <p className='error-text'>{error}</p>}
        {status && <p className='success-text'>{status}</p>}

        {rows.length > 0 && (
          <div className='import-actions'>
            <button
              type='button'
              className='filter-btn btn-primary'
              onClick={handleImport}
              disabled={importing}
            >
              {importing
                ? 'Importing...'
                : `Import ${preview.workouts.length} Workouts`}
            </button>
            <button
              type='button'
              className='filter-btn'
              onClick={handleClear}
              disabled={importing}
            >
              Clear Import
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
