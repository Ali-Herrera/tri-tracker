import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { PublicProfile } from '../types';

export function usePublicProfiles(uids: string[]) {
  const [profiles, setProfiles] = useState<Record<string, PublicProfile>>({});
  const [loading, setLoading] = useState(true);

  const uniqueUids = useMemo(() => {
    return Array.from(new Set(uids)).filter(Boolean);
  }, [uids]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (uniqueUids.length === 0) {
        setProfiles({});
        setLoading(false);
        return;
      }
      setLoading(true);
      const results = await Promise.all(
        uniqueUids.map(async (uid) => {
          const ref = doc(db, 'users', uid, 'public', 'profile');
          const snap = await getDoc(ref);
          if (!snap.exists()) {
            return [uid, { uid }] as const;
          }
          return [
            uid,
            { uid, ...(snap.data() as Omit<PublicProfile, 'uid'>) },
          ] as const;
        }),
      );

      if (!active) return;
      const map: Record<string, PublicProfile> = {};
      for (const [uid, profile] of results) {
        map[uid] = profile;
      }
      setProfiles(map);
      setLoading(false);
    };

    load();

    return () => {
      active = false;
    };
  }, [uniqueUids]);

  return { profiles, loading };
}
