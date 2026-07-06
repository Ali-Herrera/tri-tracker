import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import type { RaceEntry } from '../types';

export function useUserRaces(userId?: string) {
  const [races, setRaces] = useState<RaceEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setRaces([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'users', userId, 'races'),
      orderBy('date', 'asc'),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as RaceEntry[];
      setRaces(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [userId]);

  return { races, loading };
}
