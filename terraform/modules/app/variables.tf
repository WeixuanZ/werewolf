variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "backend_image" {
  type = string
}

variable "frontend_image" {
  type = string
}

variable "redis_ip" {
  description = "Internal IP of the Redis VM"
  type        = string
}

variable "vpc_id" {
  type = string
}

variable "subnet_id" {
  type = string
}

variable "service_suffix" {
  description = "Suffix appended to Cloud Run service names (e.g. -pr-123). Empty for prod."
  type        = string
  default     = ""
}

variable "cors_origins" {
  description = "JSON-encoded list of allowed CORS origins for the backend"
  type        = string
  default     = "[\"*\"]"
}
