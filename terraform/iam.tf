# Enable APIs required for Workload Identity Federation
resource "google_project_service" "iam_api" {
  service            = "iam.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "iam_credentials_api" {
  service            = "iamcredentials.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "sts_api" {
  service            = "sts.googleapis.com"
  disable_on_destroy = false
}

# Service account assumed by GitHub Actions via Workload Identity Federation
resource "google_service_account" "github_actions" {
  account_id   = "github-actions-deployer"
  display_name = "GitHub Actions Deployer"
  description  = "Used by GitHub Actions to deploy prod and preview environments"
  depends_on   = [google_project_service.iam_api]
}

# Workload Identity Pool dedicated to GitHub Actions
resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github-actions"
  display_name              = "GitHub Actions"
  description               = "OIDC pool for GitHub Actions"
  depends_on                = [google_project_service.iam_api]
}

# OIDC provider trusting tokens minted by GitHub Actions.
# The attribute_condition restricts tokens to this specific repository so
# workflows in other repos cannot impersonate the SA even if they obtain a
# Google access token request.
resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github"
  display_name                       = "GitHub Actions OIDC"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
    "attribute.event_name" = "assertion.event_name"
  }

  attribute_condition = "assertion.repository == \"${var.github_repository}\""

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# Allow any workflow run in the configured repository to impersonate the SA.
# (The repository scoping is enforced by attribute_condition above.)
resource "google_service_account_iam_binding" "wif_binding" {
  service_account_id = google_service_account.github_actions.name
  role               = "roles/iam.workloadIdentityUser"
  members = [
    "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repository}",
  ]
}

# Minimal set of project-level roles for the deployer SA.
locals {
  github_actions_roles = toset([
    "roles/run.admin",               # Deploy / update Cloud Run services
    "roles/artifactregistry.writer", # Push images to GAR
    "roles/compute.viewer",          # Read VM details (Redis IP, network)
    "roles/iam.serviceAccountUser",  # Act as Cloud Run runtime SA
  ])
}

resource "google_project_iam_member" "github_actions" {
  for_each = local.github_actions_roles
  project  = var.project_id
  role     = each.value
  member   = "serviceAccount:${google_service_account.github_actions.email}"
}

# Allow the deployer SA to read/write Terraform state in the state bucket.
# The bucket itself is created out-of-band by scripts/bootstrap_gcp.sh
# because GCS state bootstrapping is a chicken-and-egg problem.
resource "google_storage_bucket_iam_member" "github_actions_state" {
  bucket = var.tf_state_bucket
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.github_actions.email}"
}

output "workload_identity_provider" {
  description = "Resource name to pass as workload_identity_provider in google-github-actions/auth"
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "github_actions_service_account" {
  description = "Email of the SA assumed by GitHub Actions"
  value       = google_service_account.github_actions.email
}
