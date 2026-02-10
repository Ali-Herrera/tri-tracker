import React, { useMemo } from 'react';
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
import { useDroppable, useDraggable, useDndContext } from '@dnd-kit/core';
import type { PlannedWorkout } from '../types';

const SPORT_COLORS: Record<string, string> = {
  Swim: 'var(--green)',
  Bike: 'var(--accent)',
  Run: 'var(--red)',
  Lift: '#AB63FA',
  Other: 'var(--text-muted)',
};

const sortWorkouts = (a: PlannedWorkout, b: PlannedWorkout) => {
  const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) return orderA - orderB;
  return a.title.localeCompare(b.title);
};

/* ---------- Workout cards ---------- */

function WorkoutCard({
  workout,
  onClick,
  disableClick,
  isDragging,
  setNodeRef,
  dragAttributes,
  dragListeners,
  dragTransform,
}: {
  workout: PlannedWorkout;
  onClick: () => void;
  disableClick?: boolean;
  isDragging?: boolean;
  setNodeRef?: (node: HTMLDivElement | null) => void;
  dragAttributes?: React.HTMLAttributes<HTMLDivElement>;
  dragListeners?: React.HTMLAttributes<HTMLDivElement>;
  dragTransform?: { x: number; y: number } | null;
}) {
  const style: React.CSSProperties = {
    borderLeftColor: SPORT_COLORS[workout.sport] || 'var(--border)',
    ...(dragTransform
      ? {
          transform: `translate(${dragTransform.x}px, ${dragTransform.y}px)`,
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
        if (disableClick) return;
        onClick();
      }}
      onTouchEnd={(e) => {
        e.stopPropagation();
        if (disableClick) return;
        e.preventDefault();
        onClick();
      }}
      {...dragListeners}
      {...dragAttributes}
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

/* ---------- Draggable workout card ---------- */

function DraggableWorkoutCard({
  workout,
  onClick,
  disableClick,
}: {
  workout: PlannedWorkout;
  onClick: () => void;
  disableClick?: boolean;
}) {
  const { active } = useDndContext();
  const dragId = `drag-${workout.id}`;
  const dropId = `drop-${workout.id}`;
  const isActiveDrag = active?.id === dragId;
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({
    id: dragId,
    data: {
      type: 'workout',
      workoutId: workout.id,
      date: workout.date,
    },
  });
  const { setNodeRef: setDropRef } = useDroppable({
    id: dropId,
    data: {
      type: 'workout',
      workoutId: workout.id,
      date: workout.date,
    },
    disabled: isActiveDrag,
  });

  const setNodeRef = (node: HTMLDivElement | null) => {
    setDragRef(node);
    setDropRef(node);
  };

  return (
    <WorkoutCard
      workout={workout}
      onClick={onClick}
      disableClick={disableClick}
      isDragging={isDragging}
      setNodeRef={setNodeRef}
      dragAttributes={attributes}
      dragListeners={listeners}
      dragTransform={transform}
    />
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
  disableClick,
  enableDrag,
}: {
  dateStr: string;
  day: Date;
  isCurrentMonth: boolean;
  workouts: PlannedWorkout[];
  onDayClick: (date: string) => void;
  onWorkoutClick: (workout: PlannedWorkout) => void;
  disableClick?: boolean;
  enableDrag?: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `day-${dateStr}`,
    data: { type: 'day', date: dateStr },
  });

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
      onClick={() => {
        if (disableClick) return;
        onDayClick(dateStr);
      }}
    >
      <span className='cal-day-number'>{format(day, 'd')}</span>
      <div className='cal-day-workouts'>
        {workouts.map((w) =>
          enableDrag ? (
            <DraggableWorkoutCard
              key={w.id}
              workout={w}
              onClick={() => onWorkoutClick(w)}
              disableClick={disableClick}
            />
          ) : (
            <WorkoutCard
              key={w.id}
              workout={w}
              onClick={() => onWorkoutClick(w)}
              disableClick={disableClick}
            />
          ),
        )}
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
  isDragging?: boolean;
  enableDrag?: boolean;
}

export default function CalendarGrid({
  month,
  weekMode,
  workouts,
  onDayClick,
  onWorkoutClick,
  isDragging,
  enableDrag = true,
}: CalendarGridProps) {
  const workoutsByDate = useMemo(() => {
    const map = new Map<string, PlannedWorkout[]>();
    for (const w of workouts) {
      const existing = map.get(w.date) || [];
      existing.push(w);
      map.set(w.date, existing);
    }
    for (const [date, list] of map.entries()) {
      map.set(date, [...list].sort(sortWorkouts));
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
                    disableClick={isDragging}
                    enableDrag={enableDrag}
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
