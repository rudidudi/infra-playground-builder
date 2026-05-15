import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Shield, Server, Database, KeyRound, Box, ChevronLeft, Copy, Download,
  AlertTriangle, Check, Plus, Minus, FileCode, Globe, Zap, Network, Layers,
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
    desc: "Compute instances with weak network, identity, and host hygiene.",
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
        id: "vm-imds-v1", name: "SSRF→IMDS chain", short: "IMDSv1 + over-permissive role (Capital One pattern)",
        providers: ["aws"],
        vulns: [
          { id: "EC2-022", title: "IMDSv1 enabled", severity: "critical", desc: "Legacy metadata service exposes role credentials to SSRF — Capital One 2019 pattern." },
          { id: "IAM-031", title: "Over-permissive instance role", severity: "high", desc: "Attached role has wildcard s3:* and iam:PassRole." },
        ],
      },
      {
        id: "vm-unencrypted-disk", name: "Unencrypted volume", short: "Data disk without CMK",
        providers: ["aws", "azure", "gcp"],
        vulns: [
          { id: "VM-301", title: "Storage encryption off", severity: "high", desc: "Volume created without a customer-managed key — data at rest only platform-default protected." },
          { id: "VM-303", title: "Snapshot inherits no encryption", severity: "medium", desc: "Snapshots of the volume are also unencrypted." },
        ],
      },
      {
        id: "vm-secrets-userdata", name: "Secrets in user_data", short: "Plaintext creds in bootstrap",
        providers: ["aws", "azure", "gcp"],
        vulns: [
          { id: "SEC-201", title: "API key in user_data", severity: "critical", desc: "Cloud-init / custom_data / startup-script contains plaintext API tokens and DB credentials." },
          { id: "SEC-203", title: "user_data readable via IMDS", severity: "high", desc: "Bootstrap script retrievable through the metadata service — credential bleed." },
        ],
      },
    ],
  },
  {
    id: "data", name: "Data", icon: Database,
    desc: "Object stores, databases, and caches with weak access control and encryption.",
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
        id: "data-no-audit", name: "Audit logging disabled", short: "Silent control + data plane",
        providers: ["aws", "azure", "gcp"],
        vulns: [
          { id: "LOG-007", title: "Control-plane audit off", severity: "high", desc: "Management events (CreateUser, AssumeRole, …) not captured." },
          { id: "LOG-009", title: "Data-plane events off", severity: "medium", desc: "Object-level / data-plane audit events not captured." },
        ],
      },
      {
        id: "data-public-search", name: "Public search domain", short: "Elasticsearch / OpenSearch open to the world",
        providers: ["aws"],
        vulns: [
          { id: "OS-001", title: "Domain accessible from 0.0.0.0/0", severity: "critical", desc: "Search endpoint open to the public internet — recurring data-leak vector." },
          { id: "OS-003", title: "No fine-grained access control", severity: "critical", desc: "Master user disabled; no per-index permissions." },
          { id: "OS-007", title: "Audit logs disabled", severity: "medium", desc: "Slow / audit log exports off." },
        ],
      },
      {
        id: "data-public-snapshot", name: "Public DB/disk snapshot", short: "Snapshot shared with all accounts",
        providers: ["aws", "azure", "gcp"],
        vulns: [
          { id: "SNAP-001", title: "Snapshot shared with all", severity: "critical", desc: "RDS / EBS / managed-disk snapshot marked public — restorable by anyone." },
          { id: "SNAP-005", title: "Snapshot unencrypted", severity: "high", desc: "Snapshot contents accessible without a CMK." },
        ],
      },
      {
        id: "data-cache-open", name: "Open cache instance", short: "Redis / ElastiCache without AUTH",
        providers: ["aws", "azure", "gcp"],
        vulns: [
          { id: "CACHE-001", title: "No AUTH token", severity: "critical", desc: "Cache accepts unauthenticated commands — full data dump trivial." },
          { id: "CACHE-005", title: "Public network access", severity: "high", desc: "Cache placed in a public subnet / no firewall rules." },
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
          { id: "IAM-005", title: "Long-lived static keys", severity: "high", desc: "Programmatic access via never-rotated keys — biggest 2025-era cloud breach vector." },
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
        id: "id-over-sa", name: "Over-privileged service account", short: "Admin role bound to a VM / instance profile",
        providers: ["aws", "gcp", "azure"],
        vulns: [
          { id: "IAM-014", title: "Owner role on service identity", severity: "critical", desc: "Service account / managed identity / instance profile has full admin permissions and is bound to a compute instance." },
        ],
      },
      {
        id: "id-oidc-trust", name: "Weak OIDC trust", short: "GitHub Actions OIDC without sub restriction",
        providers: ["aws", "azure", "gcp"],
        vulns: [
          { id: "IAM-040", title: "OIDC trust without sub restriction", severity: "critical", desc: "Trust policy allows any repository / workflow to assume the role — confused-deputy primitive." },
          { id: "IAM-041", title: "Audience claim not pinned", severity: "high", desc: "aud condition missing or wildcarded." },
        ],
      },
      {
        id: "id-root-account", name: "Root account hygiene", short: "Root keys / no MFA / no detection",
        providers: ["aws"],
        vulns: [
          { id: "IAM-050", title: "Root has access keys", severity: "critical", desc: "Long-lived programmatic access on the root account — irrecoverable on compromise." },
          { id: "IAM-051", title: "MFA not enabled on root", severity: "critical", desc: "Root sign-in protected only by password." },
          { id: "IAM-052", title: "No detection of root usage", severity: "high", desc: "No CloudWatch alarm or AWS Config rule firing on root sign-in." },
        ],
      },
      {
        id: "id-no-password-policy", name: "Weak password policy", short: "No complexity / rotation rules",
        providers: ["aws"],
        vulns: [
          { id: "IAM-070", title: "No password complexity", severity: "medium", desc: "Min length 4, no uppercase / digit / symbol requirements." },
          { id: "IAM-072", title: "No password rotation", severity: "medium", desc: "max_password_age unset — passwords valid indefinitely." },
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
      {
        id: "ctr-sa-token", name: "Mounted SA token + broad RBAC", short: "Default SA can list secrets cluster-wide",
        providers: ["aws", "azure", "gcp"],
        vulns: [
          { id: "K8S-050", title: "automountServiceAccountToken default-on", severity: "high", desc: "Pod inherits a token at /var/run/secrets — stealable on compromise." },
          { id: "K8S-052", title: "SA can list secrets cluster-wide", severity: "high", desc: "Bound role allows get / list on Secrets in all namespaces." },
        ],
      },
      {
        id: "ctr-image-as-root", name: "Container runs as root", short: "UID 0, writable rootfs",
        providers: ["aws", "azure", "gcp"],
        vulns: [
          { id: "K8S-060", title: "runAsNonRoot not enforced", severity: "high", desc: "Pod spec does not require non-root execution." },
          { id: "K8S-062", title: "Writable root filesystem", severity: "medium", desc: "No readOnlyRootFilesystem — attacker can drop persistent binaries." },
        ],
      },
    ],
  },
  {
    id: "serverless", name: "Serverless", icon: Zap,
    desc: "Functions and FaaS with weak invocation, identity, and secret hygiene.",
    components: [
      {
        id: "fn-public-url", name: "Public function URL", short: "Anonymous invoke + admin role",
        providers: ["aws", "azure", "gcp"],
        vulns: [
          { id: "FN-001", title: "Unauthenticated invoke", severity: "critical", desc: "Function URL / HTTP trigger allows anonymous invocation." },
          { id: "FN-002", title: "Attached admin role", severity: "high", desc: "Execution role / SA has wildcard *:* on the account." },
          { id: "LOG-011", title: "Invoke logs disabled", severity: "medium", desc: "CloudWatch / Cloud Logging / App Insights logging not configured." },
        ],
      },
      {
        id: "fn-secrets-env", name: "Secrets in environment", short: "Hardcoded API keys in env vars",
        providers: ["aws", "azure", "gcp"],
        vulns: [
          { id: "SEC-101", title: "Hardcoded API key in env", severity: "critical", desc: "Function env vars contain plaintext tokens / DB creds — readable by anyone with describe-function." },
          { id: "SEC-102", title: "Env vars unencrypted at rest", severity: "high", desc: "Function environment is not encrypted with a customer-managed key." },
        ],
      },
      {
        id: "fn-loose-policy", name: "Over-broad resource policy", short: "Wildcard principal can invoke",
        providers: ["aws", "azure", "gcp"],
        vulns: [
          { id: "FN-014", title: "Wildcard invoke permission", severity: "high", desc: "Resource policy grants invoke to *." },
          { id: "FN-016", title: "Cross-account without ExternalId", severity: "high", desc: "Trust allows arbitrary external accounts — no condition keys scope it." },
        ],
      },
    ],
  },
  {
    id: "network", name: "Network", icon: Network,
    desc: "Edge, DNS, and TLS with weak perimeter posture.",
    components: [
      {
        id: "net-tls-weak", name: "Weak TLS on public LB", short: "TLS 1.0/1.1 + weak ciphers",
        providers: ["aws", "azure", "gcp"],
        vulns: [
          { id: "NET-101", title: "TLS 1.0/1.1 enabled", severity: "high", desc: "Listener accepts deprecated TLS versions known to be broken." },
          { id: "NET-103", title: "Weak cipher suites", severity: "medium", desc: "RC4 / 3DES / CBC ciphers allowed." },
        ],
      },
      {
        id: "net-dangling-dns", name: "Dangling DNS record", short: "Subdomain takeover risk",
        providers: ["aws", "azure", "gcp"],
        vulns: [
          { id: "NET-201", title: "DNS points to deleted resource", severity: "critical", desc: "CNAME references a deprovisioned cloud resource — attacker can re-register the underlying name and hijack the subdomain." },
        ],
      },
      {
        id: "net-public-origin", name: "CDN-bypassable origin", short: "Origin reachable directly, bypasses WAF",
        providers: ["aws", "azure", "gcp"],
        vulns: [
          { id: "NET-301", title: "Origin reachable from internet", severity: "high", desc: "ALB / origin has 0.0.0.0/0 ingress; clients can skip the CDN / WAF entirely." },
        ],
      },
      {
        id: "net-no-waf", name: "Public app without WAF", short: "No L7 protection",
        providers: ["aws", "azure", "gcp"],
        vulns: [
          { id: "NET-401", title: "No WAF in front of app", severity: "medium", desc: "Public LB / Front Door / Cloud Load Balancer has no WAF / Cloud Armor managed rule set." },
        ],
      },
    ],
  },
];

