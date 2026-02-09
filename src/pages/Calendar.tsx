import { useState, useMemo, useCallback } from 'react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { usePlannedWorkouts } from '../hooks/usePlannedWorkouts';
import { usePublicProfile } from '../hooks/usePublicProfile';
import CalendarGrid from '../components/CalendarGrid';
import PlannedWorkoutModal from '../components/PlannedWorkoutModal';
import type { PlannedWorkout } from '../types';

type DragData =
  | { type: 'day'; date: string }
  | { type: 'workout'; date: string; workoutId: string };

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(() =>
    startOfMonth(new Date()),
  );
  const [weekMode, setWeekMode] = useState<7 | 9>(7);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() =>
    format(new Date(), 'yyyy-MM-dd'),
  );
  const [editingWorkout, setEditingWorkout] = useState<PlannedWorkout | null>(
    null,
  );
  const [isDragging, setIsDragging] = useState(false);

  // Compute query range covering the full visible grid
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

  const {
    workouts,
    loading,
    addPlannedWorkout,
    updatePlannedWorkout,
    updatePlannedWorkouts,
    deletePlannedWorkout,
    completePlannedWorkout,
    updateCompletedWorkout,
  } = usePlannedWorkouts(queryStart, queryEnd);
  const { profile } = usePublicProfile();

  // 5px activation distance so clicks don't trigger drags
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handlePrevMonth = () => setCurrentMonth((m) => subMonths(m, 1));
  const handleNextMonth = () => setCurrentMonth((m) => addMonths(m, 1));

  const handleDayClick = useCallback((date: string) => {
    setSelectedDate(date);
    setEditingWorkout(null);
    setModalOpen(true);
  }, []);

  const handleWorkoutClick = useCallback((workout: PlannedWorkout) => {
    setEditingWorkout(workout);
    setSelectedDate(workout.date);
    setModalOpen(true);
  }, []);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setIsDragging(false);
      const { active, over } = event;
      if (!over) return;

      const activeData = active.data.current as DragData | undefined;
      const overData = over.data.current as DragData | undefined;

      if (!activeData || activeData.type !== 'workout') return;

      const sourceDate = activeData.date;
      let targetDate = sourceDate;
      let targetWorkoutId: string | undefined;

      if (overData?.type === 'day') {
        targetDate = overData.date;
      } else if (overData?.type === 'workout') {
        targetDate = overData.date;
        targetWorkoutId = overData.workoutId;
      } else {
        return;
      }

      const sortWorkouts = (items: PlannedWorkout[]) =>
        [...items].sort((a, b) => {
          const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
          const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
          if (orderA !== orderB) return orderA - orderB;
          return a.title.localeCompare(b.title);
        });

      const sourceList = sortWorkouts(
        workouts.filter((w) => w.date === sourceDate),
      );
      const activeWorkout = sourceList.find(
        (w) => w.id === activeData.workoutId,
      );
      if (!activeWorkout) return;

      if (sourceDate === targetDate) {
        const nextList = sourceList.filter((w) => w.id !== activeWorkout.id);
        if (!targetWorkoutId || targetWorkoutId === activeWorkout.id) {
          nextList.push(activeWorkout);
        } else {
          const targetIndex = nextList.findIndex(
            (w) => w.id === targetWorkoutId,
          );
          const insertIndex = targetIndex >= 0 ? targetIndex : nextList.length;
          nextList.splice(insertIndex, 0, activeWorkout);
        }
        const updates = nextList.map((workout, index) => ({
          id: workout.id,
          updates: { order: index },
        }));
        void updatePlannedWorkouts(updates);
        return;
      }

      const targetList = sortWorkouts(
        workouts.filter((w) => w.date === targetDate),
      );
      const nextSourceList = sourceList.filter(
        (w) => w.id !== activeWorkout.id,
      );
      const nextTargetList = [...targetList];
      const targetIndex = targetWorkoutId
        ? nextTargetList.findIndex((w) => w.id === targetWorkoutId)
        : -1;
      const insertIndex =
        targetIndex >= 0 ? targetIndex : nextTargetList.length;
      nextTargetList.splice(insertIndex, 0, {
        ...activeWorkout,
        date: targetDate,
      });

      const updates = [
        ...nextSourceList.map((workout, index) => ({
          id: workout.id,
          updates: { order: index },
        })),
        ...nextTargetList.map((workout, index) => ({
          id: workout.id,
          updates: {
            order: index,
            ...(workout.id === activeWorkout.id ? { date: targetDate } : {}),
          },
        })),
      ];

      void updatePlannedWorkouts(updates);
    },
    [updatePlannedWorkouts, workouts],
  );

  const handleDragCancel = useCallback(() => {
    setIsDragging(false);
  }, []);

  const getNextOrder = useCallback(
    (date: string) => {
      const list = workouts
        .filter((w) => w.date === date)
        .sort((a, b) => {
          const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
          const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
          if (orderA !== orderB) return orderA - orderB;
          return a.title.localeCompare(b.title);
        });
      if (list.length === 0) return 0;
      const last = list[list.length - 1];
      const lastOrder = last.order ?? list.length - 1;
      return lastOrder + 1;
    },
    [workouts],
  );

  const handleSavePlannedWorkout = useCallback(
    async (workout: Omit<PlannedWorkout, 'id'>) => {
      await addPlannedWorkout({
        ...workout,
        order: getNextOrder(workout.date),
      });
    },
    [addPlannedWorkout, getNextOrder],
  );

  const handleCopyPlannedWorkout = useCallback(
    async (workout: PlannedWorkout) => {
      const { id, ...copy } = workout;
      await addPlannedWorkout({
        ...copy,
        order: getNextOrder(workout.date),
      });
    },
    [addPlannedWorkout, getNextOrder],
  );

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingWorkout(null);
  };

  if (loading) {
    return <p>Loading calendar...</p>;
  }

  const displayName = profile?.displayName || profile?.email || 'You';

  return (
    <div className='dashboard cal-page'>
      <div className='page-header'>
        <h1>Training Calendar</h1>
        <div className='page-header-actions'>
          <div className='cal-controls'>
            <button className='filter-btn' onClick={handlePrevMonth}>
              &larr;
            </button>
            <span className='cal-month-label'>
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <button className='filter-btn' onClick={handleNextMonth}>
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
          <div className='page-header-profile'>
            <div className='friend-avatar friend-avatar-sm'>
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt={displayName} />
              ) : (
                <span>{displayName.slice(0, 1).toUpperCase()}</span>
              )}
            </div>
            <span className='muted'>{displayName}</span>
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <CalendarGrid
          month={currentMonth}
          weekMode={weekMode}
          workouts={workouts}
          onDayClick={handleDayClick}
          onWorkoutClick={handleWorkoutClick}
          isDragging={isDragging}
        />
      </DndContext>

      <PlannedWorkoutModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        onSave={handleSavePlannedWorkout}
        onUpdate={updatePlannedWorkout}
        onDelete={deletePlannedWorkout}
        onCopy={handleCopyPlannedWorkout}
        onComplete={completePlannedWorkout}
        onUpdateCompleted={updateCompletedWorkout}
        initialDate={selectedDate}
        existingWorkout={editingWorkout}
      />
    </div>
  );
}
