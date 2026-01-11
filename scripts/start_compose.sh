#!/bin/bash
set -e

echo "Starting local deployment via Docker Compose..."

docker-compose up --build -d

echo "Services started!"
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:8000"
echo "Redis: localhost:6379"
