import { useEffect, useState } from 'react';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './useAuth';
import type { RaceEntry, RaceType } from '../types';

export function useRaces() {
  const { user } = useAuth();
  const [races, setRaces] = useState<RaceEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRaces([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'users', user.uid, 'races'),
      orderBy('date', 'asc'),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as RaceEntry[];
      setRaces(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const addRace = async (race: {
    name: string;
    date: string;
    raceType: RaceType;
    distance: string;
    registered: boolean;
    link?: string;
  }) => {
    if (!user) return;
    await addDoc(collection(db, 'users', user.uid, 'races'), {
      name: race.name,
      date: race.date,
      raceType: race.raceType,
      distance: race.distance,
      registered: race.registered,
      link: race.link || '',
      completed: false,
    });
  };

  const updateRace = async (id: string, partial: Partial<RaceEntry>) => {
    if (!user) return;
    const clean = Object.fromEntries(
      Object.entries(partial).filter(([, v]) => v !== undefined),
    );
    await updateDoc(doc(db, 'users', user.uid, 'races', id), clean);
  };

  const deleteRace = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'races', id));
  };

  return { races, loading, addRace, updateRace, deleteRace };
}
