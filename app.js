// --- STATE & DATA ---
const FORMATIONS = {
  5: [{ key: "1-2-1", rows: [1, 2, 1] }, { key: "1-1-2", rows: [1, 1, 2] }, { key: "2-1-1", rows: [2, 1, 1] }, { key: "1-3", rows: [1, 3] }],
  6: [{ key: "2-2-1", rows: [2, 2, 1] }, { key: "1-3-1", rows: [1, 3, 1] }, { key: "2-1-2", rows: [2, 1, 2] }, { key: "1-2-2", rows: [1, 2, 2] }],
  7: [{ key: "3-1-2", rows: [3, 1, 2] }, { key: "2-3-1", rows: [2, 3, 1] }, { key: "3-2-1", rows: [3, 2, 1] }, { key: "2-2-2", rows: [2, 2, 2] }, { key: "1-3-2", rows: [1, 3, 2] }],
  8: [{ key: "3-2-2", rows: [3, 2, 2] }, { key: "3-3-1", rows: [3, 3, 1] }, { key: "2-3-2", rows: [2, 3, 2] }, { key: "2-4-1", rows: [2, 4, 1] }, { key: "3-1-3", rows: [3, 1, 3] }],
  9: [{ key: "3-3-2", rows: [3, 3, 2] }, { key: "4-3-1", rows: [4, 3, 1] }, { key: "3-2-3", rows: [3, 2, 3] }, { key: "4-2-2", rows: [4, 2, 2] }, { key: "2-4-2", rows: [2, 4, 2] }],
  10: [{ key: "4-3-2", rows: [4, 3, 2] }, { key: "3-4-2", rows: [3, 4, 2] }, { key: "4-4-1", rows: [4, 4, 1] }, { key: "3-3-3", rows: [3, 3, 3] }, { key: "4-2-3", rows: [4, 2, 3] }],
  11: [{ key: "4-4-2", rows: [4, 4, 2] }, { key: "4-3-3", rows: [4, 3, 3] }, { key: "3-5-2", rows: [3, 5, 2] }, { key: "4-5-1", rows: [4, 5, 1] }, { key: "3-4-3", rows: [3, 4, 3] }, { key: "5-3-2", rows: [5, 3, 2] }],
};

let players = [];
let playerCount = 7;
let formationKey = FORMATIONS[7][0].key;
let assignments = {};
let benchAssignments = { B0: null, B1: null, B2: null, B3: null, B4: null };
let roles = {};
let selectedPlayerId = null;
let currentTab = 'lineup';

// Free Mode State
let freeMode = false;
let customPositions = {};

// Roster filter state
const rosterState = {
  lineup: { query: "", pos: "all", team: "all" }
};

// --- TEAM HELPERS ---
function teamLabel(team) {
  if (team === "a") return "A Team";
  if (team === "asubs") return "A Team Subs";
  if (team === "b") return "Academy";
  return "";
}
function teamClass(team) {
  if (team === "a") return "team-a";
  if (team === "asubs") return "team-asubs";
  if (team === "b") return "team-b";
  return "";
}
function teamOrder(team) {
  if (team === "a") return 0;
  if (team === "asubs") return 1;
  if (team === "b") return 2;
  return 99;
}
function posClass(pos) {
  const p = (pos || "").toLowerCase();
  if (p === "att") return "pos-att";
  if (p === "mid") return "pos-mid";
  if (p === "def") return "pos-def";
  if (p === "gk") return "pos-gk";
  return "";
}

// --- NAV / TABS LOGIC ---
const views = { lineup: document.getElementById('lineupView'), stats: document.getElementById('statsView') };
const navBtns = { lineup: document.getElementById('navLineup'), stats: document.getElementById('navStats') };
const topbarSub = document.getElementById('topbarSub');
const SUBTITLES = {
  lineup: "Build your matchday lineup",
  stats: "Squad composition at a glance"
};

function setTab(tab) {
  currentTab = tab;
  Object.keys(views).forEach(k => views[k].classList.toggle('visible', k === tab));
  Object.keys(navBtns).forEach(k => navBtns[k].classList.toggle('active', k === tab));
  topbarSub.textContent = SUBTITLES[tab];

  document.getElementById('lineupControls1').style.display = (tab === 'lineup') ? 'flex' : 'none';
  document.getElementById('lineupControls2').style.display = (tab === 'lineup') ? 'flex' : 'none';

  if (tab === 'lineup') { renderRoster('lineup'); }
  else if (tab === 'stats') { renderStats(); }
}
navBtns.lineup.onclick = () => setTab('lineup');
navBtns.stats.onclick = () => setTab('stats');

