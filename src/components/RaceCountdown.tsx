import { FormEvent, useState } from "react";
import { differenceInDays, format, parseISO } from "date-fns";
import { useProfile } from "../hooks/useProfile";

export default function RaceCountdown() {
  const { profile, loading, setNextRace, clearRace } = useProfile();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");

  if (loading) return null;

  const hasRace = profile?.raceName && profile?.raceDate;

  // If they have a race set, show the countdown
  if (hasRace && !editing) {
    const raceDate = parseISO(profile.raceDate!);
    const daysUntil = differenceInDays(raceDate, new Date());

    // Race is in the past
    if (daysUntil < 0) {
      return (
        <div className="race-countdown">
          <div className="card accent-green">
            <strong>{profile.raceName}</strong> is complete! How did it go?
          </div>
          <button
            className="race-edit-btn"
            onClick={() => {
              clearRace();
              setName("");
              setDate("");
            }}
          >
            Set your next race
          </button>
        </div>
      );
    }

    return (
      <div className="race-countdown">
        <div className="card accent-blue">
          <strong>{daysUntil} {daysUntil === 1 ? "day" : "days"}</strong> until{" "}
          <strong>{profile.raceName}</strong> ({format(raceDate, "MMMM d, yyyy")})
        </div>
        <button
          className="race-edit-btn"
          onClick={() => {
            setName(profile.raceName!);
            setDate(profile.raceDate!);
            setEditing(true);
          }}
        >
          Change race
        </button>
      </div>
    );
  }

  // No race set (or editing) — show the form
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !date) return;
    await setNextRace(name.trim(), date);
    setEditing(false);
  };

  return (
    <div className="race-setup">
      <form className="race-form" onSubmit={handleSubmit}>
        <p className="race-prompt">When's your next race?</p>
        <div className="race-form-fields">
          <input
            type="text"
            placeholder="Race name (e.g. Charleston Sprint)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button type="submit">Set Race</button>
        </div>
        {editing && (
          <button type="button" className="race-cancel-btn" onClick={() => setEditing(false)}>
            Cancel
          </button>
        )}
      </form>
    </div>
  );
}
