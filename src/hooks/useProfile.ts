import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./useAuth";

export interface UserProfile {
  raceName?: string;
  raceDate?: string; // ISO date string (YYYY-MM-DD)
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const ref = doc(db, "users", user.uid, "settings", "profile");
    const unsubscribe = onSnapshot(ref, (snap) => {
      setProfile(snap.exists() ? (snap.data() as UserProfile) : {});
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const setNextRace = async (raceName: string, raceDate: string) => {
    if (!user) return;
    const ref = doc(db, "users", user.uid, "settings", "profile");
    await setDoc(ref, { raceName, raceDate }, { merge: true });
  };

  const clearRace = async () => {
    if (!user) return;
    const ref = doc(db, "users", user.uid, "settings", "profile");
    await setDoc(ref, { raceName: null, raceDate: null }, { merge: true });
  };

  return { profile, loading, setNextRace, clearRace };
}
