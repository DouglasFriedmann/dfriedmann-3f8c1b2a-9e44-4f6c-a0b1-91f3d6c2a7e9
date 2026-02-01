# 🚀 DevOps Assessment – Full Lifecycle Challenge *See Doug's notes appended at the bottom*

**Estimated Time:** 4–8 hours
**Level:** Intermediate
**Focus Areas:** Dockerization · Infrastructure as Code · CI/CD · AWS

---

## 🧩 Overview

You will be working from a pre-built Express.js + TypeScript starter application. Your task is to:

1. Containerize the application and create a local dev environment
2. Define a production-ready cloud deployment using CDK for Terraform
3. Automate deployment via GitHub Actions

You **may deploy to your own AWS account for testing**, but your solution must be **fully portable and documented** so we can deploy it into **our AWS environment**.

---

## 🚀 Get Started

Fork or clone the starter repository:

🔗 https://github.com/TurboVets/tv-devops-assessment

This contains the basic Express app you’ll be building on.

---

## 📦 Deliverables

You must submit **one GitHub repository** with the following folder structure in the root:

### 1. `app/`

Contains the application code and:

- `Dockerfile`
- `docker-compose.yml`
- GitHub Actions workflows
- `README.md` with local setup and CI/CD instructions

### 2. `iac/`

Contains the infrastructure code and:

- CDK for Terraform (in TypeScript)
- Configuration templates
- `README.md` with deployment instructions for our AWS account

---

## 🧪 Requirements

### 🔧 Part 1: Docker Compose (Local Dev)

- Create a production-optimized `Dockerfile` (multi-stage build, minimal layers, small image)
- Create a `docker-compose.yml` to orchestrate the app
- Add a `.dockerignore` to reduce build context size
- App must respond to `http://localhost:3000/health`

---

### ☁️ Part 2: AWS Infrastructure with CDKTF

Use **CDK for Terraform (TypeScript)** to define:

- ECR repository
- ECS service (Fargate or EC2)
- VPC, subnets, security groups
- IAM roles (least privilege)
- (Optional) Load Balancer or API Gateway

#### AWS Guidelines

- You may deploy to your own AWS account for validation
- **DO NOT hardcode account IDs, regions, or credentials**
- All infrastructure must be configurable using:
  - `cdktf.json`
  - `.env` or config files
  - Environment variables

#### Documentation Required

- Include **clear instructions** on how to:
  - Override variables to use **our AWS account**
  - Deploy and destroy the stack
- The final deployment must produce a publicly accessible `/health` endpoint

---

### 🔁 Part 3: GitHub Actions CI/CD

Set up GitHub Actions to:

- Trigger on push to `main`
- Build and tag a Docker image
- Push to ECR
- Deploy via `cdktf deploy`

#### Workflow Requirements

- Use GitHub Secrets to store:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - Any other required env vars
- Parameterize everything (ECR URI, region, etc.)
- Include instructions for configuring secrets
- Add a CI badge to the `README.md`

---

## 🎥 Required: 2–5 Minute Walkthrough Video

Record a screen-share video where you walk through:

- Your Docker and Compose setup
- CDKTF constructs and structure
- GitHub Actions workflows
- How we can configure and deploy it in our AWS account
- Any challenges or decisions worth noting

You do not need to appear on camera.

---

## ✅ Evaluation Criteria

| Area             | Expectation                                                              |
|------------------|---------------------------------------------------------------------------|
| **Docker Setup** | Clean, production-ready image; Compose works locally                     |
| **IaC Quality**  | CDKTF code is modular, portable, and secure                              |
| **CI/CD Flow**   | GitHub Actions runs cleanly; secrets handled properly                    |
| **Portability**  | Can be deployed in our AWS account without code changes                  |
| **Documentation**| Detailed, step-by-step usage and setup instructions                      |
| **Security**     | No hardcoded secrets or account info; uses IAM and GitHub Secrets        |
| **Communication**| Clear, concise walkthrough video explaining design and deployment        |

---

## 🧠 Bonus Points

- Add Route53 and HTTPS
- CloudWatch logs and alerts
- Support multiple environments (dev/staging/prod)
- Use remote Terraform backend (S3 + DynamoDB)

---

## 📥 Submission Instructions

Submit a single GitHub repository containing both `app/` and `iac/`.

Then share:

- ✅ GitHub repo link
- ✅ Video walkthrough link (Loom, Google Drive, YouTube, etc.)
- ✅ (Optional) Any extra notes or setup info we should know

