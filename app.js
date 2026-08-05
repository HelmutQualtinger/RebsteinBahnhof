'use strict';

const API = 'https://transport.opendata.ch/v1';
const DEFAULT_STATION_ID = '8506318';
const HORIZON_HOURS = 24;
const REFRESH_MS = 30000;
const CACHE_TTL_MS = 25000;
const STATION_STORAGE_KEY = 'rebsteinBahnhof.stationId';

// All SBB/Appenzell-Bahnen train stations in Kanton St. Gallen. Built by harvesting
// real stationboard passLists from the region's hub stations and keeping only the
// stops that fall inside the official St. Gallen canton boundary (swisstopo
// swissboundaries3d), verified by point-in-polygon test — not a hand-typed guess.
const STATIONS = [
  { id: '8506319', name: 'Altstätten SG' },
  { id: '8506211', name: 'Arnegg' },
  { id: '8506316', name: 'Au SG' },
  { id: '8509004', name: 'Bad Ragaz' },
  { id: '8506205', name: 'Bazenheid' },
  { id: '8503118', name: 'Benken SG' },
  { id: '8503113', name: 'Blumenau' },
  { id: '8506181', name: 'Bronschhofen' },
  { id: '8506188', name: 'Bronschhofen AMP' },
  { id: '8506294', name: 'Brunnadern-Neckertal' },
  { id: '8509404', name: 'Buchs SG' },
  { id: '8506203', name: 'Bütschwil' },
  { id: '8506292', name: 'Degersheim' },
  { id: '8506202', name: 'Dietfurt' },
  { id: '8506297', name: 'Ebnat-Kappel' },
  { id: '8506209', name: 'Flawil' },
  { id: '8509413', name: 'Flums' },
  { id: '8506305', name: 'Goldach' },
  { id: '8506210', name: 'Gossau SG' },
  { id: '8506317', name: 'Heerbrugg' },
  { id: '8503120', name: 'Jona' },
  { id: '8503117', name: 'Kaltbrunn' },
  { id: '8503112', name: 'Kempraten' },
  { id: '8506298', name: 'Krummenau' },
  { id: '8506201', name: 'Lichtensteig' },
  { id: '8506204', name: 'Lütisburg' },
  { id: '8509412', name: 'Mels' },
  { id: '8506293', name: 'Mogelsberg' },
  { id: '8506396', name: 'Muolen' },
  { id: '8509417', name: 'Murg' },
  { id: '8506304', name: 'Mörschwil' },
  { id: '8506299', name: 'Nesslau-Neu St. Johann' },
  { id: '8509400', name: 'Oberriet SG' },
  { id: '8503110', name: 'Rapperswil SG' },
  { id: '8506318', name: 'Rebstein-Marbach' },
  { id: '8506313', name: 'Rheineck' },
  { id: '8506311', name: 'Rorschach' },
  { id: '8506322', name: 'Rorschach Stadt' },
  { id: '8509405', name: 'Räfis-Burgerau' },
  { id: '8509401', name: 'Rüthi SG' },
  { id: '8509402', name: 'Salez-Sennwald' },
  { id: '8509411', name: 'Sargans' },
  { id: '8503115', name: 'Schmerikon' },
  { id: '8506362', name: 'Schwarzer Bären' },
  { id: '8503119', name: 'Schänis' },
  { id: '8509406', name: 'Sevelen' },
  { id: '8506302', name: 'St. Gallen' },
  { id: '8518100', name: 'St. Gallen Birnbäumen' },
  { id: '8506301', name: 'St. Gallen Bruggen' },
  { id: '8519306', name: 'St. Gallen Güterbahnhof' },
  { id: '8506392', name: 'St. Gallen Haggen' },
  { id: '8506270', name: 'St. Gallen Marktplatz' },
  { id: '8506361', name: 'St. Gallen Notkersegg' },
  { id: '8506371', name: 'St. Gallen Riethüsli' },
  { id: '8506359', name: 'St. Gallen Schülerhaus' },
  { id: '8506358', name: 'St. Gallen Spisertor' },
  { id: '8506303', name: 'St. Gallen St. Fiden' },
  { id: '8506300', name: 'St. Gallen Winkeln' },
  { id: '8506314', name: 'St. Margrethen SG' },
  { id: '8506312', name: 'Staad SG' },
  { id: '8509416', name: 'Unterterzen' },
  { id: '8503116', name: 'Uznach' },
  { id: '8506208', name: 'Uzwil' },
  { id: '8509414', name: 'Walenstadt' },
  { id: '8506200', name: 'Wattwil' },
  { id: '8506206', name: 'Wil SG' },
  { id: '8506393', name: 'Wittenbach' },
  { id: '8503225', name: 'Ziegelbrücke' },
];

