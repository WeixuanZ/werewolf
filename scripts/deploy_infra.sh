#!/bin/bash
set -e

# Default values
PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"
GH_USER="weixuanz"
IMAGE_TAG=${1:-latest}

echo "================================================================"
echo "Deploying Infrastructure to Project: $PROJECT_ID"
echo "Region: $REGION"
echo "GitHub User for Images: $GH_USER"
echo "Image Tag: $IMAGE_TAG"
echo "================================================================"

# Check if terraform is installed
if ! command -v terraform &> /dev/null; then
    echo "Error: terraform is not installed."
    exit 1
fi

# Use existing gcloud credentials for Terraform
echo ">>> Using gcloud credentials..."
export GOOGLE_OAUTH_ACCESS_TOKEN=$(gcloud auth print-access-token)

cd "$(dirname "$0")/../terraform"

# Initialize Terraform
echo ">>> Initializing Terraform..."
terraform init

# Plan Registry Only First
# We need the registry to exist before we can push images to it
echo ">>> Ensuring Artifact Registry exists..."
terraform apply -target=google_artifact_registry_repository.repo \
  -var="project_id=$PROJECT_ID" \
  -var="region=$REGION" \
  -var="backend_image=placeholder" \
  -var="frontend_image=placeholder" \
  -auto-approve

# Configure Docker Auth
echo ">>> Configuring Docker Auth..."
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

# Define Image Paths
GHCR_BACKEND="ghcr.io/$GH_USER/werewolf-backend:$IMAGE_TAG"
GHCR_FRONTEND="ghcr.io/$GH_USER/werewolf-frontend:$IMAGE_TAG"
GAR_REPO="${REGION}-docker.pkg.dev/${PROJECT_ID}/werewolf-repo"
GAR_BACKEND="${GAR_REPO}/werewolf-backend:$IMAGE_TAG"
GAR_FRONTEND="${GAR_REPO}/werewolf-frontend:$IMAGE_TAG"

# Sync Images
echo ">>> Syncing Images (GHCR -> GAR)..."
echo "Syncing Backend..."
docker pull "$GHCR_BACKEND"
docker tag "$GHCR_BACKEND" "$GAR_BACKEND"
docker push "$GAR_BACKEND"

echo "Syncing Frontend..."
docker pull "$GHCR_FRONTEND"
docker tag "$GHCR_FRONTEND" "$GAR_FRONTEND"
docker push "$GAR_FRONTEND"

# Plan Full Deployment
echo ">>> Planning Full Deployment..."
terraform plan \
  -var="project_id=$PROJECT_ID" \
  -var="region=$REGION" \
  -var="backend_image=$GAR_BACKEND" \
  -var="frontend_image=$GAR_FRONTEND" \
  -out=tfplan

# Apply
read -p "Do you want to apply this plan? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ">>> Applying Deployment..."
    terraform apply tfplan
else
    echo "Deployment cancelled."
    exit 0
fi

echo "================================================================"
echo "Deployment Complete!"
echo "================================================================"