// Match details bindings
const ids = ['matchNameIn', 'matchTypeIn', 'matchTimeIn'];
const outs = ['outName', 'outType', 'outTime'];
ids.forEach((id, i) => {
  document.getElementById(id).addEventListener('input', (e) => { document.getElementById(outs[i]).textContent = e.target.value; });
});

function buildSlots(rows) {
  const slots = [{ id: "GK", label: "GK", row: 0 }];
  const totalRows = rows.length;
  rows.forEach((count, rowIndex) => {
    for (let i = 0; i < count; i++) {
      slots.push({ id: "R" + rowIndex + "-" + i, label: rowLabel(rowIndex, totalRows), row: rowIndex + 1 });
    }
  });
  return slots;
}

function rowLabel(rowIndex, totalRows) {
  if (totalRows === 1) return "FWD";
  if (rowIndex === 0) return "DEF";
  if (rowIndex === totalRows - 1) return "FWD";
  if (totalRows === 2) return rowIndex === 0 ? "DEF" : "FWD";
  return "MID";
}

function computeCoords(rows) {
  const totalRows = rows.length;
  const coords = { "GK": { x: 150, y: 360 } };
  const yNearGK = 290, yFarFromGK = 65;
  rows.forEach((count, rowIndex) => {
    const y = totalRows === 1 ? (yNearGK + yFarFromGK) / 2 : yNearGK + (rowIndex * (yFarFromGK - yNearGK)) / (totalRows - 1);
    for (let i = 0; i < count; i++) coords["R" + rowIndex + "-" + i] = { x: (300 * (i + 1)) / (count + 1), y };
  });
  return coords;
}

function renderPlayerCountOptions() {
  const sel = document.getElementById("playerCount");
  sel.innerHTML = "";
  Object.keys(FORMATIONS).map(Number).sort((a, b) => a - b).forEach(n => {
    const opt = document.createElement("option"); opt.value = n; opt.textContent = n + " players";
    if (n === playerCount) opt.selected = true; sel.appendChild(opt);
  });
}

function renderFormationOptions() {
  const sel = document.getElementById("formationSelect");
  sel.innerHTML = "";
  FORMATIONS[playerCount].forEach(f => {
    const opt = document.createElement("option"); opt.value = f.key; opt.textContent = f.key;
    if (f.key === formationKey) opt.selected = true; sel.appendChild(opt);
  });
}

function currentFormation() {
  return FORMATIONS[playerCount].find(f => f.key === formationKey) || FORMATIONS[playerCount][0];
}