// Schematic-map coordinates for each station, projected once (offline) from real WGS84
// coordinates (transport.opendata.ch /locations) into a 640x620 local viewBox via an
// equirectangular projection centred on the canton. A few real-world clusters (St. Gallen
// city halts, Rapperswil urban stops) are too dense to stay legible at canton scale, so
// those were respaced along their true bearing from the local hub station at a fixed
// schematic radius — direction preserved, literal distance not. Not hand-typed; if the
// station list changes, redo the pipeline rather than editing coordinates by hand.
const STATION_MAP_POS = {
  '8506319': [547.4, 197.6], '8506211': [336.8, 128.5], '8506316': [606, 134.5],
  '8509004': [511.9, 568.5], '8506205': [210.2, 161], '8503118': [168.4, 370.7],
  '8503113': [63.6, 351.8], '8506181': [187.6, 96.6], '8506188': [182.2, 84.8],
  '8506294': [252.8, 234.7], '8509404': [493.5, 407.4], '8506203': [214.4, 212.5],
  '8506292': [300.9, 199.3], '8506202': [216.6, 227.9], '8506297': [246.1, 310.3],
  '8506209': [293.7, 155.9], '8509413': [403.1, 480.6], '8506305': [485.5, 96.1],
  '8506210': [337.5, 159.3], '8506317': [596.3, 160.8], '8503120': [57.1, 338.9],
  '8503117': [178, 356.9], '8503112': [32.8, 326], '8506298': [278.8, 325.4],
  '8506201': [220, 253.2], '8506204': [211.6, 186.8], '8509412': [451.4, 524.3],
  '8506293': [260.7, 208.3], '8506396': [395.6, 51.5], '8509417': [311.2, 463.7],
  '8506304': [449.1, 95.1], '8506299': [299.1, 347.9], '8509400': [557.7, 249.3],
  '8503110': [35.7, 349.8], '8506318': [568.3, 178.8], '8506313': [571.2, 103.2],
  '8506311': [512.7, 91.6], '8506322': [500, 94.5], '8509405': [498, 426.2],
  '8509401': [533.2, 286.8], '8509402': [509.9, 333], '8509411': [471.1, 533.4],
  '8503115': [123.3, 349.6], '8506362': [503.5, 135.7], '8503119': [192.9, 418.4],
  '8509406': [504, 451.3], '8506302': [418.3, 147.7], '8518100': [475.7, 139.6],
  '8506301': [386.8, 164.4], '8519306': [402.9, 173], '8506392': [399.2, 160.6],
  '8506270': [434, 147.3], '8506361': [489.6, 137.7], '8506371': [415.7, 177.6],
  '8506359': [461.9, 141.6], '8506358': [448, 143.5], '8506303': [434.7, 134.3],
  '8506300': [370.5, 167.3], '8506314': [603.9, 117.1], '8506312': [532.9, 89.1],
  '8509416': [338.8, 463], '8503116': [149.1, 350.5], '8506208': [253, 134.2],
  '8509414': [378.9, 456.9], '8506200': [222.3, 273.8], '8506206': [191.2, 109.1],
  '8506393': [431.2, 107.3], '8503225': [204, 440.3],
};
const NETZPLAN_VIEWBOX = '0 0 640 620';

