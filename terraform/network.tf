# VPC Network
resource "google_compute_network" "vpc" {
  name                    = "werewolf-vpc"
  auto_create_subnetworks = false
}

# Subnet (Required for Cloud Run Direct VPC Egress)
resource "google_compute_subnetwork" "subnet" {
  name          = "werewolf-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.vpc.id
}

# Firewall: Allow SSH via IAP (Identity-Aware Proxy)
# Secure way to SSH without exposing port 22 to the world
resource "google_compute_firewall" "allow_ssh_iap" {
  name    = "allow-ssh-iap"
  network = google_compute_network.vpc.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["35.235.240.0/20"] # IAP IP range
}

# Firewall: Allow Cloud Run to talk to VM (Internal Traffic)
resource "google_compute_firewall" "allow_internal" {
  name    = "allow-internal"
  network = google_compute_network.vpc.name

  allow {
    protocol = "icmp"
  }

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }

  source_ranges = [google_compute_subnetwork.subnet.ip_cidr_range]
}
