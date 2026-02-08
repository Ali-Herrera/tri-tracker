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
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { usePlannedWorkouts } from '../hooks/usePlannedWorkouts';
import CalendarGrid from '../components/CalendarGrid';
import PlannedWorkoutModal from '../components/PlannedWorkoutModal';
import type { PlannedWorkout } from '../types';

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
    deletePlannedWorkout,
    copyPlannedWorkout,
    completePlannedWorkout,
  } = usePlannedWorkouts(queryStart, queryEnd);

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

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const workoutId = active.id as string;
      const newDate = over.id as string;
      updatePlannedWorkout(workoutId, { date: newDate });
    },
    [updatePlannedWorkout],
  );

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingWorkout(null);
  };

  if (loading) {
    return <p>Loading calendar...</p>;
  }

  return (
    <div className='dashboard cal-page'>
      <div className='page-header'>
        <h1>Training Calendar</h1>
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
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <CalendarGrid
          month={currentMonth}
          weekMode={weekMode}
          workouts={workouts}
          onDayClick={handleDayClick}
          onWorkoutClick={handleWorkoutClick}
        />
      </DndContext>

      <PlannedWorkoutModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        onSave={addPlannedWorkout}
        onUpdate={updatePlannedWorkout}
        onDelete={deletePlannedWorkout}
        onCopy={copyPlannedWorkout}
        onComplete={completePlannedWorkout}
        initialDate={selectedDate}
        existingWorkout={editingWorkout}
      />
    </div>
  );
}