// Standards references per vulnerability ID — CWE (weakness type), CVSS v3.1 base score,
// CIS Benchmark control, and a representative CVE where the misconfig has a direct, well-known
// software-CVE mapping (TLS protocol attacks, container-escape primitives, EOL OS examples).
// Most catalog items are pure misconfigurations and do not have a CVE.
type VulnRefs = { cwe?: string; cvss?: string; cis?: string; cve?: string };

const VULN_REFS: Record<string, VulnRefs> = {
  // --- VM ---
  "NET-007": { cwe: "CWE-284", cvss: "9.1", cis: "CIS AWS 5.2 / 5.3" },
  "VM-014":  { cwe: "CWE-521", cvss: "8.1" },
  "LOG-002": { cwe: "CWE-778", cvss: "5.3", cis: "CIS AWS 3.9" },
  "EC2-022": { cwe: "CWE-918", cvss: "9.1", cis: "CIS AWS 5.6" },
  "IAM-031": { cwe: "CWE-269", cvss: "8.1", cis: "CIS AWS 1.16" },
  "VM-301":  { cwe: "CWE-311", cvss: "7.5", cis: "CIS AWS 2.2.1" },
  "VM-303":  { cwe: "CWE-311", cvss: "5.3", cis: "CIS AWS 2.2.1" },
  "SEC-201": { cwe: "CWE-798", cvss: "9.1" },
  "SEC-203": { cwe: "CWE-200", cvss: "7.5" },

  // --- Data ---
  "S3-001":  { cwe: "CWE-732", cvss: "9.1", cis: "CIS AWS 2.1.5" },
  "S3-004":  { cwe: "CWE-732", cvss: "9.1", cis: "CIS AWS 2.1.5" },
  "S3-010":  { cwe: "CWE-693", cvss: "4.3", cis: "CIS AWS 2.1.3" },
  "DB-101":  { cwe: "CWE-311", cvss: "7.5", cis: "CIS AWS 2.3.1" },
  "DB-105":  { cwe: "CWE-668", cvss: "9.1", cis: "CIS AWS 2.3.3" },
  "DB-108":  { cwe: "CWE-521", cvss: "8.1" },
  "LOG-007": { cwe: "CWE-778", cvss: "7.5", cis: "CIS AWS 3.1" },
  "LOG-009": { cwe: "CWE-778", cvss: "5.3", cis: "CIS AWS 3.10" },
  "OS-001":  { cwe: "CWE-668", cvss: "9.8" },
  "OS-003":  { cwe: "CWE-284", cvss: "9.1" },
  "OS-007":  { cwe: "CWE-778", cvss: "5.3" },
  "SNAP-001":{ cwe: "CWE-200", cvss: "9.1", cis: "CIS AWS 2.2.2" },
  "SNAP-005":{ cwe: "CWE-311", cvss: "7.5", cis: "CIS AWS 2.2.1" },
  "CACHE-001": { cwe: "CWE-306", cvss: "9.1" },
  "CACHE-005": { cwe: "CWE-668", cvss: "8.1" },

  // --- Identity ---
  "IAM-001": { cwe: "CWE-269", cvss: "9.8", cis: "CIS AWS 1.16" },
  "IAM-005": { cwe: "CWE-798", cvss: "8.1", cis: "CIS AWS 1.14" },
  "IAM-009": { cwe: "CWE-308", cvss: "8.1", cis: "CIS AWS 1.10" },
  "IAM-021": { cwe: "CWE-269", cvss: "9.1" },
  "IAM-024": { cwe: "CWE-269", cvss: "8.1" },
  "IAM-014": { cwe: "CWE-269", cvss: "9.1", cis: "CIS GCP 1.5" },
  "IAM-040": { cwe: "CWE-863", cvss: "9.8" },
  "IAM-041": { cwe: "CWE-863", cvss: "8.1" },
  "IAM-050": { cwe: "CWE-798", cvss: "9.8", cis: "CIS AWS 1.4" },
  "IAM-051": { cwe: "CWE-308", cvss: "9.8", cis: "CIS AWS 1.5" },
  "IAM-052": { cwe: "CWE-778", cvss: "7.5", cis: "CIS AWS 4.3" },
  "IAM-070": { cwe: "CWE-521", cvss: "5.3", cis: "CIS AWS 1.8 / 1.9" },
  "IAM-072": { cwe: "CWE-262", cvss: "4.3", cis: "CIS AWS 1.11" },

  // --- Container ---
  "REG-001": { cwe: "CWE-306", cvss: "9.1" },
  "REG-004": { cwe: "CWE-1035", cvss: "5.3", cis: "CIS Docker 4.4", cve: "CVE-2021-44228" },
  "K8S-101": { cwe: "CWE-269", cvss: "9.8", cis: "CIS K8s 5.2.1", cve: "CVE-2024-21626" },
  "K8S-108": { cwe: "CWE-552", cvss: "9.8", cis: "CIS K8s 5.2.4", cve: "CVE-2022-0492" },
  "K8S-115": { cwe: "CWE-269", cvss: "8.8", cis: "CIS K8s 5.1.5" },
  "K8S-201": { cwe: "CWE-668", cvss: "7.5", cis: "CIS K8s 5.4.1" },
  "K8S-205": { cwe: "CWE-306", cvss: "9.8", cis: "CIS K8s 1.2.1" },
  "K8S-050": { cwe: "CWE-200", cvss: "7.5", cis: "CIS K8s 5.1.6" },
  "K8S-052": { cwe: "CWE-269", cvss: "8.1", cis: "CIS K8s 5.1.3" },
  "K8S-060": { cwe: "CWE-250", cvss: "7.8", cis: "CIS K8s 5.2.5" },
  "K8S-062": { cwe: "CWE-732", cvss: "5.3", cis: "CIS K8s 5.2.6" },

  // --- Serverless ---
  "FN-001":  { cwe: "CWE-306", cvss: "9.1" },
  "FN-002":  { cwe: "CWE-269", cvss: "8.1" },
  "LOG-011": { cwe: "CWE-778", cvss: "4.3" },
  "SEC-101": { cwe: "CWE-798", cvss: "9.1" },
  "SEC-102": { cwe: "CWE-311", cvss: "7.5" },
  "FN-014":  { cwe: "CWE-732", cvss: "7.5" },
  "FN-016":  { cwe: "CWE-441", cvss: "8.1" },

  // --- Network ---
  "NET-101": { cwe: "CWE-326", cvss: "7.5", cve: "CVE-2014-3566" },
  "NET-103": { cwe: "CWE-327", cvss: "5.3", cve: "CVE-2016-2183" },
  "NET-201": { cwe: "CWE-441", cvss: "9.1" },
  "NET-301": { cwe: "CWE-284", cvss: "7.5" },
  "NET-401": { cwe: "CWE-693", cvss: "5.3" },
};

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