function renderPitch() {
  const formation = currentFormation();
  const slots = buildSlots(formation.rows);
  const coords = computeCoords(formation.rows);
  const layer = document.getElementById("slotsLayer");
  layer.innerHTML = "";

  const validIds = new Set(slots.map(s => s.id));
  Object.keys(assignments).forEach(slotId => {
    if (!validIds.has(slotId)) { delete assignments[slotId]; delete roles[slotId]; }
  });

  slots.forEach(slot => {
    const div = document.createElement("div"); div.className = "slot";

    if (freeMode && customPositions[slot.id]) {
      div.style.left = customPositions[slot.id].xPerc + "%";
      div.style.top = customPositions[slot.id].yPerc + "%";
    } else {
      const coord = coords[slot.id];
      div.style.left = (coord.x / 300 * 100) + "%";
      div.style.top = (coord.y / 400 * 100) + "%";
    }

    const playerId = assignments[slot.id];
    const player = playerId ? players.find(p => p.id === playerId) : null;
    const badge = document.createElement("div"); badge.className = "slot-badge";

    if (player) {
      div.classList.add("filled");
      if (player.avatar) {
        const img = document.createElement("img"); img.src = player.avatar; badge.appendChild(img);
      } else {
        badge.textContent = initials(player.name); badge.style.color = "#fff"; badge.style.fontWeight = "700"; badge.style.fontSize = "20px";
      }
      if (roles[slot.id]) {
        const capBadge = document.createElement("div"); capBadge.className = "cap-badge"; capBadge.textContent = roles[slot.id]; badge.appendChild(capBadge);
      }
      const removeX = document.createElement("div"); removeX.className = "remove-x"; removeX.textContent = "×";
      removeX.onclick = (e) => { e.stopPropagation(); delete assignments[slot.id]; delete roles[slot.id]; renderPitch(); renderRoster('lineup'); };
      div.appendChild(removeX);
    } else {
      const icon = document.createElement("div"); icon.className = "empty-icon"; icon.textContent = "+"; badge.appendChild(icon);
    }

    div.appendChild(badge);
    const posLabel = document.createElement("div"); posLabel.className = "slot-pos"; posLabel.textContent = slot.label; div.appendChild(posLabel);
    if (player) { const nameLabel = document.createElement("div"); nameLabel.className = "slot-name"; nameLabel.textContent = player.name; div.appendChild(nameLabel); }

    if (freeMode) {
      div.style.cursor = "grab";
      let isDragging = false;
      let startX, startY;

      div.onpointerdown = (e) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        isDragging = false;
        startX = e.clientX;
        startY = e.clientY;
        div.setPointerCapture(e.pointerId);

        div.onpointermove = (ev) => {
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;
          if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
            isDragging = true;
            div.style.cursor = "grabbing";
          }
          if (isDragging) {
            const pitchRect = document.getElementById("pitchWrap").getBoundingClientRect();
            let posX = ((ev.clientX - pitchRect.left) / pitchRect.width) * 100;
            let posY = ((ev.clientY - pitchRect.top) / pitchRect.height) * 100;
            posX = Math.max(4, Math.min(96, posX));
            posY = Math.max(4, Math.min(96, posY));

            customPositions[slot.id] = { xPerc: posX, yPerc: posY };
            div.style.left = posX + "%";
            div.style.top = posY + "%";
          }
        };

        div.onpointerup = (ev) => {
          try { div.releasePointerCapture(ev.pointerId); } catch (err) {}
          div.onpointermove = null;
          div.onpointerup = null;
          div.style.cursor = "grab";
          if (!isDragging) {
            onSlotClick(slot.id);
          }
        };
      };
    } else {
      div.onclick = () => onSlotClick(slot.id);
    }

    div.oncontextmenu = (e) => {
      e.preventDefault(); e.stopPropagation();
      if (!player) return;
      if (roles[slot.id] === 'C') roles[slot.id] = 'VC';
      else if (roles[slot.id] === 'VC') delete roles[slot.id];
      else roles[slot.id] = 'C';
      renderPitch();
    };

    layer.appendChild(div);
  });
}

function renderBench() {
  const layer = document.getElementById("benchSlotsLayer");
  layer.innerHTML = "";
  ["B0", "B1", "B2", "B3", "B4"].forEach(slotId => {
    const div = document.createElement("div"); div.className = "bench-slot";
    const playerId = benchAssignments[slotId];
    const player = playerId ? players.find(p => p.id === playerId) : null;
    const badge = document.createElement("div"); badge.className = "bench-badge";

    if (player) {
      div.classList.add("filled");
      if (player.avatar) {
        const img = document.createElement("img"); img.src = player.avatar; badge.appendChild(img);
      } else { badge.textContent = initials(player.name); badge.style.color = "#fff"; badge.style.fontWeight = "700"; badge.style.fontSize = "13px"; }

      const removeX = document.createElement("div"); removeX.className = "bench-remove-x"; removeX.textContent = "×";
      removeX.onclick = (e) => { e.stopPropagation(); benchAssignments[slotId] = null; renderBench(); renderRoster('lineup'); };
      div.appendChild(removeX);
    } else {
      const icon = document.createElement("div"); icon.className = "bench-empty-icon"; icon.textContent = "+"; badge.appendChild(icon);
    }
    div.appendChild(badge);
    if (player) { const nameLabel = document.createElement("div"); nameLabel.className = "bench-slot-name"; nameLabel.textContent = player.name; div.appendChild(nameLabel); }
    div.onclick = () => onBenchSlotClick(slotId);
    layer.appendChild(div);
  });
}

