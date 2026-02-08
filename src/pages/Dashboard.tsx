import { useMemo, useState } from "react";
import { subDays } from "date-fns";
import { useWorkouts } from "../hooks/useWorkouts";
import type { TimeFrame } from "../types";
import WorkoutForm from "../components/WorkoutForm";
import RaceCountdown from "../components/RaceCountdown";
import CoachAnalysis from "../components/CoachAnalysis";
import SeasonTotals from "../components/SeasonTotals";
import WeeklyVolumeChart from "../components/WeeklyVolumeChart";
import DisciplineBreakdown from "../components/DisciplineBreakdown";
import ActivityLog from "../components/ActivityLog";
import LifetimeTotals from "../components/LifetimeTotals";

const TIME_FRAMES: TimeFrame[] = ["All Time", "Year to Date", "Last 90 Days", "Last 30 Days"];

export default function Dashboard() {
  const { workouts, loading } = useWorkouts();
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("All Time");

  const filtered = useMemo(() => {
    const now = new Date();
    return workouts.filter((w) => {
      const d = w.date.toDate();
      switch (timeFrame) {
        case "Year to Date":
          return d.getFullYear() === now.getFullYear();
        case "Last 90 Days":
          return d >= subDays(now, 90);
        case "Last 30 Days":
          return d >= subDays(now, 30);
        default:
          return true;
      }
    });
  }, [workouts, timeFrame]);

  if (loading) {
    return <p>Loading workouts...</p>;
  }

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>My Training Dashboard</h1>
        <select
          value={timeFrame}
          onChange={(e) => setTimeFrame(e.target.value as TimeFrame)}
          className="time-frame-select"
        >
          {TIME_FRAMES.map((tf) => (
            <option key={tf} value={tf}>{tf}</option>
          ))}
        </select>
      </div>

      <RaceCountdown />

      <WorkoutForm />

      <CoachAnalysis workouts={filtered} />

      <SeasonTotals workouts={workouts} />

      <WeeklyVolumeChart workouts={filtered} timeFrame={timeFrame} />

      <DisciplineBreakdown workouts={filtered} timeFrame={timeFrame} />

      <ActivityLog workouts={filtered} timeFrame={timeFrame} />

      <LifetimeTotals workouts={workouts} />
    </div>
  );
}