// Each entry is one drawn line: a CSS custom-property colour key and the station ids
// it connects, in real geographic/topological order (matches actual SBB/AB/SOB lines).
const NETZPLAN_LINES = [
  ['sbb-red', ['8506311', '8506312', '8506313', '8506314', '8506316', '8506317', '8506318', '8506319', '8509400', '8509401', '8509402', '8509406', '8509405', '8509404', '8509411', '8509004']],
  ['sbb-red', ['8506302', '8506303', '8506304', '8506305', '8506322', '8506311']],
  ['blue-line', ['8503225', '8509417', '8509416', '8509414', '8509413', '8509412', '8509411']],
  ['blue-line', ['8503112', '8503110', '8503120', '8503113', '8503115', '8503116', '8503118', '8503117', '8503119', '8503225']],
  ['green-line', ['8506206', '8506205', '8506204', '8506203', '8506202', '8506201', '8506200', '8506297', '8506298', '8506299']],
  ['green-line', ['8506302', '8506392', '8506301', '8506300', '8506210', '8506211', '8506209', '8506208', '8506206']],
  ['green-line', ['8506206', '8506181', '8506188']],
  ['violet-line', ['8506211', '8506292', '8506293', '8506294', '8506298']],
  ['amber', ['8506302', '8506393', '8506396']],
  ['violet-line', ['8506302', '8506270', '8506358', '8506359', '8518100', '8506361', '8506362']],
  ['violet-line', ['8506302', '8506371']],
  ['ink-dim', ['8506302', '8519306']],
];

// Interchange hubs get a persistent label; the other ~55 stops show their name on
// hover/focus only — labelling all 68 permanently is illegible at this scale.
const NETZPLAN_HUB_IDS = new Set([
  '8506302', '8506206', '8509411', '8503110', '8503225', '8509404',
  '8506200', '8506311', '8506314', '8506319', '8503116', '8509414',
]);

const boardEl = document.getElementById('board');
const clockDigitalEl = document.getElementById('clockDigital');
const updatedAtEl = document.getElementById('updatedAt');
const tabs = [...document.querySelectorAll('.tab')];
const stationSelectEl = document.getElementById('stationSelect');
const stationNameEl = document.getElementById('stationName');
const shareLinks = {
  whatsapp: document.getElementById('shareWhatsapp'),
  x: document.getElementById('shareX'),
  facebook: document.getElementById('shareFacebook'),
  mail: document.getElementById('shareMail'),
};

const modalBackdrop = document.getElementById('modalBackdrop');
const modalClose = document.getElementById('modalClose');
const modalBadge = document.getElementById('modalBadge');
const modalTitle = document.getElementById('modalTitle');
const modalSubtitle = document.getElementById('modalSubtitle');
const stopList = document.getElementById('stopList');

const netzplanBtn = document.getElementById('netzplanBtn');
const netzplanBackdrop = document.getElementById('netzplanBackdrop');
const netzplanClose = document.getElementById('netzplanClose');
const netzplanWrap = document.getElementById('netzplanWrap');

function findStation(id) {
  return STATIONS.find((s) => s.id === id) || STATIONS.find((s) => s.id === DEFAULT_STATION_ID);
}

function shareUrlFor(stationId) {
  const url = new URL(location.href);
  url.search = '';
  url.searchParams.set('station', stationId);
  return url.toString();
}

function updateShareLinks() {
  const url = shareUrlFor(currentStation.id);
  const text = `${currentStation.name} – Live Bahnhoftafel`;
  shareLinks.whatsapp.href = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
  shareLinks.x.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  shareLinks.facebook.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  shareLinks.mail.href = `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}`;
}

const initialStationId = new URLSearchParams(location.search).get('station')
  || localStorage.getItem(STATION_STORAGE_KEY)
  || DEFAULT_STATION_ID;
let currentStation = findStation(initialStationId);
let currentMode = 'departure';
let currentEntries = [];
let refreshTimer = null;

