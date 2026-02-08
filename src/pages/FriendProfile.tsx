import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from 'date-fns';
import { DndContext } from '@dnd-kit/core';
import { useFriends } from '../hooks/useFriends';
import { usePublicProfile } from '../hooks/usePublicProfile';
import { useUserPlannedWorkouts } from '../hooks/useUserPlannedWorkouts';
import { useUserWorkouts } from '../hooks/useUserWorkouts';
import ActivityLog from '../components/ActivityLog';
import CalendarGrid from '../components/CalendarGrid';
import LifetimeTotals from '../components/LifetimeTotals';
import WeeklyVolumeChart from '../components/WeeklyVolumeChart';

const noop = () => {};

export default function FriendProfile() {
  const { uid } = useParams();
  const { friends, loading: friendsLoading } = useFriends();
  const { profile, loading: profileLoading } = usePublicProfile(uid);

  const [currentMonth, setCurrentMonth] = useState(() =>
    startOfMonth(new Date()),
  );
  const [weekMode, setWeekMode] = useState<7 | 9>(7);

  const isFriend = useMemo(() => {
    if (!uid) return false;
    return friends.some((f) => f.uid === uid);
  }, [friends, uid]);

  const { queryStart, queryEnd } = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return {
      queryStart: format(calStart, 'yyyy-MM-dd'),
      queryEnd: format(calEnd, 'yyyy-MM-dd'),
    };
  }, [currentMonth]);

  const permittedUid = isFriend ? uid : undefined;
  const { workouts: plannedWorkouts, loading: plannedLoading } =
    useUserPlannedWorkouts(permittedUid, queryStart, queryEnd);
  const { workouts, loading: workoutsLoading } = useUserWorkouts(permittedUid);

  const recentWorkouts = useMemo(() => {
    const now = new Date();
    const cutoff = subDays(now, 30);
    return workouts.filter((w) => w.date.toDate() >= cutoff);
  }, [workouts]);

  if (!uid) {
    return (
      <div className='dashboard'>
        <p className='muted'>Friend not found.</p>
        <Link className='filter-btn' to='/friends'>
          Back to Friends
        </Link>
      </div>
    );
  }

  if (friendsLoading || profileLoading) {
    return <p>Loading friend profile...</p>;
  }

  if (!isFriend) {
    return (
      <div className='dashboard'>
        <p className='muted'>You can only view profiles for friends.</p>
        <Link className='filter-btn' to='/friends'>
          Back to Friends
        </Link>
      </div>
    );
  }

  const name = profile?.displayName || profile?.email || uid;

  return (
    <div className='dashboard'>
      <div className='page-header'>
        <div className='friend-profile-header'>
          <div className='friend-avatar friend-avatar-lg'>
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt={name} />
            ) : (
              <span>{name.slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <div className='friend-profile-meta'>
            <h1>{name}</h1>
            {profile?.bio && <p className='muted'>{profile.bio}</p>}
          </div>
        </div>
        <Link className='filter-btn' to='/friends'>
          Back to Friends
        </Link>
      </div>

      {profile?.goals && (
        <section className='friend-profile-card'>
          <h2>Goals</h2>
          <p>{profile.goals}</p>
        </section>
      )}

      {!workoutsLoading && (
        <LifetimeTotals workouts={workouts} timeFrame='All Time' />
      )}

      <section>
        <div className='page-header'>
          <h2>Training Plans</h2>
          <div className='cal-controls'>
            <button
              className='filter-btn'
              onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            >
              &larr;
            </button>
            <span className='cal-month-label'>
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <button
              className='filter-btn'
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            >
              &rarr;
            </button>
            <div className='cal-mode-toggle'>
              <button
                className={`filter-btn ${weekMode === 7 ? 'active' : ''}`}
                onClick={() => setWeekMode(7)}
              >
                7-Day
              </button>
              <button
                className={`filter-btn ${weekMode === 9 ? 'active' : ''}`}
                onClick={() => setWeekMode(9)}
              >
                9-Day
              </button>
            </div>
          </div>
        </div>

        {plannedLoading ? (
          <p className='muted'>Loading planned workouts...</p>
        ) : (
          <DndContext>
            <CalendarGrid
              month={currentMonth}
              weekMode={weekMode}
              workouts={plannedWorkouts}
              onDayClick={noop}
              onWorkoutClick={noop}
            />
          </DndContext>
        )}
      </section>

      <section>
        <h2>Recent Workouts (Last 30 Days)</h2>
        {workoutsLoading ? (
          <p className='muted'>Loading workouts...</p>
        ) : (
          <>
            <WeeklyVolumeChart
              workouts={recentWorkouts}
              timeFrame='Last 30 Days'
            />
            <ActivityLog workouts={recentWorkouts} timeFrame='Last 30 Days' />
          </>
        )}
      </section>
    </div>
  );
}
