// -------------------- Shared helpers --------------------
function nowShort() {
  return new Date().toLocaleString();
}

function getCheckin() {
  return JSON.parse(localStorage.getItem("checkin") || "null");
}

function getTasks() {
  return JSON.parse(localStorage.getItem("tasks") || "[]");
}

function setTasks(tasks) {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}
function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

// -------------------- Check-in & Planner --------------------
function saveCheckin() {
  const sleep = Number(document.getElementById("sleep").value || 0);
  const meal = document.getElementById("meal").value;
  const mood = document.getElementById("mood").value;
  const energy = Number(document.getElementById("energy").value || 5);

  const data = { sleep, meal, mood, energy, updated: nowShort() };
  localStorage.setItem("checkin", JSON.stringify(data));

  alert("Check‑in saved! AI will build your schedule now.");
  window.location.href = "planner.html";
}

function addTask() {
  const taskText = document.getElementById("taskInput").value.trim();
  const priority = document.getElementById("priority").value;
  let est = Number(document.getElementById("estHours").value || 1);
  if (!taskText) return alert("Enter a task!");
  if (est <= 0) est = 1;

  const tasks = getTasks();
  tasks.push({ id: Date.now(), text: taskText, priority, est });
  setTasks(tasks);

  document.getElementById("taskInput").value = "";
  document.getElementById("estHours").value = "";
  renderTasks();
  generateSchedule();
}

function renderTasks() {
  const list = document.getElementById("taskList");
  if (!list) return;
  const tasks = getTasks();
  if (tasks.length === 0) list.innerHTML = "<div class='small'>No tasks added yet.</div>";
  else {
    list.innerHTML = tasks.map(t => `
      <div class="task">
        <div>
          <strong>${t.text}</strong><br><span class="small">Est: ${t.est}h · ${t.priority}</span>
        </div>
        <div>
          <button onclick="removeTask(${t.id})" class="btn secondary">Remove</button>
        </div>
      </div>
    `).join("");
  }
}

function removeTask(id) {
  let tasks = getTasks();
  tasks = tasks.filter(t => t.id !== id);
  setTasks(tasks);
  renderTasks();
  generateSchedule();
}

// -------------------- Daily schedule generator --------------------
function generateSchedule() {
  const checkin = getCheckin();
  const scheduleBox = document.getElementById("schedule");
  const summary = document.getElementById("aiSummary");
  if (!scheduleBox || !summary) return;

  const tasks = getTasks();
  if (!checkin) {
    summary.innerHTML = "Please complete your daily check‑in first.";
    scheduleBox.innerHTML = "";
    return;
  }

  // Advice based on wellness
  let advice = "";
  if (checkin.sleep < 6) advice += "⚠ You slept less than 6h — schedule lighter tasks or short sessions.<br>";
  if (checkin.meal === "no") advice += "🍽️ Try to eat before long study sessions.<br>";
  if (checkin.mood === "stressed") advice += "🧘 Stress detected — include breaks and relaxation.<br>";
  if (checkin.energy < 5) advice += "🔋 Low energy — focus on low-demand tasks first.<br>";
  if (!advice) advice = "You're set! Have a productive day. ✅";

  summary.innerHTML = advice;

  // Smart ordering: high -> medium -> low, also sort by est descending within same priority
  const order = { high: 1, medium: 2, low: 3 };
  tasks.sort((a, b) => {
    if (order[a.priority] !== order[b.priority]) return order[a.priority] - order[b.priority];
    return b.est - a.est;
  });

  // Determine daily study budget (hours)
  let baseHours = 6; // default study capacity
  if (checkin.sleep < 6) baseHours = 3;
  else if (checkin.sleep < 7) baseHours = 4;
  else if (checkin.energy > 7) baseHours = 7;

  // reduce if mood is tired/stressed
  if (checkin.mood === "tired") baseHours = Math.max(2, baseHours - 2);
  if (checkin.mood === "stressed") baseHours = Math.max(2, baseHours - 1);

  // build schedule items
  scheduleBox.innerHTML = "";
  let hour = 9; // start hour
  let hoursLeft = baseHours;

  for (let t of tasks) {
    if (hoursLeft <= 0) {
      // push remaining tasks as "To schedule later"
      scheduleBox.innerHTML += `<div class="summary-box"><strong>To schedule:</strong> ${t.text} <br><small>Priority: ${t.priority} · Est ${t.est}h</small></div>`;
      continue;
    }
    const allocate = Math.min(t.est, Math.max(0.5, hoursLeft)); // allocate at least 0.5h
    scheduleBox.innerHTML += `
      <div class="summary-box">
        <strong>${hour}:00</strong> – ${t.text} (${allocate}h) <br>
        <small>Priority: ${t.priority}</small>
      </div>`;
    hour += Math.ceil(allocate);
    hoursLeft -= allocate;
  }

  // If no tasks, show demo suggestions
  if (tasks.length === 0) {
    scheduleBox.innerHTML = `
      <div class="summary-box"><strong>9:00</strong> – Review notes (30–45 min)</div>
      <div class="summary-box"><strong>10:00</strong> – Practice problems (1h)</div>
      <div class="summary-box"><strong>12:00</strong> – Lunch & rest</div>
      <div class="summary-box"><strong>2:00</strong> – Light revision (1h)</div>
    `;
  }
}

