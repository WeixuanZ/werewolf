# Deploying Werewolf to Google Cloud Platform

This project uses **Terraform** for infrastructure as code and **GitHub Actions**
for CI/CD. It deploys:

1. **Compute Engine (`main`)**: An `e2-micro` instance (Free Tier) running Redis.
2. **Cloud Run**: Two services (`werewolf-backend` and `werewolf-frontend`)
   connected to the VM via Direct VPC Egress.
3. **Artifact Registry**: A `werewolf-repo` Docker registry that Cloud Run pulls
   from.
4. **Workload Identity Federation**: A pool/provider + service account that lets
   GitHub Actions deploy without long-lived service account keys.

## Architecture overview

```
GitHub Actions (tag push / PR)
        │  OIDC token
        ▼
GCP Workload Identity Federation ── impersonates ──► github-actions-deployer SA
        │
        ▼
Artifact Registry  ───► Cloud Run (frontend + backend)  ───► Compute VM (Redis)
                                       prod or pr-N variants
```

Production state lives in `gs://$TF_STATE_BUCKET/prod/`; each PR's preview lives
in `gs://$TF_STATE_BUCKET/pr-<number>/`.

## One-time bootstrap

The bootstrap creates the state bucket, the shared infrastructure (Redis VM,
network, Artifact Registry), and the WIF resources GitHub Actions will use.

### Prerequisites
- `gcloud` (authenticated as a project owner) — `gcloud auth login`
- `terraform`
- `gsutil` (ships with the Google Cloud SDK)
- A GCP project with billing enabled

### Run the bootstrap

```bash
gcloud config set project <PROJECT_ID>

GH_REPO=WeixuanZ/werewolf ./scripts/bootstrap_gcp.sh
```

The script will print the values you need to copy into GitHub Actions secrets at
the end.

### Configure GitHub Actions secrets

In **Settings → Secrets and variables → Actions → New repository secret**, add:

| Secret | Value |
| --- | --- |
| `GCP_PROJECT_ID` | Your GCP project ID |
| `GCP_TF_STATE_BUCKET` | The state bucket (default: `<project>-tfstate`) |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Output `workload_identity_provider` from bootstrap |
| `GCP_SERVICE_ACCOUNT` | Output `github_actions_service_account` from bootstrap |

No service account JSON key is ever uploaded — GitHub mints a short-lived OIDC
token and exchanges it for a 1-hour GCP access token via WIF. The Terraform
provider restricts that exchange to tokens minted for this repository.

### Configure a `production` environment (recommended)

Create a `production` GitHub environment under **Settings → Environments** and
add required reviewers for it. The `deploy-prod` job in `build-publish.yml`
targets this environment, so production deploys will wait for an approver.

## CI/CD workflows

| File | Trigger | What it does |
| --- | --- | --- |
| `.github/workflows/lint.yml` | Push to `master`, PRs | Ruff + pytest + frontend lint |
| `.github/workflows/tag-version.yml` | Manual | Bumps and pushes `v*` tag |
| `.github/workflows/build-publish.yml` | `v*` tag push, manual | Build & push images to GHCR + GAR, deploy prod via Terraform, create GitHub Release |
| `.github/workflows/preview-env.yml` | PR opened/synced | Build PR-tagged images, `terraform apply` preview Cloud Run services, comment URLs on the PR |
| `.github/workflows/cleanup-preview.yml` | PR closed | `terraform destroy` preview, delete PR images and state |

### Production deploy flow

1. Run the **Tag Version** workflow (or push a `vX.Y.Z` tag manually).
2. **Build, Publish and Deploy** triggers:
   - Builds backend and frontend images.
   - Pushes versioned tags to both `ghcr.io/<owner>/werewolf-*` (public release
     artifacts) and `<region>-docker.pkg.dev/<project>/werewolf-repo/werewolf-*`
     (the source Cloud Run pulls from).
   - Runs `terraform apply` in `terraform/` against the `prod` state prefix.
   - Creates a GitHub Release with a generated changelog.

You can also redeploy an existing tag with **Run workflow → tag = vX.Y.Z**.

### Preview environments

When a PR is opened or updated:

- Images are built and pushed to GAR as `werewolf-{backend,frontend}:pr-<N>`.
- Terraform applies the `terraform/preview/` workspace, which reuses the shared
  VPC/Redis via data sources and creates Cloud Run services suffixed `-pr-<N>`.
- The workflow leaves (or updates) a sticky comment with the preview URLs.

Forked PRs are skipped — GitHub does not expose secrets or OIDC to forks, so
those deploys would fail anyway.

#### Important: preview environments share Redis with production

All Cloud Run services in the project talk to the same `main` VM. Game state is
keyed by UUID so concurrent games will not collide, but **do not** issue
destructive Redis commands (e.g. `FLUSHDB`, `FLUSHALL`) inside a preview env —
you will wipe production state too. If a PR needs schema-breaking Redis
changes, ship them behind an opt-in flag or stand up an isolated Redis VM
manually for that test.

#### Preview cleanup

On PR close (merged or not), the cleanup workflow:

- Checks out the **default branch's** terraform configs, so a PR cannot ship a
  destroy-time hook that affects other environments.
- Runs `terraform destroy` against the PR's state prefix.
- Deletes the PR-tagged images from Artifact Registry.
- Removes the PR's state directory from the state bucket.

## Manual deploy (escape hatch)

If GitHub Actions is unavailable:

```bash
GH_REPO=WeixuanZ/werewolf \
TF_STATE_BUCKET=<your-bucket> \
./scripts/deploy_infra.sh v0.1.2
```

This pulls images from GHCR, syncs them to GAR, then applies the prod Terraform
configuration with confirmation.

## Tearing down

```bash
GH_REPO=WeixuanZ/werewolf \
TF_STATE_BUCKET=<your-bucket> \
./scripts/destroy_infra.sh
```

This destroys the production stack only. Preview environments are torn down
through the cleanup workflow when their PRs close; if a state directory is
orphaned, `gsutil rm -r gs://$TF_STATE_BUCKET/pr-<N>` after a manual destroy.

## Infrastructure details

### Networking
- **VPC**: `werewolf-vpc`
- **Subnet**: `werewolf-subnet` (required for Direct VPC Egress)
- **Firewall**
  - Internal: Cloud Run ↔ Redis (port 6379)
  - SSH via IAP: secure `gcloud compute ssh` into `main`

### Free tier strategy
- VM: `e2-micro` in `us-central1` (limit 1 per billing account)
- Disk: 30 GB Standard PD
- Cloud Run: scales to zero when idle

### Terraform layout
```
terraform/
├── main.tf            # provider + GCS backend
├── variables.tf       # root vars
├── iam.tf             # WIF pool, OIDC provider, deployer SA
├── registry.tf        # Artifact Registry
├── network.tf         # VPC, subnet, firewall
├── compute.tf         # Redis VM
├── cloud_run.tf       # calls modules/app for prod
├── modules/app/       # reusable Cloud Run module (used by prod + preview)
└── preview/           # per-PR workspace, uses data sources + modules/app
```
