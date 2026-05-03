import { useAdaptation } from '../hooks/useAdaptation';
import WeeklyReport from '../components/WeeklyReport';
import StatusTable from '../components/StatusTable';
import TrendCharts from '../components/TrendCharts';
import { useProfile } from '../hooks/useProfile';
import AthleteMetricsForm from '../components/AthleteMetricsForm';
import { useTrainingLoad } from '../hooks/useTrainingLoad';

export default function AdaptationLab() {
  const { sessions, loading: sessionsLoading, deleteSession } = useAdaptation();
  const { profile } = useProfile();
  const { data, loading: loadLoading } = useTrainingLoad();

  if (sessionsLoading || loadLoading) {
    return <p>Loading...</p>;
  }

  if (!profile?.athleteMetrics) {
    return (
      <div className='dashboard'>
        <h1>Adaptation Lab</h1>
        <p>Please set your athlete metrics to calculate ATL/CTL/TSB.</p>
        <AthleteMetricsForm />
      </div>
    );
  }

  return (
    <div className='dashboard'>
      <h1>Adaptation Lab</h1>

      {data.length > 0 && (
        <div>
          <h2>Training Load Trends</h2>
          {data.slice(-7).map((d) => (
            <div key={d.date}>
              <strong>{d.date}</strong>: ATL {d.combined.atl.toFixed(1)}, CTL{' '}
              {d.combined.ctl.toFixed(1)}, TSB {d.combined.tsb.toFixed(1)}
            </div>
          ))}
        </div>
      )}

      {sessions.length > 0 && (
        <>
          <WeeklyReport sessions={sessions} />
          <StatusTable sessions={sessions} onDelete={deleteSession} />
          <TrendCharts sessions={sessions} />
        </>
      )}

      {sessions.length === 0 && data.length === 0 && (
        <p className='muted'>No training data yet.</p>
      )}
    </div>
  );
}