// --- CLICK ASSIGNMENTS ---
function onBenchSlotClick(slotId) {
  if (selectedPlayerId) {
    Object.keys(assignments).forEach(sid => { if (assignments[sid] === selectedPlayerId) { delete assignments[sid]; delete roles[sid]; } });
    Object.keys(benchAssignments).forEach(sid => { if (benchAssignments[sid] === selectedPlayerId) benchAssignments[sid] = null; });
    benchAssignments[slotId] = selectedPlayerId; selectedPlayerId = null;
    renderPitch(); renderBench(); renderRoster('lineup');
  } else if (benchAssignments[slotId]) {
    selectedPlayerId = benchAssignments[slotId]; benchAssignments[slotId] = null;
    renderPitch(); renderBench(); renderRoster('lineup');
  }
}

function onSlotClick(slotId) {
  if (selectedPlayerId) {
    Object.keys(assignments).forEach(sid => { if (assignments[sid] === selectedPlayerId) { delete assignments[sid]; delete roles[sid]; } });
    Object.keys(benchAssignments).forEach(sid => { if (benchAssignments[sid] === selectedPlayerId) benchAssignments[sid] = null; });
    assignments[slotId] = selectedPlayerId; selectedPlayerId = null;
    renderPitch(); renderBench(); renderRoster('lineup');
  } else if (assignments[slotId]) {
    selectedPlayerId = assignments[slotId]; delete assignments[slotId]; delete roles[slotId];
    renderPitch(); renderBench(); renderRoster('lineup');
  }
}

function initials(name) { return name.trim().split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase(); }

// --- ROSTER PANEL ---
const rosterTemplate = document.getElementById('rosterTemplate');
const rosterMounts = {
  lineup: document.getElementById('rosterPanelLineup')
};

function initRosterPanel(key) {
  const mount = rosterMounts[key];
  mount.appendChild(rosterTemplate.content.cloneNode(true));

  const searchEl = mount.querySelector('.roster-search');
  const posEl = mount.querySelector('.roster-pos-select');
  const teamBtns = mount.querySelectorAll('.rtt-btn');

  searchEl.oninput = () => { rosterState[key].query = searchEl.value.trim().toLowerCase(); renderRoster(key); };
  posEl.onchange = () => { rosterState[key].pos = posEl.value.toLowerCase(); renderRoster(key); };
  teamBtns.forEach(btn => {
    btn.onclick = () => {
      teamBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      rosterState[key].team = btn.dataset.team;
      renderRoster(key);
    };
  });
}
initRosterPanel('lineup');

function renderRoster(key) {
  const mount = rosterMounts[key];
  const list = mount.querySelector('.roster-list');
  const state = rosterState[key];
  list.innerHTML = "";

  const placedIds = new Set([...Object.values(assignments), ...Object.values(benchAssignments).filter(Boolean)]);
  const benchIds = new Set(Object.values(benchAssignments).filter(Boolean));

  const posOrder = { att: 1, mid: 2, def: 3, gk: 4 };

  [...players].sort((a, b) => {
    const teamA = teamOrder(a.team), teamB = teamOrder(b.team);
    if (teamA !== teamB) return teamA - teamB;

    const posA = posOrder[(a.position || "").toLowerCase()] || 99;
    const posB = posOrder[(b.position || "").toLowerCase()] || 99;
    if (posA !== posB) return posA - posB;

    return a.name.localeCompare(b.name);
  })
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(state.query);
      const playerPos = (p.position || "").toLowerCase();
      const matchesPos = (state.pos === "all") || (playerPos === state.pos);
      const matchesTeam = (state.team === "all") || (p.team === state.team);
      return matchesSearch && matchesPos && matchesTeam;
    })
    .forEach(p => {
      const item = document.createElement("div"); item.className = "roster-item";
      if (p.id === selectedPlayerId) item.classList.add("selected");

      let statusText = teamLabel(p.team);
      if (benchIds.has(p.id)) { statusText = "On bench"; item.classList.add("placed"); }
      else if (placedIds.has(p.id)) { statusText = "On pitch"; item.classList.add("placed"); }

      const avatarCol = document.createElement("div"); avatarCol.className = "roster-avatar-col";
      const img = document.createElement("img"); img.className = "roster-avatar";
      if (p.avatar) img.src = p.avatar;
      avatarCol.appendChild(img);

      if (p.position) {
        const posBadge = document.createElement("span");
        posBadge.className = "roster-pos-badge " + posClass(p.position);
        posBadge.textContent = p.position.toUpperCase();
        avatarCol.appendChild(posBadge);
      }

      const info = document.createElement("div"); info.className = "roster-info";
      const nameRow = document.createElement("div"); nameRow.className = "roster-name-row";
      const nameEl = document.createElement("div"); nameEl.className = "roster-name " + teamClass(p.team); nameEl.textContent = p.name;
      nameRow.appendChild(nameEl);
      const tagEl = document.createElement("div"); tagEl.className = "roster-tag"; tagEl.textContent = statusText;

      info.appendChild(nameRow); info.appendChild(tagEl);
      item.appendChild(avatarCol); item.appendChild(info);

      item.onclick = () => {
        selectedPlayerId = (selectedPlayerId === p.id) ? null : p.id;
        renderRoster(key);
        renderPitch(); renderBench();
      };
      list.appendChild(item);
    });
}

