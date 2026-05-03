import { FormEvent, useState } from 'react';
import { useProfile } from '../hooks/useProfile';
import type { AthleteMetrics } from '../types';

export default function AthleteMetricsForm() {
  const { setAthleteMetrics } = useProfile();
  const [metrics, setMetrics] = useState<AthleteMetrics>({
    swim: { lthr: undefined },
    bike: { lthr: undefined, ftp: undefined },
    run: { lthr: undefined, ftp: undefined },
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccess(false);
    try {
      await setAthleteMetrics(metrics);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const updateMetric = (
    sport: keyof AthleteMetrics,
    key: string,
    value: number | undefined,
  ) => {
    setMetrics((prev) => ({
      ...prev,
      [sport]: {
        ...prev[sport],
        [key]: value,
      },
    }));
  };

  return (
    <form className='athlete-metrics-form' onSubmit={handleSubmit}>
      <h3>Set Athlete Metrics</h3>
      <p>Enter your thresholds for TSS calculations. Leave blank if unknown.</p>

      <fieldset>
        <legend>Swim</legend>
        <p style={{ fontSize: '0.9em', color: '#666' }}>
          Swim TSS uses perceived effort (easy/moderate/hard = 40/60/80 TSS/hr)
          based on your logged intensity.
        </p>
        <label>
          LTHR (bpm) - optional, for HR-based backup
          <input
            type='number'
            min={0}
            value={metrics.swim.lthr || ''}
            onChange={(e) =>
              updateMetric(
                'swim',
                'lthr',
                e.target.value ? Number(e.target.value) : undefined,
              )
            }
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>Bike</legend>
        <label>
          LTHR (bpm)
          <input
            type='number'
            min={0}
            value={metrics.bike.lthr || ''}
            onChange={(e) =>
              updateMetric(
                'bike',
                'lthr',
                e.target.value ? Number(e.target.value) : undefined,
              )
            }
          />
        </label>
        <label>
          FTP (watts)
          <input
            type='number'
            min={0}
            value={metrics.bike.ftp || ''}
            onChange={(e) =>
              updateMetric(
                'bike',
                'ftp',
                e.target.value ? Number(e.target.value) : undefined,
              )
            }
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>Run</legend>
        <label>
          LTHR (bpm)
          <input
            type='number'
            min={0}
            value={metrics.run.lthr || ''}
            onChange={(e) =>
              updateMetric(
                'run',
                'lthr',
                e.target.value ? Number(e.target.value) : undefined,
              )
            }
          />
        </label>
        <label>
          FTP (watts)
          <input
            type='number'
            min={0}
            value={metrics.run.ftp || ''}
            onChange={(e) =>
              updateMetric(
                'run',
                'ftp',
                e.target.value ? Number(e.target.value) : undefined,
              )
            }
          />
        </label>
      </fieldset>

      <button type='submit' disabled={submitting}>
        {submitting ? 'Saving...' : 'Save Metrics'}
      </button>

      {success && <p className='success-text'>Metrics saved!</p>}
    </form>
  );
}
