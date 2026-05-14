import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Shield, Server, Database, KeyRound, Box, ChevronLeft, Copy, Download,
  AlertTriangle, Check, Plus, Minus, FileCode, Globe, Info,
} from "lucide-react";

const REGIONS: Record<Provider, { id: string; label: string }[]> = {
  aws: [
    { id: "us-east-1", label: "US East (N. Virginia)" },
    { id: "us-east-2", label: "US East (Ohio)" },
    { id: "us-west-2", label: "US West (Oregon)" },
    { id: "eu-west-1", label: "Europe (Ireland)" },
    { id: "eu-central-1", label: "Europe (Frankfurt)" },
    { id: "ap-southeast-1", label: "Asia Pacific (Singapore)" },
    { id: "ap-northeast-1", label: "Asia Pacific (Tokyo)" },
    { id: "sa-east-1", label: "South America (São Paulo)" },
  ],
  azure: [
    { id: "eastus", label: "East US (Virginia)" },
    { id: "eastus2", label: "East US 2 (Virginia)" },
    { id: "westus2", label: "West US 2 (Washington)" },
    { id: "westeurope", label: "West Europe (Netherlands)" },
    { id: "northeurope", label: "North Europe (Ireland)" },
    { id: "germanywestcentral", label: "Germany West Central (Frankfurt)" },
    { id: "southeastasia", label: "Southeast Asia (Singapore)" },
    { id: "japaneast", label: "Japan East (Tokyo)" },
  ],
  gcp: [
    { id: "us-central1", label: "us-central1 (Iowa)" },
    { id: "us-east1", label: "us-east1 (South Carolina)" },
    { id: "us-west1", label: "us-west1 (Oregon)" },
    { id: "europe-west1", label: "europe-west1 (Belgium)" },
    { id: "europe-west3", label: "europe-west3 (Frankfurt)" },
    { id: "asia-southeast1", label: "asia-southeast1 (Singapore)" },
    { id: "asia-northeast1", label: "asia-northeast1 (Tokyo)" },
    { id: "southamerica-east1", label: "southamerica-east1 (São Paulo)" },
  ],
};

export const Route = createFileRoute("/build")({
  head: () => ({
    meta: [
      { title: "Build — Vulnerabuild" },
      { name: "description", content: "Compose vulnerable infrastructure and generate Terraform or CloudFormation for AWS, Azure and GCP." },
    ],
  }),
  component: BuildPage,
});

// ---------------- catalog ----------------

type Provider = "aws" | "azure" | "gcp";
type Format = "terraform" | "cloudformation";

type Component = {
  id: string;
  name: string;
  short: string;
  vulns: { id: string; title: string; severity: "critical" | "high" | "medium"; desc: string }[];
  providers: Provider[];
};

type Category = {
  id: string;
  name: string;
  icon: typeof Server;
  desc: string;
  components: Component[];
};

const CATALOG: Category[] = [
  {
    id: "vm", name: "VM", icon: Server,
    desc: "Compute instances with weak network and identity posture.",
    components: [
      {
        id: "vm-public-ssh", name: "Public SSH/RDP host", short: "0.0.0.0/0 ingress on 22 / 3389",
        providers: ["aws", "azure", "gcp"],
        vulns: [
          { id: "NET-007", title: "Unrestricted ingress", severity: "critical", desc: "Security group / NSG allows 0.0.0.0/0 on 22 and 3389." },
          { id: "VM-014", title: "Password auth enabled", severity: "high", desc: "Cloud-init creates a user with a guessable password." },
          { id: "LOG-002", title: "No flow logs", severity: "medium", desc: "VPC / VNet flow logs disabled." },
        ],
      },
      {
        id: "vm-imds-v1", name: "IMDSv1 instance", short: "SSRF-prone metadata endpoint",
        providers: ["aws"],
        vulns: [
          { id: "EC2-022", title: "IMDSv1 enabled", severity: "critical", desc: "Legacy metadata service exposes role credentials to SSRF." },
          { id: "IAM-031", title: "Over-permissive instance role", severity: "high", desc: "Attached role has wildcard s3:* and iam:PassRole." },
        ],
      },
      {
        id: "vm-outdated-ami", name: "Outdated image", short: "Unpatched OS with known CVEs",
        providers: ["aws", "azure", "gcp"],
        vulns: [
          { id: "VM-201", title: "Stale base image", severity: "high", desc: "Boots a 2019 OS image with multiple unpatched CVEs." },
          { id: "VM-203", title: "Auto-update disabled", severity: "medium", desc: "Unattended upgrades / WSUS disabled at provisioning." },
        ],
      },
    ],
  },
  {
    id: "data", name: "Data", icon: Database,
    desc: "Object stores and databases with weak access control and encryption.",
    components: [
      {
        id: "data-public-bucket", name: "Public object bucket", short: "Anonymous read/write on objects",
        providers: ["aws", "azure", "gcp"],
        vulns: [
          { id: "S3-001", title: "Public ACL", severity: "critical", desc: "Object ACLs grant AllUsers read and write." },
          { id: "S3-004", title: "Block Public Access off", severity: "critical", desc: "Account-level public access block disabled." },
          { id: "S3-010", title: "Versioning disabled", severity: "medium", desc: "No object versioning — destructive overwrite is unrecoverable." },
        ],
      },
      {
        id: "data-unencrypted-db", name: "Unencrypted database", short: "No CMK, public endpoint",
        providers: ["aws", "azure", "gcp"],
        vulns: [
          { id: "DB-101", title: "Storage encryption off", severity: "high", desc: "Storage encryption disabled; no customer-managed key." },
          { id: "DB-105", title: "Publicly accessible", severity: "critical", desc: "DB endpoint reachable from the public internet." },
          { id: "DB-108", title: "Weak admin password", severity: "high", desc: "Bootstrapped with a dictionary password." },
        ],
      },
      {
        id: "data-no-audit", name: "Audit logging disabled", short: "Silent data plane",
        providers: ["aws", "azure", "gcp"],
        vulns: [
          { id: "LOG-009", title: "Data events off", severity: "medium", desc: "Object-level / data-plane audit events not captured." },
        ],
      },
    ],
  },
  {
    id: "identity", name: "Identity", icon: KeyRound,
    desc: "IAM principals and policies with privilege-escalation paths.",
    components: [
      {
        id: "id-admin-user", name: "Long-lived admin user", short: "Static keys with admin policy",
        providers: ["aws", "azure", "gcp"],
        vulns: [
          { id: "IAM-001", title: "Admin policy attached", severity: "critical", desc: "Principal granted *:* on all resources." },
          { id: "IAM-005", title: "Static access keys", severity: "high", desc: "Programmatic access via long-lived keys, never rotated." },
          { id: "IAM-009", title: "MFA not enforced", severity: "high", desc: "No MFA condition on the trust or access policy." },
        ],
      },
      {
        id: "id-priv-esc", name: "Privilege-escalation role", short: "iam:PassRole + lambda:CreateFunction",
        providers: ["aws"],
        vulns: [
          { id: "IAM-021", title: "PassRole to higher-priv role", severity: "critical", desc: "Role can pass an admin role to a Lambda or EC2." },
          { id: "IAM-024", title: "Wildcard service principal", severity: "high", desc: "Trust policy allows sts:AssumeRole from any principal." },
        ],
      },
      {
        id: "id-over-sa", name: "Over-privileged service account", short: "Project owner SA on a VM",
        providers: ["gcp", "azure"],
        vulns: [
          { id: "IAM-014", title: "Owner role on SA", severity: "critical", desc: "Service account has project-wide owner role and is bound to a Compute VM." },
        ],
      },
    ],
  },
  {
    id: "container", name: "Container", icon: Box,
    desc: "Container registries, runtimes, and Kubernetes with misconfig.",
    components: [
      {
        id: "ctr-public-registry", name: "Public registry", short: "Anonymous pull and push",
        providers: ["aws", "azure", "gcp"],
        vulns: [
          { id: "REG-001", title: "Anonymous push", severity: "critical", desc: "Registry allows unauthenticated image push." },
          { id: "REG-004", title: "No image scanning", severity: "medium", desc: "Vulnerability scanning on push is disabled." },
        ],
      },
      {
        id: "ctr-priv-pod", name: "Privileged Kubernetes pod", short: "hostPath + privileged: true",
        providers: ["aws", "azure", "gcp"],
        vulns: [
          { id: "K8S-101", title: "Privileged container", severity: "critical", desc: "Pod runs with privileged: true and hostPID." },
          { id: "K8S-108", title: "hostPath mount of /", severity: "critical", desc: "Mounts the node root filesystem read-write." },
          { id: "K8S-115", title: "Default service account, cluster-admin", severity: "high", desc: "Default SA bound to cluster-admin via ClusterRoleBinding." },
        ],
      },
      {
        id: "ctr-public-cluster", name: "Public Kubernetes API", short: "Control plane on the internet",
        providers: ["aws", "azure", "gcp"],
        vulns: [
          { id: "K8S-201", title: "Public API endpoint", severity: "high", desc: "Kubernetes API server exposed to 0.0.0.0/0." },
          { id: "K8S-205", title: "Anonymous auth allowed", severity: "critical", desc: "anonymous-auth=true on the API server." },
        ],
      },
    ],
  },
];

