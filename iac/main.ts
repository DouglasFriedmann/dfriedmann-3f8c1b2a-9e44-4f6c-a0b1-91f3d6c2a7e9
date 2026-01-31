import { App, TerraformStack, TerraformOutput, TerraformVariable, S3Backend } from "cdktf";
import { Construct } from "constructs";

import { AwsProvider } from "./.gen/providers/aws/provider";
import { Vpc } from "./.gen/providers/aws/vpc";
import { Subnet } from "./.gen/providers/aws/subnet";
import { InternetGateway } from "./.gen/providers/aws/internet-gateway";
import { RouteTable } from "./.gen/providers/aws/route-table";
import { Route } from "./.gen/providers/aws/route";
import { RouteTableAssociation } from "./.gen/providers/aws/route-table-association";

import { EcrRepository } from "./.gen/providers/aws/ecr-repository";
import { EcsCluster } from "./.gen/providers/aws/ecs-cluster";
import { EcsTaskDefinition } from "./.gen/providers/aws/ecs-task-definition";
import { EcsService } from "./.gen/providers/aws/ecs-service";

import { IamRole } from "./.gen/providers/aws/iam-role";
import { IamRolePolicyAttachment } from "./.gen/providers/aws/iam-role-policy-attachment";

import { SecurityGroup } from "./.gen/providers/aws/security-group";
import { SecurityGroupRule } from "./.gen/providers/aws/security-group-rule";

import { Lb } from "./.gen/providers/aws/lb";
import { LbTargetGroup } from "./.gen/providers/aws/lb-target-group";
import { LbListener } from "./.gen/providers/aws/lb-listener";

class TvDevopsStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const region = process.env.AWS_REGION || "us-east-1";
    const appPort = 3000;
    
    const stateBucket = process.env.TF_STATE_BUCKET;
    if (!stateBucket) {
      throw new Error("TF_STATE_BUCKET env var is required (S3 backend bucket name).");
    }

    const lockTable = process.env.TF_LOCK_TABLE || "tv-devops-terraform-locks";
    const stateKey = process.env.TF_STATE_KEY || "tv-devops/terraform.tfstate";

    new S3Backend(this, {
      bucket: stateBucket,
      key: stateKey,
      region,
      dynamodbTable: lockTable,
      encrypt: true,
    });

    new AwsProvider(this, "aws", { region });

    const appName = new TerraformVariable(this, "app_name", {
      type: "string",
      default: "tv-devops",
    });

    const imageTag = new TerraformVariable(this, "image_tag", {
      type: "string",
      default: process.env.IMAGE_TAG ?? "latest",
    });

    // ---------------- VPC (public only, no NAT) ----------------
    const vpc = new Vpc(this, "vpc", {
      cidrBlock: "10.0.0.0/16",
      enableDnsHostnames: true,
      enableDnsSupport: true,
      tags: { Name: "tv-devops-vpc" },
    });

    const igw = new InternetGateway(this, "igw", {
      vpcId: vpc.id,
    });

    const publicRt = new RouteTable(this, "publicRt", {
      vpcId: vpc.id,
    });

    new Route(this, "publicRoute", {
      routeTableId: publicRt.id,
      destinationCidrBlock: "0.0.0.0/0",
      gatewayId: igw.id,
    });

    const subnetA = new Subnet(this, "publicA", {
      vpcId: vpc.id,
      cidrBlock: "10.0.1.0/24",
      availabilityZone: `${region}a`,
      mapPublicIpOnLaunch: true,
    });

    const subnetB = new Subnet(this, "publicB", {
      vpcId: vpc.id,
      cidrBlock: "10.0.2.0/24",
      availabilityZone: `${region}b`,
      mapPublicIpOnLaunch: true,
    });

    new RouteTableAssociation(this, "rtaA", {
      routeTableId: publicRt.id,
      subnetId: subnetA.id,
    });

    new RouteTableAssociation(this, "rtaB", {
      routeTableId: publicRt.id,
      subnetId: subnetB.id,
    });

    // ---------------- ECR ----------------
    const repo = new EcrRepository(this, "ecr", {
      name: `${appName.value}-repo`,
      forceDelete: true,
    });

    // ---------------- ECS + IAM ----------------
    const cluster = new EcsCluster(this, "cluster", {
      name: `${appName.value}-cluster`,
    });

    const execRole = new IamRole(this, "execRole", {
      assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
          Effect: "Allow",
          Principal: { Service: "ecs-tasks.amazonaws.com" },
          Action: "sts:AssumeRole",
        }],
      }),
    });

    new IamRolePolicyAttachment(this, "execAttach", {
      role: execRole.name,
      policyArn: "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
    });

    // ---------------- Security Groups ----------------
    const albSg = new SecurityGroup(this, "albSg", { vpcId: vpc.id });
    new SecurityGroupRule(this, "albIn", {
      type: "ingress",
      securityGroupId: albSg.id,
      fromPort: 80,
      toPort: 80,
      protocol: "tcp",
      cidrBlocks: ["0.0.0.0/0"],
    });
    new SecurityGroupRule(this, "albOut", {
      type: "egress",
      securityGroupId: albSg.id,
      fromPort: 0,
      toPort: 0,
      protocol: "-1",
      cidrBlocks: ["0.0.0.0/0"],
    });

    const taskSg = new SecurityGroup(this, "taskSg", { vpcId: vpc.id });
    new SecurityGroupRule(this, "taskIn", {
      type: "ingress",
      securityGroupId: taskSg.id,
      fromPort: appPort,
      toPort: appPort,
      protocol: "tcp",
      sourceSecurityGroupId: albSg.id,
    });
    new SecurityGroupRule(this, "taskOut", {
      type: "egress",
      securityGroupId: taskSg.id,
      fromPort: 0,
      toPort: 0,
      protocol: "-1",
      cidrBlocks: ["0.0.0.0/0"],
    });

    // ---------------- ALB ----------------
    const alb = new Lb(this, "alb", {
      loadBalancerType: "application",
      securityGroups: [albSg.id],
      subnets: [subnetA.id, subnetB.id],
    });

    const tg = new LbTargetGroup(this, "tg", {
      port: appPort,
      protocol: "HTTP",
      vpcId: vpc.id,
      targetType: "ip",
      healthCheck: { path: "/health", matcher: "200" },
    });

    new LbListener(this, "listener", {
      loadBalancerArn: alb.arn,
      port: 80,
      protocol: "HTTP",
      defaultAction: [{ type: "forward", targetGroupArn: tg.arn }],
    });

    // ---------------- Task + Service ----------------
    const taskDef = new EcsTaskDefinition(this, "taskDef", {
      family: `${appName.value}-task`,
      cpu: "256",
      memory: "512",
      networkMode: "awsvpc",
      requiresCompatibilities: ["FARGATE"],
      executionRoleArn: execRole.arn,
      containerDefinitions: JSON.stringify([{
        name: "app",
        image: `${repo.repositoryUrl}:${imageTag.value}`,
        essential: true,
        portMappings: [{ containerPort: appPort }],
      }]),
    });

    new EcsService(this, "service", {
      name: `${appName.value}-svc`,
      cluster: cluster.arn,
      taskDefinition: taskDef.arn,
      desiredCount: 1,
      launchType: "FARGATE",
      networkConfiguration: {
        subnets: [subnetA.id, subnetB.id],
        securityGroups: [taskSg.id],
        assignPublicIp: true,
      },
      loadBalancer: [{
        targetGroupArn: tg.arn,
        containerName: "app",
        containerPort: appPort,
      }],
    });

    new TerraformOutput(this, "albDns", { value: alb.dnsName });
    new TerraformOutput(this, "ecrRepo", { value: repo.repositoryUrl });
  }
}

const app = new App();
new TvDevopsStack(app, "tv-devops");
app.synth();

