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

// ---------------- IaC generation (mock) ----------------

const PROVIDER_LABEL: Record<Provider, string> = { aws: "AWS", azure: "Azure", gcp: "GCP" };

function generateIaC(format: Format, provider: Provider, region: string, selected: Component[]) {
  if (selected.length === 0) {
    return `# Select one or more components on the left to generate ${format === "terraform" ? "Terraform" : "CloudFormation"}.\n# region: ${region}\n`;
  }
  if (format === "terraform") return tf(provider, region, selected);
  return cfn(region, selected);
}

function tf(provider: Provider, region: string, items: Component[]) {
  const header =
    provider === "aws"
      ? `terraform {\n  required_providers {\n    aws = { source = "hashicorp/aws", version = "~> 5.0" }\n  }\n}\n\nprovider "aws" {\n  region = "${region}"\n}\n`
      : provider === "azure"
      ? `terraform {\n  required_providers {\n    azurerm = { source = "hashicorp/azurerm", version = "~> 3.0" }\n  }\n}\n\nprovider "azurerm" {\n  features {}\n}\n\nresource "azurerm_resource_group" "vbuild" {\n  name     = "vbuild-rg"\n  location = "${region}"\n}\n`
      : `terraform {\n  required_providers {\n    google = { source = "hashicorp/google", version = "~> 5.0" }\n  }\n}\n\nprovider "google" {\n  project = "vbuild-demo"\n  region  = "${region}"\n}\n`;

  const blocks = items
    .filter((c) => c.providers.includes(provider))
    .map((c) => tfBlock(provider, c))
    .join("\n");

  const skipped = items
    .filter((c) => !c.providers.includes(provider))
    .map((c) => `# skipped: "${c.name}" — not supported on ${PROVIDER_LABEL[provider]}.`)
    .join("\n");

  return [header, blocks, skipped].filter(Boolean).join("\n");
}

