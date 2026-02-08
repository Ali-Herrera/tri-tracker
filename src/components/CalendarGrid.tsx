import { useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
} from 'date-fns';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import type { PlannedWorkout } from '../types';

const SPORT_COLORS: Record<string, string> = {
  Swim: 'var(--green)',
  Bike: 'var(--accent)',
  Run: 'var(--red)',
  Lift: '#AB63FA',
  Other: 'var(--text-muted)',
};

/* ---------- Draggable workout card ---------- */

function DraggableWorkoutCard({
  workout,
  onClick,
}: {
  workout: PlannedWorkout;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: workout.id,
      data: workout,
    });

  const style: React.CSSProperties = {
    borderLeftColor: SPORT_COLORS[workout.sport] || 'var(--border)',
    ...(transform
      ? {
          transform: `translate(${transform.x}px, ${transform.y}px)`,
          zIndex: 100,
          opacity: 0.9,
        }
      : {}),
    ...(isDragging ? { pointerEvents: 'none' as const } : {}),
  };

  return (
    <div
      ref={setNodeRef}
      className={`cal-workout-card${workout.completed ? ' cal-card-done' : ''}`}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      {...listeners}
      {...attributes}
    >
      {workout.completed && <span className='cal-check'>&#10003;</span>}
      <span className='cal-workout-sport'>{workout.sport}</span>
      <span className='cal-workout-title'>{workout.title}</span>
      <span className='cal-workout-duration'>
        {workout.easyMinutes + workout.hardMinutes}m
      </span>
    </div>
  );
}

/* ---------- Droppable day cell ---------- */

function DroppableDay({
  dateStr,
  day,
  isCurrentMonth,
  workouts,
  onDayClick,
  onWorkoutClick,
}: {
  dateStr: string;
  day: Date;
  isCurrentMonth: boolean;
  workouts: PlannedWorkout[];
  onDayClick: (date: string) => void;
  onWorkoutClick: (workout: PlannedWorkout) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: dateStr });

  return (
    <div
      ref={setNodeRef}
      className={[
        'cal-day',
        !isCurrentMonth && 'cal-day-outside',
        isToday(day) && 'cal-day-today',
        isOver && 'cal-day-over',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={() => onDayClick(dateStr)}
    >
      <span className='cal-day-number'>{format(day, 'd')}</span>
      <div className='cal-day-workouts'>
        {workouts.map((w) => (
          <DraggableWorkoutCard
            key={w.id}
            workout={w}
            onClick={() => onWorkoutClick(w)}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------- Week summary row ---------- */

function WeekSummaryRow({ workouts }: { workouts: PlannedWorkout[] }) {
  const totalEasy = workouts.reduce((s, w) => s + w.easyMinutes, 0);
  const totalHard = workouts.reduce((s, w) => s + w.hardMinutes, 0);
  const total = totalEasy + totalHard;
  const easyPct = total > 0 ? Math.round((totalEasy / total) * 100) : 0;
  const hardPct = total > 0 ? 100 - easyPct : 0;

  return (
    <div className='cal-week-summary'>
      <span className='cal-summary-label'>
        {total > 0 ? `${total} min` : 'No workouts'}
      </span>
      {total > 0 && (
        <div className='cal-summary-bar'>
          <div className='cal-bar-easy' style={{ width: `${easyPct}%` }}>
            {easyPct}%
          </div>
          <div className='cal-bar-hard' style={{ width: `${hardPct}%` }}>
            {hardPct}%
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Main grid component ---------- */

interface CalendarGridProps {
  month: Date;
  weekMode: 7 | 9;
  workouts: PlannedWorkout[];
  onDayClick: (date: string) => void;
  onWorkoutClick: (workout: PlannedWorkout) => void;
}

export default function CalendarGrid({
  month,
  weekMode,
  workouts,
  onDayClick,
  onWorkoutClick,
}: CalendarGridProps) {
  const workoutsByDate = useMemo(() => {
    const map = new Map<string, PlannedWorkout[]>();
    for (const w of workouts) {
      const existing = map.get(w.date) || [];
      existing.push(w);
      map.set(w.date, existing);
    }
    return map;
  }, [workouts]);

  const days = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [month]);

  const weekRows = useMemo(() => {
    const rows: Date[][] = [];
    for (let i = 0; i < days.length; i += weekMode) {
      rows.push(days.slice(i, i + weekMode));
    }
    return rows;
  }, [days, weekMode]);

  const dayHeaders = useMemo(() => {
    if (weekMode === 7) {
      return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    }
    return Array.from({ length: 9 }, (_, i) => `Day ${i + 1}`);
  }, [weekMode]);

  return (
    <div className='cal-grid-wrapper'>
      <div
        className='cal-grid'
        style={{ gridTemplateColumns: `repeat(${weekMode}, 1fr)` }}
      >
        {dayHeaders.map((label) => (
          <div key={label} className='cal-header'>
            {label}
          </div>
        ))}

        {weekRows.map((week, weekIdx) => {
          const weekWorkouts = week.flatMap((day) => {
            const ds = format(day, 'yyyy-MM-dd');
            return workoutsByDate.get(ds) || [];
          });

          return (
            <div key={weekIdx} style={{ display: 'contents' }}>
              {week.map((day) => {
                const ds = format(day, 'yyyy-MM-dd');
                return (
                  <DroppableDay
                    key={ds}
                    dateStr={ds}
                    day={day}
                    isCurrentMonth={isSameMonth(day, month)}
                    workouts={workoutsByDate.get(ds) || []}
                    onDayClick={onDayClick}
                    onWorkoutClick={onWorkoutClick}
                  />
                );
              })}
              {/* Pad last row if fewer than weekMode days */}
              {week.length < weekMode &&
                Array.from({ length: weekMode - week.length }).map((_, i) => (
                  <div key={`pad-${i}`} className='cal-day cal-day-outside' />
                ))}
              <WeekSummaryRow workouts={weekWorkouts} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
