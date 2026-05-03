import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format } from 'date-fns';

type Discipline = 'Swim' | 'Bike' | 'Run';

type LoadFilter = 'Combined' | Discipline;
const LOAD_FILTERS: LoadFilter[] = ['Combined', 'Swim', 'Bike', 'Run'];

interface LoadPoint {
  date: string;
  atl: number;
  ctl: number;
  tsb: number;
}

interface Props {
  loadData?: Array<{
    date: string;
    combined: { atl: number; ctl: number; tsb: number };
    swim: { atl: number; ctl: number; tsb: number };
    bike: { atl: number; ctl: number; tsb: number };
    run: { atl: number; ctl: number; tsb: number };
  }>;
}

function getTSBFeedback(tsb: number) {
  if (tsb > 25) {
    return {
      label: 'Extensively recovered, losing fitness',
      message:
        'Your TSB is above +25. You are very fresh and this is a sign that training load has been low for too long. Add structured workload carefully to maintain fitness.',
    };
  }

  if (tsb >= 15) {
    return {
      label: 'Recovering and losing training stimulus',
      message:
        'Your TSB is in the +15 to +25 peak recovery range. You are highly recovered and may be losing fitness if load remains low.',
    };
  }

  if (tsb >= 0) {
    return {
      label: 'Training equilibrium',
      message:
        'TSB around 0 indicates you are in balance between fatigue and fitness. This is a stable zone, but not necessarily optimal for building.',
    };
  }

  if (tsb >= -10) {
    return {
      label: 'Light productive training',
      message:
        'TSB between -10 and 0 is a gentle training zone. You are gaining fitness with low to moderate fatigue.',
    };
  }

  if (tsb >= -30) {
    return {
      label: 'Ideal training zone',
      message:
        'TSB between -10 and -30 is the ideal training range. You are building fitness with appropriate fatigue and recovery.',
    };
  }

  return {
    label: 'Extreme strain',
    message:
      'TSB below -30 means you are under very high fatigue or recently completed a big effort. Consecutive recovery days are likely needed before future performance can improve.',
  };
}

export default function TrendCharts({ loadData }: Props) {
  const [loadFilter, setLoadFilter] = useState<LoadFilter>('Combined');

  const loadChartData = useMemo(() => {
    if (!loadData) return [] as LoadPoint[];
    const key = loadFilter.toLowerCase() as
      | 'combined'
      | 'swim'
      | 'bike'
      | 'run';

    return [...loadData]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((d) => ({
        date: format(new Date(d.date), 'MMM d'),
        atl: d[key].atl,
        ctl: d[key].ctl,
        tsb: d[key].tsb,
      }));
  }, [loadData, loadFilter]);

  const latestPoint = loadChartData[loadChartData.length - 1];
  const feedback = latestPoint ? getTSBFeedback(latestPoint.tsb) : null;

  if (!loadData || loadData.length === 0) return null;

  return (
    <section>
      <h2>Adaptation Charts</h2>

      <div className='info-box'>
        <p>
          <strong>ATL</strong> is your acute training load (typically 7-day
          average). <strong>CTL</strong> is your chronic training load
          (typically 42-day average). <strong>TSB</strong> is freshness: CTL
          minus ATL.
        </p>
        <ul>
          <li>
            +15 to +25: peak recovery, but too much time off can lead to fitness
            loss.
          </li>
          <li>0: training equilibrium, balanced fatigue and fitness.</li>
          <li>-10 to -30: ideal training zone for building fitness.</li>
          <li>Below -30: extreme strain and recovery is required.</li>
        </ul>
      </div>

      <div className='filter-row'>
        {LOAD_FILTERS.map((f) => (
          <button
            key={f}
            className={`filter-btn ${loadFilter === f ? 'active' : ''}`}
            onClick={() => setLoadFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {feedback && (
        <div className='metric-card feedback-card'>
          <span className='metric-label'>Latest {loadFilter} TSB</span>
          <span className='metric-value'>{latestPoint.tsb.toFixed(1)}</span>
          <strong>{feedback.label}</strong>
          <p>{feedback.message}</p>
        </div>
      )}

      <h3>{loadFilter} Training Load (ATL / CTL / TSB)</h3>
      <ResponsiveContainer width='100%' height={320}>
        <LineChart data={loadChartData}>
          <XAxis dataKey='date' tick={{ fill: '#aaa', fontSize: 12 }} />
          <YAxis tick={{ fill: '#aaa', fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              background: '#1e1e2e',
              border: '1px solid #333',
            }}
          />
          <Legend />
          <Line
            type='monotone'
            dataKey='ctl'
            stroke='#636EFA'
            strokeWidth={2}
            dot={{ r: 3 }}
            name='CTL'
          />
          <Line
            type='monotone'
            dataKey='atl'
            stroke='#00CC96'
            strokeWidth={2}
            dot={{ r: 3 }}
            name='ATL'
          />
          <Line
            type='monotone'
            dataKey='tsb'
            stroke='#EF553B'
            strokeWidth={2}
            dot={{ r: 3 }}
            name='TSB'
          />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}
