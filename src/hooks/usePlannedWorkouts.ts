import { useEffect, useState } from 'react';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch,
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

  const buildPlannedPayload = (workout: Omit<PlannedWorkout, 'id'>) => {
    const payload: Omit<PlannedWorkout, 'id'> = {
      date: workout.date,
      sport: workout.sport,
      title: workout.title,
      notes: workout.notes,
      easyMinutes: workout.easyMinutes,
      hardMinutes: workout.hardMinutes,
      order: workout.order,
      completed: workout.completed,
      workoutDocId: workout.workoutDocId,
      adaptationDocId: workout.adaptationDocId,
      completedDistance: workout.completedDistance,
      completedDuration: workout.completedDuration,
      completedIntensity: workout.completedIntensity,
      completedAdaptation: workout.completedAdaptation,
    };

    Object.keys(payload).forEach((key) => {
      if (payload[key as keyof typeof payload] === undefined) {
        delete payload[key as keyof typeof payload];
      }
    });

    return payload;
  };

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
    await addDoc(
      collection(db, 'users', user.uid, 'plannedWorkouts'),
      buildPlannedPayload(workout),
    );
    // Auto-save to workout library if no entry with this title exists yet
    if (workout.title.trim()) {
      const libraryRef = collection(db, 'users', user.uid, 'referenceWorkouts');
      const existing = await getDocs(
        query(libraryRef, where('title', '==', workout.title.trim())),
      );
      if (existing.empty) {
        await addDoc(libraryRef, {
          sport: workout.sport,
          title: workout.title.trim(),
          notes: workout.notes,
          easyMinutes: workout.easyMinutes,
          hardMinutes: workout.hardMinutes,
          createdAt: serverTimestamp(),
        });
      }
    }
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
    const { id, ...copy } = workout;
    await addDoc(
      collection(db, 'users', user.uid, 'plannedWorkouts'),
      buildPlannedPayload(copy),
    );
  };

  const updatePlannedWorkouts = async (
    updates: Array<{
      id: string;
      updates: Partial<Omit<PlannedWorkout, 'id'>>;
    }>,
  ) => {
    if (!user || updates.length === 0) return;
    const batch = writeBatch(db);
    for (const { id, updates: patch } of updates) {
      const ref = doc(db, 'users', user.uid, 'plannedWorkouts', id);
      batch.update(ref, patch);
    }
    await batch.commit();
  };

  const buildWorkoutData = (
    workout: PlannedWorkout,
    distance: number,
    intensity: number,
  ) => {
    const sport = SPORT_MAP[workout.sport] || 'Strength';
    const duration = workout.easyMinutes + workout.hardMinutes;
    return {
      date: Timestamp.fromDate(new Date(workout.date + 'T12:00:00')),
      sport,
      duration,
      distance,
      intensity,
      load: duration * intensity,
    };
  };

  const buildAdaptationData = (
    workout: PlannedWorkout,
    adaptation: AdaptationCompletionInput,
  ) => {
    let work = 0;
    if (adaptation.discipline === 'Bike') {
      work = adaptation.avgPower ?? 0;
    } else if (adaptation.discipline === 'Run') {
      const paceDecimal =
        (adaptation.paceMin ?? 0) + (adaptation.paceSec ?? 0) / 60;
      work = paceDecimal > 0 ? (1 / paceDecimal) * 1000 : 0;
    } else {
      const swimPace =
        (adaptation.swimPaceMin ?? 0) + (adaptation.swimPaceSec ?? 0) / 60;
      work = swimPace > 0 ? (1 / swimPace) * 1000 : 0;
    }
    const ef = adaptation.avgHr > 0 ? +(work / adaptation.avgHr).toFixed(4) : 0;
    return {
      date: Timestamp.fromDate(new Date(workout.date + 'T12:00:00')),
      discipline: adaptation.discipline,
      type: adaptation.type,
      ef,
      decoupling: adaptation.drift,
    };
  };

  const cleanAdaptation = (
    adaptation: AdaptationCompletionInput,
  ): Record<string, unknown> => {
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(adaptation)) {
      if (value !== undefined) clean[key] = value;
    }
    return clean;
  };

  const completePlannedWorkout = async (
    workout: PlannedWorkout,
    distance: number,
    intensity: number,
    adaptation?: AdaptationCompletionInput,
  ) => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'plannedWorkouts', workout.id);

    const workoutDoc = await addDoc(
      collection(db, 'users', user.uid, 'workouts'),
      buildWorkoutData(workout, distance, intensity),
    );

    let adaptationDocId: string | undefined;
    if (adaptation) {
      const adaptationDoc = await addDoc(
        collection(db, 'users', user.uid, 'adaptations'),
        buildAdaptationData(workout, adaptation),
      );
      adaptationDocId = adaptationDoc.id;
    }

    await updateDoc(ref, {
      completed: true,
      workoutDocId: workoutDoc.id,
      adaptationDocId: adaptationDocId ?? null,
      completedDistance: distance,
      completedIntensity: intensity,
      completedAdaptation: adaptation ? cleanAdaptation(adaptation) : null,
    });
  };

  const updateCompletedWorkout = async (
    workout: PlannedWorkout,
    distance: number,
    intensity: number,
    adaptation?: AdaptationCompletionInput,
  ) => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'plannedWorkouts', workout.id);

    if (workout.workoutDocId) {
      const workoutRef = doc(
        db,
        'users',
        user.uid,
        'workouts',
        workout.workoutDocId,
      );
      await updateDoc(workoutRef, buildWorkoutData(workout, distance, intensity));
    }

    if (adaptation) {
      if (workout.adaptationDocId) {
        const adaptationRef = doc(
          db,
          'users',
          user.uid,
          'adaptations',
          workout.adaptationDocId,
        );
        await updateDoc(
          adaptationRef,
          buildAdaptationData(workout, adaptation),
        );
      } else {
        const adaptationDoc = await addDoc(
          collection(db, 'users', user.uid, 'adaptations'),
          buildAdaptationData(workout, adaptation),
        );
        await updateDoc(ref, { adaptationDocId: adaptationDoc.id });
      }
    } else if (workout.adaptationDocId) {
      await deleteDoc(
        doc(db, 'users', user.uid, 'adaptations', workout.adaptationDocId),
      );
      await updateDoc(ref, { adaptationDocId: null });
    }

    await updateDoc(ref, {
      completedDistance: distance,
      completedIntensity: intensity,
      completedAdaptation: adaptation ? cleanAdaptation(adaptation) : null,
    });
  };

  const updateLibraryWorkout = async (workout: {
    sport: string;
    title: string;
    notes: string;
    easyMinutes: number;
    hardMinutes: number;
  }) => {
    if (!user || !workout.title.trim()) return;
    const libraryRef = collection(db, 'users', user.uid, 'referenceWorkouts');
    const existing = await getDocs(
      query(libraryRef, where('title', '==', workout.title.trim())),
    );
    if (!existing.empty) {
      await updateDoc(existing.docs[0].ref, {
        sport: workout.sport,
        notes: workout.notes,
        easyMinutes: workout.easyMinutes,
        hardMinutes: workout.hardMinutes,
      });
    } else {
      await addDoc(libraryRef, {
        sport: workout.sport,
        title: workout.title.trim(),
        notes: workout.notes,
        easyMinutes: workout.easyMinutes,
        hardMinutes: workout.hardMinutes,
        createdAt: serverTimestamp(),
      });
    }
  };

  return {
    workouts,
    loading,
    addPlannedWorkout,
    updatePlannedWorkout,
    updatePlannedWorkouts,
    deletePlannedWorkout,
    copyPlannedWorkout,
    completePlannedWorkout,
    updateCompletedWorkout,
    updateLibraryWorkout,
  };
}