type ExtraProvider = "kubernetes" | "archive";
type HeaderOpts = { extras: Set<ExtraProvider> };

const EXTRA_PROVIDER_REQS: Record<ExtraProvider, string> = {
  kubernetes: `    kubernetes = { source = "hashicorp/kubernetes", version = "~> 2.0" }`,
  archive:    `    archive    = { source = "hashicorp/archive",    version = "~> 2.0" }`,
};

const K8S_CONFIG_NOTE: Record<Provider, string> = {
  aws:   `\n# Configure the kubernetes provider against your EKS cluster before applying pod / RBAC resources:\n# provider "kubernetes" {\n#   config_path = "~/.kube/config"\n# }\n`,
  azure: `\n# Configure the kubernetes provider against your AKS cluster before applying pod / RBAC resources.\n`,
  gcp:   `\n# Configure the kubernetes provider against your GKE cluster before applying pod / RBAC resources.\n`,
};

function renderExtras(extras: Set<ExtraProvider>): string {
  if (extras.size === 0) return "";
  return "\n" + [...extras].map((e) => EXTRA_PROVIDER_REQS[e]).join("\n");
}

const TF_HEADERS: Record<Provider, (region: string, opts: HeaderOpts) => string> = {
  aws: (region, { extras }) => {
    const k8sNote = extras.has("kubernetes") ? K8S_CONFIG_NOTE.aws : "";
    return `terraform {
  required_providers {
    aws    = { source = "hashicorp/aws",    version = "~> 5.0" }
    random = { source = "hashicorp/random", version = "~> 3.6" }${renderExtras(extras)}
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
  azure: (region, { extras }) => {
    const k8sNote = extras.has("kubernetes") ? K8S_CONFIG_NOTE.azure : "";
    return `terraform {
  required_providers {
    azurerm = { source = "hashicorp/azurerm", version = "~> 3.0" }
    azuread = { source = "hashicorp/azuread", version = "~> 2.0" }
    random  = { source = "hashicorp/random",  version = "~> 3.6" }${renderExtras(extras)}
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
  gcp: (region, { extras }) => {
    const k8sNote = extras.has("kubernetes") ? K8S_CONFIG_NOTE.gcp : "";
    return `terraform {
  required_providers {
    google = { source = "hashicorp/google", version = "~> 5.0" }
    random = { source = "hashicorp/random", version = "~> 3.6" }${renderExtras(extras)}
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
    azure: () => `resource "azurerm_network_security_group" "vm_public_ssh" {
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
    aws: () => `resource "aws_iam_role" "id_over_sa" {
  name = "vbuild-id-over-sa"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "id_over_sa_admin" {
  role       = aws_iam_role.id_over_sa.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

resource "aws_iam_instance_profile" "id_over_sa" {
  name = "vbuild-id-over-sa"
  role = aws_iam_role.id_over_sa.name
}

resource "aws_instance" "id_over_sa" {
  ami                  = data.aws_ami.al2023.id
  instance_type        = "t3.micro"
  iam_instance_profile = aws_iam_instance_profile.id_over_sa.name
  tags = { Name = "vbuild-id-over-sa" }
}
`,
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
  "vm-unencrypted-disk": {
    aws: (region) => `resource "aws_ebs_volume" "vm_unencrypted_disk" {
  availability_zone = "${region}a"
  size              = 8
  encrypted         = false # Missing CMK; only platform-default at-rest protection.
  tags = { Name = "vbuild-vm-unencrypted-disk" }
}
`,
    azure: () => `resource "azurerm_managed_disk" "vm_unencrypted_disk" {
  name                 = "vbuild-vm-unencrypted-disk"
  location             = azurerm_resource_group.vbuild.location
  resource_group_name  = azurerm_resource_group.vbuild.name
  storage_account_type = "Standard_LRS"
  create_option        = "Empty"
  disk_size_gb         = 8
  # No disk_encryption_set_id — uses default platform key, no CMK.
}
`,
    gcp: (region) => `resource "google_compute_disk" "vm_unencrypted_disk" {
  name = "vbuild-vm-unencrypted-disk"
  zone = "${region}-a"
  size = 8
  type = "pd-standard"
  # No disk_encryption_key block — Google-managed key only.
}
`,
  },

  "vm-secrets-userdata": {
    aws: () => `resource "aws_instance" "vm_secrets_userdata" {
  ami                         = data.aws_ami.al2023.id
  instance_type               = "t3.micro"
  associate_public_ip_address = true
  user_data                   = <<-EOT
    #!/bin/bash
    export DB_PASSWORD="hunter2-prod"
    export STRIPE_KEY="sk_live_REDACTED_BUT_NOT_REALLY"
    aws s3 cp s3://vbuild-config/app.env /etc/app.env
  EOT
  tags = { Name = "vbuild-vm-secrets-userdata" }
}
`,
    azure: () => `resource "azurerm_network_interface" "vm_secrets_userdata" {
  name                = "vbuild-vm-secrets-userdata-nic"
  location            = azurerm_resource_group.vbuild.location
  resource_group_name = azurerm_resource_group.vbuild.name
  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.vbuild.id
    private_ip_address_allocation = "Dynamic"
  }
}

resource "azurerm_linux_virtual_machine" "vm_secrets_userdata" {
  name                            = "vbuild-vm-secrets-userdata"
  location                        = azurerm_resource_group.vbuild.location
  resource_group_name             = azurerm_resource_group.vbuild.name
  size                            = "Standard_B1s"
  admin_username                  = "vbuild"
  admin_password                  = "P@ssw0rd-vbuild!"
  disable_password_authentication = false
  network_interface_ids           = [azurerm_network_interface.vm_secrets_userdata.id]
  custom_data = base64encode(<<-EOT
    #!/bin/bash
    export DB_PASSWORD="hunter2-prod"
    export STRIPE_KEY="sk_live_REDACTED_BUT_NOT_REALLY"
  EOT
  )
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
    gcp: (region) => `resource "google_compute_instance" "vm_secrets_userdata" {
  name         = "vbuild-vm-secrets-userdata"
  machine_type = "e2-micro"
  zone         = "${region}-a"
  boot_disk {
    initialize_params { image = "debian-cloud/debian-12" }
  }
  network_interface {
    network = "default"
    access_config {}
  }
  metadata_startup_script = <<-EOT
    #!/bin/bash
    export DB_PASSWORD="hunter2-prod"
    export STRIPE_KEY="sk_live_REDACTED_BUT_NOT_REALLY"
    gsutil cp gs://vbuild-config/app.env /etc/app.env
  EOT
}
`,
  },

  "data-public-search": {
    aws: (region) => `resource "aws_opensearch_domain" "data_public_search" {
  domain_name    = "vbuild-public-search"
  engine_version = "OpenSearch_2.11"
  cluster_config {
    instance_type  = "t3.small.search"
    instance_count = 1
  }
  ebs_options {
    ebs_enabled = true
    volume_size = 10
  }
  access_policies = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = "*"
      Action    = "es:*"
      Resource  = "arn:aws:es:${region}:*:domain/vbuild-public-search/*"
    }]
  })
  # No advanced_security_options / VPC config — public.
}
`,
  },

  "data-public-snapshot": {
    aws: () => `resource "aws_instance" "data_public_snapshot_src" {
  ami           = data.aws_ami.al2023.id
  instance_type = "t3.micro"
  tags          = { Name = "vbuild-public-snapshot-src" }
}

resource "aws_ami_from_instance" "data_public_snapshot" {
  name               = "vbuild-data-public-snapshot"
  source_instance_id = aws_instance.data_public_snapshot_src.id
  description        = "INTENTIONALLY VULNERABLE — public AMI with EBS snapshot"
}

resource "aws_ami_launch_permission" "data_public_snapshot" {
  image_id = aws_ami_from_instance.data_public_snapshot.id
  group    = "all" # SNAP-001: AMI (and underlying EBS snapshot) publicly readable.
}
`,
    azure: () => `resource "azurerm_managed_disk" "data_public_snapshot_src" {
  name                 = "vbuild-snapshot-src"
  location             = azurerm_resource_group.vbuild.location
  resource_group_name  = azurerm_resource_group.vbuild.name
  storage_account_type = "Standard_LRS"
  create_option        = "Empty"
  disk_size_gb         = 8
}

resource "azurerm_snapshot" "data_public_snapshot" {
  name                  = "vbuild-data-public-snapshot"
  location              = azurerm_resource_group.vbuild.location
  resource_group_name   = azurerm_resource_group.vbuild.name
  create_option         = "Copy"
  source_uri            = azurerm_managed_disk.data_public_snapshot_src.id
  network_access_policy = "AllowAll" # SNAP-001: network access not restricted.
}
`,
    gcp: (region) => `resource "google_compute_disk" "data_public_snapshot_src" {
  name = "vbuild-snapshot-src"
  zone = "${region}-a"
  size = 8
}

resource "google_compute_snapshot" "data_public_snapshot" {
  name        = "vbuild-data-public-snapshot"
  source_disk = google_compute_disk.data_public_snapshot_src.self_link
  zone        = "${region}-a"
}

resource "google_compute_snapshot_iam_member" "data_public_snapshot" {
  name   = google_compute_snapshot.data_public_snapshot.name
  role   = "roles/compute.viewer"
  member = "allUsers" # SNAP-001: snapshot accessible by any Google identity.
}
`,
  },

  "data-cache-open": {
    aws: () => `resource "aws_elasticache_subnet_group" "data_cache_open" {
  name       = "vbuild-data-cache-open"
  subnet_ids = data.aws_subnets.default.ids
}

resource "aws_security_group" "data_cache_open" {
  name        = "vbuild-data-cache-open"
  description = "INTENTIONALLY VULNERABLE — Redis open to world"
  vpc_id      = data.aws_vpc.default.id
  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_elasticache_cluster" "data_cache_open" {
  cluster_id           = "vbuild-data-cache-open"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  subnet_group_name    = aws_elasticache_subnet_group.data_cache_open.name
  security_group_ids   = [aws_security_group.data_cache_open.id]
  # No transit_encryption_enabled, no auth_token.
}
`,
    azure: () => `resource "azurerm_redis_cache" "data_cache_open" {
  name                          = "vbuild-cache-\${substr(md5(azurerm_resource_group.vbuild.id), 0, 6)}"
  location                      = azurerm_resource_group.vbuild.location
  resource_group_name           = azurerm_resource_group.vbuild.name
  capacity                      = 0
  family                        = "C"
  sku_name                      = "Basic"
  non_ssl_port_enabled          = true # Plaintext port 6379.
  public_network_access_enabled = true
  redis_configuration {
    # No AUTH; aad_enabled defaults to false.
  }
}
`,
    gcp: (region) => `resource "google_redis_instance" "data_cache_open" {
  name                    = "vbuild-data-cache-open"
  tier                    = "BASIC"
  memory_size_gb          = 1
  region                  = "${region}"
  auth_enabled            = false # CACHE-001: no AUTH on Redis connections.
  transit_encryption_mode = "DISABLED"
}
`,
  },

  "id-oidc-trust": {
    aws: () => `resource "aws_iam_openid_connect_provider" "id_oidc_trust" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

resource "aws_iam_role" "id_oidc_trust" {
  name = "vbuild-id-oidc-trust"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.id_oidc_trust.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          # IAM-040: no sub-claim restriction — ANY GitHub workflow can assume.
          # Real fix: "token.actions.githubusercontent.com:sub" = "repo:my-org/my-repo:ref:refs/heads/main"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "id_oidc_trust_admin" {
  role       = aws_iam_role.id_oidc_trust.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}
`,
    azure: () => `resource "azuread_application" "id_oidc_trust" {
  display_name = "vbuild-id-oidc-trust"
}

resource "azuread_service_principal" "id_oidc_trust" {
  client_id = azuread_application.id_oidc_trust.client_id
}

# IAM-040: subject left wildcard-equivalent; any GitHub workflow can exchange a token.
resource "azuread_application_federated_identity_credential" "id_oidc_trust" {
  application_id = azuread_application.id_oidc_trust.id
  display_name   = "vbuild-gh-oidc"
  audiences      = ["api://AzureADTokenExchange"]
  issuer         = "https://token.actions.githubusercontent.com"
  subject        = "repo:*:*"
}

resource "azurerm_role_assignment" "id_oidc_trust_owner" {
  scope                = data.azurerm_subscription.current.id
  role_definition_name = "Owner"
  principal_id         = azuread_service_principal.id_oidc_trust.object_id
}
`,
    gcp: () => `resource "google_iam_workload_identity_pool" "id_oidc_trust" {
  workload_identity_pool_id = "vbuild-oidc-pool"
  display_name              = "vbuild OIDC"
}

resource "google_iam_workload_identity_pool_provider" "id_oidc_trust" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.id_oidc_trust.workload_identity_pool_id
  workload_identity_pool_provider_id = "vbuild-github"
  display_name                       = "vbuild GitHub OIDC"
  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
  }
  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
    # IAM-040: no attribute_condition — any repository authenticates.
  }
}

