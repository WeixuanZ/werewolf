#!/bin/bash
# Bootstrap GCP infrastructure required before CI/CD can take over.
#
# Creates the Terraform state bucket, then runs an initial Terraform apply
# that provisions:
#   - Networking (VPC, subnet, firewall)
#   - Compute Engine VM running Redis
#   - Artifact Registry
#   - Workload Identity Federation pool/provider and the deployer SA
#
# After this script succeeds, GitHub Actions can deploy via OIDC.
#
# Usage:
#   GH_REPO=owner/name ./scripts/bootstrap_gcp.sh
#
# Env (all optional except GH_REPO):
#   GH_REPO                GitHub repo in 'owner/name' (required)
#   PROJECT_ID             Defaults to active gcloud project
#   REGION                 Defaults to us-central1
#   TF_STATE_BUCKET        Defaults to "<project_id>-tfstate"

set -euo pipefail

if [ -z "${GH_REPO:-}" ]; then
  echo "Error: GH_REPO must be set (e.g. GH_REPO=WeixuanZ/werewolf)." >&2
  exit 1
fi

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${REGION:-us-central1}"
TF_STATE_BUCKET="${TF_STATE_BUCKET:-${PROJECT_ID}-tfstate}"

if [ -z "$PROJECT_ID" ]; then
  echo "Error: PROJECT_ID is empty. Set it or run 'gcloud config set project ...'." >&2
  exit 1
fi

cat <<EOF
================================================================
Bootstrapping GCP for project: $PROJECT_ID
  Region:          $REGION
  State bucket:    gs://$TF_STATE_BUCKET
  GitHub repo:     $GH_REPO
================================================================
EOF

for cmd in gcloud gsutil terraform; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Error: $cmd is not installed." >&2
    exit 1
  fi
done

echo ">>> Enabling required APIs (idempotent)..."
gcloud services enable \
  cloudresourcemanager.googleapis.com \
  storage.googleapis.com \
  --project "$PROJECT_ID"

echo ">>> Ensuring state bucket exists..."
if gsutil ls -b "gs://${TF_STATE_BUCKET}" >/dev/null 2>&1; then
  echo "Bucket gs://${TF_STATE_BUCKET} already exists."
else
  gsutil mb -p "$PROJECT_ID" -l "$REGION" "gs://${TF_STATE_BUCKET}"
  gsutil versioning set on "gs://${TF_STATE_BUCKET}"
  gsutil uniformbucketlevelaccess set on "gs://${TF_STATE_BUCKET}"
fi

cd "$(dirname "$0")/../terraform"

echo ">>> Using gcloud credentials for Terraform..."
export GOOGLE_OAUTH_ACCESS_TOKEN
GOOGLE_OAUTH_ACCESS_TOKEN="$(gcloud auth print-access-token)"

echo ">>> Initializing Terraform (GCS backend)..."
terraform init -reconfigure \
  -backend-config="bucket=${TF_STATE_BUCKET}" \
  -backend-config="prefix=prod"

# Apply the bits that don't depend on application images first, so the
# Artifact Registry exists before any image push and so WIF is usable.
echo ">>> Provisioning foundation (registry, network, compute, IAM)..."
terraform apply -auto-approve \
  -var="project_id=$PROJECT_ID" \
  -var="region=$REGION" \
  -var="github_repository=$GH_REPO" \
  -var="tf_state_bucket=$TF_STATE_BUCKET" \
  -var="backend_image=placeholder" \
  -var="frontend_image=placeholder" \
  -target=google_artifact_registry_repository.repo \
  -target=google_compute_instance.main \
  -target=google_compute_network.vpc \
  -target=google_compute_subnetwork.subnet \
  -target=google_compute_firewall.allow_ssh_iap \
  -target=google_compute_firewall.allow_internal \
  -target=google_iam_workload_identity_pool.github \
  -target=google_iam_workload_identity_pool_provider.github \
  -target=google_service_account.github_actions \
  -target=google_service_account_iam_binding.wif_binding \
  -target=google_project_iam_member.github_actions \
  -target=google_storage_bucket_iam_member.github_actions_state

echo
echo "================================================================"
echo "Bootstrap complete. Configure these GitHub Actions secrets:"
echo
echo "  GCP_PROJECT_ID              = $PROJECT_ID"
echo "  GCP_TF_STATE_BUCKET         = $TF_STATE_BUCKET"
echo "  GCP_WORKLOAD_IDENTITY_PROVIDER = $(terraform output -raw workload_identity_provider)"
echo "  GCP_SERVICE_ACCOUNT         = $(terraform output -raw github_actions_service_account)"
echo
echo "Tag a release (v*) or run the 'Build, Publish and Deploy' workflow to"
echo "deploy the application."
echo "================================================================"
