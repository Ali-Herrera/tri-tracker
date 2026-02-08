import { format } from 'date-fns';
import type { Workout } from '../types';

interface Props {
  workouts: Workout[];
  timeFrame?: string;
}

export default function LifetimeTotals({ workouts, timeFrame }: Props) {
  if (workouts.length === 0) return null;

  const totalHours = workouts.reduce((s, w) => s + w.duration, 0) / 60;
  const swimYds = workouts
    .filter((w) => w.sport === 'Swim')
    .reduce((s, w) => s + w.distance, 0);
  const bikeMi = workouts
    .filter((w) => w.sport === 'Bike')
    .reduce((s, w) => s + w.distance, 0);
  const runMi = workouts
    .filter((w) => w.sport === 'Run')
    .reduce((s, w) => s + w.distance, 0);

  const oldest = workouts.reduce((min, w) => {
    const d = w.date.toDate();
    return d < min ? d : min;
  }, workouts[0].date.toDate());

  const byYear = workouts.reduce(
    (acc, w) => {
      const year = w.date.toDate().getFullYear();
      if (!acc[year]) {
        acc[year] = { Swim: 0, Bike: 0, Run: 0 };
      }
      if (w.sport === 'Swim') acc[year].Swim += w.distance;
      if (w.sport === 'Bike') acc[year].Bike += w.distance;
      if (w.sport === 'Run') acc[year].Run += w.distance;
      return acc;
    },
    {} as Record<number, { Swim: number; Bike: number; Run: number }>,
  );

  const yearlyRows = Object.entries(byYear)
    .map(([year, totals]) => ({
      year: Number(year),
      swim: totals.Swim,
      bike: totals.Bike,
      run: totals.Run,
    }))
    .sort((a, b) => b.year - a.year);

  return (
    <section>
      <h2>Lifetime Totals</h2>
      <p className='muted'>Since {format(oldest, 'MMMM d, yyyy')}</p>
      <div className='metrics-row'>
        <div className='metric-card'>
          <span className='metric-label'>Total Hours</span>
          <span className='metric-value'>{totalHours.toFixed(1)}</span>
        </div>
        <div className='metric-card'>
          <span className='metric-label'>Total Swim</span>
          <span className='metric-value'>{Math.round(swimYds)} yds</span>
        </div>
        <div className='metric-card'>
          <span className='metric-label'>Total Bike</span>
          <span className='metric-value'>{Math.round(bikeMi)} mi</span>
        </div>
        <div className='metric-card'>
          <span className='metric-label'>Total Run</span>
          <span className='metric-value'>{Math.round(runMi)} mi</span>
        </div>
      </div>
      {timeFrame === 'All Time' && yearlyRows.length > 0 && (
        <>
          <h3>Yearly Totals</h3>
          <div className='table-wrapper'>
            <table>
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Swim (yds)</th>
                  <th>Bike (mi)</th>
                  <th>Run (mi)</th>
                </tr>
              </thead>
              <tbody>
                {yearlyRows.map((row) => (
                  <tr key={row.year}>
                    <td>{row.year}</td>
                    <td>{Math.round(row.swim)}</td>
                    <td>{row.bike.toFixed(1)}</td>
                    <td>{row.run.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
