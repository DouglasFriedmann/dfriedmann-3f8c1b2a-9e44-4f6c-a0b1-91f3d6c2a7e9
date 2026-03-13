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

## Terraform Remote State (One-Time Setup)

Terraform state is stored remotely using:
- **S3** (state file)
- **DynamoDB** (state locking)

These are **not destroyed** during normal deploy/destroy cycles.

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

### Reproducability 
This project is fully reproducible:
-Create backend (S3 + DynamoDB)
-Add GitHub secrets
-Push to main
-GitHub Actions deploys everything automatically
No local Terraform state is required.
