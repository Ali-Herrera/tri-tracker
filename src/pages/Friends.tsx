import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFriends } from '../hooks/useFriends';
import { usePublicProfile } from '../hooks/usePublicProfile';
import { usePublicProfiles } from '../hooks/usePublicProfiles';

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

      <section className='friends-section'>
        <h2>Friends</h2>
        {friendsLoading && <p className='muted'>Loading friends...</p>}
        {!friendsLoading && friends.length === 0 && (
          <p className='muted'>No friends yet. Send a request above!</p>
        )}
        {friends.map((friend) => {
          const friendProfile = profiles[friend.uid];
          const name =
            friendProfile?.displayName || friendProfile?.email || friend.uid;
          return (
            <div key={friend.uid} className='friend-card'>
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
                  className='filter-btn'
                  onClick={() => removeFriend(friend.uid)}
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
