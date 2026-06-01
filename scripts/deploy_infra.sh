#!/bin/bash
# Emergency / manual production deploy.
#
# In normal operation the GitHub Actions workflow "Build, Publish and Deploy"
# handles tagged releases. This script exists for the rare case where you
# need to push from a workstation (e.g. recovering from a failed CI run).
#
# Usage:
#   GH_REPO=owner/name TF_STATE_BUCKET=my-tfstate ./scripts/deploy_infra.sh v0.1.2
#
# Required env:
#   GH_REPO            GitHub repo in 'owner/name' (used by WIF Terraform)
#   TF_STATE_BUCKET    Name of GCS bucket holding terraform state
#
# Optional env:
#   PROJECT_ID         Defaults to active gcloud project
#   REGION             Defaults to us-central1
#   GH_USER            Source GHCR org/user (defaults to lowercased GH_REPO owner)

set -euo pipefail

if [ -z "${GH_REPO:-}" ]; then
  echo "Error: GH_REPO must be set (e.g. GH_REPO=WeixuanZ/werewolf)." >&2
  exit 1
fi
if [ -z "${TF_STATE_BUCKET:-}" ]; then
  echo "Error: TF_STATE_BUCKET must be set." >&2
  exit 1
fi

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${REGION:-us-central1}"
GH_USER="${GH_USER:-$(echo "$GH_REPO" | cut -d/ -f1 | tr '[:upper:]' '[:lower:]')}"
IMAGE_TAG="${1:-latest}"

cat <<EOF
================================================================
Deploying Infrastructure
  Project:       $PROJECT_ID
  Region:        $REGION
  State bucket:  gs://$TF_STATE_BUCKET
  GitHub repo:   $GH_REPO
  GHCR source:   ghcr.io/$GH_USER
  Image tag:     $IMAGE_TAG
================================================================
EOF

for cmd in gcloud docker terraform; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Error: $cmd is not installed." >&2
    exit 1
  fi
done

echo ">>> Using gcloud credentials..."
export GOOGLE_OAUTH_ACCESS_TOKEN
GOOGLE_OAUTH_ACCESS_TOKEN="$(gcloud auth print-access-token)"

cd "$(dirname "$0")/../terraform"

echo ">>> Initializing Terraform (GCS backend)..."
terraform init -reconfigure \
  -backend-config="bucket=${TF_STATE_BUCKET}" \
  -backend-config="prefix=prod"

echo ">>> Configuring Docker auth for GAR..."
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

GHCR_BACKEND="ghcr.io/$GH_USER/werewolf-backend:$IMAGE_TAG"
GHCR_FRONTEND="ghcr.io/$GH_USER/werewolf-frontend:$IMAGE_TAG"
GAR_REPO="${REGION}-docker.pkg.dev/${PROJECT_ID}/werewolf-repo"
GAR_BACKEND="${GAR_REPO}/werewolf-backend:$IMAGE_TAG"
GAR_FRONTEND="${GAR_REPO}/werewolf-frontend:$IMAGE_TAG"

echo ">>> Syncing images (GHCR -> GAR)..."
docker pull "$GHCR_BACKEND"
docker tag "$GHCR_BACKEND" "$GAR_BACKEND"
docker push "$GAR_BACKEND"

docker pull "$GHCR_FRONTEND"
docker tag "$GHCR_FRONTEND" "$GAR_FRONTEND"
docker push "$GAR_FRONTEND"

echo ">>> Planning full deployment..."
terraform plan \
  -var="project_id=$PROJECT_ID" \
  -var="region=$REGION" \
  -var="github_repository=$GH_REPO" \
  -var="tf_state_bucket=$TF_STATE_BUCKET" \
  -var="backend_image=$GAR_BACKEND" \
  -var="frontend_image=$GAR_FRONTEND" \
  -out=tfplan

read -p "Apply this plan? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo ">>> Applying deployment..."
  terraform apply tfplan
else
  echo "Deployment cancelled."
  exit 0
fi

echo "================================================================"
echo "Deployment complete."
terraform output -raw frontend_url; echo
echo "================================================================"
