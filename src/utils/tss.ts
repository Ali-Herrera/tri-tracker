export function calculateHrTSS(
  durationHours: number,
  avgHR: number,
  lthr: number,
): number {
  return durationHours * Math.pow(avgHR / lthr, 2) * 100;
}

export function calculatePowerTSS(
  durationHours: number,
  avgPower: number,
  ftp: number,
): number {
  return durationHours * Math.pow(avgPower / ftp, 2) * 100;
}

export function calculateRPEBasedTSS(
  durationHours: number,
  intensity: number,
): number {
  // RPE-based: map 1-10 intensity to perceived effort zones
  // 1-3: Easy (40 TSS/hr), 4-6: Moderate (60 TSS/hr), 7-10: Hard (80 TSS/hr)
  let tssPerHour = 40;
  if (intensity >= 7) {
    tssPerHour = 80;
  } else if (intensity >= 4) {
    tssPerHour = 60;
  }
  return durationHours * tssPerHour;
}

export function calculateTSS(
  duration: number, // in minutes
  avgHR: number | undefined,
  avgPower: number | undefined,
  intensity: number | undefined,
  sport: 'Swim' | 'Bike' | 'Run',
  athleteMetrics: {
    swim: { lthr?: number };
    bike: { lthr?: number; ftp?: number };
    run: { lthr?: number; ftp?: number };
  },
): number | null {
  const durationHours = duration / 60;

  // For Swim, use RPE-based approach
  if (sport === 'Swim' && intensity) {
    return calculateRPEBasedTSS(durationHours, intensity);
  }

  if (avgPower && sport === 'Bike' && athleteMetrics.bike.ftp) {
    return calculatePowerTSS(durationHours, avgPower, athleteMetrics.bike.ftp);
  } else if (avgPower && sport === 'Run' && athleteMetrics.run.ftp) {
    return calculatePowerTSS(durationHours, avgPower, athleteMetrics.run.ftp);
  } else if (
    avgHR &&
    athleteMetrics[sport.toLowerCase() as 'swim' | 'bike' | 'run'].lthr
  ) {
    const lthr =
      athleteMetrics[sport.toLowerCase() as 'swim' | 'bike' | 'run'].lthr!;
    return calculateHrTSS(durationHours, avgHR, lthr);
  }

  return null; // Cannot calculate TSS
}