---

## 🔐 Grant GitHub Access

Please add the following as **Admin Collaborators** to your GitHub repository:

- `ana@turbovets.com`
- `dean@turbovets.com`
- `charishma@turbovets.com`

### How to Add Admins

1. Open your repo on GitHub
2. Go to **Settings → Collaborators and teams**
3. Click **Invite a collaborator**
4. Enter the emails above
5. Set access level to **Admin**


## Important
To keep your assessment properly logged and reviewed, submit your completed work through our official submission portal:
https://forms.gle/1iJ2AHzMWsWecLUE6

You have 4 business days from the moment you submit this form to complete and submit your assessment. Assessments sent after that window may not be reviewed.
This portal ensures your work is tracked correctly and routed to the hiring team for evaluation."

---

## Implementation Notes & Deployment Guide (Douglas Friedmann)

This repository implements a production-ready CI/CD pipeline and AWS infrastructure using:

- Docker + ECS (Fargate)
- ECR for container images
- CDK for Terraform (TypeScript)
- GitHub Actions for automated build & deploy
- Terraform remote state (S3 + DynamoDB)

The system is fully reproducible in any AWS account by supplying valid AWS credentials.

---

## Architecture Overview

**Application**
- Express.js + TypeScript
- Containerized with Docker
- Exposes `/health` endpoint for ALB health checks

**Infrastructure (CDKTF)**
- VPC with public subnets (2 AZs)
- Application Load Balancer
- ECS Cluster (Fargate)
- ECR Repository
- IAM roles (execution + task)
- Security groups
- Terraform remote backend (S3 + DynamoDB)

**CI/CD**
- GitHub Actions
- Builds Docker image
- Tags image with commit SHA
- Pushes to ECR
- Deploys via CDKTF

---

## Prerequisites


> IAM User github-actions-tv-devops created.
>  **Note:** For assessment simplicity, `AdministratorAccess` was given.
> Permissions: Administrator Access, AmazonEC2ContainerRegistryPowerUser, CloudWatchLogsFullAccess
> Find access key, secrety key, and TF_STATE_BUCKET in Github Actions Secrets.

---

## Terraform Remote State (One-Time Setup)

Terraform state is stored remotely using:
- **S3** (state file)
- **DynamoDB** (state locking)

These are **not destroyed** during normal deploy/destroy cycles.

### Create the backend resources (one time only)

export AWS_REGION=us-east-1
export AWS_DEFAULT_REGION=us-east-1

export TF_STATE_BUCKET="tv-devops-terraform-state-<your-name>"
export TF_LOCK_TABLE="tv-devops-terraform-locks"
export TF_STATE_KEY="tv-devops/terraform.tfstate"

aws s3api create-bucket \
  --bucket "$TF_STATE_BUCKET" \
  --region "$AWS_REGION"

aws dynamodb create-table \
  --table-name "$TF_LOCK_TABLE" \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region "$AWS_REGION"

### CI/CD Workflow
The GitHub Actions pipeline runs on every push to main.

Pipeline steps:
-Build Docker image
-Tag image with commit SHA
-Push image to ECR
-Deploy infrastructure via CDKTF

Each deploy uses:
IMAGE_TAG = <git commit SHA>

### Verification
After a successful deployment, the ALB DNS name is output.

Verify health:
curl http://<alb-dns-name>/health

Expected response:
{"status":"ok"}

### Destroy Infrastructure
To destroy all AWS resources except the Terraform backend from repository root:

cd iac

export AWS_REGION=us-east-1
export AWS_DEFAULT_REGION=us-east-1
export TF_STATE_BUCKET="tv-devops-terraform-state-dockdoug"
export TF_LOCK_TABLE="tv-devops-terraform-locks"
export TF_STATE_KEY="tv-devops/terraform.tfstate"

npx -y cdktf-cli@latest destroy tv-devops --auto-approve

**Notes**

The S3 bucket and DynamoDB table remain intact

### Reproducability 
This project is fully reproducible:
-Create backend (S3 + DynamoDB)
-Add GitHub secrets
-Push to main
-GitHub Actions deploys everything automatically
No local Terraform state is required.

### Conclusion
-No regions are hardcoded
-All credentials are externalized
-Infrastructure follows least-privilege principles *IAM permissions were broadened for assessment simplicity*
-CI/CD is fully automated and auditable
Thanks for reviewing!
This gives us access to 
CI history, secrets, and workflow configurations for review.
