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
import { useFriends } from '../hooks/useFriends';
import { usePublicProfile } from '../hooks/usePublicProfile';
import { useUserPlannedWorkouts } from '../hooks/useUserPlannedWorkouts';
import { useUserWorkouts } from '../hooks/useUserWorkouts';
import { useUserRaces } from '../hooks/useUserRaces';
import ActivityLog from '../components/ActivityLog';
import CalendarGrid from '../components/CalendarGrid';
import LifetimeTotals from '../components/LifetimeTotals';
import WeeklyVolumeChart from '../components/WeeklyVolumeChart';
import WorkoutDetailsModal from '../components/WorkoutDetailsModal';
import PlannedWorkoutDetailsModal from '../components/PlannedWorkoutDetailsModal';
import type { PlannedWorkout, Workout, RaceEntry } from '../types';

const noop = () => {};

const TODAY = new Date().toISOString().slice(0, 10);

function formatRaceDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function daysUntilRace(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const race = new Date(year, month - 1, day);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((race.getTime() - now.getTime()) / 86400000);
}

function FriendRaceCard({ race }: { race: RaceEntry }) {
  const isMultiDiscipline = race.raceType === 'Triathlon' || race.raceType === 'Duathlon';
  const days = daysUntilRace(race.date);
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
          <a
            className='race-link'
            href={race.link}
            target='_blank'
            rel='noopener noreferrer'
            title='Race details'
          >
            ↗
          </a>
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
              {isMultiDiscipline && race.swimTime && (
                <span className='race-result-item'>
                  <span className='race-result-label'>Swim</span>
                  <span className='race-result-value'>{race.swimTime}</span>
                </span>
              )}
              {isMultiDiscipline && race.bikeTime && (
                <span className='race-result-item'>
                  <span className='race-result-label'>Bike</span>
                  <span className='race-result-value'>{race.bikeTime}</span>
                </span>
              )}
              {isMultiDiscipline && race.runTime && (
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

export default function FriendProfile() {
  const { uid } = useParams();
  const { friends, loading: friendsLoading } = useFriends();
  const { profile, loading: profileLoading } = usePublicProfile(uid);

  const [currentMonth, setCurrentMonth] = useState(() =>
    startOfMonth(new Date()),
  );
  const [weekMode, setWeekMode] = useState<7 | 9>(7);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [selectedPlanned, setSelectedPlanned] = useState<PlannedWorkout | null>(
    null,
  );

  const isFriend = useMemo(() => {
    if (!uid) return false;
    return friends.some((f) => f.uid === uid);
  }, [friends, uid]);

  const { queryStart, queryEnd } = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return {
      queryStart: format(calStart, 'yyyy-MM-dd'),
      queryEnd: format(calEnd, 'yyyy-MM-dd'),
    };
  }, [currentMonth]);

  const permittedUid = isFriend ? uid : undefined;
  const { workouts: plannedWorkouts, loading: plannedLoading } =
    useUserPlannedWorkouts(permittedUid, queryStart, queryEnd);
  const { workouts, loading: workoutsLoading } = useUserWorkouts(permittedUid);
  const { races, loading: racesLoading } = useUserRaces(permittedUid);

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

      {!racesLoading && races.length > 0 && (() => {
        const upcoming = races.filter((r) => !r.completed && r.date >= TODAY);
        const past = races.filter((r) => r.completed || r.date < TODAY).slice().reverse();
        return (
          <section className='friend-profile-card'>
            <h2>Races</h2>
            {upcoming.length > 0 && (
              <>
                <p className='races-section-title'>Upcoming</p>
                {upcoming.map((r) => <FriendRaceCard key={r.id} race={r} />)}
              </>
            )}
            {past.length > 0 && (
              <>
                <p className='races-section-title' style={{ marginTop: upcoming.length > 0 ? '1rem' : 0 }}>Past Races</p>
                {past.map((r) => <FriendRaceCard key={r.id} race={r} />)}
              </>
            )}
          </section>
        );
      })()}

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
          <CalendarGrid
            month={currentMonth}
            weekMode={weekMode}
            workouts={plannedWorkouts}
            onDayClick={noop}
            onWorkoutClick={(workout) => setSelectedPlanned(workout)}
            enableDrag={false}
          />
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
            <ActivityLog
              workouts={recentWorkouts}
              timeFrame='Last 30 Days'
              onWorkoutClick={(workout) => setSelectedWorkout(workout)}
            />
          </>
        )}
      </section>

      <WorkoutDetailsModal
        isOpen={!!selectedWorkout}
        workout={selectedWorkout}
        onClose={() => setSelectedWorkout(null)}
        title='Workout Details (Read Only)'
      />
      <PlannedWorkoutDetailsModal
        isOpen={!!selectedPlanned}
        workout={selectedPlanned}
        onClose={() => setSelectedPlanned(null)}
      />
    </div>
  );
}
