import { useEffect, useState } from 'react';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './useAuth';
import type {
  AdaptationCompletionInput,
  PlannedWorkout,
  Sport,
} from '../types';

const SPORT_MAP: Record<string, Sport> = {
  Swim: 'Swim',
  Bike: 'Bike',
  Run: 'Run',
  Lift: 'Strength',
  Other: 'Strength',
};

export function usePlannedWorkouts(startDate: string, endDate: string) {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<PlannedWorkout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setWorkouts([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'users', user.uid, 'plannedWorkouts'),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'asc'),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as PlannedWorkout[];
      setWorkouts(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [user, startDate, endDate]);

  const addPlannedWorkout = async (workout: Omit<PlannedWorkout, 'id'>) => {
    if (!user) return;
    await addDoc(collection(db, 'users', user.uid, 'plannedWorkouts'), {
      date: workout.date,
      sport: workout.sport,
      title: workout.title,
      notes: workout.notes,
      easyMinutes: workout.easyMinutes,
      hardMinutes: workout.hardMinutes,
    });
  };

  const updatePlannedWorkout = async (
    id: string,
    updates: Partial<Omit<PlannedWorkout, 'id'>>,
  ) => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'plannedWorkouts', id);
    await updateDoc(ref, updates);
  };

  const deletePlannedWorkout = async (id: string) => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'plannedWorkouts', id);
    await deleteDoc(ref);
  };

  const copyPlannedWorkout = async (workout: PlannedWorkout) => {
    if (!user) return;
    await addDoc(collection(db, 'users', user.uid, 'plannedWorkouts'), {
      date: workout.date,
      sport: workout.sport,
      title: workout.title,
      notes: workout.notes,
      easyMinutes: workout.easyMinutes,
      hardMinutes: workout.hardMinutes,
    });
  };

  const completePlannedWorkout = async (
    workout: PlannedWorkout,
    distance: number,
    adaptation?: AdaptationCompletionInput,
  ) => {
    if (!user) return;
    // Mark planned workout as completed
    const ref = doc(db, 'users', user.uid, 'plannedWorkouts', workout.id);
    await updateDoc(ref, { completed: true });

    // Log to the workouts collection for volume tracking
    const duration = workout.easyMinutes + workout.hardMinutes;
    const total = duration || 1;
    const intensity = Math.round(
      (workout.easyMinutes * 3 + workout.hardMinutes * 8) / total,
    );
    const sport = SPORT_MAP[workout.sport] || 'Strength';
    await addDoc(collection(db, 'users', user.uid, 'workouts'), {
      date: Timestamp.fromDate(new Date(workout.date + 'T12:00:00')),
      sport,
      duration,
      distance,
      intensity,
      load: duration * intensity,
    });

    if (adaptation) {
      let work = 0;
      if (adaptation.discipline === 'Bike') {
        work = adaptation.avgPower ?? 0;
      } else if (adaptation.discipline === 'Run') {
        const paceDecimal =
          (adaptation.paceMin ?? 0) + (adaptation.paceSec ?? 0) / 60;
        work = paceDecimal > 0 ? (1 / paceDecimal) * 1000 : 0;
      } else {
        work = adaptation.swimSpeed ?? 0;
      }
      const ef =
        adaptation.avgHr > 0 ? +(work / adaptation.avgHr).toFixed(4) : 0;
      await addDoc(collection(db, 'users', user.uid, 'adaptations'), {
        date: Timestamp.fromDate(new Date(workout.date + 'T12:00:00')),
        discipline: adaptation.discipline,
        type: adaptation.type,
        ef,
        decoupling: adaptation.drift,
      });
    }
  };

  return {
    workouts,
    loading,
    addPlannedWorkout,
    updatePlannedWorkout,
    deletePlannedWorkout,
    copyPlannedWorkout,
    completePlannedWorkout,
  };
}