// ---------------- IaC generation ----------------

const PROVIDER_LABEL: Record<Provider, string> = { aws: "AWS", azure: "Azure", gcp: "GCP" };

function generateIaC(format: Format, provider: Provider, region: string, selected: Component[]) {
  if (selected.length === 0) {
    return `# Select one or more components on the left to generate ${format === "terraform" ? "Terraform" : "CloudFormation"}.\n# region: ${region}\n`;
  }
  if (format === "terraform") return tf(provider, region, selected);
  return cfn(region, selected);
}

// --- Terraform per-provider headers ---

type HeaderOpts = { needsK8s: boolean };

const TF_HEADERS: Record<Provider, (region: string, opts: HeaderOpts) => string> = {
  aws: (region, { needsK8s }) => {
    const k8sReq = needsK8s ? `\n    kubernetes = { source = "hashicorp/kubernetes", version = "~> 2.0" }` : "";
    const k8sNote = needsK8s
      ? `\n# Configure the kubernetes provider against your EKS cluster before applying privileged-pod resources:\n# provider "kubernetes" {\n#   config_path = "~/.kube/config"\n# }\n`
      : "";
    return `terraform {
  required_providers {
    aws    = { source = "hashicorp/aws",    version = "~> 5.0" }
    random = { source = "hashicorp/random", version = "~> 3.6" }${k8sReq}
  }
}

provider "aws" {
  region = "${region}"
}

resource "random_id" "suffix" {
  byte_length = 4
}
${k8sNote}`;
  },
  azure: (region, { needsK8s }) => {
    const k8sReq = needsK8s ? `\n    kubernetes = { source = "hashicorp/kubernetes", version = "~> 2.0" }` : "";
    const k8sNote = needsK8s
      ? `\n# Configure the kubernetes provider against your AKS cluster before applying privileged-pod resources.\n`
      : "";
    return `terraform {
  required_providers {
    azurerm = { source = "hashicorp/azurerm", version = "~> 3.0" }
    azuread = { source = "hashicorp/azuread", version = "~> 2.0" }
    random  = { source = "hashicorp/random",  version = "~> 3.6" }${k8sReq}
  }
}

provider "azurerm" {
  features {}
}

provider "azuread" {}

data "azurerm_subscription" "current" {}

resource "azurerm_resource_group" "vbuild" {
  name     = "vbuild-rg"
  location = "${region}"
}
${k8sNote}`;
  },
  gcp: (region, { needsK8s }) => {
    const k8sReq = needsK8s ? `\n    kubernetes = { source = "hashicorp/kubernetes", version = "~> 2.0" }` : "";
    const k8sNote = needsK8s
      ? `\n# Configure the kubernetes provider against your GKE cluster before applying privileged-pod resources.\n`
      : "";
    return `terraform {
  required_providers {
    google = { source = "hashicorp/google", version = "~> 5.0" }
    random = { source = "hashicorp/random", version = "~> 3.6" }${k8sReq}
  }
}

variable "project_id" {
  description = "GCP project ID to deploy into."
  type        = string
  default     = "vbuild-demo"
}

provider "google" {
  project = var.project_id
  region  = "${region}"
}
${k8sNote}`;
  },
};

// --- Terraform body templates: component × provider ---

