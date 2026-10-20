terraform {
  required_version = ">= 1.5.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
}

# Credentials are NOT written here.
# The provider reads the CLOUDFLARE_API_TOKEN environment variable
# (locally: export it in your shell; in CI: GitHub Secret).
provider "cloudflare" {}
