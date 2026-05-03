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

export function calculateTSS(
  duration: number, // in minutes
  avgHR: number | undefined,
  avgPower: number | undefined,
  sport: 'Swim' | 'Bike' | 'Run',
  athleteMetrics: {
    swim: { lthr?: number; css?: number };
    bike: { lthr?: number; ftp?: number };
    run: { lthr?: number; ftp?: number };
  },
): number | null {
  const durationHours = duration / 60;

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
