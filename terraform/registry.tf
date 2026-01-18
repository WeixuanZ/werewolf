# Enable Artifact Registry API
resource "google_project_service" "artifact_registry_api" {
  service            = "artifactregistry.googleapis.com"
  disable_on_destroy = false
}

# Create a local Artifact Registry (Standard mode)
# This will hold the mirrored images from GHCR
resource "google_artifact_registry_repository" "repo" {
  location      = var.region
  repository_id = "werewolf-repo"
  description   = "Mirror of GHCR images for Cloud Run"
  format        = "DOCKER"

  depends_on = [google_project_service.artifact_registry_api]
}

output "repository_url" {
  value = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.repo.repository_id}"
}