function tfBlock(provider: Provider, c: Component) {
  const banner = `# ${c.name}\n# vulnerabilities: ${c.vulns.map((v) => v.id).join(", ")}\n`;
  const body =
    c.id === "vm-public-ssh"
      ? provider === "aws"
        ? `resource "aws_security_group" "${c.id}" {\n  name        = "vbuild-${c.id}"\n  description = "INTENTIONALLY VULNERABLE"\n  ingress {\n    from_port   = 22\n    to_port     = 22\n    protocol    = "tcp"\n    cidr_blocks = ["0.0.0.0/0"]\n  }\n  ingress {\n    from_port   = 3389\n    to_port     = 3389\n    protocol    = "tcp"\n    cidr_blocks = ["0.0.0.0/0"]\n  }\n}\n\nresource "aws_instance" "${c.id}" {\n  ami                    = "ami-0abcd1234"\n  instance_type          = "t3.micro"\n  vpc_security_group_ids = [aws_security_group.${c.id}.id]\n  associate_public_ip_address = true\n}\n`
        : provider === "azure"
        ? `resource "azurerm_network_security_group" "${c.id}" {\n  name                = "vbuild-${c.id}"\n  location            = azurerm_resource_group.vbuild.location\n  resource_group_name = azurerm_resource_group.vbuild.name\n  security_rule {\n    name                       = "ssh"\n    priority                   = 100\n    direction                  = "Inbound"\n    access                     = "Allow"\n    protocol                   = "Tcp"\n    source_port_range          = "*"\n    destination_port_ranges    = ["22","3389"]\n    source_address_prefix      = "*"\n    destination_address_prefix = "*"\n  }\n}\n`
        : `resource "google_compute_firewall" "${c.id}" {\n  name    = "vbuild-${c.id}"\n  network = "default"\n  allow {\n    protocol = "tcp"\n    ports    = ["22", "3389"]\n  }\n  source_ranges = ["0.0.0.0/0"]\n}\n`
      : c.id === "data-public-bucket"
      ? provider === "aws"
        ? `resource "aws_s3_bucket" "${c.id}" {\n  bucket        = "vbuild-public-\${random_id.s.hex}"\n  force_destroy = true\n}\n\nresource "aws_s3_bucket_public_access_block" "${c.id}" {\n  bucket                  = aws_s3_bucket.${c.id}.id\n  block_public_acls       = false\n  block_public_policy     = false\n  ignore_public_acls      = false\n  restrict_public_buckets = false\n}\n\nresource "aws_s3_bucket_acl" "${c.id}" {\n  bucket = aws_s3_bucket.${c.id}.id\n  acl    = "public-read-write"\n}\n`
        : provider === "azure"
        ? `resource "azurerm_storage_account" "${c.id}" {\n  name                     = "vbuildpublic"\n  resource_group_name      = azurerm_resource_group.vbuild.name\n  location                 = azurerm_resource_group.vbuild.location\n  account_tier             = "Standard"\n  account_replication_type = "LRS"\n  allow_nested_items_to_be_public = true\n}\n\nresource "azurerm_storage_container" "${c.id}" {\n  name                  = "public"\n  storage_account_name  = azurerm_storage_account.${c.id}.name\n  container_access_type = "container"\n}\n`
        : `resource "google_storage_bucket" "${c.id}" {\n  name                        = "vbuild-public"\n  location                    = "US"\n  uniform_bucket_level_access = false\n  force_destroy               = true\n}\n\nresource "google_storage_bucket_iam_member" "${c.id}" {\n  bucket = google_storage_bucket.${c.id}.name\n  role   = "roles/storage.objectViewer"\n  member = "allUsers"\n}\n`
      : c.id === "id-admin-user"
      ? provider === "aws"
        ? `resource "aws_iam_user" "${c.id}" {\n  name = "vbuild-admin"\n}\n\nresource "aws_iam_user_policy" "${c.id}" {\n  user   = aws_iam_user.${c.id}.name\n  policy = jsonencode({\n    Version = "2012-10-17",\n    Statement = [{ Effect = "Allow", Action = "*", Resource = "*" }]\n  })\n}\n\nresource "aws_iam_access_key" "${c.id}" {\n  user = aws_iam_user.${c.id}.name\n}\n`
        : provider === "azure"
        ? `resource "azuread_user" "${c.id}" {\n  user_principal_name = "vbuild-admin@example.onmicrosoft.com"\n  display_name        = "vbuild admin"\n  password            = "P@ssw0rd-vbuild!"\n}\n\nresource "azurerm_role_assignment" "${c.id}" {\n  scope                = "/subscriptions/00000000-0000-0000-0000-000000000000"\n  role_definition_name = "Owner"\n  principal_id         = azuread_user.${c.id}.object_id\n}\n`
        : `resource "google_service_account" "${c.id}" {\n  account_id   = "vbuild-admin"\n  display_name = "vbuild admin"\n}\n\nresource "google_project_iam_member" "${c.id}" {\n  project = "vbuild-demo"\n  role    = "roles/owner"\n  member  = "serviceAccount:\${google_service_account.${c.id}.email}"\n}\n\nresource "google_service_account_key" "${c.id}" {\n  service_account_id = google_service_account.${c.id}.name\n}\n`
      : `# resources for "${c.name}" (${PROVIDER_LABEL[provider]})\n# … truncated in preview …\n`;
  return banner + body;
}

