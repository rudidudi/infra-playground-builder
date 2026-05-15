# Vulnerabuild

Compose intentionally-vulnerable cloud infrastructure across AWS, Azure, and GCP, then download the generated Terraform or CloudFormation. Built for security training, red-team exercises, and CTFs.

> **Warning.** Every template this app emits is deliberately misconfigured (public buckets, admin policies, IMDSv1, privileged Kubernetes pods, etc.). Apply only in an isolated sub-account / project, time-boxed and tagged. Never deploy on top of production.

## Catalog (v0.5.0)

**6 categories · 28 components · 60 vulnerabilities** — each tagged with CWE, CVSS v3.1, CIS Benchmark (where applicable), and CVE (for the handful of misconfigs with a direct software-CVE mapping).

| Category | Components |
|---|---|
| **VM** | Public SSH/RDP host · SSRF→IMDS chain (Capital One) · Unencrypted volume · Secrets in user_data |
| **Data** | Public object bucket · Unencrypted database · Audit logging disabled · Public OpenSearch domain · Public DB/disk snapshot · Open Redis cache |
| **Identity** | Long-lived admin user · Privilege-escalation role · Over-privileged service account · Weak OIDC trust · Root account hygiene · Weak password policy |
| **Container** | Public registry · Privileged Kubernetes pod · Public Kubernetes API · Mounted SA token + broad RBAC · Container runs as root |
| **Serverless** | Public function URL · Secrets in environment · Over-broad resource policy |
| **Network** | Weak TLS on public LB · Dangling DNS record · CDN-bypassable origin · Public app without WAF |

Each component lists the providers it supports. Components ticked for AWS additionally emit a CloudFormation block when CloudFormation format is selected.

## Quickstart

```bash
# install
bun install        # or: npm install

# dev server
bun run dev        # serves on http://localhost:8080

# production build
bun run build      # outputs dist/client + dist/server for Cloudflare Workers

# preview the production build
bun run preview
```

## Usage

1. Open **`/build`**.
2. **Left panel** — pick components from the six categories. Each category has a `select all` toggle. The vulnerabilities each component introduces are listed below, tagged with CWE / CVSS / CIS / CVE.
3. **Right panel** — pick output format (Terraform or CloudFormation), cloud (AWS / Azure / GCP), and region.
   - CloudFormation is AWS-only and disables the Azure / GCP options.
   - Region IDs are provider-specific (AWS `us-east-1`, Azure `eastus`, GCP `us-central1`).
4. **Copy** or **download** the generated file. Apply it in your own isolated sub-account.

## Architecture

```
src/
  routes/
    __root.tsx     # TanStack root route (head, error boundary, 404)
    index.tsx      # Landing page
    build.tsx      # The actual product — catalog + IaC generator + UI
  lib/
    error-capture.ts  # Out-of-band SSR error capture (recovers stacks h3 swallows)
    error-page.ts     # Branded 500 HTML
    utils.ts          # cn() helper
  server.ts        # Cloudflare Workers entry — wraps TanStack server, normalizes h3 errors
  start.ts         # createStart middleware: per-request error→branded-500
  router.tsx       # createRouter
  styles.css       # Tailwind 4 + design tokens
```

The catalog, IaC generators (`TF_BODIES`, `CFN_BODIES`), shared block deduplication (`TF_SHARED`), and standards lookup (`VULN_REFS`) all live in [src/routes/build.tsx](src/routes/build.tsx). The page is intentionally a single file so the catalog, the Terraform templates, and the UI that displays them are easy to cross-reference.

### How the IaC generator works

1. `tf(provider, region, items)` — picks the per-provider header, deduplicates shared blocks (e.g. `data "aws_ami" "al2023"` is emitted once even if multiple components reference it), opts into extra Terraform providers when needed (`kubernetes` for K8s components, `archive` for Lambda packaging), then emits each component's body.
2. `cfn(region, items)` — emits a CloudFormation template with `Parameters` (`LatestAmazonLinuxAmi`, `SubnetIds`) only when components actually use them. Components without a CFN-native representation (K8s manifests, public snapshot sharing, IAM account password policy) emit an honest placeholder pointing at the Terraform output.

## Standards references

Each vulnerability is mapped to the relevant industry frameworks:

- **CWE** — Common Weakness Enumeration. Provided for every vulnerability.
- **CVSS** — CVSS v3.1 base score, aligned with the catalog's `critical`/`high`/`medium` severity bands.
- **CIS** — CIS Benchmark control (AWS Foundations, Azure Foundations, GCP Foundations, Kubernetes Benchmark, Docker Benchmark). Provided where a direct mapping exists.
- **CVE** — A representative software CVE (rendered as a destructive-colored chip). Provided only where the misconfiguration has a direct, well-known CVE equivalent — e.g. POODLE for TLS 1.0, runc "leaky vessels" for privileged pods, PwnKit for stale base images.

## Tech stack

- **TanStack Start 1.167** (file-based routing, SSR) + **TanStack Router 1.168**
- **React 19** + **Tailwind 4** + **shadcn/ui** primitives
- **Vite 7** via `@lovable.dev/vite-tanstack-config`
- **Cloudflare Workers** runtime (`wrangler.jsonc`, `nodejs_compat`)

## Safety / responsible use

This project is for authorized security research only. Use it to learn how to detect and remediate cloud misconfigurations — never to attack systems you don't own. The generated templates are valid IaC; the resources they describe are deliberately exploitable. Apply only in:

- A dedicated AWS sub-account / Azure subscription / GCP project
- That is **tagged** with `vulnerabuild=true` (or similar) for budget alerts and easy teardown
- Where you have written authorization to deploy intentionally-vulnerable resources
- Time-boxed (destroy when training/CTF ends)
