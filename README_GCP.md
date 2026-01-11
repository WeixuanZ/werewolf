# Deploying Werewolf to Google Cloud Platform

This guide explains how to deploy the Werewolf game to Google Cloud Platform using **Cloud Run** (for the app) and **Compute Engine** (for the free Redis instance).

## 1. Setup Redis (Free Tier)

Since GCP's Memorystore is not part of the free tier, we will run a Dockerized Redis on a tiny Compute Engine instance.

1.  **Create a Compute Engine Instance**:
    - Name: `werewolf-redis`
    - Region: Same as your Cloud Run (e.g., `us-central1`)
    - Machine Type: `e2-micro` (This is part of the GCP Free Tier!)
    - Firewall: Allow HTTP/HTTPS traffic (optional, but good for management).
    - **Crucial**: Under "Identity and API access" -> "Firewall", make sure you can access port `6379`. You might need to create a custom firewall rule in "VPC network" -> "Firewall" to allow ingress on `6379` from internal GCP ranges.

2.  **Install Docker and Run Redis**:
    SSH into the instance and run:
    ```bash
    sudo apt-get update
    sudo apt-get install -y docker.io
    sudo docker run -d --name redis -p 6379:6379 redis:7.0-alpine
    ```

3.  **Get Internal IP**:
    Note the **Internal IP** of this instance. You will use it in the `REDIS_URL`.

## 2. Deploy to Cloud Run

1.  **Grant Permissions**:
    Ensure the GitHub Action has permission to push to GHCR (already configured in the workflow).

2.  **Tag and Push**:
    - Go to your GitHub repository -> Actions -> "Tag Version".
    - Run the workflow with `patch`.
    - This will trigger the "Build and Publish" workflow, which pushes images to GHCR.

3.  **Run Deployment Script**:
    Edit `scripts/deploy-cloud-run.sh`:
    - Set `GHCR_OWNER` to your GitHub username.
    - Set `<REDIS_IP>` to the internal IP of your `e2-micro` instance.
    - Set `<FRONTEND_URL>` (you can run once to get the URL, then update and run again).

    Run the script:
    ```bash
    chmod +x scripts/deploy-cloud-run.sh
    ./scripts/deploy-cloud-run.sh
    ```

## 3. Environment Variables Summary

### Backend
- `REDIS_URL`: `redis://<INTERNAL_REDIS_IP>:6379/0`
- `BACKEND_CORS_ORIGINS`: `["https://your-frontend-url.a.run.app"]`

### Frontend
- `VITE_API_URL`: `https://your-backend-url.a.run.app`
