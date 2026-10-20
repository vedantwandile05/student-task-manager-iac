const API = "/api/tasks";
const $ = (id) => document.getElementById(id);
const STUDENT_API = "/api/students";
let tasks = [];
let students = [];

function setMessage(text, isError = false) {
  const el = $("message");
  el.textContent = text;
  el.className = "message" + (isError ? " error" : "");
}

async function api(path, options) {
  const res = await fetch(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data.errors && data.errors.join(", ")) || data.error || "Request failed");
  return data;
}

async function loadConfig() {
  try {
    const cfg = await api("/api/config");
    $("app-title").textContent = cfg.title;
    document.title = cfg.title;
    $("env-badge").textContent = cfg.environment;
  } catch { /* non-critical */ }
}

async function loadTasks() {
  try {
    tasks = await api(API);
    render();
  } catch (e) {
    setMessage(e.message, true);
  }
}

function cell(text) {
  const td = document.createElement("td");
  td.textContent = text;
  return td;
}

function render() {
  const q = $("search").value.trim().toLowerCase();
  const f = $("filter").value;
  const visible = tasks.filter((t) => (!f || t.status === f) && (!q || t.title.toLowerCase().includes(q)));

  const body = $("task-body");
  body.replaceChildren();
  if (!visible.length) {
    const tr = document.createElement("tr");
    const td = cell("No tasks found.");
    td.colSpan = 6;
    td.className = "empty";
    tr.appendChild(td);
    body.appendChild(tr);
  }

  for (const t of visible) {
    const tr = document.createElement("tr");
    tr.appendChild(cell(t.id));
    tr.appendChild(cell(t.title));

    const pTd = document.createElement("td");
    const pill = document.createElement("span");
    pill.className = "pill " + t.priority;
    pill.textContent = t.priority;
    pTd.appendChild(pill);
    tr.appendChild(pTd);

    tr.appendChild(cell(t.status));
    tr.appendChild(cell(t.createdDate));

    const actions = document.createElement("td");
    actions.className = "actions";
    const sel = document.createElement("select");
    for (const s of ["Pending", "In Progress", "Completed"]) {
      const o = document.createElement("option");
      o.textContent = s;
      o.selected = s === t.status;
      sel.appendChild(o);
    }
    sel.addEventListener("change", () => updateStatus(t.id, sel.value));
    const del = document.createElement("button");
    del.className = "danger";
    del.textContent = "Delete";
    del.addEventListener("click", () => removeTask(t.id));
    actions.append(sel, del);
    tr.appendChild(actions);
    body.appendChild(tr);
  }
  renderStats();
}

function renderStats() {
  const count = (s) => tasks.filter((t) => t.status === s).length;
  const items = [
    ["Total", tasks.length],
    ["Pending", count("Pending")],
    ["In Progress", count("In Progress")],
    ["Completed", count("Completed")],
  ];
  $("stats").replaceChildren(
    ...items.map(([label, n]) => {
      const d = document.createElement("div");
      d.className = "stat";
      const b = document.createElement("b");
      b.textContent = n;
      const s = document.createElement("span");
      s.textContent = label;
      d.append(b, s);
      return d;
    })
  );
}

async function addTask() {
  try {
    const task = await api(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: $("title").value, priority: $("priority").value, status: $("status").value }),
    });
    $("title").value = "";
    setMessage(`Task ${task.id} created successfully.`);
    await loadTasks();
  } catch (e) {
    setMessage(e.message, true);
  }
}

async function updateStatus(id, status) {
  try {
    await api(`${API}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setMessage(`Task ${id} status changed to ${status}.`);
    await loadTasks();
  } catch (e) {
    setMessage(e.message, true);
  }
}

async function removeTask(id) {
  if (!confirm(`Delete task ${id}?`)) return;
  try {
    await api(`${API}/${id}`, { method: "DELETE" });
    setMessage(`Task ${id} removed successfully.`);
    await loadTasks();
  } catch (e) {
    setMessage(e.message, true);
  }
}

$("add-btn").addEventListener("click", addTask);
$("title").addEventListener("keydown", (e) => e.key === "Enter" && addTask());
$("search").addEventListener("input", render);
$("filter").addEventListener("change", render);

// ---------- students ----------
function setStudentMessage(text, isError = false) {
  const el = $("student-message");
  el.textContent = text;
  el.className = "message" + (isError ? " error" : "");
}

function renderStudents() {
  const body = $("student-body");
  body.replaceChildren();
  if (!students.length) {
    const tr = document.createElement("tr");
    const td = cell("No students yet. Add the first one above.");
    td.colSpan = 3;
    td.className = "empty";
    tr.appendChild(td);
    body.appendChild(tr);
    return;
  }
  for (const st of students) {
    const tr = document.createElement("tr");
    tr.append(cell(st.id), cell(st.name), cell(st.status));
    body.appendChild(tr);
  }
}

async function loadStudents() {
  try {
    students = await api(STUDENT_API);
    renderStudents();
  } catch (e) {
    setStudentMessage(e.message, true);
  }
}

async function addStudent(event) {
  event.preventDefault();
  const name = $("student-name").value.trim();
  const id = $("student-id").value.trim();
  const status = $("student-status").value;

  if (!name) return setStudentMessage("Enter the student's name.", true);
  if (!/^\d{1,10}$/.test(id)) return setStudentMessage("Student ID must be digits only, up to 10.", true);

  $("student-btn").disabled = true;
  setStudentMessage("Saving...");
  try {
    const created = await api(STUDENT_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, id, status }),
    });
    $("student-form").reset();
    setStudentMessage(`Added ${created.name} (ID ${created.id}) as ${created.status}.`);
    await loadStudents();
  } catch (e) {
    setStudentMessage(e.message, true);
  } finally {
    $("student-btn").disabled = false;
  }
}

$("student-form").addEventListener("submit", addStudent);

loadConfig();
loadTasks();
loadStudents();
