variable "account_id" {
  description = "Cloudflare Account ID"
  type        = string
}

variable "worker_name" {
  description = "Base name of the Cloudflare Worker"
  type        = string
  default     = "student-task-manager"
}

variable "kv_namespace_name" {
  description = "Base name of the Workers KV namespace"
  type        = string
  default     = "student_tasks"
}

variable "environment" {
  description = "Deployment environment (dev, test, production)"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "test", "production"], var.environment)
    error_message = "environment must be one of: dev, test, production."
  }
}

variable "app_title" {
  description = "Title shown in the web application (passed to the Worker as a binding)"
  type        = string
  default     = "Student Task Manager"
}

variable "workers_subdomain" {
  description = "Your account's workers.dev subdomain (Dashboard > Workers & Pages). Only used to build the output URL."
  type        = string
  default     = ""
}
