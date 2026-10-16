locals {
  # Names include the environment so dev/test/production never collide.
  worker_script_name = "${var.worker_name}-${var.environment}"
  kv_title           = "${var.kv_namespace_name}-${var.environment}"

  # The frontend files are injected into worker.js at plan time, so a change to
  # index.html / style.css / script.js shows up as a diff in `terraform plan`.
  worker_source = replace(
    replace(
      replace(
        file("${path.module}/../application/worker.js"),
        "\"__INDEX_HTML__\"", jsonencode(file("${path.module}/../application/index.html"))
      ),
      "\"__STYLE_CSS__\"", jsonencode(file("${path.module}/../application/style.css"))
    ),
    "\"__SCRIPT_JS__\"", jsonencode(file("${path.module}/../application/script.js"))
  )
}

# 1) Workers KV namespace (task storage)
resource "cloudflare_workers_kv_namespace" "tasks" {
  account_id = var.account_id
  title      = local.kv_title
}

# 2) Cloudflare Worker + 3) KV binding + 4) configuration variables
resource "cloudflare_workers_script" "task_manager" {
  account_id         = var.account_id
  script_name        = local.worker_script_name
  content            = local.worker_source
  main_module        = "worker.js"
  compatibility_date = "2025-01-01"

  bindings = [
    {
      type         = "kv_namespace"
      name         = "TASKS_KV"
      namespace_id = cloudflare_workers_kv_namespace.tasks.id
    },
    {
      type = "plain_text"
      name = "ENVIRONMENT"
      text = var.environment
    },
    {
      type = "plain_text"
      name = "APP_TITLE"
      text = var.app_title
    }
  ]
}

# Publish the Worker on <name>.<subdomain>.workers.dev
resource "cloudflare_workers_script_subdomain" "task_manager" {
  account_id  = var.account_id
  script_name = cloudflare_workers_script.task_manager.script_name
  enabled     = true
}