// In-memory cache of stationboard results, keyed by "stationId|mode".
// Avoids refetching the API on every tab/station switch; a background refresh keeps it warm.
const boardCache = new Map();
const cacheKey = (stationId, mode) => `${stationId}|${mode}`;

/* ---------- time helpers ---------- */

function swissDateKey(d) {
  return d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Zurich' });
}

function hhmm(isoString) {
  return isoString ? isoString.slice(11, 16) : '--:--';
}

function swissTimeString(date) {
  return new Intl.DateTimeFormat('de-CH', {
    timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).format(date);
}

function categoryClass(category) {
  const known = ['S', 'R', 'RE', 'REX', 'IR', 'IC', 'EC', 'ICE', 'TGV', 'RJ', 'NJ', 'BUS'];
  return known.includes(category) ? `cat-${category}` : 'cat-default';
}

/* ---------- analog + digital clock (SBB Bahnhofsuhr, Hans Hilfiker) ---------- */

const SVG_NS = 'http://www.w3.org/2000/svg';
const handHourEl = document.getElementById('handHour');
const handMinuteEl = document.getElementById('handMinute');
const handSecondEl = document.getElementById('handSecond');

function buildClockTicks() {
  const ticksGroup = document.getElementById('clockTicks');
  for (let i = 0; i < 60; i++) {
    const angle = i * 6;
    const isHour = i % 5 === 0;
    const el = document.createElementNS(SVG_NS, isHour ? 'polygon' : 'rect');
    if (isHour) {
      // bold trapezoid baton, wider at the rim, narrower toward the centre
      el.setAttribute('points', '-1.7,-46 1.7,-46 2.3,-34 -2.3,-34');
      el.setAttribute('class', 'tick-hour');
    } else {
      el.setAttribute('x', '-0.55');
      el.setAttribute('y', '-46');
      el.setAttribute('width', '1.1');
      el.setAttribute('height', '6.5');
      el.setAttribute('class', 'tick-minute');
    }
    el.setAttribute('transform', `translate(50,50) rotate(${angle})`);
    ticksGroup.appendChild(el);
  }
}

function tickClock() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('de-CH', {
    timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).formatToParts(now).reduce((acc, p) => (acc[p.type] = p.value, acc), {});

  clockDigitalEl.textContent = `${parts.hour}:${parts.minute}:${parts.second}`;

  const s = Number(parts.second), m = Number(parts.minute), h = Number(parts.hour) % 12;
  handSecondEl.setAttribute('transform', `translate(50,50) rotate(${s * 6})`);
  handMinuteEl.setAttribute('transform', `translate(50,50) rotate(${m * 6})`);
  handHourEl.setAttribute('transform', `translate(50,50) rotate(${h * 30 + m * 0.5})`);
}

/* ---------- API ---------- */

async function fetchPage(stationId, mode, datetime) {
  const params = new URLSearchParams({ id: stationId, type: mode, limit: '200' });
  if (datetime) params.set('datetime', datetime);
  const res = await fetch(`${API}/stationboard?${params.toString()}`);
  if (!res.ok) throw new Error(`API-Fehler (${res.status})`);
  const data = await res.json();
  return data.stationboard || [];
}

function toApiDatetime(date) {
  // API expects local Swiss time as "YYYY-MM-DD HH:mm"
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(date).reduce((acc, p) => (acc[p.type] = p.value, acc), {});
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

// Midnight of the Zurich calendar day *after* the given instant, as an API datetime
// string. Adding a full 24h before reading the calendar day guarantees we land on
// "tomorrow" regardless of how close `afterDate` already is to midnight.
function nextZurichMidnight(afterDate) {
  const shifted = new Date(afterDate.getTime() + 24 * 3600 * 1000);
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(shifted).reduce((acc, p) => (acc[p.type] = p.value, acc), {});
  return `${parts.year}-${parts.month}-${parts.day} 00:00`;
}

async function loadBoard(stationId, mode) {
  const now = new Date();
  const horizonTs = now.getTime() + HORIZON_HOURS * 3600 * 1000;

  const seen = new Set();
  const collected = [];
  let cursor = undefined;
  let guard = 0;
  let activeMode = mode;

  while (guard++ < 8) {
    const page = await fetchPage(stationId, activeMode, cursor);
    if (page.length === 0) break;

    let reachedHorizon = false;
    let addedAny = false;
    for (const entry of page) {
      const ts = entry.stop.departureTimestamp || entry.stop.arrivalTimestamp;
      if (!ts) continue;
      const key = `${entry.name}-${ts}`;
      if (seen.has(key)) continue;
      if (ts * 1000 > horizonTs) { reachedHorizon = true; break; }
      seen.add(key);
      collected.push(entry);
      addedAny = true;
    }

    const last = page[page.length - 1];
    const lastTs = last.stop.departureTimestamp || last.stop.arrivalTimestamp;
    if (reachedHorizon || !lastTs || lastTs * 1000 > horizonTs) break;

    if (addedAny) {
      cursor = toApiDatetime(new Date(lastTs * 1000 + 60000));
    } else if (activeMode === 'arrival') {
      // The API's arrival board doesn't roll over the "operating day" on its own —
      // near midnight it keeps returning the same last entry no matter how far the
      // cursor is nudged forward, and querying it for a later calendar day just
      // jumps to that day's very last entry instead of the next chronological one.
      // Once it stalls, fall back to the departure board for the remainder of the
      // horizon: for a through-station the two share the same single timestamp
      // anyway (see CLAUDE.md), and departure reliably paginates across midnight.
      activeMode = 'departure';
      cursor = nextZurichMidnight(new Date(lastTs * 1000));
    } else {
      break; // departure stalled too — nothing more to fetch
    }
  }

  collected.sort((a, b) => {
    const ta = a.stop.departureTimestamp || a.stop.arrivalTimestamp || 0;
    const tb = b.stop.departureTimestamp || b.stop.arrivalTimestamp || 0;
    return ta - tb;
  });

  return collected;
}

/* ---------- rendering ---------- */

function renderBoard(entries) {
  currentEntries = entries;
  boardEl.innerHTML = '';

  if (entries.length === 0) {
    boardEl.innerHTML = `<div class="board-status">Keine Züge in den nächsten ${HORIZON_HOURS}&nbsp;Stunden gefunden.</div>`;
    return;
  }

  const todayKey = swissDateKey(new Date());
  const frag = document.createDocumentFragment();

  entries.forEach((entry, i) => {
    const s = entry.stop;
    const iso = s.departure || s.arrival;
    const dayKey = iso.slice(0, 10);
    const isTomorrow = dayKey !== todayKey;

    const delay = s.delay;
    let delayHtml;
    if (delay == null) delayHtml = `<span class="delay">&ndash;</span>`;
    else if (delay <= 0) delayHtml = `<span class="delay ontime">pünktlich</span>`;
    else delayHtml = `<span class="delay late">${delay}'</span>`;

    const row = document.createElement('div');
    row.className = 'row';
    row.setAttribute('role', 'button');
    row.setAttribute('tabindex', '0');
    row.style.animationDelay = `${Math.min(i, 24) * 18}ms`;
    row.dataset.index = String(i);

    row.innerHTML = `
      <span class="time">${hhmm(iso)}${isTomorrow ? '<span class="day-badge">morgen</span>' : ''}</span>
      <span><span class="line-badge ${categoryClass(entry.category)}">${entry.category}${entry.number || ''}</span></span>
      <span class="dest">${entry.to || '–'}</span>
      <span class="platform">${s.platform ? `<span class="pf-box">${s.platform}</span>` : '&ndash;'}</span>
      ${delayHtml}
    `;

    row.addEventListener('click', () => openModal(entry));
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(entry); }
    });

    frag.appendChild(row);
  });

  boardEl.appendChild(frag);
}

