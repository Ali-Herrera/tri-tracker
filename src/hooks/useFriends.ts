import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './useAuth';

export interface FriendRecord {
  uid: string;
  createdAt?: unknown;
}

export interface FriendRequest {
  uid: string;
  email?: string;
  createdAt?: unknown;
}

export function useFriends() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendRecord[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setFriends([]);
      setIncoming([]);
      setOutgoing([]);
      setLoading(false);
      return;
    }

    const friendsRef = collection(db, 'users', user.uid, 'friends');
    const incomingRef = collection(db, 'users', user.uid, 'friendRequests');
    const outgoingRef = collection(db, 'users', user.uid, 'friendInvites');

    const unsubFriends = onSnapshot(friendsRef, (snap) => {
      const data = snap.docs.map((d) => ({
        uid: d.id,
        ...(d.data() as object),
      }));
      setFriends(data);
      setLoading(false);
    });

    const unsubIncoming = onSnapshot(incomingRef, (snap) => {
      const data = snap.docs.map((d) => ({
        uid: d.id,
        ...(d.data() as { fromEmail?: string; createdAt?: unknown }),
      }));
      setIncoming(
        data.map((item) => ({
          uid: item.uid,
          email: item.fromEmail,
          createdAt: item.createdAt,
        })),
      );
      setLoading(false);
    });

    const unsubOutgoing = onSnapshot(outgoingRef, (snap) => {
      const data = snap.docs.map((d) => ({
        uid: d.id,
        ...(d.data() as { toEmail?: string; createdAt?: unknown }),
      }));
      setOutgoing(
        data.map((item) => ({
          uid: item.uid,
          email: item.toEmail,
          createdAt: item.createdAt,
        })),
      );
      setLoading(false);
    });

    return () => {
      unsubFriends();
      unsubIncoming();
      unsubOutgoing();
    };
  }, [user]);

  const friendIds = useMemo(() => friends.map((f) => f.uid), [friends]);
  const outgoingIds = useMemo(() => outgoing.map((o) => o.uid), [outgoing]);

  const sendRequest = async (email: string) => {
    if (!user) return;
    const normalized = email.trim().toLowerCase();
    if (!normalized) return;

    const profilesQuery = query(
      collectionGroup(db, 'public'),
      where('email', '==', normalized),
      limit(1),
    );
    const profilesSnap = await getDocs(profilesQuery);
    if (profilesSnap.empty) {
      throw new Error('No user found with that email.');
    }

    const profileDoc = profilesSnap.docs[0];
    const targetUid = profileDoc.ref.parent.parent?.id;
    if (!targetUid) {
      throw new Error('Could not resolve that user.');
    }
    if (targetUid === user.uid) {
      throw new Error('You cannot add yourself as a friend.');
    }
    if (friendIds.includes(targetUid)) {
      throw new Error('You are already friends.');
    }
    if (outgoingIds.includes(targetUid)) {
      throw new Error('Friend request already sent.');
    }

    const requestRef = doc(db, 'users', targetUid, 'friendRequests', user.uid);
    const inviteRef = doc(db, 'users', user.uid, 'friendInvites', targetUid);
    await setDoc(
      requestRef,
      {
        fromUid: user.uid,
        fromEmail: user.email ?? null,
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );
    await setDoc(
      inviteRef,
      {
        toUid: targetUid,
        toEmail: normalized,
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );
  };

  const acceptRequest = async (fromUid: string) => {
    if (!user) return;
    const friendRef = doc(db, 'users', user.uid, 'friends', fromUid);
    const otherFriendRef = doc(db, 'users', fromUid, 'friends', user.uid);
    const requestRef = doc(db, 'users', user.uid, 'friendRequests', fromUid);
    const inviteRef = doc(db, 'users', fromUid, 'friendInvites', user.uid);

    await setDoc(friendRef, {
      friendUid: fromUid,
      createdAt: serverTimestamp(),
    });
    await setDoc(otherFriendRef, {
      friendUid: user.uid,
      createdAt: serverTimestamp(),
    });
    await deleteDoc(requestRef);
    await deleteDoc(inviteRef);
  };

  const declineRequest = async (fromUid: string) => {
    if (!user) return;
    const requestRef = doc(db, 'users', user.uid, 'friendRequests', fromUid);
    const inviteRef = doc(db, 'users', fromUid, 'friendInvites', user.uid);
    await deleteDoc(requestRef);
    await deleteDoc(inviteRef);
  };

  const cancelInvite = async (toUid: string) => {
    if (!user) return;
    const inviteRef = doc(db, 'users', user.uid, 'friendInvites', toUid);
    const requestRef = doc(db, 'users', toUid, 'friendRequests', user.uid);
    await deleteDoc(inviteRef);
    await deleteDoc(requestRef);
  };

  const removeFriend = async (friendUid: string) => {
    if (!user) return;
    const friendRef = doc(db, 'users', user.uid, 'friends', friendUid);
    const otherFriendRef = doc(db, 'users', friendUid, 'friends', user.uid);
    await deleteDoc(friendRef);
    await deleteDoc(otherFriendRef);
  };

  return {
    friends,
    incoming,
    outgoing,
    loading,
    sendRequest,
    acceptRequest,
    declineRequest,
    cancelInvite,
    removeFriend,
  };
}
