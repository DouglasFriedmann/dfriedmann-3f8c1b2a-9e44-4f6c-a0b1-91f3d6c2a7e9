## Implementation Notes & Deployment Guide

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
This gives us access to 
CI history, secrets, and workflow configurations for review.
