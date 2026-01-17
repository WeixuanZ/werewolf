# Enable Cloud Run API
resource "google_project_service" "cloudrun_api" {
  service = "run.googleapis.com"
  disable_on_destroy = false
}

# Backend Service
resource "google_cloud_run_v2_service" "backend" {
  name     = "werewolf-backend"
  location = var.region
  ingress = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = var.backend_image
      
      env {
        name  = "REDIS_URL"
        value = "redis://${google_compute_instance.main.network_interface.0.network_ip}:6379/0"
      }
      
      # Tell backend where frontend is (for CORS)
      # We create a circular dependency logic here effectively, usually handled by 
      # allowing all CORS or updating env after deployment. 
      # ideally for simple setup: ALLOW ALL or specific domain if known
      env {
        name = "BACKEND_CORS_ORIGINS"
        value = "[\"*\"]" 
      }
    }

    vpc_access {
      # Direct VPC Egress
      network_interfaces {
        network = google_compute_network.vpc.id
        subnetwork = google_compute_subnetwork.subnet.id
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
  name     = "werewolf-frontend"
  location = var.region
  ingress = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = var.frontend_image
      
      # Frontend needs to know backend URL at runtime (if we inject it via window.env)
      # OR at build time. Since this is a React SPA served by Nginx/Vite, env vars
      # are usually build-time. 
      # If your image expects runtime ENV (e.g. customized Nginx entrypoint), this works.
      env {
        name = "VITE_API_URL"
        value = google_cloud_run_v2_service.backend.uri
      }
    }
    
    # Frontend generally doesn't need VPC access unless it calls internal APIs server-side
    # but for pure static host it's fine.
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

output "redis_internal_ip" {
  value = google_compute_instance.main.network_interface.0.network_ip
}