function cfn(region: string, items: Component[]) {
  const aws = items.filter((c) => c.providers.includes("aws"));
  const skipped = items.filter((c) => !c.providers.includes("aws"));
  const resources = aws
    .map((c) => {
      const banner = `  # ${c.name} — vulns: ${c.vulns.map((v) => v.id).join(", ")}`;
      if (c.id === "vm-public-ssh")
        return `${banner}\n  ${pascal(c.id)}Sg:\n    Type: AWS::EC2::SecurityGroup\n    Properties:\n      GroupDescription: INTENTIONALLY VULNERABLE\n      SecurityGroupIngress:\n        - IpProtocol: tcp\n          FromPort: 22\n          ToPort: 22\n          CidrIp: 0.0.0.0/0\n        - IpProtocol: tcp\n          FromPort: 3389\n          ToPort: 3389\n          CidrIp: 0.0.0.0/0\n`;
      if (c.id === "data-public-bucket")
        return `${banner}\n  ${pascal(c.id)}:\n    Type: AWS::S3::Bucket\n    Properties:\n      AccessControl: PublicReadWrite\n      PublicAccessBlockConfiguration:\n        BlockPublicAcls: false\n        BlockPublicPolicy: false\n        IgnorePublicAcls: false\n        RestrictPublicBuckets: false\n`;
      if (c.id === "id-admin-user")
        return `${banner}\n  ${pascal(c.id)}:\n    Type: AWS::IAM::User\n    Properties:\n      UserName: vbuild-admin\n      Policies:\n        - PolicyName: Admin\n          PolicyDocument:\n            Version: "2012-10-17"\n            Statement:\n              - Effect: Allow\n                Action: "*"\n                Resource: "*"\n`;
      return `${banner}\n  ${pascal(c.id)}:\n    Type: AWS::CloudFormation::WaitConditionHandle\n    # placeholder — full template truncated in preview\n`;
    })
    .join("\n");

  const skip = skipped.map((c) => `# skipped: "${c.name}" — CloudFormation is AWS-only.`).join("\n");

  return `AWSTemplateFormatVersion: "2010-09-09"\nDescription: Vulnerabuild — intentionally vulnerable AWS infrastructure (deploy region: ${region})\n\nResources:\n${resources || "  Noop:\n    Type: AWS::CloudFormation::WaitConditionHandle\n"}\n${skip}`;
}

const pascal = (s: string) => s.replace(/(^|[-_])(\w)/g, (_, __, c) => c.toUpperCase());

// ---------------- page ----------------

function BuildPage() {
  const [selectedIds, setSelectedIds] = useState<string[]>(["vm-public-ssh", "data-public-bucket"]);
  const [activeCat, setActiveCat] = useState<string>("vm");
  const [format, setFormat] = useState<Format>("terraform");
  const [provider, setProvider] = useState<Provider>("aws");
  const [copied, setCopied] = useState(false);

  const selected = useMemo(
    () => CATALOG.flatMap((c) => c.components).filter((c) => selectedIds.includes(c.id)),
    [selectedIds]
  );

  const code = useMemo(() => generateIaC(format, provider, selected), [format, provider, selected]);

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
            {/* controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border bg-background/40">
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-primary" />
                <span className="font-mono text-sm">infrastructure-as-code</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <SegmentedControl
                  options={[
                    { value: "terraform", label: "Terraform" },
                    { value: "cloudformation", label: "CloudFormation", disabled: provider !== "aws" },
                  ]}
                  value={format}
                  onChange={(v) => setFormat(v as Format)}
                />
                <SegmentedControl
                  options={[
                    { value: "aws", label: "AWS" },
                    { value: "azure", label: "Azure", disabled: format === "cloudformation" },
                    { value: "gcp", label: "GCP", disabled: format === "cloudformation" },
                  ]}
                  value={provider}
                  onChange={(v) => setProvider(v as Provider)}
                />
                <div className="h-5 w-px bg-border" />
                <button
                  onClick={copy}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/60 px-2.5 py-1.5 font-mono text-xs hover:bg-background"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "copied" : "copy"}
                </button>
                <button
                  onClick={download}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-2.5 py-1.5 font-mono text-xs hover:opacity-90"
                >
                  <Download className="h-3.5 w-3.5" />
                  download
                </button>
              </div>
            </div>

            {/* code */}
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
