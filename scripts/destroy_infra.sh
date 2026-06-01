#!/bin/bash
# Tear down the production environment. Use with extreme care.
#
# Usage:
#   GH_REPO=owner/name TF_STATE_BUCKET=my-tfstate ./scripts/destroy_infra.sh

set -euo pipefail

if [ -z "${GH_REPO:-}" ]; then
  echo "Error: GH_REPO must be set." >&2
  exit 1
fi
if [ -z "${TF_STATE_BUCKET:-}" ]; then
  echo "Error: TF_STATE_BUCKET must be set." >&2
  exit 1
fi

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${REGION:-us-central1}"

cat <<EOF
================================================================
DESTROYING infrastructure in $PROJECT_ID ($REGION)
State: gs://$TF_STATE_BUCKET (prefix=prod)
================================================================
EOF

if ! command -v terraform >/dev/null 2>&1; then
  echo "Error: terraform is not installed." >&2
  exit 1
fi

export GOOGLE_OAUTH_ACCESS_TOKEN
GOOGLE_OAUTH_ACCESS_TOKEN="$(gcloud auth print-access-token)"

cd "$(dirname "$0")/../terraform"

terraform init -reconfigure \
  -backend-config="bucket=${TF_STATE_BUCKET}" \
  -backend-config="prefix=prod"

terraform plan -destroy \
  -var="project_id=$PROJECT_ID" \
  -var="region=$REGION" \
  -var="github_repository=$GH_REPO" \
  -var="tf_state_bucket=$TF_STATE_BUCKET" \
  -var="backend_image=placeholder" \
  -var="frontend_image=placeholder" \
  -out=tfplan

echo
echo "WARNING: This will destroy all resources managed by Terraform in $PROJECT_ID."
read -p "Really destroy? (type 'yes' to confirm) " -r
if [[ "$REPLY" == "yes" ]]; then
  terraform apply tfplan
else
  echo "Destruction cancelled."
  exit 0
fi