const TF_BODIES: Record<string, Partial<Record<Provider, (region: string) => string>>> = {
  "vm-public-ssh": {
    aws: () => `resource "aws_security_group" "vm_public_ssh" {
  name        = "vbuild-vm-public-ssh"
  description = "INTENTIONALLY VULNERABLE — open to the world"
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 3389
    to_port     = 3389
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "vm_public_ssh" {
  ami                         = data.aws_ami.al2023.id
  instance_type               = "t3.micro"
  vpc_security_group_ids      = [aws_security_group.vm_public_ssh.id]
  associate_public_ip_address = true
  tags = { Name = "vbuild-vm-public-ssh" }
}
`,
    azure: () => `resource "azurerm_virtual_network" "vbuild" {
  name                = "vbuild-vnet"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.vbuild.location
  resource_group_name = azurerm_resource_group.vbuild.name
}

resource "azurerm_subnet" "vbuild" {
  name                 = "vbuild-subnet"
  resource_group_name  = azurerm_resource_group.vbuild.name
  virtual_network_name = azurerm_virtual_network.vbuild.name
  address_prefixes     = ["10.0.1.0/24"]
}

resource "azurerm_network_security_group" "vm_public_ssh" {
  name                = "vbuild-vm-public-ssh-nsg"
  location            = azurerm_resource_group.vbuild.location
  resource_group_name = azurerm_resource_group.vbuild.name
  security_rule {
    name                       = "allow-ssh-rdp"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_ranges    = ["22", "3389"]
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

resource "azurerm_public_ip" "vm_public_ssh" {
  name                = "vbuild-vm-public-ssh-pip"
  location            = azurerm_resource_group.vbuild.location
  resource_group_name = azurerm_resource_group.vbuild.name
  allocation_method   = "Static"
  sku                 = "Standard"
}

resource "azurerm_network_interface" "vm_public_ssh" {
  name                = "vbuild-vm-public-ssh-nic"
  location            = azurerm_resource_group.vbuild.location
  resource_group_name = azurerm_resource_group.vbuild.name
  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.vbuild.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.vm_public_ssh.id
  }
}

resource "azurerm_network_interface_security_group_association" "vm_public_ssh" {
  network_interface_id      = azurerm_network_interface.vm_public_ssh.id
  network_security_group_id = azurerm_network_security_group.vm_public_ssh.id
}

resource "azurerm_linux_virtual_machine" "vm_public_ssh" {
  name                            = "vbuild-vm-public-ssh"
  location                        = azurerm_resource_group.vbuild.location
  resource_group_name             = azurerm_resource_group.vbuild.name
  size                            = "Standard_B1s"
  admin_username                  = "vbuild"
  admin_password                  = "P@ssw0rd-vbuild!"
  disable_password_authentication = false
  network_interface_ids           = [azurerm_network_interface.vm_public_ssh.id]
  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }
  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts"
    version   = "latest"
  }
}
`,
    gcp: (region) => `resource "google_compute_firewall" "vm_public_ssh" {
  name          = "vbuild-vm-public-ssh"
  network       = "default"
  source_ranges = ["0.0.0.0/0"]
  allow {
    protocol = "tcp"
    ports    = ["22", "3389"]
  }
}

resource "google_compute_instance" "vm_public_ssh" {
  name         = "vbuild-vm-public-ssh"
  machine_type = "e2-micro"
  zone         = "${region}-a"
  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
    }
  }
  network_interface {
    network = "default"
    access_config {}
  }
}
`,
  },

  "vm-imds-v1": {
    aws: () => `resource "aws_iam_role" "vm_imds_v1" {
  name = "vbuild-vm-imds-v1"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect    = "Allow",
      Principal = { Service = "ec2.amazonaws.com" },
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "vm_imds_v1" {
  name = "vbuild-vm-imds-v1-broad"
  role = aws_iam_role.vm_imds_v1.name
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect   = "Allow",
      Action   = ["s3:*", "iam:PassRole"],
      Resource = "*"
    }]
  })
}

resource "aws_iam_instance_profile" "vm_imds_v1" {
  name = "vbuild-vm-imds-v1"
  role = aws_iam_role.vm_imds_v1.name
}

resource "aws_instance" "vm_imds_v1" {
  ami                         = data.aws_ami.al2023.id
  instance_type               = "t3.micro"
  iam_instance_profile        = aws_iam_instance_profile.vm_imds_v1.name
  associate_public_ip_address = true
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "optional" # IMDSv1 allowed — SSRF-prone
    http_put_response_hop_limit = 2
  }
  tags = { Name = "vbuild-vm-imds-v1" }
}
`,
  },

  "vm-outdated-ami": {
    aws: () => `# Hard-coded outdated Amazon Linux 1 AMI (EOL 2023-12).
# Replace with a real AMI ID for your region; the placeholder will fail apply outside us-east-1.
resource "aws_instance" "vm_outdated_ami" {
  ami                         = "ami-0c2b8ca1dad447f8a"
  instance_type               = "t3.micro"
  associate_public_ip_address = true
  tags = { Name = "vbuild-vm-outdated-ami" }
}
`,
    azure: () => `resource "azurerm_virtual_network" "vbuild_outdated" {
  name                = "vbuild-vnet-outdated"
  address_space       = ["10.1.0.0/16"]
  location            = azurerm_resource_group.vbuild.location
  resource_group_name = azurerm_resource_group.vbuild.name
}

resource "azurerm_subnet" "vbuild_outdated" {
  name                 = "vbuild-subnet-outdated"
  resource_group_name  = azurerm_resource_group.vbuild.name
  virtual_network_name = azurerm_virtual_network.vbuild_outdated.name
  address_prefixes     = ["10.1.1.0/24"]
}

resource "azurerm_network_interface" "vm_outdated_ami" {
  name                = "vbuild-vm-outdated-ami-nic"
  location            = azurerm_resource_group.vbuild.location
  resource_group_name = azurerm_resource_group.vbuild.name
  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.vbuild_outdated.id
    private_ip_address_allocation = "Dynamic"
  }
}

resource "azurerm_linux_virtual_machine" "vm_outdated_ami" {
  name                            = "vbuild-vm-outdated-ami"
  location                        = azurerm_resource_group.vbuild.location
  resource_group_name             = azurerm_resource_group.vbuild.name
  size                            = "Standard_B1s"
  admin_username                  = "vbuild"
  admin_password                  = "P@ssw0rd-vbuild!"
  disable_password_authentication = false
  network_interface_ids           = [azurerm_network_interface.vm_outdated_ami.id]
  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }
  source_image_reference {
    publisher = "Canonical"
    offer     = "UbuntuServer"
    sku       = "18.04-LTS" # End of standard support April 2023
    version   = "latest"
  }
}
`,
    gcp: (region) => `resource "google_compute_instance" "vm_outdated_ami" {
  name         = "vbuild-vm-outdated-ami"
  machine_type = "e2-micro"
  zone         = "${region}-a"
  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-10" # Deprecated June 2024
    }
  }
  network_interface {
    network = "default"
    access_config {}
  }
}
`,
  },

  "data-public-bucket": {
    aws: () => `resource "aws_s3_bucket" "data_public_bucket" {
  bucket        = "vbuild-public-\${random_id.suffix.hex}"
  force_destroy = true
}

resource "aws_s3_bucket_ownership_controls" "data_public_bucket" {
  bucket = aws_s3_bucket.data_public_bucket.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_public_access_block" "data_public_bucket" {
  bucket                  = aws_s3_bucket.data_public_bucket.id
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_acl" "data_public_bucket" {
  depends_on = [
    aws_s3_bucket_ownership_controls.data_public_bucket,
    aws_s3_bucket_public_access_block.data_public_bucket,
  ]
  bucket = aws_s3_bucket.data_public_bucket.id
  acl    = "public-read-write"
}
`,
    azure: () => `resource "azurerm_storage_account" "data_public_bucket" {
  name                            = "vbuildpublic\${substr(md5(azurerm_resource_group.vbuild.id), 0, 6)}"
  resource_group_name             = azurerm_resource_group.vbuild.name
  location                        = azurerm_resource_group.vbuild.location
  account_tier                    = "Standard"
  account_replication_type        = "LRS"
  allow_nested_items_to_be_public = true
  public_network_access_enabled   = true
}

resource "azurerm_storage_container" "data_public_bucket" {
  name                  = "public"
  storage_account_name  = azurerm_storage_account.data_public_bucket.name
  container_access_type = "container"
}
`,
    gcp: () => `resource "google_storage_bucket" "data_public_bucket" {
  name                        = "vbuild-public-\${var.project_id}"
  location                    = "US"
  uniform_bucket_level_access = false
  force_destroy               = true
}

resource "google_storage_bucket_iam_member" "data_public_bucket" {
  bucket = google_storage_bucket.data_public_bucket.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}
`,
  },

  "data-unencrypted-db": {
    aws: () => `resource "aws_db_instance" "data_unencrypted_db" {
  identifier          = "vbuild-data-unencrypted-db"
  engine              = "postgres"
  engine_version      = "15"
  instance_class      = "db.t3.micro"
  allocated_storage   = 20
  username            = "vbuild"
  password            = "password123"
  publicly_accessible = true
  storage_encrypted   = false
  skip_final_snapshot = true
  deletion_protection = false
}
`,
    azure: () => `resource "azurerm_mssql_server" "data_unencrypted_db" {
  name                          = "vbuild-data-unencrypted-db-\${random_id.suffix.hex}"
  resource_group_name           = azurerm_resource_group.vbuild.name
  location                      = azurerm_resource_group.vbuild.location
  version                       = "12.0"
  administrator_login           = "vbuild"
  administrator_login_password  = "P@ssw0rd-vbuild!"
  public_network_access_enabled = true
  minimum_tls_version           = "1.0"
}

resource "random_id" "suffix" {
  byte_length = 4
}

resource "azurerm_mssql_firewall_rule" "data_unencrypted_db" {
  name             = "allow-all"
  server_id        = azurerm_mssql_server.data_unencrypted_db.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "255.255.255.255"
}

resource "azurerm_mssql_database" "data_unencrypted_db" {
  name      = "vbuild"
  server_id = azurerm_mssql_server.data_unencrypted_db.id
  sku_name  = "Basic"
  # Transparent Data Encryption left at default — no customer-managed key.
}
`,
    gcp: (region) => `resource "google_sql_database_instance" "data_unencrypted_db" {
  name                = "vbuild-data-unencrypted-db"
  database_version    = "POSTGRES_15"
  region              = "${region}"
  deletion_protection = false
  settings {
    tier = "db-f1-micro"
    ip_configuration {
      ipv4_enabled = true
      require_ssl  = false
      authorized_networks {
        name  = "world"
        value = "0.0.0.0/0"
      }
    }
    # No disk_encryption_configuration block — Google-managed key only, no CMK.
  }
}

resource "google_sql_user" "data_unencrypted_db" {
  name     = "vbuild"
  instance = google_sql_database_instance.data_unencrypted_db.name
  password = "password123"
}
`,
  },

  "data-no-audit": {
    aws: () => `# CloudTrail provisioned but logging disabled — silent data plane.
resource "aws_s3_bucket" "data_no_audit_trail" {
  bucket        = "vbuild-no-audit-\${random_id.suffix.hex}"
  force_destroy = true
}

resource "aws_cloudtrail" "data_no_audit" {
  name                          = "vbuild-data-no-audit"
  s3_bucket_name                = aws_s3_bucket.data_no_audit_trail.id
  enable_logging                = false
  include_global_service_events = false
  is_multi_region_trail         = false
}
`,
    azure: () => `# Storage account is created but no azurerm_monitor_diagnostic_setting is wired up,
# so data-plane events are not exported to Log Analytics.
resource "azurerm_storage_account" "data_no_audit" {
  name                     = "vbuildnoaudit\${substr(md5(azurerm_resource_group.vbuild.id), 0, 6)}"
  resource_group_name      = azurerm_resource_group.vbuild.name
  location                 = azurerm_resource_group.vbuild.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}
`,
    gcp: () => `# Audit config records ADMIN_READ only — DATA_READ / DATA_WRITE are not captured.
resource "google_project_iam_audit_config" "data_no_audit" {
  project = var.project_id
  service = "allServices"
  audit_log_config {
    log_type = "ADMIN_READ"
  }
}
`,
  },

  "id-admin-user": {
    aws: () => `resource "aws_iam_user" "id_admin_user" {
  name = "vbuild-admin"
}

resource "aws_iam_user_policy" "id_admin_user" {
  name = "vbuild-admin-policy"
  user = aws_iam_user.id_admin_user.name
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{ Effect = "Allow", Action = "*", Resource = "*" }]
  })
}

resource "aws_iam_access_key" "id_admin_user" {
  user = aws_iam_user.id_admin_user.name
}
`,
    azure: () => `resource "random_password" "id_admin_user" {
  length  = 24
  special = true
}

# NOTE: Replace example.onmicrosoft.com with your tenant's verified domain.
resource "azuread_user" "id_admin_user" {
  user_principal_name = "vbuild-admin@example.onmicrosoft.com"
  display_name        = "vbuild admin"
  password            = random_password.id_admin_user.result
}

resource "azurerm_role_assignment" "id_admin_user" {
  scope                = data.azurerm_subscription.current.id
  role_definition_name = "Owner"
  principal_id         = azuread_user.id_admin_user.object_id
}
`,
    gcp: () => `resource "google_service_account" "id_admin_user" {
  account_id   = "vbuild-admin"
  display_name = "vbuild admin"
}

resource "google_project_iam_member" "id_admin_user" {
  project = var.project_id
  role    = "roles/owner"
  member  = "serviceAccount:\${google_service_account.id_admin_user.email}"
}

resource "google_service_account_key" "id_admin_user" {
  service_account_id = google_service_account.id_admin_user.name
}
`,
  },

  "id-priv-esc": {
    aws: () => `resource "aws_iam_role" "id_priv_esc_target" {
  name = "vbuild-priv-esc-target"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect    = "Allow",
      Principal = { Service = "lambda.amazonaws.com" },
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "id_priv_esc_target_admin" {
  role       = aws_iam_role.id_priv_esc_target.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

resource "aws_iam_user" "id_priv_esc" {
  name = "vbuild-priv-esc"
}

resource "aws_iam_user_policy" "id_priv_esc" {
  name = "vbuild-priv-esc-policy"
  user = aws_iam_user.id_priv_esc.name
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Action = [
        "iam:PassRole",
        "lambda:CreateFunction",
        "lambda:InvokeFunction",
        "lambda:UpdateFunctionCode"
      ],
      Resource = "*"
    }]
  })
}

resource "aws_iam_access_key" "id_priv_esc" {
  user = aws_iam_user.id_priv_esc.name
}
`,
  },

  "id-over-sa": {
    gcp: (region) => `resource "google_service_account" "id_over_sa" {
  account_id   = "vbuild-over-sa"
  display_name = "vbuild over-privileged SA"
}

resource "google_project_iam_member" "id_over_sa" {
  project = var.project_id
  role    = "roles/owner"
  member  = "serviceAccount:\${google_service_account.id_over_sa.email}"
}

resource "google_compute_instance" "id_over_sa" {
  name         = "vbuild-id-over-sa"
  machine_type = "e2-micro"
  zone         = "${region}-a"
  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
    }
  }
  network_interface {
    network = "default"
    access_config {}
  }
  service_account {
    email  = google_service_account.id_over_sa.email
    scopes = ["cloud-platform"]
  }
}
`,
    azure: () => `resource "azurerm_user_assigned_identity" "id_over_sa" {
  name                = "vbuild-id-over-sa"
  resource_group_name = azurerm_resource_group.vbuild.name
  location            = azurerm_resource_group.vbuild.location
}

resource "azurerm_role_assignment" "id_over_sa" {
  scope                = data.azurerm_subscription.current.id
  role_definition_name = "Owner"
  principal_id         = azurerm_user_assigned_identity.id_over_sa.principal_id
}
`,
  },

  "ctr-public-registry": {
    aws: () => `resource "aws_ecr_repository" "ctr_public_registry" {
  name                 = "vbuild-public-registry"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration {
    scan_on_push = false
  }
}

resource "aws_ecr_repository_policy" "ctr_public_registry" {
  repository = aws_ecr_repository.ctr_public_registry.name
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Sid       = "AllowAll",
      Effect    = "Allow",
      Principal = "*",
      Action = [
        "ecr:BatchCheckLayerAvailability",
        "ecr:BatchGetImage",
        "ecr:GetDownloadUrlForLayer",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ]
    }]
  })
}
`,
    azure: () => `resource "azurerm_container_registry" "ctr_public_registry" {
  name                          = "vbuildpublicreg\${substr(md5(azurerm_resource_group.vbuild.id), 0, 4)}"
  resource_group_name           = azurerm_resource_group.vbuild.name
  location                      = azurerm_resource_group.vbuild.location
  sku                           = "Standard"
  admin_enabled                 = true
  public_network_access_enabled = true
  anonymous_pull_enabled        = true
}
`,
    gcp: (region) => `resource "google_artifact_registry_repository" "ctr_public_registry" {
  location      = "${region}"
  repository_id = "vbuild-public-registry"
  format        = "DOCKER"
}

resource "google_artifact_registry_repository_iam_member" "ctr_public_registry" {
  location   = google_artifact_registry_repository.ctr_public_registry.location
  repository = google_artifact_registry_repository.ctr_public_registry.name
  role       = "roles/artifactregistry.reader"
  member     = "allUsers"
}
`,
  },

  "ctr-priv-pod": {
    aws: () => K8S_PRIV_POD,
    azure: () => K8S_PRIV_POD,
    gcp: () => K8S_PRIV_POD,
  },

  "ctr-public-cluster": {
    aws: () => `resource "aws_iam_role" "ctr_public_cluster" {
  name = "vbuild-ctr-public-cluster"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect    = "Allow",
      Principal = { Service = "eks.amazonaws.com" },
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ctr_public_cluster_eks" {
  role       = aws_iam_role.ctr_public_cluster.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}

resource "aws_eks_cluster" "ctr_public_cluster" {
  name     = "vbuild-public-cluster"
  role_arn = aws_iam_role.ctr_public_cluster.arn
  vpc_config {
    subnet_ids              = data.aws_subnets.default.ids
    endpoint_public_access  = true
    endpoint_private_access = false
    public_access_cidrs     = ["0.0.0.0/0"]
  }
  depends_on = [aws_iam_role_policy_attachment.ctr_public_cluster_eks]
}
`,
    azure: () => `resource "azurerm_kubernetes_cluster" "ctr_public_cluster" {
  name                              = "vbuild-public-cluster"
  location                          = azurerm_resource_group.vbuild.location
  resource_group_name               = azurerm_resource_group.vbuild.name
  dns_prefix                        = "vbuild"
  private_cluster_enabled           = false
  role_based_access_control_enabled = true

  default_node_pool {
    name       = "default"
    node_count = 1
    vm_size    = "Standard_B2s"
  }

  identity {
    type = "SystemAssigned"
  }

  api_server_access_profile {
    authorized_ip_ranges = [] # Empty list means the API server is open to the internet.
  }
}
`,
    gcp: (region) => `resource "google_container_cluster" "ctr_public_cluster" {
  name                     = "vbuild-public-cluster"
  location                 = "${region}"
  initial_node_count       = 1
  remove_default_node_pool = false
  deletion_protection      = false

  # No master_authorized_networks_config block — control plane reachable from 0.0.0.0/0.

  private_cluster_config {
    enable_private_nodes    = false
    enable_private_endpoint = false
  }
}
`,
  },
};

