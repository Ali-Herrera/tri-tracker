import { useEffect, useState } from 'react';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  writeBatch,
  doc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './useAuth';
import type { Workout, Sport } from '../types';

export function useWorkouts() {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setWorkouts([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'users', user.uid, 'workouts'),
      orderBy('date', 'desc'),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Workout[];
      setWorkouts(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const addWorkout = async (workout: {
    date: Date;
    sport: Sport;
    duration: number;
    distance: number;
    intensity: number;
  }) => {
    if (!user) return;
    const load = workout.duration * workout.intensity;
    await addDoc(collection(db, 'users', user.uid, 'workouts'), {
      date: Timestamp.fromDate(workout.date),
      sport: workout.sport,
      duration: workout.duration,
      distance: workout.distance,
      intensity: workout.intensity,
      load,
    });
  };

  const addWorkoutsBatch = async (
    workoutsToAdd: Array<{
      date: Date;
      sport: Sport;
      duration: number;
      distance: number;
      intensity?: number;
    }>,
  ) => {
    if (!user || workoutsToAdd.length === 0) return;
    const ref = collection(db, 'users', user.uid, 'workouts');
    const chunkSize = 450;

    for (let i = 0; i < workoutsToAdd.length; i += chunkSize) {
      const batch = writeBatch(db);
      const chunk = workoutsToAdd.slice(i, i + chunkSize);

      for (const workout of chunk) {
        const intensity = workout.intensity ?? 5;
        const load = workout.duration * intensity;
        const docRef = doc(ref);
        batch.set(docRef, {
          date: Timestamp.fromDate(workout.date),
          sport: workout.sport,
          duration: workout.duration,
          distance: workout.distance,
          intensity,
          load,
        });
      }

      await batch.commit();
    }
  };

  return { workouts, loading, addWorkout, addWorkoutsBatch };
}