function setStatus(msg, isError) {
  boardEl.innerHTML = `<div class="board-status${isError ? ' error' : ''}">${msg}</div>`;
}

/* ---------- modal / Fahrplan ---------- */

function openModal(entry) {
  const s = entry.stop;
  modalBadge.textContent = `${entry.category}${entry.number || ''}`;
  modalBadge.className = `modal-badge ${categoryClass(entry.category)}`;
  modalTitle.textContent = `${entry.category}${entry.number || ''} → ${entry.to || ''}`;
  modalSubtitle.textContent = `${entry.operator || ''} · ab ${currentStation.name} ${hhmm(s.departure || s.arrival)}${s.platform ? ` · Gleis ${s.platform}` : ''}`;

  stopList.innerHTML = '';

  const origin = document.createElement('li');
  origin.className = 'stop origin';
  origin.innerHTML = `<span class="stop-name">${currentStation.name}</span><span class="stop-time">${hhmm(s.departure || s.arrival)}</span>`;
  stopList.appendChild(origin);

  const stops = (entry.passList || []).filter((p) => p.station && p.station.name);

  if (stops.length === 0) {
    stopList.innerHTML += `<li class="stop-loading">Keine weiteren Halte in den Fahrplandaten.</li>`;
  } else {
    stops.forEach((p) => {
      const li = document.createElement('li');
      li.className = 'stop';
      const time = p.arrival || p.departure;
      li.innerHTML = `<span class="stop-name">${p.station.name}</span><span class="stop-time">${hhmm(time)}</span>`;
      stopList.appendChild(li);
    });
  }

  modalBackdrop.classList.add('open');
}