const K8S_PRIV_POD = `# Requires a kubernetes provider configured against the cluster.
resource "kubernetes_manifest" "ctr_priv_pod" {
  manifest = {
    apiVersion = "v1"
    kind       = "Pod"
    metadata = {
      name      = "vbuild-priv-pod"
      namespace = "default"
    }
    spec = {
      hostPID = true
      containers = [{
        name    = "priv"
        image   = "alpine:3.19"
        command = ["sleep", "infinity"]
        securityContext = {
          privileged = true
        }
        volumeMounts = [{
          name      = "host-root"
          mountPath = "/host"
        }]
      }]
      volumes = [{
        name = "host-root"
        hostPath = { path = "/" }
      }]
    }
  }
}

# Default ServiceAccount → cluster-admin (K8S-115).
resource "kubernetes_manifest" "ctr_priv_pod_binding" {
  manifest = {
    apiVersion = "rbac.authorization.k8s.io/v1"
    kind       = "ClusterRoleBinding"
    metadata = { name = "vbuild-default-cluster-admin" }
    roleRef = {
      apiGroup = "rbac.authorization.k8s.io"
      kind     = "ClusterRole"
      name     = "cluster-admin"
    }
    subjects = [{
      kind      = "ServiceAccount"
      name      = "default"
      namespace = "default"
    }]
  }
}
`;

