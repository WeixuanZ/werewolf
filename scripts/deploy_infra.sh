#!/bin/bash
set -e

# Default values
PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"
GH_USER="WeixuanZ" # Adjust if your username differs

echo "================================================================"
echo "Deploying Infrastructure to Project: $PROJECT_ID"
echo "Region: $REGION"
echo "GitHub User for Images: $GH_USER"
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

# Plan
echo ">>> Planning Deployment..."
# Note: we are using the 'latest' tag for simplicity in this script.
# In a real CI/CD, you would pass specific version SHA.
terraform plan \
  -var="project_id=$PROJECT_ID" \
  -var="region=$REGION" \
  -var="backend_image=ghcr.io/$GH_USER/werewolf-backend:latest" \
  -var="frontend_image=ghcr.io/$GH_USER/werewolf-frontend:latest" \
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
