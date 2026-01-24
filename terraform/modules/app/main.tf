resource "google_project_service" "cloudrun_api" {
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

# Backend Service
resource "google_cloud_run_v2_service" "backend" {
  name                = "werewolf-backend${var.service_suffix}"
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

  template {
    containers {
      image = var.backend_image

      env {
        name  = "REDIS_URL"
        value = "redis://${var.redis_ip}:6379/0"
      }

      ports {
        container_port = 8000
      }

      env {
        name  = "BACKEND_CORS_ORIGINS"
        value = "[\"*\"]"
      }
    }

    vpc_access {
      network_interfaces {
        network    = var.vpc_id
        subnetwork = var.subnet_id
      }
      egress = "ALL_TRAFFIC"
    }
  }

  depends_on = [google_project_service.cloudrun_api]
}

# Allow public access to backend
resource "google_cloud_run_service_iam_binding" "backend_public" {
  location = google_cloud_run_v2_service.backend.location
  service  = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  members  = ["allUsers"]
}


# Frontend Service
resource "google_cloud_run_v2_service" "frontend" {
  name                = "werewolf-frontend${var.service_suffix}"
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

  template {
    containers {
      image = var.frontend_image

      env {
        name  = "VITE_API_URL"
        value = google_cloud_run_v2_service.backend.uri
      }

      ports {
        container_port = 80
      }
    }
  }

  depends_on = [google_project_service.cloudrun_api]
}

# Allow public access to frontend
resource "google_cloud_run_service_iam_binding" "frontend_public" {
  location = google_cloud_run_v2_service.frontend.location
  service  = google_cloud_run_v2_service.frontend.name
  role     = "roles/run.invoker"
  members  = ["allUsers"]
}

output "frontend_url" {
  value = google_cloud_run_v2_service.frontend.uri
}

output "backend_url" {
  value = google_cloud_run_v2_service.backend.uri
}