// --- Shared Terraform blocks (deduplicated across components) ---

const TF_SHARED: Record<string, Partial<Record<Provider, string>>> = {
  aws_ami_al2023: {
    aws: `data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}
`,
  },
  aws_default_vpc: {
    aws: `data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}
`,
  },
};

const TF_BODY_DEPS: Record<string, Partial<Record<Provider, string[]>>> = {
  "vm-public-ssh": { aws: ["aws_ami_al2023"] },
  "vm-imds-v1": { aws: ["aws_ami_al2023"] },
  "ctr-public-cluster": { aws: ["aws_default_vpc"] },
};

// --- Terraform assembly ---

function tf(provider: Provider, region: string, items: Component[]) {
  const supported = items.filter((c) => c.providers.includes(provider));
  const needsK8s = supported.some((c) => c.id === "ctr-priv-pod");
  const header = TF_HEADERS[provider](region, { needsK8s });

  const sharedKeys = new Set<string>();
  for (const c of supported) {
    for (const k of TF_BODY_DEPS[c.id]?.[provider] ?? []) sharedKeys.add(k);
  }
  const shared = [...sharedKeys]
    .map((k) => TF_SHARED[k]?.[provider])
    .filter((s): s is string => Boolean(s))
    .join("\n");

  const blocks = supported.map((c) => tfBlock(provider, region, c)).join("\n");
  const skipped = items
    .filter((c) => !c.providers.includes(provider))
    .map((c) => `# skipped: "${c.name}" — not supported on ${PROVIDER_LABEL[provider]}.`)
    .join("\n");
  return [header, shared, blocks, skipped].filter(Boolean).join("\n");
}

