import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './useAuth';
import type { PlannedWorkout } from '../types';

export function usePlannedWorkoutActions() {
  const { user } = useAuth();

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

  return { addPlannedWorkout };
}
