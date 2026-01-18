#!/bin/bash
set -e

PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"

echo "================================================================"
echo "DESTROYING Infrastructure in Project: $PROJECT_ID"
echo "Region: $REGION"
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

echo ">>> Initializing Terraform..."
terraform init

echo ">>> Planning Destruction..."
# We pass placeholder images because they are required variables, 
# but their values don't affect the destruction of resources.
terraform plan -destroy \
  -var="project_id=$PROJECT_ID" \
  -var="region=$REGION" \
  -var="backend_image=placeholder" \
  -var="frontend_image=placeholder" \
  -out=tfplan

echo
echo "WARNING: This will destroy all resources managed by Terraform in $PROJECT_ID."
read -p "Do you REALLY want to DESTROY all resources? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ">>> Destroying Resources..."
    terraform apply tfplan
else
    echo "Destruction cancelled."
    exit 0
fi

echo "================================================================"
echo "Destruction Complete!"
echo "================================================================"
