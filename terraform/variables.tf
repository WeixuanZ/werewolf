variable "project_id" {
  description = "The Google Cloud Project ID"
  type        = string
}

variable "region" {
  description = "The GCP region to deploy to"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "The GCP zone for the Compute Engine instance"
  type        = string
  default     = "us-central1-a"
}

variable "instance_name" {
  description = "Name of the main compute instance"
  type        = string
  default     = "main"
}

variable "machine_type" {
  description = "Machine type for the main instance (Keep e2-micro for free tier)"
  type        = string
  default     = "e2-micro"
}

variable "backend_image" {
  description = "Docker image for the backend service (e.g. ghcr.io/username/werewolf-backend:tag)"
  type        = string
}

variable "frontend_image" {
  description = "Docker image for the frontend service (e.g. ghcr.io/username/werewolf-frontend:tag)"
  type        = string
}
