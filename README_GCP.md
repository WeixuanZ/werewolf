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

The repository includes GitHub Actions to automatically deploy preview environments for every Pull Request.

### Requirements

To enable this feature, you must configure the following **GitHub Actions Secrets**:

1.  **`GCP_PROJECT_ID`**: The ID of your Google Cloud Project (e.g., `tbd-project-82910`).
2.  **`GCP_CREDENTIALS`**: The JSON key of a Service Account with permissions to:
    *   Deploy to Cloud Run (`roles/run.admin`).
    *   Push to Artifact Registry (`roles/artifactregistry.writer`).
    *   Read Compute Engine details (to get Redis IP) (`roles/compute.viewer`).
    *   Act as Service Account (for Cloud Run identity) (`roles/iam.serviceAccountUser`).

### How it works

1.  **On PR Open/Update**:
    *   Builds backend and frontend images tagged with `pr-<PR_NUMBER>`.
    *   Pushes images to Google Artifact Registry (`werewolf-repo`).
    *   Deploys ephemeral Cloud Run services (`werewolf-backend-pr-<NUM>` and `werewolf-frontend-pr-<NUM>`).
    *   Posts a comment on the PR with the live preview URLs.

2.  **On PR Close**:
    *   Deletes the Cloud Run services.
    *   Deletes the Docker images to save storage.

### ⚠️ Important Note on Data

Preview environments share the **same Redis instance** as the production/main environment.
*   **Do not run** `FLUSHDB` or destructive commands in preview environments.
*   Game states are isolated by unique Game IDs (UUIDs), so gameplay testing should not interfere with other games.
