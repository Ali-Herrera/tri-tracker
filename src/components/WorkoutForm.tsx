import { FormEvent, useState } from "react";
import { useWorkouts } from "../hooks/useWorkouts";
import type { Sport } from "../types";

const SPORTS: Sport[] = ["Swim", "Bike", "Run", "Strength"];

export default function WorkoutForm() {
  const { addWorkout } = useWorkouts();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sport, setSport] = useState<Sport>("Swim");
  const [duration, setDuration] = useState(30);
  const [distance, setDistance] = useState(0);
  const [intensity, setIntensity] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccess(false);
    try {
      await addWorkout({
        date: new Date(date + "T12:00:00"),
        sport,
        duration,
        distance,
        intensity,
      });
      setSuccess(true);
      setDuration(30);
      setDistance(0);
      setIntensity(5);
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="workout-form" onSubmit={handleSubmit}>
      <h3>Log Workout</h3>

      <label>
        Date
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>

      <label>
        Sport
        <select value={sport} onChange={(e) => setSport(e.target.value as Sport)}>
          {SPORTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>

      <label>
        Duration (mins)
        <input
          type="number"
          min={1}
          step={1}
          value={duration || ''}
          placeholder="0"
          onChange={(e) => setDuration(Number(e.target.value) || 0)}
          required
        />
      </label>

      <label>
        Distance
        <input
          type="number"
          min={0}
          step={0.1}
          value={distance || ''}
          placeholder="0"
          onChange={(e) => setDistance(Number(e.target.value) || 0)}
          required
        />
      </label>

      <label>
        Intensity ({intensity}/10)
        <input
          type="range"
          min={1}
          max={10}
          value={intensity}
          onChange={(e) => setIntensity(Number(e.target.value))}
        />
      </label>

      <button type="submit" disabled={submitting}>
        {submitting ? "Saving..." : "Log Workout"}
      </button>

      {success && <p className="success-text">Workout recorded!</p>}
    </form>
  );
}