// -------------------- Weekly timetable generator (AI-style) --------------------
function generateWeeklyTimetable() {
  const checkin = getCheckin();
  const tasks = getTasks();
  const adviceBox = document.getElementById("ttAdvice");
  const grid = document.getElementById("weekGrid");

  if (!grid) return;

  // If no checkin, show note
  if (!checkin) {
    adviceBox.innerHTML = "Complete a daily check‑in first for a personalized weekly timetable.";
  } else {
    adviceBox.innerHTML = `Timetable generated from your last check‑in (sleep ${checkin.sleep}h · energy ${checkin.energy}/10 · mood ${checkin.mood}).`;
  }

  // Create week slots (Mon-Sun) with 3 blocks each: Morning / Afternoon / Evening
  const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const blocks = ["Morning (8–12)","Afternoon (1–5)","Evening (6–9)"];

  // If no tasks, generate demo week (classes + light study)
  let plan = {};
  for (let d of days) {
    plan[d] = [];
  }

  if (tasks.length === 0) {
    // demo schedule: classes and study blocks
    for (let i=0;i<days.length;i++){
      const d = days[i];
      plan[d].push({time: blocks[0], text: "Lecture / Class"});
      plan[d].push({time: blocks[1], text: "Self-study (1h)"});
      if (i % 2 === 0) plan[d].push({time: blocks[2], text: "Revision / Assignments"});
      else plan[d].push({time: blocks[2], text: "Club / Free time"});
    }
  } else {
    // Smart distribution algorithm:
    // 1) compute total study hours needed = sum(est)
    // 2) compute weekly capacity based on sleep/energy (rough)
    // 3) distribute tasks into blocks respecting priority
    let totalHours = tasks.reduce((s,t)=>s + (t.est||1), 0);
    // weekly capacity heuristic
    let baseDaily = 5;
    if (checkin) {
      if (checkin.sleep < 6) baseDaily = 3;
      else if (checkin.sleep < 7) baseDaily = 4;
      else if (checkin.energy > 7) baseDaily = 6;
      if (checkin.mood === "tired") baseDaily = Math.max(2, baseDaily - 2);
      if (checkin.mood === "stressed") baseDaily = Math.max(2, baseDaily - 1);
    }
    const weeklyCapacity = baseDaily * 7;
    // if tasks exceed capacity, we will mark overflow
    const overflow = totalHours > weeklyCapacity;

    // sort tasks by priority + est desc
    const order = { high: 1, medium: 2, low: 3 };
    const sorted = tasks.slice().sort((a,b)=>{
      if (order[a.priority] !== order[b.priority]) return order[a.priority]-order[b.priority];
      return b.est - a.est;
    });

    // fill plan by iterating days and blocks, assign chunks until est exhausted
    // convert blocks-per-week = 7*3 = 21 slots. We'll try to fill with ~1h chunks.
    let slotIndex = 0;
    const totalSlots = days.length * blocks.length;
    const slotCapacityHours = Math.max(0.5, weeklyCapacity / totalSlots); // hours per slot

    // initialize empty slot arrays
    const slotList = [];
    for (let di=0; di<days.length; di++) {
      for (let bi=0; bi<blocks.length; bi++) {
        slotList.push({ day: days[di], block: blocks[bi], hoursAvailable: slotCapacityHours, items: [] });
      }
    }

    // Assign tasks into slots
    for (let t of sorted) {
      let remaining = t.est || 1;
      // try to give priority tasks earlier in week
      for (let s=0; s<slotList.length && remaining > 0; s++) {
        const slot = slotList[s];
        // heuristic: avoid putting heavy tasks on consecutive late-night slots if low energy
        // assign min of slot hours and remaining
        const give = Math.min(slot.hoursAvailable, remaining);
        if (give >= 0.25) {
          slot.items.push({ text: t.text + (remaining - give > 0 ? ` (${give}h part)` : ` (${give}h)`), priority: t.priority });
          slot.hoursAvailable = Math.max(0, slot.hoursAvailable - give);
          remaining = Math.max(0, remaining - give);
        }
      }
      if (remaining > 0) {
        // could not schedule fully — append overflow note to the last slot
        slotList[slotList.length-1].items.push({ text: `TODO (unscheduled): ${t.text} (${remaining}h)`, priority: t.priority });
      }
    }

    // Convert slotList to plan structure keyed by day
    for (let s of slotList) {
      if (!plan[s.day]) plan[s.day] = [];
      // combine items into a single description per block
      if (s.items.length === 0) {
        plan[s.day].push({ time: s.block, text: "Free / Wellness" });
      } else {
        const txt = s.items.map(it => `${it.text}`).join(" · ");
        plan[s.day].push({ time: s.block, text: txt });
      }
    }

    if (overflow) {
      adviceBox.innerHTML += "<br><strong>Note:</strong> Tasks exceed weekly capacity — some items are unscheduled. Consider reducing load or extending study hours.";
    }
  }

  // Render plan as a table
  let html = `<table class="week-table"><thead><tr><th>Time / Day</th>`;
  for (let d of days) html += `<th>${d}</th>`;
  html += `</tr></thead><tbody>`;

  for (let b=0;b<blocks.length;b++){
    html += `<tr><th>${blocks[b]}</th>`;
    for (let d of days) {
      const cellItems = (plan[d] && plan[d][b]) ? plan[d][b].text : "";
      html += `<td>${cellItems.split("·").map(s => `<div class="slot">${s.trim()}</div>`).join("")}</td>`;
    }
    html += `</tr>`;
  }

  html += `</tbody></table>`;
  grid.innerHTML = html;
}

// -------------------- Auto-run helpers for pages --------------------
if (window.location.pathname.includes("planner.html")) {
  renderTasks();
  generateSchedule();
}

if (window.location.pathname.includes("timetable.html")) {
  generateWeeklyTimetable();
}

// keep planner reactive: update if storage changes (helps when running multiple pages)
window.addEventListener("storage", () => {
  if (window.location.pathname.includes("planner.html")) {
    renderTasks();
    generateSchedule();
  }
});
