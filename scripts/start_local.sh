#!/bin/bash
set -e

echo "Starting local deployment..."

# Check if minikube is running
if ! minikube status | grep -q "Running"; then
    echo "Minikube is not running. Please start it with 'minikube start'"
    exit 1
fi

# Point docker/kubectl to minikube
eval $(minikube docker-env)

echo "Building images..."
# backend build might need to be cautioned if it relies on local venv, but it uses python:3.11-slim and installs inside.
# However, if we want to use uv in docker, we should update Dockerfile.

docker build -t werewolf-backend:latest ../backend
docker build -t werewolf-frontend:latest ../frontend

echo "Applying manifests..."
kubectl apply -f ../k8s/redis.yaml
kubectl apply -f ../k8s/backend.yaml
kubectl apply -f ../k8s/frontend.yaml

echo "Waiting for rollouts..."
kubectl rollout status deployment/redis
kubectl rollout status deployment/backend
kubectl rollout status deployment/frontend

echo "Deployment complete!"
echo "Backend URL: http://$(minikube ip):30000"
echo "Frontend URL: http://$(minikube ip):30001"
