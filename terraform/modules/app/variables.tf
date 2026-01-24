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
  type = string
}

variable "vpc_id" {
  type = string
}

variable "subnet_id" {
  type = string
}

variable "service_suffix" {
  type    = string
  default = ""
  description = "Suffix to append to service names (e.g. -pr-123)"
}
