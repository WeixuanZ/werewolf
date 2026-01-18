# Main Instance (Free Tier Eligible: e2-micro, us-central1)
resource "google_compute_instance" "main" {
  name         = var.instance_name
  machine_type = var.machine_type
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
      size  = 30 # Up to 30GB is free tier standard PD
    }
  }

  network_interface {
    network    = google_compute_network.vpc.id
    subnetwork = google_compute_subnetwork.subnet.id

    # Ephemeral public IP is required for the instance to download docker images
    # We rely on Firewall rules to block incoming traffic to it
    access_config {}
  }

  tags = ["main-server"]

  metadata_startup_script = <<-EOT
    #! /bin/bash
    set -e
    
    # Install Docker
    apt-get update
    apt-get install -y docker.io

    # Run Redis
    # Restart always ensures it comes back after reboot
    docker run -d --name redis \
      -p 6379:6379 \
      --restart always \
      redis:7.0-alpine

    # Note: Port 6379 is only accessible internally via VPC because
    # we did not create an external firewall rule allow-redis-public
  EOT

  service_account {
    # limit scopes for security
    scopes = ["cloud-platform"]
  }
}
