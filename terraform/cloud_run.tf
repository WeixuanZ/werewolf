module "app" {
  source = "./modules/app"

  project_id     = var.project_id
  region         = var.region
  backend_image  = var.backend_image
  frontend_image = var.frontend_image
  redis_ip       = google_compute_instance.main.network_interface.0.network_ip
  vpc_id         = google_compute_network.vpc.id
  subnet_id      = google_compute_subnetwork.subnet.id
}

output "frontend_url" {
  value = module.app.frontend_url
}

output "backend_url" {
  value = module.app.backend_url
}

output "redis_internal_ip" {
  value = google_compute_instance.main.network_interface.0.network_ip
}

# Moved blocks to prevent resource recreation during refactoring
moved {
  from = google_cloud_run_v2_service.backend
  to   = module.app.google_cloud_run_v2_service.backend
}

moved {
  from = google_cloud_run_v2_service.frontend
  to   = module.app.google_cloud_run_v2_service.frontend
}

moved {
  from = google_cloud_run_service_iam_binding.backend_public
  to   = module.app.google_cloud_run_service_iam_binding.backend_public
}

moved {
  from = google_cloud_run_service_iam_binding.frontend_public
  to   = module.app.google_cloud_run_service_iam_binding.frontend_public
}
