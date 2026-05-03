import { useEffect, useState } from 'react';
import { useWorkouts } from './useWorkouts';
import { useAdaptation } from './useAdaptation';
import { useProfile } from './useProfile';
import { calculateTSS } from '../utils/tss';
import type { Discipline } from '../types';

interface TrainingLoadData {
  date: string;
  combined: { atl: number; ctl: number; tsb: number };
  swim: { atl: number; ctl: number; tsb: number };
  bike: { atl: number; ctl: number; tsb: number };
  run: { atl: number; ctl: number; tsb: number };
}

export function useTrainingLoad() {
  const { workouts, loading: workoutsLoading } = useWorkouts();
  const { sessions, loading: sessionsLoading } = useAdaptation();
  const { profile } = useProfile();
  const [data, setData] = useState<TrainingLoadData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (workoutsLoading || sessionsLoading) {
      setLoading(true);
      return;
    }

    if (!profile?.athleteMetrics) {
      setLoading(false);
      setData([]);
      return;
    }

    const athleteMetrics = profile.athleteMetrics;
    const now = new Date();
    const startDate = new Date(now.getTime() - 42 * 24 * 60 * 60 * 1000);

    // Filter workouts and sessions in date range
    const recentWorkouts = workouts.filter((w) => w.date.toDate() >= startDate);
    const recentSessions = sessions.filter((s) => s.date.toDate() >= startDate);

    // Calculate TSS for workouts
    const workoutTSS = recentWorkouts
      .filter((w) => w.sport !== 'Strength') // Exclude Strength
      .map((w) => ({
        date: w.date.toDate().toDateString(),
        sport: w.sport as Discipline,
        tss:
          calculateTSS(
            w.duration,
            w.avgHR,
            w.avgPower,
            w.sport as 'Swim' | 'Bike' | 'Run',
            athleteMetrics,
          ) || 0,
      }));

    // For sessions, assume 60 min duration for TSS calculation
    const sessionTSS = recentSessions.map((s) => ({
      date: s.date.toDate().toDateString(),
      sport: s.discipline,
      tss:
        calculateTSS(
          60,
          s.ef *
            (s.discipline === 'Swim'
              ? 180
              : s.discipline === 'Bike'
                ? 180
                : 180),
          undefined,
          s.discipline,
          athleteMetrics,
        ) || 0, // Rough estimate
    }));

    const allTSS = [...workoutTSS, ...sessionTSS];

    // Group by date and sport, sum TSS
    const tssByDateAndSport: Record<string, Record<Discipline, number>> = {};
    allTSS.forEach(({ date, sport, tss }) => {
      if (!tssByDateAndSport[date])
        tssByDateAndSport[date] = { Swim: 0, Bike: 0, Run: 0 };
      tssByDateAndSport[date][sport] += tss;
    });

    // Get all dates, sort
    const dates = Object.keys(tssByDateAndSport).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime(),
    );

    // Compute rolling metrics
    const result: TrainingLoadData[] = dates.map((date) => {
      const dateIndex = dates.indexOf(date);
      const combinedTSS: number[] = [];
      const swimTSS: number[] = [];
      const bikeTSS: number[] = [];
      const runTSS: number[] = [];

      // Collect TSS for rolling periods
      for (let i = Math.max(0, dateIndex - 41); i <= dateIndex; i++) {
        const d = dates[i];
        const dayTSS = tssByDateAndSport[d];
        combinedTSS.push(dayTSS.Swim + dayTSS.Bike + dayTSS.Run);
        swimTSS.push(dayTSS.Swim);
        bikeTSS.push(dayTSS.Bike);
        runTSS.push(dayTSS.Run);
      }

      // ATL: last 7 days avg
      const atlCombined = combinedTSS.slice(-7).reduce((a, b) => a + b, 0) / 7;
      const atlSwim = swimTSS.slice(-7).reduce((a, b) => a + b, 0) / 7;
      const atlBike = bikeTSS.slice(-7).reduce((a, b) => a + b, 0) / 7;
      const atlRun = runTSS.slice(-7).reduce((a, b) => a + b, 0) / 7;

      // CTL: last 42 days avg
      const ctlCombined =
        combinedTSS.reduce((a, b) => a + b, 0) / combinedTSS.length;
      const ctlSwim = swimTSS.reduce((a, b) => a + b, 0) / swimTSS.length;
      const ctlBike = bikeTSS.reduce((a, b) => a + b, 0) / bikeTSS.length;
      const ctlRun = runTSS.reduce((a, b) => a + b, 0) / runTSS.length;

      // TSB: CTL - ATL
      const tsbCombined = ctlCombined - atlCombined;
      const tsbSwim = ctlSwim - atlSwim;
      const tsbBike = ctlBike - atlBike;
      const tsbRun = ctlRun - atlRun;

      return {
        date,
        combined: { atl: atlCombined, ctl: ctlCombined, tsb: tsbCombined },
        swim: { atl: atlSwim, ctl: ctlSwim, tsb: tsbSwim },
        bike: { atl: atlBike, ctl: ctlBike, tsb: tsbBike },
        run: { atl: atlRun, ctl: ctlRun, tsb: tsbRun },
      };
    });

    setData(result);
    setLoading(false);
  }, [workouts, sessions, workoutsLoading, sessionsLoading, profile]);

  return { data, loading };
}