function tfBlock(provider: Provider, region: string, c: Component) {
  const banner = `# ${c.name}\n# vulnerabilities: ${c.vulns.map((v) => v.id).join(", ")}\n`;
  const fn = TF_BODIES[c.id]?.[provider];
  const body = fn
    ? fn(region)
    : `# no Terraform template available for "${c.name}" on ${PROVIDER_LABEL[provider]}\n`;
  return banner + body;
}

// --- CloudFormation body templates (AWS only) ---

const CFN_BODIES: Record<string, () => string> = {
  "vm-public-ssh": () => `  VmPublicSshSg:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: INTENTIONALLY VULNERABLE — open to the world
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 22
          ToPort: 22
          CidrIp: 0.0.0.0/0
        - IpProtocol: tcp
          FromPort: 3389
          ToPort: 3389
          CidrIp: 0.0.0.0/0
  VmPublicSsh:
    Type: AWS::EC2::Instance
    Properties:
      InstanceType: t3.micro
      ImageId: !Ref LatestAmazonLinuxAmi
      SecurityGroupIds: [!Ref VmPublicSshSg]
      Tags:
        - Key: Name
          Value: vbuild-vm-public-ssh
`,
  "vm-imds-v1": () => `  VmImdsV1Role:
    Type: AWS::IAM::Role
    Properties:
      RoleName: vbuild-vm-imds-v1
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal: { Service: ec2.amazonaws.com }
            Action: sts:AssumeRole
      Policies:
        - PolicyName: BroadAccess
          PolicyDocument:
            Version: "2012-10-17"
            Statement:
              - Effect: Allow
                Action: ["s3:*", "iam:PassRole"]
                Resource: "*"
  VmImdsV1Profile:
    Type: AWS::IAM::InstanceProfile
    Properties:
      Roles: [!Ref VmImdsV1Role]
  VmImdsV1:
    Type: AWS::EC2::Instance
    Properties:
      InstanceType: t3.micro
      ImageId: !Ref LatestAmazonLinuxAmi
      IamInstanceProfile: !Ref VmImdsV1Profile
      MetadataOptions:
        HttpEndpoint: enabled
        HttpTokens: optional # IMDSv1 allowed — SSRF-prone
        HttpPutResponseHopLimit: 2
`,
  "vm-outdated-ami": () => `  # Hard-coded outdated Amazon Linux 1 AMI (EOL 2023-12). Replace per region.
  VmOutdatedAmi:
    Type: AWS::EC2::Instance
    Properties:
      InstanceType: t3.micro
      ImageId: ami-0c2b8ca1dad447f8a
`,
  "data-public-bucket": () => `  DataPublicBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub "vbuild-public-\${AWS::AccountId}-\${AWS::Region}"
      OwnershipControls:
        Rules:
          - ObjectOwnership: BucketOwnerPreferred
      PublicAccessBlockConfiguration:
        BlockPublicAcls: false
        BlockPublicPolicy: false
        IgnorePublicAcls: false
        RestrictPublicBuckets: false
  DataPublicBucketPolicy:
    Type: AWS::S3::BucketPolicy
    Properties:
      Bucket: !Ref DataPublicBucket
      PolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal: "*"
            Action: ["s3:GetObject", "s3:PutObject"]
            Resource: !Sub "\${DataPublicBucket.Arn}/*"
`,
  "data-unencrypted-db": () => `  DataUnencryptedDb:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceIdentifier: vbuild-data-unencrypted-db
      Engine: postgres
      EngineVersion: "15"
      DBInstanceClass: db.t3.micro
      AllocatedStorage: 20
      MasterUsername: vbuild
      MasterUserPassword: password123
      PubliclyAccessible: true
      StorageEncrypted: false
      DeletionProtection: false
    DeletionPolicy: Delete
`,
  "data-no-audit": () => `  DataNoAuditTrailBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub "vbuild-no-audit-\${AWS::AccountId}-\${AWS::Region}"
  DataNoAudit:
    Type: AWS::CloudTrail::Trail
    Properties:
      TrailName: vbuild-data-no-audit
      S3BucketName: !Ref DataNoAuditTrailBucket
      IsLogging: false # Trail provisioned but logging disabled
      IncludeGlobalServiceEvents: false
      IsMultiRegionTrail: false
`,
  "id-admin-user": () => `  IdAdminUser:
    Type: AWS::IAM::User
    Properties:
      UserName: vbuild-admin
      Policies:
        - PolicyName: Admin
          PolicyDocument:
            Version: "2012-10-17"
            Statement:
              - Effect: Allow
                Action: "*"
                Resource: "*"
  IdAdminUserKey:
    Type: AWS::IAM::AccessKey
    Properties:
      UserName: !Ref IdAdminUser
`,
  "id-priv-esc": () => `  IdPrivEscTarget:
    Type: AWS::IAM::Role
    Properties:
      RoleName: vbuild-priv-esc-target
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal: { Service: lambda.amazonaws.com }
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/AdministratorAccess
  IdPrivEsc:
    Type: AWS::IAM::User
    Properties:
      UserName: vbuild-priv-esc
      Policies:
        - PolicyName: PassRoleAndLambda
          PolicyDocument:
            Version: "2012-10-17"
            Statement:
              - Effect: Allow
                Action:
                  - iam:PassRole
                  - lambda:CreateFunction
                  - lambda:InvokeFunction
                  - lambda:UpdateFunctionCode
                Resource: "*"
`,
  "ctr-public-registry": () => `  CtrPublicRegistry:
    Type: AWS::ECR::Repository
    Properties:
      RepositoryName: vbuild-public-registry
      ImageTagMutability: MUTABLE
      ImageScanningConfiguration:
        ScanOnPush: false
      RepositoryPolicyText:
        Version: "2012-10-17"
        Statement:
          - Sid: AllowAll
            Effect: Allow
            Principal: "*"
            Action:
              - ecr:BatchCheckLayerAvailability
              - ecr:BatchGetImage
              - ecr:GetDownloadUrlForLayer
              - ecr:PutImage
              - ecr:InitiateLayerUpload
              - ecr:UploadLayerPart
              - ecr:CompleteLayerUpload
`,
  "ctr-public-cluster": () => `  CtrPublicClusterRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: vbuild-ctr-public-cluster
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal: { Service: eks.amazonaws.com }
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/AmazonEKSClusterPolicy
  CtrPublicCluster:
    Type: AWS::EKS::Cluster
    Properties:
      Name: vbuild-public-cluster
      RoleArn: !GetAtt CtrPublicClusterRole.Arn
      ResourcesVpcConfig:
        SubnetIds: !Ref EksSubnetIds
        EndpointPublicAccess: true
        EndpointPrivateAccess: false
        PublicAccessCidrs: [0.0.0.0/0]
`,
};

