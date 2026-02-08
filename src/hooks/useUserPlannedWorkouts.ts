import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { PlannedWorkout } from '../types';

export function useUserPlannedWorkouts(
  userId?: string,
  startDate?: string,
  endDate?: string,
) {
  const [workouts, setWorkouts] = useState<PlannedWorkout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !startDate || !endDate) {
      setWorkouts([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'users', userId, 'plannedWorkouts'),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'asc'),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as PlannedWorkout[];
      setWorkouts(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [userId, startDate, endDate]);

  return { workouts, loading };
}
