import { FormEvent, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { useFriends } from '../hooks/useFriends';
import { usePublicProfile } from '../hooks/usePublicProfile';
import { usePublicProfiles } from '../hooks/usePublicProfiles';
import {
  useUserWorkoutLibrary,
  type LibraryWorkout,
} from '../hooks/useUserWorkoutLibrary';
import { useUserRaces } from '../hooks/useUserRaces';
import type { RaceEntry } from '../types';

const SPORTS = ['Swim', 'Bike', 'Run', 'Lift', 'Other'] as const;

const TODAY = new Date().toISOString().slice(0, 10);

function groupByYear(races: RaceEntry[]): { year: string; races: RaceEntry[] }[] {
  const map = new Map<string, RaceEntry[]>();
  for (const race of races) {
    const year = race.date.slice(0, 4);
    if (!map.has(year)) map.set(year, []);
    map.get(year)!.push(race);
  }
  return Array.from(map.entries()).map(([year, races]) => ({ year, races }));
}

function formatRaceDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function daysUntil(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const race = new Date(year, month - 1, day);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((race.getTime() - now.getTime()) / 86400000);
}

function FriendRaceRow({ race }: { race: RaceEntry }) {
  const isMulti = race.raceType === 'Triathlon' || race.raceType === 'Duathlon';
  const days = daysUntil(race.date);
  const isPast = days < 0;

  return (
    <div className={`race-card${race.completed ? ' race-card--completed' : ''}`}>
      <div className='race-card-header'>
        <div className='race-card-meta'>
          <span className={`race-type-badge race-type-badge--${race.raceType.toLowerCase()}`}>
            {race.raceType}
          </span>
          <span className={`race-registered-chip${race.registered ? ' race-registered-chip--yes' : ''}`}>
            {race.registered ? 'Registered' : 'Not Registered'}
          </span>
          {race.completed && <span className='race-completed-chip'>Finished</span>}
        </div>
        {race.link && (
          <a className='race-link' href={race.link} target='_blank' rel='noopener noreferrer' title='Race details'>↗</a>
        )}
      </div>
      <h3 className='race-card-name'>{race.name}</h3>
      <div className='race-card-info'>
        <span className='race-date'>{formatRaceDate(race.date)}</span>
        {race.distance && <span className='race-distance'>{race.distance}</span>}
        {!isPast && !race.completed && (
          <span className='race-countdown'>
            {days === 0 ? 'Today!' : `${days} day${days === 1 ? '' : 's'} away`}
          </span>
        )}
      </div>
      {race.completed && (race.finishTime || race.resultNotes) && (
        <div className='race-results'>
          {race.finishTime && (
            <div className='race-results-times'>
              <span className='race-result-item'>
                <span className='race-result-label'>Finish</span>
                <span className='race-result-value'>{race.finishTime}</span>
              </span>
              {isMulti && race.swimTime && (
                <span className='race-result-item'>
                  <span className='race-result-label'>Swim</span>
                  <span className='race-result-value'>{race.swimTime}</span>
                </span>
              )}
              {isMulti && race.bikeTime && (
                <span className='race-result-item'>
                  <span className='race-result-label'>Bike</span>
                  <span className='race-result-value'>{race.bikeTime}</span>
                </span>
              )}
              {isMulti && race.runTime && (
                <span className='race-result-item'>
                  <span className='race-result-label'>Run</span>
                  <span className='race-result-value'>{race.runTime}</span>
                </span>
              )}
            </div>
          )}
          {race.resultNotes && <p className='race-result-notes'>{race.resultNotes}</p>}
        </div>
      )}
    </div>
  );
}

function FriendRacesPanel({ friendUid }: { friendUid: string }) {
  const { races, loading } = useUserRaces(friendUid);

  if (loading) return <p className='muted'>Loading races...</p>;
  if (races.length === 0) return <p className='muted'>No races added yet.</p>;

  const upcoming = races.filter((r) => !r.completed && r.date >= TODAY);
  const past = races.filter((r) => r.completed || r.date < TODAY);

  return (
    <div className='friend-library'>
      {upcoming.length > 0 && (
        <div>
          <p className='races-section-title'>Upcoming</p>
          {groupByYear(upcoming).map(({ year, races: group }) => (
            <div key={year}>
              <div className='races-year-label'>{year}</div>
              {group.map((r) => <FriendRaceRow key={r.id} race={r} />)}
            </div>
          ))}
        </div>
      )}
      {past.length > 0 && (
        <div style={{ marginTop: upcoming.length > 0 ? '1rem' : 0 }}>
          <p className='races-section-title'>Past Races</p>
          {groupByYear(past).map(({ year, races: group }) => (
            <div key={year}>
              <div className='races-year-label'>{year}</div>
              {group.map((r) => <FriendRaceRow key={r.id} race={r} />)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FriendLibraryPanel({ friendUid }: { friendUid: string }) {
  const { user } = useAuth();
  const { library, loading } = useUserWorkoutLibrary(friendUid);
  const [calendarWorkoutId, setCalendarWorkoutId] = useState<string | null>(null);
  const [calendarDate, setCalendarDate] = useState(() =>
    format(new Date(), 'yyyy-MM-dd'),
  );
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  const showFeedback = (key: string, msg: string) => {
    setFeedback((prev) => ({ ...prev, [key]: msg }));
    setTimeout(() => {
      setFeedback((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }, 2000);
  };

  const handleCopyToLibrary = async (w: LibraryWorkout) => {
    if (!user) return;
    const libraryRef = collection(db, 'users', user.uid, 'referenceWorkouts');
    const existing = await getDocs(
      query(libraryRef, where('title', '==', w.title)),
    );
    if (!existing.empty) {
      showFeedback(w.id + '-lib', 'Already saved');
      return;
    }
    await addDoc(libraryRef, {
      sport: w.sport,
      title: w.title,
      notes: w.notes,
      easyMinutes: w.easyMinutes,
      hardMinutes: w.hardMinutes,
      createdAt: serverTimestamp(),
    });
    showFeedback(w.id + '-lib', 'Copied!');
  };

  const handleAddToCalendar = async (w: LibraryWorkout) => {
    if (!user) return;
    await addDoc(collection(db, 'users', user.uid, 'plannedWorkouts'), {
      date: calendarDate,
      sport: w.sport,
      title: w.title,
      notes: w.notes,
      easyMinutes: w.easyMinutes,
      hardMinutes: w.hardMinutes,
      completed: false,
    });
    showFeedback(w.id + '-cal', 'Added!');
    setCalendarWorkoutId(null);
  };

  if (loading) return <p className='muted'>Loading library...</p>;
  if (library.length === 0) return <p className='muted'>No workouts in library yet.</p>;

  return (
    <div className='friend-library'>
      <div className='ref-library-columns'>
        {SPORTS.map((sport) => {
          const sportWorkouts = library.filter((w) => w.sport === sport);
          if (sportWorkouts.length === 0) return null;
          return (
            <div key={sport} className='ref-sport-column'>
              <p className='ref-sport-heading'>{sport}</p>
              <div className='ref-sport-cards'>
                {sportWorkouts.map((w) => (
                  <div key={w.id} className='ref-template-card'>
                    <div>
                      <strong>{w.title}</strong>
                      <div className='muted'>
                        {w.easyMinutes + w.hardMinutes} min
                      </div>
                    </div>
                    {w.notes && (
                      <p className='ref-template-notes'>{w.notes}</p>
                    )}
                    {calendarWorkoutId === w.id && (
                      <div className='friend-lib-cal-row'>
                        <input
                          type='date'
                          value={calendarDate}
                          onChange={(e) => setCalendarDate(e.target.value)}
                        />
                        <div className='ref-template-actions'>
                          <button
                            type='button'
                            className='filter-btn'
                            onClick={() => handleAddToCalendar(w)}
                          >
                            {feedback[w.id + '-cal'] || 'Confirm'}
                          </button>
                          <button
                            type='button'
                            className='filter-btn'
                            onClick={() => setCalendarWorkoutId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    <div className='ref-template-actions'>
                      <button
                        type='button'
                        className='filter-btn'
                        onClick={() => handleCopyToLibrary(w)}
                      >
                        {feedback[w.id + '-lib'] || 'Copy to My Library'}
                      </button>
                      {calendarWorkoutId !== w.id && (
                        <button
                          type='button'
                          className='filter-btn'
                          onClick={() => setCalendarWorkoutId(w.id)}
                        >
                          Add to Calendar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Friends() {
  const {
    friends,
    incoming,
    outgoing,
    loading: friendsLoading,
    sendRequest,
    acceptRequest,
    declineRequest,
    cancelInvite,
    removeFriend,
  } = useFriends();
  const {
    profile,
    loading: profileLoading,
    updateProfile,
    canEdit,
  } = usePublicProfile();

  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [goals, setGoals] = useState('');
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState('');

  const [email, setEmail] = useState('');
  const [requestError, setRequestError] = useState('');
  const [requestSuccess, setRequestSuccess] = useState('');
  const [expandedLibraryId, setExpandedLibraryId] = useState<string | null>(null);
  const [expandedRacesId, setExpandedRacesId] = useState<string | null>(null);

  const profileIds = useMemo(() => {
    return [
      ...friends.map((f) => f.uid),
      ...incoming.map((r) => r.uid),
      ...outgoing.map((r) => r.uid),
    ];
  }, [friends, incoming, outgoing]);

  const { profiles } = usePublicProfiles(profileIds);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName ?? '');
    setAvatarUrl(profile.avatarUrl ?? '');
    setAvatarPreview(profile.avatarUrl ?? '');
    setBio(profile.bio ?? '');
    setGoals(profile.goals ?? '');
  }, [profile]);

  const handleAvatarFile = (file?: File) => {
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const size = 200;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      // Crop to center square
      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2;
      const sy = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setAvatarUrl(dataUrl);
      setAvatarPreview(dataUrl);
    };
    img.src = URL.createObjectURL(file);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    try {
      await updateProfile({
        displayName: displayName.trim(),
        avatarUrl: avatarUrl.trim(),
        bio: bio.trim(),
        goals: goals.trim(),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendRequest = async (e: FormEvent) => {
    e.preventDefault();
    setRequestError('');
    setRequestSuccess('');
    try {
      await sendRequest(email);
      setRequestSuccess('Friend request sent!');
      setEmail('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Request failed';
      setRequestError(message);
    }
  };

  if (profileLoading) {
    return <p>Loading profile...</p>;
  }

  return (
    <div className='dashboard'>
      <div className='page-header'>
        <h1>Friends</h1>
      </div>

      <section className='friends-section'>
        <h2>Friends</h2>
        {friendsLoading && <p className='muted'>Loading friends...</p>}
        {!friendsLoading && friends.length === 0 && (
          <p className='muted'>No friends yet. Send a request below!</p>
        )}
        {friends.map((friend) => {
          const friendProfile = profiles[friend.uid];
          const name =
            friendProfile?.displayName || friendProfile?.email || friend.uid;
          const isExpanded = expandedLibraryId === friend.uid;
          const isRacesExpanded = expandedRacesId === friend.uid;
          return (
            <div key={friend.uid} className='friend-card'>
              <div className='friend-card-top'>
                <div className='friend-card-main'>
                  <div className='friend-avatar'>
                    {friendProfile?.avatarUrl ? (
                      <img src={friendProfile.avatarUrl} alt={name} />
                    ) : (
                      <span>{name.slice(0, 1).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <strong>{name}</strong>
                    {friendProfile?.bio && (
                      <div className='muted friend-meta'>{friendProfile.bio}</div>
                    )}
                  </div>
                </div>
                <div className='friend-actions'>
                  <Link className='filter-btn' to={`/friends/${friend.uid}`}>
                    View Profile
                  </Link>
                  <button
                    className={`filter-btn${isRacesExpanded ? ' active' : ''}`}
                    onClick={() =>
                      setExpandedRacesId(isRacesExpanded ? null : friend.uid)
                    }
                  >
                    {isRacesExpanded ? 'Hide Races' : 'View Races'}
                  </button>
                  <button
                    className={`filter-btn${isExpanded ? ' active' : ''}`}
                    onClick={() =>
                      setExpandedLibraryId(isExpanded ? null : friend.uid)
                    }
                  >
                    {isExpanded ? 'Hide Library' : 'View Library'}
                  </button>
                  <button
                    className='filter-btn'
                    onClick={() => removeFriend(friend.uid)}
                  >
                    Remove
                  </button>
                </div>
              </div>
              {isRacesExpanded && (
                <FriendRacesPanel friendUid={friend.uid} />
              )}
              {isExpanded && (
                <FriendLibraryPanel friendUid={friend.uid} />
              )}
            </div>
          );
        })}
      </section>

      <form className='workout-form' onSubmit={handleSave}>
        <h3>My Profile</h3>
        <label>
          Display Name
          <input
            type='text'
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder='Your name'
          />
        </label>
        <label>
          Avatar
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {avatarPreview && (
              <img
                src={avatarPreview}
                alt='Avatar preview'
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  objectFit: 'cover',
                }}
              />
            )}
            <input
              type='file'
              accept='image/*'
              onChange={(e) => handleAvatarFile(e.target.files?.[0])}
            />
          </div>
        </label>
        <label>
          Bio
          <textarea
            className='modal-textarea'
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder='Short intro'
          />
        </label>
        <label>
          Goals
          <textarea
            className='modal-textarea'
            rows={3}
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            placeholder='Your current goals'
          />
        </label>
        <button type='submit' disabled={saving || !canEdit}>
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>

      <form className='workout-form' onSubmit={handleSendRequest}>
        <h3>Add Friend</h3>
        <label>
          Friend Email
          <input
            type='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder='dad@example.com'
            required
          />
        </label>
        <button type='submit'>Send Request</button>
        {requestError && <p className='error-text'>{requestError}</p>}
        {requestSuccess && <p className='success-text'>{requestSuccess}</p>}
      </form>

      <section className='friends-section'>
        <h2>Friend Requests</h2>
        {incoming.length === 0 && (
          <p className='muted'>No incoming requests.</p>
        )}
        {incoming.map((req) => {
          const profileCard = profiles[req.uid];
          return (
            <div key={req.uid} className='friend-row'>
              <div>
                <strong>
                  {profileCard?.displayName || req.email || req.uid}
                </strong>
                <div className='muted friend-meta'>{req.email}</div>
              </div>
              <div className='friend-actions'>
                <button
                  className='filter-btn'
                  onClick={() => acceptRequest(req.uid)}
                >
                  Accept
                </button>
                <button
                  className='filter-btn'
                  onClick={() => declineRequest(req.uid)}
                >
                  Decline
                </button>
              </div>
            </div>
          );
        })}
      </section>

      <section className='friends-section'>
        <h2>Pending Invites</h2>
        {outgoing.length === 0 && <p className='muted'>No pending invites.</p>}
        {outgoing.map((req) => {
          const profileCard = profiles[req.uid];
          return (
            <div key={req.uid} className='friend-row'>
              <div>
                <strong>
                  {profileCard?.displayName || req.email || req.uid}
                </strong>
                <div className='muted friend-meta'>{req.email}</div>
              </div>
              <div className='friend-actions'>
                <button
                  className='filter-btn'
                  onClick={() => cancelInvite(req.uid)}
                >
                  Cancel
                </button>
              </div>
            </div>
          );
        })}
      </section>

    </div>
  );
}