// --- CloudFormation assembly ---

function cfn(region: string, items: Component[]) {
  const aws = items.filter((c) => c.providers.includes("aws"));
  const skipped = items.filter((c) => !c.providers.includes("aws"));

  const resources = aws
    .map((c) => {
      const banner = `  # ${c.name} — vulns: ${c.vulns.map((v) => v.id).join(", ")}`;
      const fn = CFN_BODIES[c.id];
      if (fn) return `${banner}\n${fn()}`;
      return `${banner}\n  ${pascal(c.id)}Placeholder:\n    Type: AWS::CloudFormation::WaitConditionHandle\n    # No CloudFormation template available — see Terraform output for full resources.\n`;
    })
    .join("\n");

  const skip = skipped
    .map((c) => `# skipped: "${c.name}" — CloudFormation is AWS-only.`)
    .join("\n");

  const needsAmi = aws.some((c) => c.id === "vm-public-ssh" || c.id === "vm-imds-v1");
  const needsSubnets = aws.some((c) => c.id === "ctr-public-cluster");

  const params: string[] = [];
  if (needsAmi) {
    params.push(`  LatestAmazonLinuxAmi:
    Type: AWS::SSM::Parameter::Value<AWS::EC2::Image::Id>
    Default: /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64`);
  }
  if (needsSubnets) {
    params.push(`  EksSubnetIds:
    Type: List<AWS::EC2::Subnet::Id>
    Description: At least two subnets across AZs for the EKS control plane.`);
  }
  const parametersBlock = params.length ? `\nParameters:\n${params.join("\n\n")}\n` : "";

  return `AWSTemplateFormatVersion: "2010-09-09"
Description: Vulnerabuild — intentionally vulnerable AWS infrastructure (deploy region: ${region})
${parametersBlock}
Resources:
${resources || "  Noop:\n    Type: AWS::CloudFormation::WaitConditionHandle\n"}
${skip}`;
}

const pascal = (s: string) => s.replace(/(^|[-_])(\w)/g, (_, __, c) => c.toUpperCase());

// ---------------- page ----------------