function closeModal() {
  modalBackdrop.classList.remove('open');
}

modalClose.addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', (e) => {
  if (e.target === modalBackdrop) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeModal(); closeNetzplan(); }
});

/* ---------- Netzplan (schematic network map) ---------- */

const SVG_HTML_NS = 'http://www.w3.org/2000/svg';
let netzplanBuilt = false;

function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_HTML_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function buildNetzplan() {
  const svg = svgEl('svg', { viewBox: NETZPLAN_VIEWBOX, class: 'netzplan-svg', role: 'group', 'aria-label': 'Netzplan Kanton St. Gallen' });

  const linesGroup = svgEl('g', { class: 'netzplan-lines' });
  NETZPLAN_LINES.forEach(([colorKey, ids]) => {
    const points = ids.map((id) => STATION_MAP_POS[id].join(',')).join(' ');
    linesGroup.appendChild(svgEl('polyline', { points, class: `netzplan-line line-${colorKey}` }));
  });
  svg.appendChild(linesGroup);

  const nodesGroup = svgEl('g', { class: 'netzplan-nodes' });
  STATIONS.forEach((station) => {
    const pos = STATION_MAP_POS[station.id];
    if (!pos) return;
    const [x, y] = pos;
    const isHub = NETZPLAN_HUB_IDS.has(station.id);

    const g = svgEl('g', {
      class: `netzplan-station${isHub ? ' is-hub' : ''}`,
      tabindex: '0',
      role: 'button',
      'aria-label': station.name,
      'data-station-id': station.id,
    });

    g.appendChild(svgEl('circle', { cx: x, cy: y, r: 6, class: 'netzplan-hit' }));
    g.appendChild(svgEl('circle', { cx: x, cy: y, r: isHub ? 4.6 : 3.6, class: 'netzplan-dot' }));

    // Flip label to the left of the dot near the right edge of the viewBox so long
    // names (e.g. "St. Margrethen SG") don't get clipped by the SVG viewport.
    const flipLeft = x > 560;
    const label = svgEl('text', {
      x: flipLeft ? x - 8 : x + 8, y: y + 3.2,
      class: `netzplan-label${isHub ? ' is-hub' : ' is-hover-only'}`,
      ...(flipLeft ? { 'text-anchor': 'end' } : {}),
    });
    label.textContent = station.name;
    g.appendChild(label);

    const select = () => { selectStation(station.id); closeNetzplan(); };
    g.addEventListener('click', select);
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); }
    });

    nodesGroup.appendChild(g);
  });
  svg.appendChild(nodesGroup);

  netzplanWrap.innerHTML = '';
  netzplanWrap.appendChild(svg);
  netzplanBuilt = true;
}

