import { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './useAuth';
import type { PublicProfile } from '../types';

export function usePublicProfile(uid?: string) {
  const { user } = useAuth();
  const targetUid = uid ?? user?.uid ?? null;
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const canEdit = useMemo(() => {
    return !!user && targetUid === user.uid;
  }, [targetUid, user]);

  useEffect(() => {
    if (!targetUid) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const ref = doc(db, 'users', targetUid, 'public', 'profile');
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        setProfile({ uid: targetUid });
        setLoading(false);
        return;
      }
      setProfile({
        uid: targetUid,
        ...(snap.data() as Omit<PublicProfile, 'uid'>),
      });
      setLoading(false);
    });

    return unsubscribe;
  }, [targetUid]);

  useEffect(() => {
    if (!canEdit || !user?.email || !targetUid) return;
    const ref = doc(db, 'users', targetUid, 'public', 'profile');
    const normalizedEmail = user.email.trim().toLowerCase();
    setDoc(
      ref,
      { email: normalizedEmail, updatedAt: serverTimestamp() },
      { merge: true },
    );
  }, [canEdit, targetUid, user]);

  const updateProfile = async (updates: Partial<PublicProfile>) => {
    if (!canEdit || !targetUid) return;
    const ref = doc(db, 'users', targetUid, 'public', 'profile');
    await setDoc(
      ref,
      {
        ...updates,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  };

  return { profile, loading, updateProfile, canEdit };
}
