output "worker_name" {
  description = "Name of the deployed Worker"
  value       = cloudflare_workers_script.task_manager.script_name
}

output "kv_namespace_id" {
  description = "ID of the Workers KV namespace"
  value       = cloudflare_workers_kv_namespace.tasks.id
}

output "kv_namespace_title" {
  description = "Title of the Workers KV namespace"
  value       = cloudflare_workers_kv_namespace.tasks.title
}

output "application_url" {
  description = "Public URL of the application"
  value = (
    var.workers_subdomain != ""
    ? "https://${local.worker_script_name}.${var.workers_subdomain}.workers.dev"
    : "Set workers_subdomain to see the full URL (Dashboard > Workers & Pages)"
  )
}
