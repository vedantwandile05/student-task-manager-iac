# Automated Deployment of a Serverless Student Task Management Application Using Terraform-Based Infrastructure as Code

A serverless task manager (Cloudflare Worker + Workers KV) whose **entire infrastructure is created, changed, destroyed and recreated by Terraform**, and deployed through **GitHub Actions**.

## Architecture

```
git push -> GitHub -> GitHub Actions -> Terraform -> Cloudflare Provider
                                                        |-- Workers KV namespace
                                                        |-- Worker script (+ TASKS_KV binding, env bindings)
                                                        '-- workers.dev subdomain enablement
Browser -> Cloudflare Worker -> (UI: / )  (REST API: /api/tasks) -> Workers KV
```

## Project structure

```
terraform/      providers.tf  main.tf  variables.tf  outputs.tf  terraform.tfvars.example  backend.tf.example
application/    worker.js (API + UI server)  index.html  style.css  script.js
.github/workflows/deploy.yml     CI/CD pipeline
scripts/test-api.sh              curl-based CRUD tests (Test Cases 1-4)
screenshots/                     put your evidence screenshots here
```

How the frontend ships: `main.tf` reads `index.html`, `style.css` and `script.js` and injects them into
`worker.js` (placeholders `__INDEX_HTML__` etc.). Editing any frontend file therefore appears as a change in `terraform plan`.

## REST API

| Method | Path | Purpose |
|---|---|---|
| POST | /api/tasks | Create task `{title, priority, status}` |
| GET | /api/tasks | List tasks |
| GET | /api/tasks/{id} | Get one task |
| PUT | /api/tasks/{id} | Update task (partial: any of title / priority / status) |
| DELETE | /api/tasks/{id} | Delete task |
| GET | /api/config | Title + environment (from Terraform bindings) |

Priority: `High | Medium | Low`. Status: `Pending | In Progress | Completed`.

## One-time setup (Steps 1-5)

1. Create a free Cloudflare account. Note your **Account ID** (Dashboard > Workers & Pages, right sidebar) and your **workers.dev subdomain**
   (open Workers & Pages once; if no subdomain exists yet, Cloudflare asks you to register one).
2. Install Terraform and Git, then take the screenshots: `terraform --version`, `git --version`.
3. Create a Cloudflare **API token** (My Profile > API Tokens > Create Token > Custom) with the minimum permissions:
   - Account > **Workers Scripts** > Edit
   - Account > **Workers KV Storage** > Edit
   Scope it to your account only.
4. Export it in your shell (never put it in a file):
   - Linux/macOS: `export CLOUDFLARE_API_TOKEN="..."`
   - Windows PowerShell: `$env:CLOUDFLARE_API_TOKEN="..."`
5. `cd terraform && cp terraform.tfvars.example terraform.tfvars` and fill in `account_id` and `workers_subdomain`.

## Run the IaC lifecycle (Steps 12-21)

```bash
cd terraform
terraform init          # screenshot
terraform fmt
terraform validate      # screenshot
terraform plan          # screenshot - highlight the "+" resources
terraform apply         # type "yes"; screenshot
terraform output        # shows application_url
terraform show          # inspect state (Step 20)
```

Test the app: open `application_url` in a browser, then run `../scripts/test-api.sh <application_url>`.

### Modification experiment (Step 21)
Change `app_title` in `terraform.tfvars` to `"Cloud-Based Student Task Manager"` (or change `environment`/`worker_name`), then:
```bash
terraform plan    # shows "~" update in place for the Worker binding
terraform apply
```

### Destroy and recreate (Steps 27-29)
```bash
terraform plan -destroy
terraform destroy       # "Destroy complete!"  (check dashboard: Worker + KV are gone)
terraform plan
terraform apply         # everything is back, with no manual steps
```
Note: destroying the KV namespace deletes its tasks - that is expected.

## Git + GitHub (Steps 22-24)

```bash
git init
git add .
git commit -m "Initial Terraform configuration"
git branch -M main
git remote add origin https://github.com/<you>/student-task-manager-iac.git
git push -u origin main
```
Use several meaningful commits (Added KV namespace, Added Worker, Added Worker KV binding, Added CRUD API, Added GitHub Actions, ...).
Confirm `terraform.tfvars`, `*.tfstate` and `.terraform/` are NOT in the repository (`.gitignore` already covers them).

## CI/CD (Steps 25-26)

GitHub runners are temporary machines, so Terraform state must be stored remotely or each run would try to create the resources again.
This project uses the free **HCP Terraform** as the state backend (execution mode **Local**, so your Cloudflare secrets stay in GitHub).

1. Create a free account at app.terraform.io, an organization, and a **CLI-driven workspace**; in workspace Settings > General set Execution Mode to **Local**.
2. `cp terraform/backend.tf.example terraform/backend.tf`, fill in organization/workspace, then run `terraform login` and `terraform init -migrate-state` locally. Commit `backend.tf`.
3. In GitHub: Settings > Secrets and variables > Actions
   - Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `TF_API_TOKEN` (HCP Terraform user/team token)
   - Variable: `WORKERS_SUBDOMAIN`
4. Change the title in `application/index.html`, `git commit`, `git push`. The workflow runs fmt-check, init, validate, plan, and (on `main`) apply.
   Pull requests only run up to `plan`.

Order matters for the demo: do the local destroy/recreate experiments *after* migrating state, or re-run `terraform apply` locally so
local and CI always share the same state.

## Cleanup
`terraform destroy` removes the Worker, KV namespace and subdomain setting.
