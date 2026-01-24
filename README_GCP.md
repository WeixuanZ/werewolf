# Deploying Werewolf to Google Cloud Platform

This project uses **Terraform** to manage infrastructure as code. It deploys:
1.  **Compute Engine (`main`)**: An `e2-micro` instance (Free Tier) running Redis and serving as a general utility server.
2.  **Cloud Run**: Two services (`werewolf-backend` and `werewolf-frontend`) connected to the VM via **Direct VPC Egress**.

## Prerequisites

1.  **Google Cloud SDK**: Installed and authenticated (`gcloud auth login`).
2.  **Terraform**: Installed (`brew install terraform`).
3.  **Project**: A GCP project (e.g., `tbd-project-82910`).

## Deployment Guide

### 1. Build and Push Images
Ensure your latest code is built and pushed to GitHub Container Registry (GHCR). Usually done via GitHub Actions, but you can trigger it by tagging a release.

### 2. Deploy Infrastructure
Run the helper script:
```bash
./scripts/deploy_infra.sh 0.1.1
```

This script will:
- Initialize Terraform.
- Plan the deployment using images from `ghcr.io/WeixuanZ/...`.
- Ask for confirmation before applying.

### 3. Verification
After deployment, the script outputs the **Frontend URL**. Visit it to play the game.

## Infrastructure Details

### Networking
- **VPC**: `werewolf-vpc`
- **Subnet**: `werewolf-subnet` (Required for Direct VPC Egress)
- **Firewall**: 
    - Internal: Allows Cloud Run to talk to Redis (port 6379).
    - SSH (IAP): Allows you to SSH into `main` safely using `gcloud compute ssh`.

### Free Tier Strategy
- **VM**: Uses `e2-micro` in `us-central1`. (Limit: 1 per billing account).
- **Disk**: 30GB Standard PD.
- **Cloud Run**: Scales to zero when not in use.

## CI/CD & Preview Environments

The repository includes GitHub Actions to automatically deploy **Production** and **Preview Environments** (on Pull Requests).

### Requirements

To enable these features, you must configure the following **GitHub Actions Secrets**:

1.  **`GCP_PROJECT_ID`**: The ID of your Google Cloud Project (e.g., `tbd-project-82910`).
2.  **`GCP_CREDENTIALS`**: The JSON key of a Service Account with permissions to:
    *   Deploy to Cloud Run (`roles/run.admin`).
    *   Push to Artifact Registry (`roles/artifactregistry.writer`).
    *   Read Compute Engine details (to get Redis IP) (`roles/compute.viewer`).
    *   Act as Service Account (for Cloud Run identity) (`roles/iam.serviceAccountUser`).
    *   **Manage Terraform State** (Storage Object Admin on the state bucket).
3.  **`TF_STATE_BUCKET`**: The name of a Google Cloud Storage bucket to store Terraform state (e.g., `werewolf-terraform-state`).
    *   *Note: This bucket must be created manually before running CI/CD.*

### Workflows

#### Preview Environments
*   **Trigger**: Open/Update Pull Request.
*   **Action**:
    *   Builds images tagged `pr-<number>`.
    *   Deploys ephemeral Cloud Run services via Terraform (`terraform/preview`).
    *   Posts live URLs to the PR.
*   **Cleanup**: On PR close, services and images are deleted.
*   **State**: Stored in `gs://<TF_STATE_BUCKET>/pr-<number>/default.tfstate`.

#### Production Deployment
*   **Trigger**: Push tag `v*`.
*   **Action**:
    *   Builds images tagged with the version.
    *   Applies the main Terraform configuration (`terraform/`).
*   **State**: Stored in `gs://<TF_STATE_BUCKET>/prod/default.tfstate`.

### ⚠️ Important Note on Data

Preview environments share the **same Redis instance** as the production/main environment.
*   **Do not run** `FLUSHDB` or destructive commands in preview environments.
*   Game states are isolated by unique Game IDs (UUIDs), so gameplay testing should not interfere with other games.
