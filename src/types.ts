import { Timestamp } from 'firebase/firestore';

export type Sport = 'Swim' | 'Bike' | 'Run' | 'Strength';
export type Discipline = 'Swim' | 'Bike' | 'Run';

export interface Workout {
  id: string;
  date: Timestamp;
  sport: Sport;
  duration: number;
  distance: number;
  intensity: number;
  load: number;
}

export interface AdaptationSession {
  id: string;
  date: Timestamp;
  discipline: Discipline;
  type: string;
  ef: number;
  decoupling: number;
}

export interface AdaptationCompletionInput {
  discipline: Discipline;
  type: string;
  avgHr: number;
  drift: number;
  avgPower?: number;
  paceMin?: number;
  paceSec?: number;
  swimSpeed?: number;
}

export interface Race {
  name: string;
  date: Date;
}

export type TimeFrame =
  | 'All Time'
  | 'Year to Date'
  | 'Last 90 Days'
  | 'Last 30 Days';

export type CalendarSport = 'Swim' | 'Bike' | 'Run' | 'Lift' | 'Other';

export interface PlannedWorkout {
  id: string;
  date: string; // YYYY-MM-DD
  sport: CalendarSport;
  title: string;
  notes: string;
  easyMinutes: number;
  hardMinutes: number;
  order?: number;
  completed?: boolean;
  workoutDocId?: string;
  adaptationDocId?: string;
  completedDistance?: number;
  completedDuration?: number;
  completedIntensity?: number;
  completedAdaptation?: AdaptationCompletionInput;
}

export interface PublicProfile {
  uid: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  goals?: string;
  updatedAt?: Timestamp;
}
