terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.0"
    }
  }
  # Backend configured via CLI in CI/CD (terraform init -backend-config=...)
  backend "gcs" {}
}

provider "google" {
  project = var.project_id
  region  = var.region
}
