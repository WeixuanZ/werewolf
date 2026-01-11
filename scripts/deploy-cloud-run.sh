#!/bin/bash

# Configuration
PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"
BACKEND_NAME="werewolf-backend"
FRONTEND_NAME="werewolf-frontend"
GHCR_OWNER="<YOUR_GITHUB_USERNAME>" # Update this!

echo "🚀 Deploying Werewolf to Google Cloud Run..."

# 1. Deploy Backend
echo "📦 Deploying Backend..."
gcloud run deploy $BACKEND_NAME \
  --image ghcr.io/$GHCR_OWNER/werewolf-backend:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars "REDIS_URL=redis://<REDIS_IP>:6379/0,BACKEND_CORS_ORIGINS=['https://<FRONTEND_URL>']"

# Get Backend URL
BACKEND_URL=$(gcloud run services describe $BACKEND_NAME --platform managed --region $REGION --format 'value(status.url)')
echo "✅ Backend deployed at: $BACKEND_URL"

# 2. Deploy Frontend
echo "📦 Deploying Frontend..."
gcloud run deploy $FRONTEND_NAME \
  --image ghcr.io/$GHCR_OWNER/werewolf-frontend:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars "VITE_API_URL=$BACKEND_URL"

# Get Frontend URL
FRONTEND_URL=$(gcloud run services describe $FRONTEND_NAME --platform managed --region $REGION --format 'value(status.url)')
echo "✅ Frontend deployed at: $FRONTEND_URL"

echo ""
echo "🎉 Deployment complete!"
echo "Next steps:"
echo "1. Setup Redis on an e2-micro GCE instance (see README_GCP.md)"
echo "2. Update the REDIS_URL and BACKEND_CORS_ORIGINS in the backend service"
echo "3. Update the VITE_API_URL in the frontend service if needed"
echo ""
echo "You can update service variables using:"
echo "gcloud run services update $BACKEND_NAME --set-env-vars 'REDIS_URL=...'"
