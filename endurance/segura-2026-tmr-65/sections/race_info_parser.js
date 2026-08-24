// ---------------------------------------------------------------------------
// Race Info Parser
//
// Race websites have no standard format -- unlike GPX, there's no schema to
// rely on. This is deliberately heuristic: regex/pattern matching over pasted
// text, surfacing candidates for the person to confirm or correct rather than
// silently applying a guess. Never treat any of this as authoritative on its
// own; it's a starting point, not a source of truth.
// ---------------------------------------------------------------------------

const MONTH_NAMES = ['january','february','march','april','may','june','july','august','september','october','november','december'];
const MONTH_ABBR = ['jan','feb','mar','apr','may','jun','jul','aug','sep','sept','oct','nov','dec'];

function extractRaceDate(text) {
  // "August 22, 2026" / "Aug 22, 2026" / "Saturday, August 22, 2026"
  const monthNamePattern = new RegExp(
    `\\b(${MONTH_NAMES.join('|')}|${MONTH_ABBR.join('|')})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`, 'i'
  );
  const m1 = text.match(monthNamePattern);
  if (m1) {
    const monthIdx = MONTH_NAMES.indexOf(m1[1].toLowerCase()) >= 0
      ? MONTH_NAMES.indexOf(m1[1].toLowerCase())
      : MONTH_ABBR.indexOf(m1[1].toLowerCase().replace('.', ''));
    if (monthIdx >= 0) {
      const day = parseInt(m1[2], 10), year = parseInt(m1[3], 10);
      return { iso: `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`, matchedText: m1[0] };
    }
  }
  // "8/22/2026" or "08-22-2026"
  const m2 = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
  if (m2) {
    const month = parseInt(m2[1], 10), day = parseInt(m2[2], 10), year = parseInt(m2[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { iso: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, matchedText: m2[0] };
    }
  }
  return null;
}

function parseTimeToHHMM(raw) {
  const m = raw.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const period = m[3] ? m[3].toLowerCase() : null;
  if (period === 'pm' && h < 12) h += 12;
  if (period === 'am' && h === 12) h = 0;
  if (!period && h <= 6) h += 12; // bare "6:00 start" on a race page is overwhelmingly PM-ambiguous->assume race context; but most starts are AM, so only nudge very early bare hours -- left conservative, see note below
  return { h, min };
}

function extractStartTime(text) {
  // Look for a time within ~40 chars of the word "start"
  const idx = text.toLowerCase().search(/\bstart(s|ing)?\b/);
  if (idx === -1) return null;
  const window = text.slice(Math.max(0, idx - 40), idx + 40);
  const m = window.match(/\b(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)\b/);
  if (!m) return null;
  const parsed = parseTimeToHHMM(m[0]);
  if (!parsed) return null;
  return { hh: parsed.h, mm: parsed.min, matchedText: m[0] };
}

// Scans line by line for anything that looks like an aid-station mention:
// a line containing a mile number. Everything else (name, cutoff time, drop
// bag / crew / pacer flags) is inferred from the same line and a small
// window around it, all presented as editable candidates -- never applied
// without the person confirming which existing segment (if any) it matches.
function extractAidStationMentions(text) {
  const lines = text.split(/\r?\n/);
  const mentions = [];
  const milePattern = /\b(?:mile|mi\.?)\s*#?\s*(\d{1,3}(?:\.\d{1,2})?)\b/i;

  lines.forEach((line, i) => {
    const mileMatch = line.match(milePattern);
    if (!mileMatch) return;
    const mile = parseFloat(mileMatch[1]);
    if (isNaN(mile)) return;

    // candidate name: text before the mile mention, stripped of table
    // separators, trailing punctuation, and leading numbering
    let namePart = line.slice(0, mileMatch.index)
      .replace(/[|,\t]+$/, '')
      .replace(/[\s\-–—(),.:]+$/, '')
      .replace(/^[\s\-–—•\d.:)]+/, '')
      .trim();
    if (!namePart) namePart = null;

    // Cutoff time and drop-bag/crew/pacer flags are read from THIS line only.
    // An earlier version fell back to checking neighboring lines when the
    // current line had nothing, which sounds helpful for multi-line station
    // blocks but in practice meant one station's cutoff or flags would
    // silently bleed onto the NEXT or PREVIOUS station (confirmed with a
    // real test case: "Finish" with no cutoff of its own inherited the
    // previous station's cutoff time, and a station with only "Crew
    // accessible" showed a false "Drop bag" flag from the next line). In a
    // review-before-apply flow, a wrong-looking-plausible value is worse
    // than a missed one the person has to fill in themselves.
    const timePattern = /\b(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)\b/;
    const cutoffMatch = line.match(timePattern);
    const cutoff = cutoffMatch ? parseTimeToHHMM(cutoffMatch[0]) : null;

    mentions.push({
      lineNumber: i + 1,
      rawLine: line.trim(),
      name: namePart,
      mile,
      cutoffHH: cutoff ? cutoff.h : null,
      cutoffMM: cutoff ? cutoff.min : null,
      cutoffMatchedText: cutoffMatch ? cutoffMatch[0] : null,
      dropBag: /drop\s*bag/i.test(line),
      crew: /\bcrew\b/i.test(line),
      pacer: /\bpacer/i.test(line),
    });
  });

  return mentions;
}

function parseRaceInfoText(text) {
  return {
    date: extractRaceDate(text),
    startTime: extractStartTime(text),
    aidStations: extractAidStationMentions(text),
  };
}

window.parseRaceInfoText = parseRaceInfoText;
