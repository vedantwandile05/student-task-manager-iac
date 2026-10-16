// Cloudflare Worker: serves the web UI and exposes a REST API backed by Workers KV.
// The three placeholders below are replaced by Terraform (see terraform/main.tf).
const INDEX_HTML = "__INDEX_HTML__";
const STYLE_CSS = "__STYLE_CSS__";
const SCRIPT_JS = "__SCRIPT_JS__";

const PRIORITIES = ["High", "Medium", "Low"];
const STATUSES = ["Pending", "In Progress", "Completed"];
const TASK_PREFIX = "task:";
const COUNTER_KEY = "meta:counter";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });

const asset = (body, type) =>
  new Response(body, { headers: { "Content-Type": `${type}; charset=utf-8` } });

async function nextId(kv) {
  const current = parseInt((await kv.get(COUNTER_KEY)) || "100", 10);
  const next = current + 1;
  await kv.put(COUNTER_KEY, String(next));
  return `T${next}`;
}

function validate(body, partial = false) {
  const errors = [];
  if (!partial || body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) errors.push("title is required");
    else if (body.title.length > 200) errors.push("title must be at most 200 characters");
  }
  if (body.priority !== undefined && !PRIORITIES.includes(body.priority))
    errors.push(`priority must be one of: ${PRIORITIES.join(", ")}`);
  if (body.status !== undefined && !STATUSES.includes(body.status))
    errors.push(`status must be one of: ${STATUSES.join(", ")}`);
  return errors;
}

async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function listTasks(kv) {
  const tasks = [];
  let cursor;
  do {
    const page = await kv.list({ prefix: TASK_PREFIX, cursor });
    const items = await Promise.all(page.keys.map((k) => kv.get(k.name, "json")));
    tasks.push(...items.filter(Boolean));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return tasks.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
    const method = request.method;
    const kv = env.TASKS_KV;

    try {
      // ---- static frontend ----
      if (method === "GET" && path === "/") return asset(INDEX_HTML, "text/html");
      if (method === "GET" && path === "/style.css") return asset(STYLE_CSS, "text/css");
      if (method === "GET" && path === "/script.js") return asset(SCRIPT_JS, "application/javascript");

      // ---- config (comes from Terraform-managed bindings) ----
      if (method === "GET" && path === "/api/config")
        return json({ title: env.APP_TITLE || "Student Task Manager", environment: env.ENVIRONMENT || "dev" });

      // ---- collection: /api/tasks ----
      if (path === "/api/tasks") {
        if (method === "GET") return json(await listTasks(kv));

        if (method === "POST") {
          const body = await readBody(request);
          if (!body) return json({ error: "Invalid JSON body" }, 400);
          const errors = validate(body);
          if (errors.length) return json({ errors }, 400);

          const task = {
            id: await nextId(kv),
            title: body.title.trim(),
            priority: body.priority || "Medium",
            status: body.status || "Pending",
            createdDate: new Date().toISOString().slice(0, 10),
          };
          await kv.put(TASK_PREFIX + task.id, JSON.stringify(task));
          return json(task, 201);
        }
        return json({ error: "Method not allowed" }, 405);
      }

      // ---- single item: /api/tasks/{id} ----
      const match = path.match(/^\/api\/tasks\/([A-Za-z0-9_-]+)$/);
      if (match) {
        const key = TASK_PREFIX + match[1];
        const existing = await kv.get(key, "json");
        if (!existing) return json({ error: "Task not found" }, 404);

        if (method === "GET") return json(existing);

        if (method === "PUT") {
          const body = await readBody(request);
          if (!body) return json({ error: "Invalid JSON body" }, 400);
          const errors = validate(body, true);
          if (errors.length) return json({ errors }, 400);

          const updated = {
            ...existing,
            title: body.title !== undefined ? body.title.trim() : existing.title,
            priority: body.priority ?? existing.priority,
            status: body.status ?? existing.status,
          };
          await kv.put(key, JSON.stringify(updated));
          return json(updated);
        }

        if (method === "DELETE") {
          await kv.delete(key);
          return json({ message: "Task deleted", id: existing.id });
        }
        return json({ error: "Method not allowed" }, 405);
      }

      return json({ error: "Not found" }, 404);
    } catch (err) {
      return json({ error: "Internal error", detail: String(err) }, 500);
    }
  },
};