function highlightNetzplanSelection() {
  netzplanWrap.querySelectorAll('.netzplan-station').forEach((g) => {
    g.classList.toggle('is-selected', g.dataset.stationId === currentStation.id);
  });
}

function openNetzplan() {
  if (!netzplanBuilt) buildNetzplan();
  highlightNetzplanSelection();
  netzplanBackdrop.classList.add('open');
}

function closeNetzplan() {
  netzplanBackdrop.classList.remove('open');
}

netzplanBtn.addEventListener('click', openNetzplan);
netzplanClose.addEventListener('click', closeNetzplan);
netzplanBackdrop.addEventListener('click', (e) => {
  if (e.target === netzplanBackdrop) closeNetzplan();
});

/* ---------- board loading orchestration ---------- */

async function refresh(stationId, mode, { silent = false } = {}) {
  if (!silent) setStatus(`Lade ${mode === 'departure' ? 'Abfahrten' : 'Ankünfte'}…`);
  try {
    const entries = await loadBoard(stationId, mode);
    const fetchedAt = Date.now();
    boardCache.set(cacheKey(stationId, mode), { entries, fetchedAt });
    if (stationId === currentStation.id && mode === currentMode) {
      renderBoard(entries);
      updatedAtEl.textContent = `Aktualisiert um ${swissTimeString(new Date(fetchedAt))}`;
    }
  } catch (err) {
    if (stationId === currentStation.id && mode === currentMode && !boardCache.has(cacheKey(stationId, mode))) {
      setStatus(`Verbindung zur SBB Open Data API fehlgeschlagen: ${err.message}`, true);
    }
  }
}

function selectTab(mode) {
  currentMode = mode;
  tabs.forEach((t) => {
    const active = t.dataset.mode === mode;
    t.classList.toggle('active', active);
    t.setAttribute('aria-selected', String(active));
  });

  const key = cacheKey(currentStation.id, mode);
  const cached = boardCache.get(key);
  if (cached) {
    // Serve instantly from the in-memory cache, then silently revalidate if stale.
    renderBoard(cached.entries);
    updatedAtEl.textContent = `Aktualisiert um ${swissTimeString(new Date(cached.fetchedAt))}`;
    if (Date.now() - cached.fetchedAt > CACHE_TTL_MS) refresh(currentStation.id, mode, { silent: true });
  } else {
    refresh(currentStation.id, mode);
  }
}

function selectStation(stationId) {
  currentStation = findStation(stationId);
  localStorage.setItem(STATION_STORAGE_KEY, currentStation.id);
  history.replaceState({}, '', shareUrlFor(currentStation.id));
  stationNameEl.textContent = currentStation.name;
  document.title = `${currentStation.name} — Bahnhoftafel`;
  updateShareLinks();
  stationSelectEl.value = currentStation.id;
  if (netzplanBuilt) highlightNetzplanSelection();
  selectTab(currentMode);
}

tabs.forEach((t) => t.addEventListener('click', () => selectTab(t.dataset.mode)));

function populateStationSelect() {
  const sorted = [...STATIONS].sort((a, b) => a.name.localeCompare(b.name, 'de-CH'));
  stationSelectEl.innerHTML = sorted
    .map((s) => `<option value="${s.id}"${s.id === currentStation.id ? ' selected' : ''}>${s.name}</option>`)
    .join('');
  stationSelectEl.addEventListener('change', () => selectStation(stationSelectEl.value));
}

/* ---------- init ---------- */

buildClockTicks();
tickClock();
setInterval(tickClock, 1000);

populateStationSelect();
stationNameEl.textContent = currentStation.name;
document.title = `${currentStation.name} — Bahnhoftafel`;
history.replaceState({}, '', shareUrlFor(currentStation.id));
updateShareLinks();

selectTab('departure');
refreshTimer = setInterval(() => refresh(currentStation.id, currentMode, { silent: true }), REFRESH_MS);