// --- STATS VIEW ---
function renderStats() {
  const mount = document.getElementById('statsScroll');
  const posOrder = ['att', 'mid', 'def', 'gk'];
  const posNames = { att: 'Attackers', mid: 'Midfielders', def: 'Defenders', gk: 'Goalkeepers' };
  const posColors = { att: 'var(--pos-att)', mid: 'var(--pos-mid)', def: 'var(--pos-def)', gk: 'var(--pos-gk)' };

  const total = players.length;
  const counts = { att: 0, mid: 0, def: 0, gk: 0, other: 0 };
  const teamCounts = { a: { att: 0, mid: 0, def: 0, gk: 0, other: 0, total: 0 }, asubs: { att: 0, mid: 0, def: 0, gk: 0, other: 0, total: 0 }, b: { att: 0, mid: 0, def: 0, gk: 0, other: 0, total: 0 } };

  players.forEach(p => {
    const pos = (p.position || "").toLowerCase();
    const bucket = counts.hasOwnProperty(pos) ? pos : 'other';
    counts[bucket]++;
    if (teamCounts[p.team]) {
      teamCounts[p.team].total++;
      const tb = teamCounts[p.team].hasOwnProperty(pos) ? pos : 'other';
      teamCounts[p.team][tb]++;
    }
  });

  const maxCount = Math.max(counts.att, counts.mid, counts.def, counts.gk, 1);

  // Most common position (excludes 'other')
  const posEntries = posOrder.map(k => [k, counts[k]]);
  const mostCommon = posEntries.reduce((a, b) => (b[1] > a[1] ? b : a));

  // Position that lacks players the most, excluding GK per user's request
  const outfieldEntries = posEntries.filter(([k]) => k !== 'gk');
  const leastCommon = outfieldEntries.reduce((a, b) => (b[1] < a[1] ? b : a));

  const teamA = teamCounts.a.total, teamASubs = teamCounts.asubs.total, teamB = teamCounts.b.total;
  const withAvatar = players.filter(p => p.avatar).length;
  const noUserId = players.filter(p => !p.userId).length;

  mount.innerHTML = "";

  // --- Top stat cards ---
  const topGrid = document.createElement('div'); topGrid.className = 'stats-grid-top';

  topGrid.appendChild(statCard({
    hero: true,
    icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    value: String(total),
    label: 'Total players',
    sub: `${teamA} A Team · ${teamASubs} Subs · ${teamB} Academy`
  }));

  topGrid.appendChild(statCard({
    icon: '<path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/>',
    value: posNames[mostCommon[0]],
    label: 'Most common position',
    sub: `${mostCommon[1]} of ${total} players (${Math.round(mostCommon[1] / total * 100)}%)`
  }));

  topGrid.appendChild(statCard({
    icon: '<path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L14.71 3.86a2 2 0 0 0-3.42 0z"/>',
    value: posNames[leastCommon[0]],
    label: 'Thinnest on numbers',
    sub: `Only ${leastCommon[1]} outfield ${leastCommon[1] === 1 ? 'player' : 'players'}, GKs excluded`
  }));

  topGrid.appendChild(statCard({
    icon: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>',
    value: String(withAvatar),
    label: 'Avatars loaded',
    sub: noUserId > 0 ? `${noUserId} missing a Roblox ID` : 'All players have a Roblox ID'
  }));

  mount.appendChild(topGrid);

  // --- Position breakdown ---
  const posSection = document.createElement('div'); posSection.className = 'stats-section';
  posSection.innerHTML = `<h3>Position breakdown</h3><p class="section-sub">Distribution across the entire squad, all teams combined.</p>`;
  const barsWrap = document.createElement('div'); barsWrap.className = 'pos-bars';
  posOrder.forEach(pos => {
    const row = document.createElement('div'); row.className = 'pos-bar-row';
    row.innerHTML = `
      <div class="pos-bar-label"><span class="pos-bar-dot" style="background:${posColors[pos]}"></span>${posNames[pos]}</div>
      <div class="pos-bar-track"><div class="pos-bar-fill" style="width:${(counts[pos] / maxCount * 100)}%; background:${posColors[pos]}"></div></div>
      <div class="pos-bar-count">${counts[pos]}</div>
    `;
    barsWrap.appendChild(row);
  });
  posSection.appendChild(barsWrap);
  mount.appendChild(posSection);

  // --- Team split ---
  const teamSection = document.createElement('div'); teamSection.className = 'stats-section';
  teamSection.innerHTML = `<h3>Squad split by team</h3><p class="section-sub">How the roster breaks down across A Team, Subs, and Academy.</p>`;
  const splitGrid = document.createElement('div'); splitGrid.className = 'team-split-grid';
  [
    { key: 'a', cls: 'tsc-a', name: 'A Team', data: teamCounts.a },
    { key: 'asubs', cls: 'tsc-asubs', name: 'A Team Subs', data: teamCounts.asubs },
    { key: 'b', cls: 'tsc-b', name: 'Academy', data: teamCounts.b }
  ].forEach(t => {
    const card = document.createElement('div'); card.className = 'team-split-card ' + t.cls;
    card.innerHTML = `
      <div class="tsc-name">${t.name}</div>
      <div class="tsc-count">${t.data.total}</div>
      <div class="tsc-breakdown">
        ${t.data.att} att · ${t.data.mid} mid · ${t.data.def} def · ${t.data.gk} gk${t.data.other ? ' · ' + t.data.other + ' other' : ''}
      </div>
    `;
    splitGrid.appendChild(card);
  });
  teamSection.appendChild(splitGrid);
  mount.appendChild(teamSection);

  // --- Insights ---
  const insightSection = document.createElement('div'); insightSection.className = 'stats-section';
  insightSection.innerHTML = `<h3>Squad insights</h3><p class="section-sub">A few quick notes worth knowing.</p>`;
  const insightList = document.createElement('div'); insightList.className = 'insight-list';

  const insights = [];
  insights.push({ tone: 'ok', icon: '⚽', html: `<b>${posNames[mostCommon[0]]}</b> are the deepest position group with ${mostCommon[1]} players.` });
  insights.push({ tone: 'warn', icon: '⚠️', html: `<b>${posNames[leastCommon[0]]}</b> is your shallowest outfield position, only ${leastCommon[1]} available.` });
  if (teamCounts.a.gk < 2) insights.push({ tone: 'warn', icon: '🧤', html: `A Team has just <b>${teamCounts.a.gk}</b> recognised goalkeeper${teamCounts.a.gk === 1 ? '' : 's'}, worth keeping an eye on.` });
  if (noUserId > 0) insights.push({ tone: 'warn', icon: '🆔', html: `<b>${noUserId} player${noUserId === 1 ? '' : 's'}</b> ${noUserId === 1 ? 'is' : 'are'} missing a Roblox ID, so avatars fall back to initials.` });
  insights.push({ tone: 'gold', icon: '🏟️', html: `<b>${teamA}</b> players make up the A Team, backed by <b>${teamASubs}</b> subs and <b>${teamB}</b> in the Academy pipeline.` });

  insights.forEach(ins => {
    const row = document.createElement('div'); row.className = 'insight-row ' + ins.tone;
    row.innerHTML = `<div class="insight-icon">${ins.icon}</div><div class="insight-text">${ins.html}</div>`;
    insightList.appendChild(row);
  });
  insightSection.appendChild(insightList);
  mount.appendChild(insightSection);
}

