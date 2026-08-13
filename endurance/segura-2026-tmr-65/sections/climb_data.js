const halfMiles = [
  { mile: 0.5, elev: 8788, grade: 1.4 },
  { mile: 1.0, elev: 8884, grade: 3.6 },
  { mile: 1.5, elev: 8969, grade: 3.2 },
  { mile: 2.0, elev: 9034, grade: 2.5 },
  { mile: 2.5, elev: 9295, grade: 9.9 },
  { mile: 3.0, elev: 9563, grade: 10.2 },
  { mile: 3.5, elev: 9822, grade: 9.8 },
  { mile: 4.0, elev: 10086, grade: 10.0 },
  { mile: 4.5, elev: 10372, grade: 10.8 },
  { mile: 5.0, elev: 10801, grade: 16.2 },
  { mile: 5.5, elev: 11295, grade: 18.7 },
  { mile: 6.0, elev: 11812, grade: 19.6 },
  { mile: 6.5, elev: 12278, grade: 17.7 },
  { mile: 7.0, elev: 12776, grade: 18.9 },
  { mile: 7.5, elev: 13073, grade: 11.2 },
  { mile: 8.0, elev: 13500, grade: 16.2 },
];

const zones = [
  { label: "Runnable", range: "0–8%", color: "#3CB897" },
  { label: "Power hike", range: "8–15%", color: "#E8943A" },
  { label: "Hard grind", range: ">15%", color: "#A32D2D" },
];

function climbGetColor(grade) {
  if (grade > 15) return "#A32D2D";
  if (grade > 8) return "#E8943A";
  return "#3CB897";
}

function climbGetZoneLabel(grade) {
  if (grade > 15) return "Hard grind — commit to hike";
  if (grade > 8) return "Power hike zone";
  return "Runnable if pace is right";
}