resource "google_service_account" "id_oidc_trust" {
  account_id   = "vbuild-oidc-sa"
  display_name = "vbuild OIDC SA"
}

resource "google_service_account_iam_member" "id_oidc_trust" {
  service_account_id = google_service_account.id_oidc_trust.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/\${google_iam_workload_identity_pool.id_oidc_trust.name}/*"
}

resource "google_project_iam_member" "id_oidc_trust_owner" {
  project = var.project_id
  role    = "roles/owner"
  member  = "serviceAccount:\${google_service_account.id_oidc_trust.email}"
}
`,
  },

  "id-root-account": {
    aws: () => `# Root account itself cannot be managed via Terraform — IAM API rejects root operations.
# The expected operator response is to set up detection (Config + EventBridge) and remediate
# in the AWS console (rotate / delete keys, enable MFA).

resource "aws_config_config_rule" "root_mfa_enabled" {
  name = "vbuild-root-mfa-enabled"
  source {
    owner             = "AWS"
    source_identifier = "ROOT_ACCOUNT_MFA_ENABLED"
  }
}

resource "aws_config_config_rule" "root_no_access_keys" {
  name = "vbuild-root-no-access-keys"
  source {
    owner             = "AWS"
    source_identifier = "IAM_ROOT_ACCESS_KEY_CHECK"
  }
}

resource "aws_cloudwatch_event_rule" "root_signin_alarm" {
  name = "vbuild-root-signin-alarm"
  event_pattern = jsonencode({
    "detail-type" = ["AWS Console Sign In via CloudTrail"]
    "detail"      = { "userIdentity" = { "type" = ["Root"] } }
  })
}
`,
  },

  "id-no-password-policy": {
    aws: () => `resource "aws_iam_account_password_policy" "id_no_password_policy" {
  minimum_password_length        = 4
  require_lowercase_characters   = false
  require_uppercase_characters   = false
  require_numbers                = false
  require_symbols                = false
  allow_users_to_change_password = true
  # IAM-072: no max_password_age — passwords valid indefinitely.
  # No password_reuse_prevention either.
}
`,
  },

  "ctr-sa-token": {
    aws: () => K8S_SA_TOKEN,
    azure: () => K8S_SA_TOKEN,
    gcp: () => K8S_SA_TOKEN,
  },

  "ctr-image-as-root": {
    aws: () => K8S_IMAGE_AS_ROOT,
    azure: () => K8S_IMAGE_AS_ROOT,
    gcp: () => K8S_IMAGE_AS_ROOT,
  },

  "fn-public-url": {
    aws: () => `data "archive_file" "fn_public_url" {
  type        = "zip"
  output_path = "\${path.module}/fn_public_url.zip"
  source {
    filename = "index.py"
    content  = "def handler(event, context):\\n    return {'statusCode': 200, 'body': 'vbuild'}\\n"
  }
}

resource "aws_iam_role" "fn_public_url" {
  name = "vbuild-fn-public-url"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Effect = "Allow", Principal = { Service = "lambda.amazonaws.com" }, Action = "sts:AssumeRole" }]
  })
}

resource "aws_iam_role_policy_attachment" "fn_public_url_admin" {
  role       = aws_iam_role.fn_public_url.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

resource "aws_lambda_function" "fn_public_url" {
  function_name    = "vbuild-fn-public-url"
  role             = aws_iam_role.fn_public_url.arn
  runtime          = "python3.12"
  handler          = "index.handler"
  filename         = data.archive_file.fn_public_url.output_path
  source_code_hash = data.archive_file.fn_public_url.output_base64sha256
}

resource "aws_lambda_function_url" "fn_public_url" {
  function_name      = aws_lambda_function.fn_public_url.function_name
  authorization_type = "NONE" # FN-001: unauthenticated invoke.
}
`,
    azure: () => `resource "azurerm_storage_account" "fn_public_url" {
  name                     = "vbuildfn\${substr(md5(azurerm_resource_group.vbuild.id), 0, 6)}"
  resource_group_name      = azurerm_resource_group.vbuild.name
  location                 = azurerm_resource_group.vbuild.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_service_plan" "fn_public_url" {
  name                = "vbuild-fn-public-url-plan"
  resource_group_name = azurerm_resource_group.vbuild.name
  location            = azurerm_resource_group.vbuild.location
  os_type             = "Linux"
  sku_name            = "Y1"
}

resource "azurerm_linux_function_app" "fn_public_url" {
  name                       = "vbuild-fn-public-url"
  resource_group_name        = azurerm_resource_group.vbuild.name
  location                   = azurerm_resource_group.vbuild.location
  storage_account_name       = azurerm_storage_account.fn_public_url.name
  storage_account_access_key = azurerm_storage_account.fn_public_url.primary_access_key
  service_plan_id            = azurerm_service_plan.fn_public_url.id
  identity { type = "SystemAssigned" }
  site_config {
    # No ip_restriction blocks — reachable from anywhere.
  }
  auth_settings { enabled = false } # FN-001: anonymous invoke allowed.
}

resource "azurerm_role_assignment" "fn_public_url_owner" {
  scope                = data.azurerm_subscription.current.id
  role_definition_name = "Owner"
  principal_id         = azurerm_linux_function_app.fn_public_url.identity[0].principal_id
}
`,
    gcp: (region) => `resource "google_service_account" "fn_public_url" {
  account_id   = "vbuild-fn-public-url"
  display_name = "vbuild fn public-url SA"
}

resource "google_project_iam_member" "fn_public_url_owner" {
  project = var.project_id
  role    = "roles/owner"
  member  = "serviceAccount:\${google_service_account.fn_public_url.email}"
}

resource "google_storage_bucket" "fn_public_url_src" {
  name                        = "vbuild-fn-public-url-src-\${var.project_id}"
  location                    = "US"
  force_destroy               = true
  uniform_bucket_level_access = true
}

resource "google_cloudfunctions2_function" "fn_public_url" {
  name     = "vbuild-fn-public-url"
  location = "${region}"
  build_config {
    runtime     = "python312"
    entry_point = "handler"
    source {
      storage_source {
        bucket = google_storage_bucket.fn_public_url_src.name
        object = "function-source.zip" # Provide your own packaged source.
      }
    }
  }
  service_config {
    service_account_email = google_service_account.fn_public_url.email
    ingress_settings      = "ALLOW_ALL"
  }
}

resource "google_cloud_run_service_iam_member" "fn_public_url" {
  location = google_cloudfunctions2_function.fn_public_url.location
  service  = google_cloudfunctions2_function.fn_public_url.name
  role     = "roles/run.invoker"
  member   = "allUsers" # FN-001: unauthenticated invoke.
}
`,
  },

  "fn-secrets-env": {
    aws: () => `data "archive_file" "fn_secrets_env" {
  type        = "zip"
  output_path = "\${path.module}/fn_secrets_env.zip"
  source {
    filename = "index.py"
    content  = "def handler(event, context):\\n    return {'statusCode': 200}\\n"
  }
}

resource "aws_iam_role" "fn_secrets_env" {
  name = "vbuild-fn-secrets-env"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Effect = "Allow", Principal = { Service = "lambda.amazonaws.com" }, Action = "sts:AssumeRole" }]
  })
}

resource "aws_lambda_function" "fn_secrets_env" {
  function_name    = "vbuild-fn-secrets-env"
  role             = aws_iam_role.fn_secrets_env.arn
  runtime          = "python3.12"
  handler          = "index.handler"
  filename         = data.archive_file.fn_secrets_env.output_path
  source_code_hash = data.archive_file.fn_secrets_env.output_base64sha256
  environment {
    variables = {
      DB_PASSWORD    = "hunter2-prod"
      STRIPE_API_KEY = "sk_live_REDACTED_BUT_NOT_REALLY"
      GITHUB_PAT     = "ghp_redacted_but_not_really"
    }
  }
  # No kms_key_arn — env encrypted only with default Lambda key.
}
`,
    azure: () => `resource "azurerm_storage_account" "fn_secrets_env" {
  name                     = "vbuildfnsec\${substr(md5(azurerm_resource_group.vbuild.id), 0, 4)}"
  resource_group_name      = azurerm_resource_group.vbuild.name
  location                 = azurerm_resource_group.vbuild.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_service_plan" "fn_secrets_env" {
  name                = "vbuild-fn-secrets-env-plan"
  resource_group_name = azurerm_resource_group.vbuild.name
  location            = azurerm_resource_group.vbuild.location
  os_type             = "Linux"
  sku_name            = "Y1"
}

resource "azurerm_linux_function_app" "fn_secrets_env" {
  name                       = "vbuild-fn-secrets-env"
  resource_group_name        = azurerm_resource_group.vbuild.name
  location                   = azurerm_resource_group.vbuild.location
  storage_account_name       = azurerm_storage_account.fn_secrets_env.name
  storage_account_access_key = azurerm_storage_account.fn_secrets_env.primary_access_key
  service_plan_id            = azurerm_service_plan.fn_secrets_env.id
  app_settings = {
    DB_PASSWORD    = "hunter2-prod"
    STRIPE_API_KEY = "sk_live_REDACTED_BUT_NOT_REALLY"
    GITHUB_PAT     = "ghp_redacted_but_not_really"
  }
  site_config {}
}
`,
    gcp: (region) => `resource "google_storage_bucket" "fn_secrets_env_src" {
  name                        = "vbuild-fn-secrets-env-src-\${var.project_id}"
  location                    = "US"
  force_destroy               = true
  uniform_bucket_level_access = true
}

resource "google_cloudfunctions2_function" "fn_secrets_env" {
  name     = "vbuild-fn-secrets-env"
  location = "${region}"
  build_config {
    runtime     = "python312"
    entry_point = "handler"
    source {
      storage_source {
        bucket = google_storage_bucket.fn_secrets_env_src.name
        object = "function-source.zip"
      }
    }
  }
  service_config {
    environment_variables = {
      DB_PASSWORD    = "hunter2-prod"
      STRIPE_API_KEY = "sk_live_REDACTED_BUT_NOT_REALLY"
      GITHUB_PAT     = "ghp_redacted_but_not_really"
    }
  }
}
`,
  },

  "fn-loose-policy": {
    aws: () => `data "archive_file" "fn_loose_policy" {
  type        = "zip"
  output_path = "\${path.module}/fn_loose_policy.zip"
  source {
    filename = "index.py"
    content  = "def handler(event, context):\\n    return {'statusCode': 200}\\n"
  }
}

resource "aws_iam_role" "fn_loose_policy" {
  name = "vbuild-fn-loose-policy"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Effect = "Allow", Principal = { Service = "lambda.amazonaws.com" }, Action = "sts:AssumeRole" }]
  })
}

resource "aws_lambda_function" "fn_loose_policy" {
  function_name    = "vbuild-fn-loose-policy"
  role             = aws_iam_role.fn_loose_policy.arn
  runtime          = "python3.12"
  handler          = "index.handler"
  filename         = data.archive_file.fn_loose_policy.output_path
  source_code_hash = data.archive_file.fn_loose_policy.output_base64sha256
}

resource "aws_lambda_permission" "fn_loose_policy" {
  statement_id  = "AllowAllInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.fn_loose_policy.function_name
  principal     = "*" # FN-014: wildcard principal can invoke.
}
`,
    azure: () => `resource "azurerm_storage_account" "fn_loose_policy" {
  name                     = "vbuildfnpol\${substr(md5(azurerm_resource_group.vbuild.id), 0, 4)}"
  resource_group_name      = azurerm_resource_group.vbuild.name
  location                 = azurerm_resource_group.vbuild.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_service_plan" "fn_loose_policy" {
  name                = "vbuild-fn-loose-policy-plan"
  resource_group_name = azurerm_resource_group.vbuild.name
  location            = azurerm_resource_group.vbuild.location
  os_type             = "Linux"
  sku_name            = "Y1"
}

resource "azurerm_linux_function_app" "fn_loose_policy" {
  name                       = "vbuild-fn-loose-policy"
  resource_group_name        = azurerm_resource_group.vbuild.name
  location                   = azurerm_resource_group.vbuild.location
  storage_account_name       = azurerm_storage_account.fn_loose_policy.name
  storage_account_access_key = azurerm_storage_account.fn_loose_policy.primary_access_key
  service_plan_id            = azurerm_service_plan.fn_loose_policy.id
  site_config {
    cors { allowed_origins = ["*"] } # CORS wide-open — cross-origin invocation invited.
  }
  auth_settings { enabled = false }
}
`,
    gcp: (region) => `resource "google_storage_bucket" "fn_loose_policy_src" {
  name                        = "vbuild-fn-loose-policy-src-\${var.project_id}"
  location                    = "US"
  force_destroy               = true
  uniform_bucket_level_access = true
}

resource "google_cloudfunctions2_function" "fn_loose_policy" {
  name     = "vbuild-fn-loose-policy"
  location = "${region}"
  build_config {
    runtime     = "python312"
    entry_point = "handler"
    source {
      storage_source {
        bucket = google_storage_bucket.fn_loose_policy_src.name
        object = "function-source.zip"
      }
    }
  }
  service_config {
    ingress_settings = "ALLOW_ALL"
  }
}

resource "google_cloud_run_service_iam_member" "fn_loose_policy" {
  location = google_cloudfunctions2_function.fn_loose_policy.location
  service  = google_cloudfunctions2_function.fn_loose_policy.name
  role     = "roles/run.invoker"
  member   = "allUsers" # FN-014: unauthenticated invoke.
}
`,
  },

  "net-tls-weak": {
    aws: () => `# Replace certificate_arn with a real ACM cert ARN before apply.
resource "aws_lb" "net_tls_weak" {
  name               = "vbuild-net-tls-weak"
  internal           = false
  load_balancer_type = "application"
  subnets            = data.aws_subnets.default.ids
}

resource "aws_lb_listener" "net_tls_weak" {
  load_balancer_arn = aws_lb.net_tls_weak.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-0-2015-04" # NET-101: allows TLS 1.0/1.1.
  certificate_arn   = "arn:aws:acm:us-east-1:000000000000:certificate/REPLACE-ME"
  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      message_body = "vbuild"
      status_code  = "200"
    }
  }
}
`,
    azure: () => `resource "azurerm_service_plan" "net_tls_weak" {
  name                = "vbuild-net-tls-weak-plan"
  resource_group_name = azurerm_resource_group.vbuild.name
  location            = azurerm_resource_group.vbuild.location
  os_type             = "Linux"
  sku_name            = "B1"
}

resource "azurerm_linux_web_app" "net_tls_weak" {
  name                = "vbuild-net-tls-weak-\${substr(md5(azurerm_resource_group.vbuild.id), 0, 4)}"
  resource_group_name = azurerm_resource_group.vbuild.name
  location            = azurerm_service_plan.net_tls_weak.location
  service_plan_id     = azurerm_service_plan.net_tls_weak.id
  site_config {
    minimum_tls_version = "1.0" # NET-101: accepts TLS 1.0/1.1.
  }
}
`,
    gcp: () => `resource "google_compute_ssl_policy" "net_tls_weak" {
  name            = "vbuild-net-tls-weak"
  profile         = "CUSTOM"
  min_tls_version = "TLS_1_0" # NET-101
  custom_features = ["TLS_RSA_WITH_3DES_EDE_CBC_SHA"] # NET-103: weak cipher.
}
# Wire this ssl_policy to a target_https_proxy to complete the LB.
`,
  },

  "net-dangling-dns": {
    aws: () => `resource "aws_route53_zone" "net_dangling_dns" {
  name = "vbuild-example.com"
}

# NET-201: CNAME points at a deleted S3 bucket. An attacker can re-register the
# bucket name "vbuild-deleted-bucket" and hijack promo.vbuild-example.com.
resource "aws_route53_record" "net_dangling_dns" {
  zone_id = aws_route53_zone.net_dangling_dns.zone_id
  name    = "promo.vbuild-example.com"
  type    = "CNAME"
  ttl     = 300
  records = ["vbuild-deleted-bucket.s3.amazonaws.com"]
}
`,
    azure: () => `resource "azurerm_dns_zone" "net_dangling_dns" {
  name                = "vbuild-example.com"
  resource_group_name = azurerm_resource_group.vbuild.name
}

# NET-201: points at a deprovisioned App Service.
resource "azurerm_dns_cname_record" "net_dangling_dns" {
  name                = "promo"
  zone_name           = azurerm_dns_zone.net_dangling_dns.name
  resource_group_name = azurerm_resource_group.vbuild.name
  ttl                 = 300
  record              = "vbuild-deleted.azurewebsites.net"
}
`,
    gcp: () => `resource "google_dns_managed_zone" "net_dangling_dns" {
  name        = "vbuild-example-com"
  dns_name    = "vbuild-example.com."
  description = "vbuild example zone"
}

# NET-201: CNAME points at a deleted GCS bucket name; attacker may re-register it.
resource "google_dns_record_set" "net_dangling_dns" {
  name         = "promo.\${google_dns_managed_zone.net_dangling_dns.dns_name}"
  managed_zone = google_dns_managed_zone.net_dangling_dns.name
  type         = "CNAME"
  ttl          = 300
  rrdatas      = ["vbuild-deleted.storage.googleapis.com."]
}
`,
  },

  "net-public-origin": {
    aws: () => `resource "aws_security_group" "net_public_origin" {
  name        = "vbuild-net-public-origin"
  description = "INTENTIONALLY VULNERABLE — ALB reachable directly, bypasses CDN/WAF"
  vpc_id      = data.aws_vpc.default.id
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # NET-301: should be restricted to CloudFront prefix list.
  }
}

resource "aws_lb" "net_public_origin" {
  name               = "vbuild-net-public-origin"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.net_public_origin.id]
  subnets            = data.aws_subnets.default.ids
}
`,
    azure: () => `resource "azurerm_service_plan" "net_public_origin" {
  name                = "vbuild-net-public-origin-plan"
  resource_group_name = azurerm_resource_group.vbuild.name
  location            = azurerm_resource_group.vbuild.location
  os_type             = "Linux"
  sku_name            = "B1"
}

resource "azurerm_linux_web_app" "net_public_origin" {
  name                          = "vbuild-net-public-origin-\${substr(md5(azurerm_resource_group.vbuild.id), 0, 4)}"
  resource_group_name           = azurerm_resource_group.vbuild.name
  location                      = azurerm_service_plan.net_public_origin.location
  service_plan_id               = azurerm_service_plan.net_public_origin.id
  public_network_access_enabled = true
  site_config {
    # No ip_restriction — origin reachable from any IP, bypassing Front Door / WAF.
  }
}
`,
    gcp: (region) => `resource "google_compute_firewall" "net_public_origin" {
  name          = "vbuild-net-public-origin"
  network       = "default"
  source_ranges = ["0.0.0.0/0"]
  allow {
    protocol = "tcp"
    ports    = ["80"]
  }
}

resource "google_compute_instance" "net_public_origin" {
  name         = "vbuild-net-public-origin"
  machine_type = "e2-micro"
  zone         = "${region}-a"
  boot_disk {
    initialize_params { image = "debian-cloud/debian-12" }
  }
  network_interface {
    network = "default"
    access_config {}
  }
}
`,
  },

  "net-no-waf": {
    aws: () => `resource "aws_lb" "net_no_waf" {
  name               = "vbuild-net-no-waf"
  internal           = false
  load_balancer_type = "application"
  subnets            = data.aws_subnets.default.ids
}
# NET-401: no aws_wafv2_web_acl_association — ALB unprotected at L7.
`,
    azure: () => `resource "azurerm_cdn_frontdoor_profile" "net_no_waf" {
  name                = "vbuild-net-no-waf"
  resource_group_name = azurerm_resource_group.vbuild.name
  sku_name            = "Standard_AzureFrontDoor"
  # NET-401: no azurerm_cdn_frontdoor_security_policy associated.
}
`,
    gcp: () => `resource "google_compute_backend_service" "net_no_waf" {
  name                  = "vbuild-net-no-waf"
  protocol              = "HTTP"
  load_balancing_scheme = "EXTERNAL"
  # NET-401: no security_policy — no Cloud Armor managed rule set at L7.
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

const K8S_SA_TOKEN = `# Default ServiceAccount + permissive RBAC. Requires the kubernetes provider.
resource "kubernetes_manifest" "ctr_sa_token_role" {
  manifest = {
    apiVersion = "rbac.authorization.k8s.io/v1"
    kind       = "ClusterRole"
    metadata   = { name = "vbuild-secrets-reader" }
    rules = [{
      apiGroups = [""]
      resources = ["secrets"]
      verbs     = ["get", "list", "watch"]
    }]
  }
}

# K8S-052: default ServiceAccount granted cluster-wide secrets read.
resource "kubernetes_manifest" "ctr_sa_token_binding" {
  manifest = {
    apiVersion = "rbac.authorization.k8s.io/v1"
    kind       = "ClusterRoleBinding"
    metadata   = { name = "vbuild-default-secrets-reader" }
    roleRef = {
      apiGroup = "rbac.authorization.k8s.io"
      kind     = "ClusterRole"
      name     = "vbuild-secrets-reader"
    }
    subjects = [{
      kind      = "ServiceAccount"
      name      = "default"
      namespace = "default"
    }]
  }
}

# K8S-050: automountServiceAccountToken left at default (true) — pod inherits a token
# at /var/run/secrets/kubernetes.io/serviceaccount/token, stealable on compromise.
resource "kubernetes_manifest" "ctr_sa_token_pod" {
  manifest = {
    apiVersion = "v1"
    kind       = "Pod"
    metadata = {
      name      = "vbuild-sa-token-pod"
      namespace = "default"
    }
    spec = {
      containers = [{
        name    = "app"
        image   = "alpine:3.19"
        command = ["sleep", "infinity"]
      }]
    }
  }
}
`;

const K8S_IMAGE_AS_ROOT = `# Pod runs as UID 0 with writable root filesystem. Requires the kubernetes provider.
resource "kubernetes_manifest" "ctr_image_as_root" {
  manifest = {
    apiVersion = "v1"
    kind       = "Pod"
    metadata = {
      name      = "vbuild-root-pod"
      namespace = "default"
    }
    spec = {
      containers = [{
        name    = "app"
        image   = "alpine:3.19"
        command = ["sleep", "infinity"]
        securityContext = {
          # K8S-060: runAsNonRoot not set — container runs as root by default.
          # K8S-062: readOnlyRootFilesystem not set — attacker can drop persistent binaries.
        }
      }]
    }
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
  azure_vbuild_vnet: {
    azure: `resource "azurerm_virtual_network" "vbuild" {
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
`,
  },
};

const TF_BODY_DEPS: Record<string, Partial<Record<Provider, string[]>>> = {
  "vm-public-ssh": { aws: ["aws_ami_al2023"], azure: ["azure_vbuild_vnet"] },
  "vm-imds-v1": { aws: ["aws_ami_al2023"] },
  "vm-secrets-userdata": { aws: ["aws_ami_al2023"], azure: ["azure_vbuild_vnet"] },
  "id-over-sa": { aws: ["aws_ami_al2023"] },
  "ctr-public-cluster": { aws: ["aws_default_vpc"] },
  "data-cache-open": { aws: ["aws_default_vpc"] },
  "data-public-snapshot": { aws: ["aws_ami_al2023"] },
  "net-tls-weak": { aws: ["aws_default_vpc"] },
  "net-public-origin": { aws: ["aws_default_vpc"] },
  "net-no-waf": { aws: ["aws_default_vpc"] },
};

const TF_EXTRA_PROVIDERS: Record<string, Partial<Record<Provider, ExtraProvider[]>>> = {
  "ctr-priv-pod":      { aws: ["kubernetes"], azure: ["kubernetes"], gcp: ["kubernetes"] },
  "ctr-sa-token":      { aws: ["kubernetes"], azure: ["kubernetes"], gcp: ["kubernetes"] },
  "ctr-image-as-root": { aws: ["kubernetes"], azure: ["kubernetes"], gcp: ["kubernetes"] },
  "fn-public-url":     { aws: ["archive"] },
  "fn-secrets-env":    { aws: ["archive"] },
  "fn-loose-policy":   { aws: ["archive"] },
};

// --- Terraform assembly ---

function tf(provider: Provider, region: string, items: Component[]) {
  const supported = items.filter((c) => c.providers.includes(provider));

  const extras = new Set<ExtraProvider>();
  for (const c of supported) {
    for (const e of TF_EXTRA_PROVIDERS[c.id]?.[provider] ?? []) extras.add(e);
  }
  const header = TF_HEADERS[provider](region, { extras });

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
  "id-over-sa": () => `  IdOverSaRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: vbuild-id-over-sa
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal: { Service: ec2.amazonaws.com }
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/AdministratorAccess
  IdOverSaProfile:
    Type: AWS::IAM::InstanceProfile
    Properties:
      Roles: [!Ref IdOverSaRole]
  IdOverSa:
    Type: AWS::EC2::Instance
    Properties:
      InstanceType: t3.micro
      ImageId: !Ref LatestAmazonLinuxAmi
      IamInstanceProfile: !Ref IdOverSaProfile
      Tags:
        - Key: Name
          Value: vbuild-id-over-sa
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
        SubnetIds: !Ref SubnetIds
        EndpointPublicAccess: true
        EndpointPrivateAccess: false
        PublicAccessCidrs: [0.0.0.0/0]
`,
  "vm-unencrypted-disk": () => `  VmUnencryptedDisk:
    Type: AWS::EC2::Volume
    Properties:
      AvailabilityZone: !Sub "\${AWS::Region}a"
      Size: 8
      Encrypted: false # VM-301: no CMK; only platform-default at-rest protection.
      Tags:
        - Key: Name
          Value: vbuild-vm-unencrypted-disk
`,
  "vm-secrets-userdata": () => `  VmSecretsUserdata:
    Type: AWS::EC2::Instance
    Properties:
      InstanceType: t3.micro
      ImageId: !Ref LatestAmazonLinuxAmi
      UserData:
        Fn::Base64: |
          #!/bin/bash
          export DB_PASSWORD="hunter2-prod"
          export STRIPE_KEY="sk_live_REDACTED_BUT_NOT_REALLY"
          aws s3 cp s3://vbuild-config/app.env /etc/app.env
      Tags:
        - Key: Name
          Value: vbuild-vm-secrets-userdata
`,
  "data-public-search": () => `  DataPublicSearch:
    Type: AWS::OpenSearchService::Domain
    Properties:
      DomainName: vbuild-public-search
      EngineVersion: OpenSearch_2.11
      ClusterConfig:
        InstanceType: t3.small.search
        InstanceCount: 1
      EBSOptions:
        EBSEnabled: true
        VolumeSize: 10
      AccessPolicies:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal: "*"
            Action: "es:*"
            Resource: !Sub "arn:aws:es:\${AWS::Region}:\${AWS::AccountId}:domain/vbuild-public-search/*"
`,
  "data-public-snapshot": () => `  # SNAP-001: CloudFormation cannot mark an AMI/snapshot public natively.
  # See Terraform (aws_ami_launch_permission with group=all) or apply via:
  # aws ec2 modify-image-attribute --image-id <id> --launch-permission '{"Add":[{"Group":"all"}]}'
  DataPublicSnapshotPlaceholder:
    Type: AWS::CloudFormation::WaitConditionHandle
`,
  "data-cache-open": () => `  DataCacheOpenSg:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: vbuild-data-cache-open — Redis open to world
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 6379
          ToPort: 6379
          CidrIp: 0.0.0.0/0
  DataCacheOpen:
    Type: AWS::ElastiCache::CacheCluster
    Properties:
      CacheNodeType: cache.t3.micro
      Engine: redis
      NumCacheNodes: 1
      VpcSecurityGroupIds: [!GetAtt DataCacheOpenSg.GroupId]
      # No AuthToken, no TransitEncryptionEnabled.
`,
  "id-oidc-trust": () => `  IdOidcTrustProvider:
    Type: AWS::IAM::OIDCProvider
    Properties:
      Url: https://token.actions.githubusercontent.com
      ClientIdList: [sts.amazonaws.com]
      ThumbprintList: [6938fd4d98bab03faadb97b34396831e3780aea1]
  IdOidcTrust:
    Type: AWS::IAM::Role
    Properties:
      RoleName: vbuild-id-oidc-trust
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal:
              Federated: !Ref IdOidcTrustProvider
            Action: sts:AssumeRoleWithWebIdentity
            Condition:
              StringEquals:
                "token.actions.githubusercontent.com:aud": sts.amazonaws.com
                # IAM-040: no sub claim restriction — any GitHub workflow can assume.
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/AdministratorAccess
`,
  "id-root-account": () => `  # Root account cannot be managed via CloudFormation. These rules detect the misconfig.
  RootMfaEnabledRule:
    Type: AWS::Config::ConfigRule
    Properties:
      ConfigRuleName: vbuild-root-mfa-enabled
      Source:
        Owner: AWS
        SourceIdentifier: ROOT_ACCOUNT_MFA_ENABLED
  RootNoAccessKeysRule:
    Type: AWS::Config::ConfigRule
    Properties:
      ConfigRuleName: vbuild-root-no-access-keys
      Source:
        Owner: AWS
        SourceIdentifier: IAM_ROOT_ACCESS_KEY_CHECK
  RootSigninAlarm:
    Type: AWS::Events::Rule
    Properties:
      Name: vbuild-root-signin-alarm
      EventPattern:
        detail-type: ["AWS Console Sign In via CloudTrail"]
        detail:
          userIdentity:
            type: [Root]
`,
  "id-no-password-policy": () => `  # AWS::IAM::AccountPasswordPolicy is not a native CloudFormation resource.
  # Apply with a Lambda-backed custom resource, or via CLI:
  #   aws iam update-account-password-policy --minimum-password-length 4
  IdNoPasswordPolicyPlaceholder:
    Type: AWS::CloudFormation::WaitConditionHandle
`,
  "ctr-priv-pod": () => `  # K8S pod / RBAC manifests are not CloudFormation primitives.
  # See the Terraform output (uses the kubernetes provider) or apply via kubectl.
  CtrPrivPodPlaceholder:
    Type: AWS::CloudFormation::WaitConditionHandle
`,
  "ctr-sa-token": () => `  # K8S RBAC / pod manifests are not CloudFormation primitives.
  # See the Terraform output (uses the kubernetes provider) or apply via kubectl.
  CtrSaTokenPlaceholder:
    Type: AWS::CloudFormation::WaitConditionHandle
`,
  "ctr-image-as-root": () => `  # K8S pod manifests are not CloudFormation primitives.
  # See the Terraform output (uses the kubernetes provider) or apply via kubectl.
  CtrImageAsRootPlaceholder:
    Type: AWS::CloudFormation::WaitConditionHandle
`,
  "net-tls-weak": () => `  NetTlsWeak:
    Type: AWS::ElasticLoadBalancingV2::LoadBalancer
    Properties:
      Name: vbuild-net-tls-weak
      Subnets: !Ref SubnetIds
      Scheme: internet-facing
      Type: application
  # NET-101: to demonstrate weak TLS, attach a Listener with
  # SslPolicy: ELBSecurityPolicy-TLS-1-0-2015-04 and a real ACM certificate ARN.
`,
  "net-dangling-dns": () => `  NetDanglingDnsZone:
    Type: AWS::Route53::HostedZone
    Properties:
      Name: vbuild-example.com
  # NET-201: CNAME points at a deleted S3 bucket — attacker can re-register the bucket name.
  NetDanglingDns:
    Type: AWS::Route53::RecordSet
    Properties:
      HostedZoneId: !Ref NetDanglingDnsZone
      Name: promo.vbuild-example.com
      Type: CNAME
      TTL: "300"
      ResourceRecords:
        - vbuild-deleted-bucket.s3.amazonaws.com
`,
  "net-public-origin": () => `  NetPublicOriginSg:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: ALB open to internet, bypasses any CDN/WAF
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 80
          ToPort: 80
          CidrIp: 0.0.0.0/0
  NetPublicOrigin:
    Type: AWS::ElasticLoadBalancingV2::LoadBalancer
    Properties:
      Name: vbuild-net-public-origin
      Subnets: !Ref SubnetIds
      SecurityGroups: [!GetAtt NetPublicOriginSg.GroupId]
      Scheme: internet-facing
      Type: application
`,
  "net-no-waf": () => `  NetNoWaf:
    Type: AWS::ElasticLoadBalancingV2::LoadBalancer
    Properties:
      Name: vbuild-net-no-waf
      Subnets: !Ref SubnetIds
      Scheme: internet-facing
      Type: application
  # NET-401: no AWS::WAFv2::WebACLAssociation in this stack — ALB unprotected at L7.
`,
  "fn-public-url": () => `  FnPublicUrlRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: vbuild-fn-public-url
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal: { Service: lambda.amazonaws.com }
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/AdministratorAccess
  FnPublicUrl:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: vbuild-fn-public-url
      Role: !GetAtt FnPublicUrlRole.Arn
      Runtime: python3.12
      Handler: index.handler
      Code:
        ZipFile: |
          def handler(event, context):
              return {'statusCode': 200, 'body': 'vbuild'}
  FnPublicUrlUrl:
    Type: AWS::Lambda::Url
    Properties:
      TargetFunctionArn: !Ref FnPublicUrl
      AuthType: NONE # FN-001
`,
  "fn-secrets-env": () => `  FnSecretsEnvRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: vbuild-fn-secrets-env
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal: { Service: lambda.amazonaws.com }
            Action: sts:AssumeRole
  FnSecretsEnv:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: vbuild-fn-secrets-env
      Role: !GetAtt FnSecretsEnvRole.Arn
      Runtime: python3.12
      Handler: index.handler
      Code:
        ZipFile: |
          def handler(event, context):
              return {'statusCode': 200}
      Environment:
        Variables:
          DB_PASSWORD: hunter2-prod
          STRIPE_API_KEY: sk_live_REDACTED_BUT_NOT_REALLY
          GITHUB_PAT: ghp_redacted_but_not_really
`,
  "fn-loose-policy": () => `  FnLoosePolicyRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: vbuild-fn-loose-policy
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal: { Service: lambda.amazonaws.com }
            Action: sts:AssumeRole
  FnLoosePolicy:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: vbuild-fn-loose-policy
      Role: !GetAtt FnLoosePolicyRole.Arn
      Runtime: python3.12
      Handler: index.handler
      Code:
        ZipFile: |
          def handler(event, context):
              return {'statusCode': 200}
  FnLoosePolicyPermission:
    Type: AWS::Lambda::Permission
    Properties:
      FunctionName: !Ref FnLoosePolicy
      Action: lambda:InvokeFunction
      Principal: "*" # FN-014: wildcard principal.
`,
};

const CFN_NEEDS_AMI = new Set(["vm-public-ssh", "vm-imds-v1", "vm-secrets-userdata", "id-over-sa"]);
const CFN_NEEDS_SUBNETS = new Set(["ctr-public-cluster", "net-tls-weak", "net-public-origin", "net-no-waf"]);

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

  const needsAmi = aws.some((c) => CFN_NEEDS_AMI.has(c.id));
  const needsSubnets = aws.some((c) => CFN_NEEDS_SUBNETS.has(c.id));

  const params: string[] = [];
  if (needsAmi) {
    params.push(`  LatestAmazonLinuxAmi:
    Type: AWS::SSM::Parameter::Value<AWS::EC2::Image::Id>
    Default: /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64`);
  }
  if (needsSubnets) {
    params.push(`  SubnetIds:
    Type: List<AWS::EC2::Subnet::Id>
    Description: At least two subnets across AZs (used by EKS / ALB resources).`);
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

  const toggleCategory = (cat: Category) => {
    const ids = cat.components.map((c) => c.id);
    const allSelected = ids.every((id) => selectedIds.includes(id));
    setSelectedIds((s) =>
      allSelected
        ? s.filter((id) => !ids.includes(id))
        : Array.from(new Set([...s, ...ids])),
    );
  };

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
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-background/40">
              <Layers className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="font-mono text-sm">vulnerability-catalog</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 border-b border-border">
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
              {CATALOG.filter((c) => c.id === activeCat).map((cat) => {
                const allSelected = cat.components.every((c) => selectedIds.includes(c.id));
                return (
                <div key={cat.id}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <p className="text-xs text-muted-foreground">{cat.desc}</p>
                    <button
                      onClick={() => toggleCategory(cat)}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-background/60 px-2 py-1 font-mono text-[10px] uppercase tracking-wider hover:bg-background flex-shrink-0"
                    >
                      {allSelected ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                      {allSelected ? "deselect all" : "select all"}
                    </button>
                  </div>
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
                );
              })}
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
  const refs = VULN_REFS[v.id];
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-2.5">
      <div className="flex items-center gap-2">
        <span className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${sev}`}>{v.severity}</span>
        <span className="font-mono text-[10px] text-muted-foreground">{v.id}</span>
        <span className="text-xs font-medium truncate">{v.title}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{v.desc}</p>
      {refs && (refs.cwe || refs.cvss || refs.cis || refs.cve) && (
        <div className="mt-2 flex flex-wrap gap-1 font-mono text-[10px]">
          {refs.cwe  && <span className="px-1.5 py-0.5 rounded border border-border/60 bg-background/60 text-muted-foreground">{refs.cwe}</span>}
          {refs.cvss && <span className="px-1.5 py-0.5 rounded border border-border/60 bg-background/60 text-muted-foreground">CVSS {refs.cvss}</span>}
          {refs.cis  && <span className="px-1.5 py-0.5 rounded border border-border/60 bg-background/60 text-muted-foreground">{refs.cis}</span>}
          {refs.cve  && <span className="px-1.5 py-0.5 rounded border border-destructive/40 bg-destructive/10 text-destructive">{refs.cve}</span>}
        </div>
      )}
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
