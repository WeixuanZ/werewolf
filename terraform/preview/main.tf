terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.0"
    }
  }
  # Backend will be configured via CLI/CI
  backend "gcs" {}
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Data Sources to find existing infrastructure
data "google_compute_network" "vpc" {
  name = "werewolf-vpc"
}

data "google_compute_subnetwork" "subnet" {
  name   = "werewolf-subnet"
  region = var.region
}

data "google_compute_instance" "main" {
  name = "main"
  zone = "${var.region}-a" # Assuming zone convention or adding variable
}

# Call the App Module
module "app" {
  source = "../modules/app"

  project_id     = var.project_id
  region         = var.region
  backend_image  = var.backend_image
  frontend_image = var.frontend_image

  # Use looked-up values
  redis_ip       = data.google_compute_instance.main.network_interface.0.network_ip
  vpc_id         = data.google_compute_network.vpc.id
  subnet_id      = data.google_compute_subnetwork.subnet.id

  service_suffix = var.service_suffix
}

output "frontend_url" {
  value = module.app.frontend_url
}

output "backend_url" {
  value = module.app.backend_url
}