function statCard({ hero, icon, value, label, sub }) {
  const card = document.createElement('div'); card.className = 'stat-card' + (hero ? ' hero' : '');
  card.innerHTML = `
    <div class="stat-icon"><svg viewBox="0 0 24 24">${icon}</svg></div>
    <div class="stat-value">${value}</div>
    <div class="stat-label">${label}</div>
    ${sub ? `<div class="stat-sub">${sub}</div>` : ''}
  `;
  return card;
}

// --- Header control bindings ---
document.getElementById("logoSelect").onchange = (e) => { document.getElementById("pitchLogo").src = e.target.value; };
document.getElementById("playerCount").onchange = (e) => {
  playerCount = Number(e.target.value);
  formationKey = FORMATIONS[playerCount][0].key;
  assignments = {}; roles = {}; customPositions = {};
  renderFormationOptions(); renderPitch(); renderBench(); renderRoster('lineup');
};
document.getElementById("formationSelect").onchange = (e) => {
  formationKey = e.target.value;
  assignments = {}; roles = {}; customPositions = {};
  renderPitch(); renderBench(); renderRoster('lineup');
};
document.getElementById("clearBtn").onclick = () => {
  assignments = {}; roles = {}; customPositions = {};
  benchAssignments = { B0: null, B1: null, B2: null, B3: null, B4: null };
  selectedPlayerId = null;
  renderPitch(); renderBench(); renderRoster('lineup');
};

