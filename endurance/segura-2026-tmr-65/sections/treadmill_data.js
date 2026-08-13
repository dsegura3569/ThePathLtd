const legs = [
  {
    id: 1, from: "Town Park", to: "Bridal Veil", miS: 0.0, miE: 3.9, dist: 3.9,
    gain: 1293, loss: 22, elevS: 8764, elevE: 10035, character: "CLIMB",
    color: "#E8943A",
    profile: "Flat first 1.3mi, then steady steepening to Bridal Veil. Max single climb +1,582ft.",
    phases: [
      { label: "Warm-up", miRange: "0–1.3", grade: "2–5%", speed: "3.8–4.4 mph (15:47/mi–13:38/mi)", time: 16 },
      { label: "Build", miRange: "1.3–2.6", grade: "8–14%", speed: "2.7 mph (22:13/mi)", time: 22 },
      { label: "Crux climb", miRange: "2.6–3.9", grade: "16–20%", speed: "1.8–2.1 mph (33:20/mi–28:34/mi)", time: 24 },
    ],
  },
  {
    id: 2, from: "Bridal Veil", to: "Tomboy", miS: 3.9, miE: 9.9, dist: 6.0,
    gain: 3807, loss: 1908, elevS: 10035, elevE: 11934, character: "CLIMB",
    color: "#D4731C",
    profile: "Biggest sustained climb on the front half — Tomboy Road into high basin. Some rolling terrain mid-leg.",
    phases: [
      { label: "Initial climb", miRange: "3.9–5.5", grade: "12–16%", speed: "2.1–2.7 mph (28:34/mi–22:13/mi)", time: 28 },
      { label: "Rolling climb", miRange: "5.5–6.5", grade: "8%", speed: "2.7 mph (22:13/mi)", time: 13 },
      { label: "⟲ SWITCH: backward walk", miRange: "6.5–7.5", grade: "+3% incline, facing backward", speed: "1.2 mph (50:00/mi)", time: 13 },
      { label: "Final push", miRange: "7.5–9.9", grade: "18–22%", speed: "1.8–2.1 mph (33:20/mi–28:34/mi)", time: 30 },
    ],
  },
  {
    id: 3, from: "Tomboy", to: "Oak Street", miS: 9.9, miE: 16.2, dist: 6.3,
    gain: 1312, loss: 4268, elevS: 11934, elevE: 8978, character: "DESCENT",
    color: "#4A9FE8",
    profile: "Net descent back to Telluride town. Includes Imogene Pass area — steepest descent on the whole course (-27.8% at one pitch).",
    phases: [
      { label: "Brief climb", miRange: "9.9–11.0", grade: "10–14%", speed: "2.7 mph (22:13/mi)", time: 14 },
      { label: "⟲ Backward walk (real grade -12 to -18%)", miRange: "11.0–13.5", grade: "+4% incline, facing backward", speed: "1.0–1.2 mph (60:00/mi–50:00/mi)", time: 20 },
      { label: "⟲ Backward walk (real grade -20 to -27%)", miRange: "13.5–16.2", grade: "+6% incline, facing backward", speed: "0.8–1.0 mph (75:00/mi–60:00/mi)", time: 22 },
    ],
    descentNote: "Your treadmill's -3% floor can't replicate this -27.8% descent directly, so this leg uses backward walking on a small positive incline to load the quads eccentrically. It's a reasonable substitute for muscular demand but doesn't train technical footing or ankle stability — pair with real downhill trail (Morrison repeats) for the full picture.",
  },
  {
    id: 4, from: "Oak Street", to: "Prospect", miS: 16.2, miE: 21.1, dist: 4.9,
    gain: 3192, loss: 1033, elevS: 8978, elevE: 11137, character: "CLIMB",
    color: "#D4731C",
    profile: "Ajax Peak climb + Mile and a Half of Sky ridgeline begins. Hardest sustained climbing density on the course.",
    phases: [
      { label: "Ajax lower", miRange: "16.2–17.5", grade: "15–18%", speed: "2.1 mph (28:34/mi)", time: 18 },
      { label: "Ajax upper", miRange: "17.5–19.0", grade: "20–23%", speed: "1.8 mph (33:20/mi)", time: 22 },
      { label: "Ridgeline to Prospect", miRange: "19.0–21.1", grade: "16–20%, rolling", speed: "1.8–2.1 mph (33:20/mi–28:34/mi)", time: 24 },
    ],
  },
  {
    id: 5, from: "Prospect", to: "Gold Hill", miS: 21.1, miE: 25.3, dist: 4.2,
    gain: 2868, loss: 1387, elevS: 11137, elevE: 12619, character: "CLIMB",
    color: "#D4731C",
    profile: "Telluride Peak summit (13,500ft) and second Imogene Pass crossing. Contains 40%+ pitches — exceeds treadmill capability.",
    phases: [
      { label: "Ridge continuation", miRange: "21.1–22.5", grade: "18–24%", speed: "1.8–2.1 mph (33:20/mi–28:34/mi)", time: 20 },
      { label: "Telluride Peak push", miRange: "22.5–23.5", grade: "23–25% (course hits 40%+)", speed: "1.5–1.8 mph (40:00/mi–33:20/mi)", time: 14 },
      { label: "⟲ Backward walk", miRange: "23.5–24.4", grade: "+4% incline, facing backward", speed: "1.0 mph (60:00/mi)", time: 9 },
      { label: "SWITCH: re-climb forward", miRange: "24.4–25.3", grade: "+20% forward", speed: "1.8 mph (33:20/mi)", time: 9 },
    ],
    descentNote: "Real course exceeds your 25% treadmill ceiling here (up to 40.9%). This is a genuine gap — only outdoor training on Morrison/Manitou Incline closes it.",
  },
  {
    id: 6, from: "Gold Hill", to: "Bridal Veil (2nd)", miS: 25.3, miE: 33.6, dist: 8.3,
    gain: 1879, loss: 3879, elevS: 12619, elevE: 10619, character: "DESCENT",
    color: "#4A9FE8",
    profile: "Long net-descent leg back toward Bridal Veil. Longest single leg on the course. Pacer pickup point at the end.",
    phases: [
      { label: "⟲ Backward walk (real grade -10 to -15%)", miRange: "25.3–28.0", grade: "+4% incline, facing backward", speed: "1.0–1.2 mph (60:00/mi–50:00/mi)", time: 24 },
      { label: "Rolling climb", miRange: "28.0–29.5", grade: "10%", speed: "2.7 mph (22:13/mi)", time: 14 },
      { label: "⟲ SWITCH: backward walk", miRange: "29.5–31.0", grade: "+3% incline, facing backward", speed: "1.2 mph (50:00/mi)", time: 14 },
      { label: "⟲ Backward walk (real grade -12 to -16%)", miRange: "31.0–33.6", grade: "+4% incline, facing backward", speed: "1.0 mph (60:00/mi)", time: 22 },
    ],
    descentNote: "Net descent leg — uses backward walking on incline for the descent phases to train eccentric quad load. The rolling middle has real forward-facing climbing (up to +10%) that's properly simulated; lean on that segment for genuine grade stimulus.",
  },
  {
    id: 7, from: "Bridal Veil (2nd)", to: "Red Mountain Pass", miS: 33.6, miE: 40.6, dist: 7.0,
    gain: 2718, loss: 1867, elevS: 10619, elevE: 11471, character: "CLIMB",
    color: "#E8943A",
    profile: "First leg with pacer. Black Bear Pass + Brooklyn Pass climbing sequence. Likely in darkness depending on pace.",
    phases: [
      { label: "Black Bear approach", miRange: "33.6–36.0", grade: "14–18%", speed: "2.1–2.7 mph (28:34/mi–22:13/mi)", time: 26 },
      { label: "Black Bear Pass", miRange: "36.0–37.5", grade: "18–22%", speed: "1.8–2.1 mph (33:20/mi–28:34/mi)", time: 20 },
      { label: "Brooklyn climb", miRange: "37.5–39.0", grade: "+16% forward", speed: "2.1 mph (28:34/mi)", time: 13 },
      { label: "⟲ SWITCH: backward walk", miRange: "39.0–40.6", grade: "+4% incline, facing backward", speed: "1.0 mph (60:00/mi)", time: 13 },
    ],
    nightNote: "At ~20–25hr projected pace, this leg likely falls in full darkness. Consider doing this treadmill session with lights dimmed to simulate headlamp-only visual field.",
  },
  {
    id: 8, from: "Red Mountain Pass", to: "Burro Bridge", miS: 40.6, miE: 48.5, dist: 7.9,
    gain: 1548, loss: 2802, elevS: 11471, elevE: 10217, character: "DESCENT",
    color: "#4A9FE8",
    profile: "Net descent through Howard Fork drainage. Your fastest projected segment — recovery terrain after Black Bear/Brooklyn.",
    phases: [
      { label: "⟲ Backward walk (real grade -10 to -14%)", miRange: "40.6–43.5", grade: "+3% incline, facing backward", speed: "1.2 mph (50:00/mi)", time: 24 },
      { label: "Valley rolling", miRange: "43.5–46.5", grade: "mixed, gentle", speed: "3.8–4.0 mph (15:47/mi–15:00/mi)", time: 22 },
      { label: "⟲ Backward walk (real grade -6 to -10%)", miRange: "46.5–48.5", grade: "+2% incline, facing backward", speed: "1.3–1.5 mph (46:09/mi–40:00/mi)", time: 16 },
    ],
    descentNote: "Gentlest descent leg on the course (-6 to -14%). Backward-walk incline here is mild (+2–3%) since the real grade is gentle too — focus on smooth, controlled steps rather than intensity.",
    nightNote: "Almost certainly in darkness (projected 14–17hr mark). Good leg to practice night nutrition handoffs with pacer.",
  },
  {
    id: 9, from: "Burro Bridge", to: "Ophir", miS: 48.5, miE: 54.0, dist: 5.5,
    gain: 1844, loss: 1002, elevS: 10217, elevE: 11059, character: "CLIMB",
    color: "#E8943A",
    profile: "Ophir Pass climb. Final drop bag before the finish. Likely pre-dawn.",
    phases: [
      { label: "Lower climb", miRange: "48.5–50.5", grade: "10–14%", speed: "2.7 mph (22:13/mi)", time: 18 },
      { label: "Ophir Pass approach", miRange: "50.5–52.5", grade: "16–20%", speed: "1.8–2.1 mph (33:20/mi–28:34/mi)", time: 20 },
      { label: "Summit climb", miRange: "52.5–53.3", grade: "+12% forward", speed: "2.7 mph (22:13/mi)", time: 7 },
      { label: "⟲ SWITCH: backward walk", miRange: "53.3–54.0", grade: "+3% incline, facing backward", speed: "1.2 mph (50:00/mi)", time: 7 },
    ],
    nightNote: "Projected pre-dawn (~19–22hr mark). Last major effort before the final leg — fueling discipline here matters most.",
  },
  {
    id: 10, from: "Ophir", to: "Town Park (Finish)", miS: 54.0, miE: 62.7, dist: 8.7,
    gain: 2842, loss: 4874, elevS: 11059, elevE: 9028, character: "DESCENT",
    color: "#3CB897",
    profile: "Oscar's Pass summit (13,104ft) at ~mile 57, steepest climb on course (+24.8%), then 6-mile final descent through Wasatch Basin and Bear Creek to the finish.",
    phases: [
      { label: "Final climb to Oscar's", miRange: "54.0–57.0", grade: "20–25% (peaks 24.8%)", speed: "1.5–1.8 mph (40:00/mi–33:20/mi)", time: 28 },
      { label: "⟲ Backward walk (real grade -15 to -21%)", miRange: "57.0–59.5", grade: "+5% incline, facing backward", speed: "0.9–1.1 mph (66:40/mi–54:33/mi)", time: 22 },
      { label: "⟲ Backward walk (real grade -12 to -18%)", miRange: "59.5–62.7", grade: "+4% incline, facing backward", speed: "1.0–1.2 mph (60:00/mi–50:00/mi)", time: 26 },
    ],
    descentNote: "This is the finish — your legs will have ~22+ hours on them. Like Leg 3, backward walking on incline substitutes for the real -12% to -21% descent grades here. Consider doing this leg's session after another hard workout occasionally, to practice the backward-walk technique on pre-fatigued legs — closer to race-day reality.",
    finishNote: true,
  },
];

function TreadmillCharBadge(props) {
  const isClimb = props.character === "CLIMB";
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 12,
      background: isClimb ? "#E8943A20" : "#4A9FE820",
      color: isClimb ? "#E8943A" : "#4A9FE8",
    }}>{isClimb ? "↑ CLIMB-dominant" : "↓ DESCENT-dominant"}</span>
  );
}

