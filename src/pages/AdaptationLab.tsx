import { useAdaptation } from "../hooks/useAdaptation";
import AdaptationForm from "../components/AdaptationForm";
import WeeklyReport from "../components/WeeklyReport";
import StatusTable from "../components/StatusTable";
import TrendCharts from "../components/TrendCharts";

export default function AdaptationLab() {
  const { sessions, loading } = useAdaptation();

  if (loading) {
    return <p>Loading sessions...</p>;
  }

  return (
    <div className="dashboard">
      <h1>Adaptation Lab</h1>

      <AdaptationForm />

      {sessions.length > 0 && (
        <>
          <WeeklyReport sessions={sessions} />
          <StatusTable sessions={sessions} />
          <TrendCharts sessions={sessions} />
        </>
      )}

      {sessions.length === 0 && (
        <p className="muted">No adaptation sessions logged yet. Use the form above to get started!</p>
      )}
    </div>
  );
}