// Free Mode Button Handler
const freeModeBtn = document.getElementById("freeModeBtn");
freeModeBtn.onclick = () => {
  freeMode = !freeMode;
  freeModeBtn.textContent = freeMode ? "Free mode: on" : "Free mode: off";
  freeModeBtn.classList.toggle('active', freeMode);
  if (freeMode) {
    const formation = currentFormation();
    const coords = computeCoords(formation.rows);
    const slots = buildSlots(formation.rows);
    slots.forEach(s => {
      if (!customPositions[s.id]) {
        const c = coords[s.id];
        customPositions[s.id] = { xPerc: (c.x / 300) * 100, yPerc: (c.y / 400) * 100 };
      }
    });
  }
  renderPitch();
};

// --- DRAWING MODE LOGIC ---
const drawingCanvas = document.getElementById('drawingCanvas');
const ctx = drawingCanvas.getContext('2d');
let isDrawingMode = false; let isDrawing = false; let drawHistory = [];

ctx.strokeStyle = '#ffff00'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';

document.getElementById('drawToggleBtn').onclick = (e) => {
  isDrawingMode = !isDrawingMode;
  e.target.textContent = isDrawingMode ? "Draw: on" : "Draw: off";
  e.target.classList.toggle('active', isDrawingMode);
  if (isDrawingMode) drawingCanvas.classList.add('active'); else drawingCanvas.classList.remove('active');
};

document.getElementById('clearDrawBtn').onclick = () => { ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height); drawHistory = []; };

function getDrawPos(e) {
  const rect = drawingCanvas.getBoundingClientRect();
  const scaleX = drawingCanvas.width / rect.width;
  const scaleY = drawingCanvas.height / rect.height;
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
}

function startDrawing(e) {
  if (!isDrawingMode) return;
  e.preventDefault();
  drawHistory.push(ctx.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height));
  if (drawHistory.length > 30) drawHistory.shift();
  isDrawing = true;
  const pos = getDrawPos(e);
  ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
}

function drawPointer(e) {
  if (!isDrawing || !isDrawingMode) return;
  e.preventDefault();
  const pos = getDrawPos(e);
  ctx.lineTo(pos.x, pos.y); ctx.stroke();
}

function stopDrawing() { isDrawing = false; }

window.addEventListener('keydown', (e) => {
  if (isDrawingMode && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (drawHistory.length > 0) { const lastState = drawHistory.pop(); ctx.putImageData(lastState, 0, 0); }
    else { ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height); }
  }
});

drawingCanvas.addEventListener('mousedown', startDrawing); drawingCanvas.addEventListener('mousemove', drawPointer); window.addEventListener('mouseup', stopDrawing);
drawingCanvas.addEventListener('touchstart', startDrawing, { passive: false }); drawingCanvas.addEventListener('touchmove', drawPointer, { passive: false }); window.addEventListener('touchend', stopDrawing);

