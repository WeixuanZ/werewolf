terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.0"
    }
  }
  # Backend configured at init time:
  #   terraform init \
  #     -backend-config="bucket=$TF_STATE_BUCKET" \
  #     -backend-config="prefix=prod"
  backend "gcs" {}
}

provider "google" {
  project = var.project_id
  region  = var.region
}
