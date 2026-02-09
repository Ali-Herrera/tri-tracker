import { FormEvent, useState } from "react";
import { useAdaptation } from "../hooks/useAdaptation";
import type { Discipline } from "../types";

const DISCIPLINES: Discipline[] = ["Bike", "Run", "Swim"];

const WORKOUT_OPTIONS: Record<Discipline, string[]> = {
  Run: ["Aerobic Base Build", "Threshold Intervals", "Hill Repeats", "Easy Recovery Run", "Other"],
  Bike: ["Steady State (Post-Intervals)", "Progressive Build (Ride 6)", "Pure Aerobic (Recovery)", "Other"],
  Swim: ["Endurance Sets", "Technique/Drills", "Sprints", "Other"],
};

export default function AdaptationForm() {
  const { addSession } = useAdaptation();
  const [discipline, setDiscipline] = useState<Discipline>("Bike");
  const [type, setType] = useState(WORKOUT_OPTIONS.Bike[0]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Bike: power, Run: pace (min:sec), Swim: speed
  const [avgPower, setAvgPower] = useState(130);
  const [paceMin, setPaceMin] = useState(9);
  const [paceSec, setPaceSec] = useState(30);
  const [swimSpeed, setSwimSpeed] = useState(100);

  const [avgHr, setAvgHr] = useState(120);
  const [drift, setDrift] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleDisciplineChange = (d: Discipline) => {
    setDiscipline(d);
    setType(WORKOUT_OPTIONS[d][0]);
  };

  const computeEf = (): number => {
    let work: number;
    if (discipline === "Bike") {
      work = avgPower;
    } else if (discipline === "Run") {
      const paceDecimal = paceMin + paceSec / 60;
      work = paceDecimal > 0 ? (1 / paceDecimal) * 1000 : 0;
    } else {
      work = swimSpeed;
    }
    return avgHr > 0 ? +(work / avgHr).toFixed(4) : 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccess(false);
    try {
      await addSession({
        date: new Date(date + "T12:00:00"),
        discipline,
        type,
        ef: computeEf(),
        decoupling: drift,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="workout-form" onSubmit={handleSubmit}>
      <h3>Log Session</h3>

      <label>
        Discipline
        <select value={discipline} onChange={(e) => handleDisciplineChange(e.target.value as Discipline)}>
          {DISCIPLINES.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </label>

      <label>
        Workout Category
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {WORKOUT_OPTIONS[discipline].map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </label>

      <label>
        Date
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>

      {discipline === "Bike" && (
        <label>
          Avg Power (Watts)
          <input type="number" min={0} value={avgPower || ''} placeholder="0" onChange={(e) => setAvgPower(Number(e.target.value) || 0)} />
        </label>
      )}

      {discipline === "Run" && (
        <div className="pace-row">
          <label>
            Pace Min
            <input type="number" min={0} max={20} value={paceMin || ''} placeholder="0" onChange={(e) => setPaceMin(Number(e.target.value) || 0)} />
          </label>
          <label>
            Pace Sec
            <input type="number" min={0} max={59} value={paceSec || ''} placeholder="0" onChange={(e) => setPaceSec(Number(e.target.value) || 0)} />
          </label>
        </div>
      )}

      {discipline === "Swim" && (
        <label>
          Avg Speed
          <input type="number" min={0} value={swimSpeed || ''} placeholder="0" onChange={(e) => setSwimSpeed(Number(e.target.value) || 0)} />
        </label>
      )}

      <label>
        Avg Heart Rate (BPM)
        <input type="number" min={1} value={avgHr || ''} placeholder="0" onChange={(e) => setAvgHr(Number(e.target.value) || 0)} required />
      </label>

      <label>
        Decoupling / Drift (%)
        <input
          type="number"
          min={-100}
          max={100}
          step={0.1}
          value={drift || ''}
          placeholder="0"
          onChange={(e) => {
            const v = Number(e.target.value);
            if (e.target.value === '' || Number.isFinite(v)) setDrift(v || 0);
          }}
        />
      </label>

      <button type="submit" disabled={submitting}>
        {submitting ? "Saving..." : "Save Session"}
      </button>

      {success && <p className="success-text">Session logged!</p>}
    </form>
  );
}