document.getElementById("webhookUrl").addEventListener("input", (e) => {
  try { localStorage.setItem("lineupPlanner_webhookUrl", e.target.value.trim()); } catch (err) {}
});

// EXPORT FUNCTION
async function generateCanvas() {
  const captureElement = document.getElementById("captureArea");
  captureElement.classList.add('export-mode');
  await new Promise(r => setTimeout(r, 150)); window.scrollTo(0, 0); await new Promise(r => setTimeout(r, 50));
  const rect = captureElement.getBoundingClientRect();
  const canvas = await html2canvas(captureElement, {
    useCORS: true, backgroundColor: "#0a0e14", scale: 2, x: rect.left, y: rect.top, width: rect.width, height: rect.height,
    windowWidth: document.documentElement.scrollWidth, windowHeight: document.documentElement.scrollHeight
  });
  captureElement.classList.remove('export-mode');
  return canvas;
}

document.getElementById("downloadBtn").onclick = async () => {
  const btn = document.getElementById("downloadBtn"); btn.textContent = "Saving...";
  const canvas = await generateCanvas();
  const teamName = document.getElementById("logoSelect").selectedOptions[0].textContent.trim().replace(/\s+/g, "-").toLowerCase();
  const link = document.createElement("a"); link.download = teamName + "-lineup.png"; link.href = canvas.toDataURL("image/png"); link.click();
  btn.textContent = "Save image";
};

function absoluteUrl(path) { try { return new URL(path, window.location.href).href; } catch (e) { return path; } }
const CORS_RELAY = "https://corsproxy.io/?url=";

async function postToDiscord(webhookUrl, formData) {
  try { return await fetch(webhookUrl, { method: 'POST', body: formData }); }
  catch (directErr) { return await fetch(CORS_RELAY + encodeURIComponent(webhookUrl), { method: 'POST', body: formData }); }
}

document.getElementById("discordBtn").onclick = async () => {
  const webhookUrl = document.getElementById("webhookUrl").value.trim();
  if (!webhookUrl) { alert("Please paste a Discord Webhook URL in the top right box first!"); return; }
  const btn = document.getElementById("discordBtn"); const ogText = btn.innerHTML; btn.innerHTML = "Sending..."; btn.disabled = true;
  try {
    const canvas = await generateCanvas();
    canvas.toBlob(async (blob) => {
      try {
        const teamName = document.getElementById("logoSelect").selectedOptions[0].textContent.trim();
        const logoUrl = absoluteUrl(document.getElementById("pitchLogo").src);
        const formData = new FormData(); formData.append('file', blob, 'lineup.png'); formData.append('payload_json', JSON.stringify({ username: teamName + " | Lineup", avatar_url: logoUrl }));
        const res = await postToDiscord(webhookUrl, formData);
        if (res.ok) alert("Successfully sent to Discord!"); else alert("Discord rejected the request.");
      } catch (sendErr) { alert("Couldn't reach Discord. Check relay settings."); }
      btn.innerHTML = ogText; btn.disabled = false;
    });
  } catch (e) { alert("Error taking screenshot"); btn.innerHTML = ogText; btn.disabled = false; }
};

async function init() {
  try {
    const res = await fetch('players.json');
    const data = await res.json();

    players = data.map((p, i) => ({ id: "p" + i, ...p, avatar: "" }));

    const userIds = players.map(p => p.userId).filter(Boolean).join(',');

    if (userIds) {
      const apiUrl = `https://thumbnails.roproxy.com/v1/users/avatar-headshot?userIds=${userIds}&size=150x150&format=Png&isCircular=false`;
      const thumbRes = await fetch(apiUrl);
      const thumbData = await thumbRes.json();

      thumbData.data.forEach(thumb => {
        const player = players.find(p => p.userId === thumb.targetId);
        if (player) {
          player.avatar = thumb.imageUrl;
        }
      });
    }
  } catch (error) {
    console.error("Could not load players.json or avatars", error);
  }

  try {
    const savedWebhook = localStorage.getItem("lineupPlanner_webhookUrl");
    if (savedWebhook) document.getElementById("webhookUrl").value = savedWebhook;
  } catch (e) { console.warn("Could not read saved webhook:", e); }

  renderPlayerCountOptions(); renderFormationOptions(); renderPitch(); renderBench();
  renderRoster('lineup');
}
init();
