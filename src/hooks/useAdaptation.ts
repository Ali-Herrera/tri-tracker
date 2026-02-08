import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./useAuth";
import type { AdaptationSession, Discipline } from "../types";

export function useAdaptation() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<AdaptationSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSessions([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "users", user.uid, "adaptations"),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as AdaptationSession[];
      setSessions(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const addSession = async (session: {
    date: Date;
    discipline: Discipline;
    type: string;
    ef: number;
    decoupling: number;
  }) => {
    if (!user) return;
    await addDoc(collection(db, "users", user.uid, "adaptations"), {
      date: Timestamp.fromDate(session.date),
      discipline: session.discipline,
      type: session.type,
      ef: session.ef,
      decoupling: session.decoupling,
    });
  };

  const deleteSession = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, "users", user.uid, "adaptations", id));
  };

  return { sessions, loading, addSession, deleteSession };
}
