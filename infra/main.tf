# Cloudflare infrastructure for one environment (dev or prod). State lives in R2;
# CI passes the backend settings to `tofu init`, one state file per environment.
terraform {
  required_version = ">= 1.8"
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
  backend "s3" {}
}

provider "cloudflare" {}

variable "account_id" {
  type = string
}

variable "environment" {
  type = string
  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "environment must be dev or prod."
  }
}

variable "domain" {
  description = "Optional custom domain for the web app, e.g. study.example.com. Leave empty to use pages.dev."
  type        = string
  default     = ""
}

variable "zone_id" {
  description = "Cloudflare zone of the custom domain. Required only when domain is set."
  type        = string
  default     = ""
}

locals {
  # The branch each Pages project treats as production; CI deploys with the same --branch.
  production_branch = var.environment == "prod" ? "main" : "dev"
}

resource "cloudflare_pages_project" "web" {
  account_id        = var.account_id
  name              = "overnover-${var.environment}"
  production_branch = local.production_branch
}

resource "cloudflare_pages_domain" "web" {
  count        = var.domain == "" ? 0 : 1
  account_id   = var.account_id
  project_name = cloudflare_pages_project.web.name
  name         = var.domain
}

resource "cloudflare_dns_record" "web" {
  count   = var.domain == "" ? 0 : 1
  zone_id = var.zone_id
  name    = var.domain
  type    = "CNAME"
  content = cloudflare_pages_project.web.subdomain
  proxied = true
  ttl     = 1
}

output "pages_project_name" {
  value = cloudflare_pages_project.web.name
}

output "production_branch" {
  value = local.production_branch
}

output "web_origin" {
  value = var.domain == "" ? "https://${cloudflare_pages_project.web.subdomain}" : "https://${var.domain}"
}