function BuildPage() {
  const [selectedIds, setSelectedIds] = useState<string[]>(["vm-public-ssh", "data-public-bucket"]);
  const [activeCat, setActiveCat] = useState<string>("vm");
  const [format, setFormat] = useState<Format>("terraform");
  const [provider, setProvider] = useState<Provider>("aws");
  const [region, setRegion] = useState<string>(REGIONS.aws[0].id);
  const [copied, setCopied] = useState(false);

  const changeProvider = (p: Provider) => {
    setProvider(p);
    setRegion(REGIONS[p][0].id);
  };

  const selected = useMemo(
    () => CATALOG.flatMap((c) => c.components).filter((c) => selectedIds.includes(c.id)),
    [selectedIds]
  );

  const code = useMemo(() => generateIaC(format, provider, region, selected), [format, provider, region, selected]);

  const toggle = (id: string) =>
    setSelectedIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const download = () => {
    const ext = format === "terraform" ? "tf" : "yaml";
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vulnerabuild-${provider}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const allVulns = selected.flatMap((c) => c.vulns.map((v) => ({ ...v, from: c.name })));

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <div className="absolute inset-0 grid-bg opacity-30 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)] pointer-events-none" />

      {/* top bar */}
      <header className="relative z-10 border-b border-border/60 backdrop-blur">
        <div className="mx-auto max-w-[1600px] px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-3.5 w-3.5" /> back
            </Link>
            <span className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="font-mono text-sm font-semibold">vulnerabuild<span className="text-primary">_</span> / build</span>
            </div>
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            <span className="text-foreground font-semibold">{selected.length}</span> components ·{" "}
            <span className="text-foreground font-semibold">{allVulns.length}</span> vulnerabilities
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-[1600px] px-6 py-6 grid grid-cols-12 gap-6">
        {/* LEFT: catalog */}
        <aside className="col-span-12 lg:col-span-5 xl:col-span-4 space-y-4">
          <div className="rounded-xl border border-border bg-card/60 overflow-hidden">
            <div className="grid grid-cols-4 border-b border-border">
              {CATALOG.map((cat) => {
                const Icon = cat.icon;
                const active = activeCat === cat.id;
                const count = cat.components.filter((c) => selectedIds.includes(c.id)).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCat(cat.id)}
                    className={`relative flex flex-col items-center gap-1.5 py-4 transition ${active ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-background/40"}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-mono text-xs">{cat.name}</span>
                    {count > 0 && (
                      <span className="absolute top-2 right-2 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground font-mono text-[10px] flex items-center justify-center">
                        {count}
                      </span>
                    )}
                    {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                  </button>
                );
              })}
            </div>

            <div className="p-4">
              {CATALOG.filter((c) => c.id === activeCat).map((cat) => (
                <div key={cat.id}>
                  <p className="text-xs text-muted-foreground mb-3">{cat.desc}</p>
                  <div className="space-y-2">
                    {cat.components.map((c) => {
                      const isSel = selectedIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          onClick={() => toggle(c.id)}
                          className={`w-full text-left rounded-lg border p-3 transition ${isSel ? "border-primary/50 bg-primary/5" : "border-border bg-background/40 hover:border-border/80 hover:bg-background/60"}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-display font-semibold text-sm">{c.name}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">{c.short}</div>
                              <div className="mt-2 flex flex-wrap gap-1">
                                {c.providers.map((p) => (
                                  <span
                                    key={p}
                                    className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded"
                                    style={{
                                      background: `color-mix(in oklab, var(--color-${p === "azure" ? "azure" : p}) 15%, transparent)`,
                                      color: `var(--color-${p === "azure" ? "azure" : p})`,
                                    }}
                                  >
                                    {p}
                                  </span>
                                ))}
                                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                                  {c.vulns.length} vulns
                                </span>
                              </div>
                            </div>
                            <div className={`h-7 w-7 rounded-md border flex items-center justify-center flex-shrink-0 ${isSel ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
                              {isSel ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* selected vulnerabilities */}
          <div className="rounded-xl border border-border bg-card/60 p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <h3 className="font-display font-semibold text-sm">Vulnerabilities introduced</h3>
            </div>
            {selected.length === 0 ? (
              <p className="text-xs text-muted-foreground">Select infrastructure on the left to preview the vulnerabilities it will introduce.</p>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {selected.map((c) => (
                  <div key={c.id}>
                    <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">{c.name}</div>
                    <div className="space-y-1.5">
                      {c.vulns.map((v) => (
                        <VulnRow key={v.id} v={v} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* RIGHT: generator */}
        <section className="col-span-12 lg:col-span-7 xl:col-span-8">
          <div className="rounded-xl border border-border bg-card/60 overflow-hidden">
            {/* Row 1 — title + actions (anchored, never wraps) */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-background/40">
              <div className="flex items-center gap-2 min-w-0">
                <FileCode className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="font-mono text-sm truncate">infrastructure-as-code</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={copy}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/60 px-2.5 py-1.5 font-mono text-xs hover:bg-background"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">{copied ? "copied" : "copy"}</span>
                </button>
                <button
                  onClick={download}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-2.5 py-1.5 font-mono text-xs hover:opacity-90"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">download</span>
                </button>
              </div>
            </div>

            {/* Row 2 — format / provider / region (wraps freely without affecting the actions above) */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 border-b border-border bg-background/20">
              <ControlGroup label="format">
                <SegmentedControl
                  options={[
                    { value: "terraform", label: "Terraform" },
                    { value: "cloudformation", label: "CloudFormation", disabled: provider !== "aws" },
                  ]}
                  value={format}
                  onChange={(v) => setFormat(v as Format)}
                />
              </ControlGroup>
              <ControlGroup label="cloud">
                <SegmentedControl
                  options={[
                    { value: "aws", label: "AWS" },
                    { value: "azure", label: "Azure", disabled: format === "cloudformation" },
                    { value: "gcp", label: "GCP", disabled: format === "cloudformation" },
                  ]}
                  value={provider}
                  onChange={(v) => changeProvider(v as Provider)}
                />
              </ControlGroup>
              <ControlGroup label="region">
                <div className="relative inline-flex items-center" title={`Region IDs are provider-specific (${PROVIDER_LABEL[provider]} format).`}>
                  <Globe className="absolute left-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="appearance-none rounded-md border border-border bg-background/60 pl-7 pr-7 py-1.5 font-mono text-xs hover:bg-background focus:outline-none focus:border-primary/60 cursor-pointer"
                  >
                    {REGIONS[provider].map((r) => (
                      <option key={r.id} value={r.id} className="bg-background">
                        {r.id} — {r.label}
                      </option>
                    ))}
                  </select>
                  <ChevronLeft className="absolute right-2 h-3 w-3 text-muted-foreground pointer-events-none -rotate-90" />
                </div>
              </ControlGroup>
            </div>

            <div className="px-4 py-2 border-b border-border bg-background/20 flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
              <Info className="h-3 w-3 text-primary flex-shrink-0" />
              region IDs differ per CSP — AWS uses <span className="text-foreground">us-east-1</span>, Azure uses <span className="text-foreground">eastus</span>, GCP uses <span className="text-foreground">us-central1</span>.
            </div>

            <div className="relative">
              <pre className="p-5 font-mono text-[12.5px] leading-relaxed overflow-auto max-h-[70vh] text-foreground/90">
                <code>{code}</code>
              </pre>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-warning/30 bg-warning/5 p-4 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-warning">intentionally vulnerable.</span>{" "}
              Apply only in an isolated sub-account / project, time-boxed and tagged. Never deploy on top of production.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

function VulnRow({ v }: { v: { id: string; title: string; severity: "critical" | "high" | "medium"; desc: string } }) {
  const sev = {
    critical: "text-destructive border-destructive/40 bg-destructive/10",
    high: "text-accent border-accent/40 bg-accent/10",
    medium: "text-warning border-warning/40 bg-warning/10",
  }[v.severity];
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-2.5">
      <div className="flex items-center gap-2">
        <span className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${sev}`}>{v.severity}</span>
        <span className="font-mono text-[10px] text-muted-foreground">{v.id}</span>
        <span className="text-xs font-medium truncate">{v.title}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{v.desc}</p>
    </div>
  );
}

function ControlGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function SegmentedControl({
  options, value, onChange,
}: {
  options: { value: string; label: string; disabled?: boolean }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-border bg-background/60 p-0.5">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={`px-2.5 py-1 rounded font-mono text-xs transition ${
              active
                ? "bg-primary text-primary-foreground"
                : o.disabled
                ? "text-muted-foreground/40 cursor-not-allowed"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
