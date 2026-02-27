import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { CalendarSport } from '../types';

export type LibraryWorkout = {
  id: string;
  sport: CalendarSport;
  title: string;
  notes: string;
  easyMinutes: number;
  hardMinutes: number;
};

export function useUserWorkoutLibrary(userId?: string) {
  const [library, setLibrary] = useState<LibraryWorkout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLibrary([]);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'users', userId, 'referenceWorkouts'),
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<LibraryWorkout, 'id'>),
        }));
        setLibrary(data);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [userId]);

  return { library, loading };
}
