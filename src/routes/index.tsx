import { createFileRoute } from "@tanstack/react-router";
import {
  Shield, Zap, ChevronRight, Lock, Database, Server, Cloud,
  AlertTriangle, Activity, GitBranch, Box, ArrowUpRight, Cpu,
  Layers, Rocket, MousePointerClick,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-40 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" />

      <Nav />

      <main className="relative">
        <Hero />
        <ProvidersSection />
        <ScenariosSection />
        <DeploySection />
        <CTA />
      </main>

      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="relative z-10 border-b border-border/60 backdrop-blur">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative h-8 w-8 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Shield className="h-4 w-4 text-primary" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary pulse-ring" />
          </div>
          <span className="font-mono font-semibold tracking-tight">vulnerabuild<span className="text-primary">_</span></span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground font-mono">
          <a href="#providers" className="hover:text-foreground transition-colors">providers</a>
          <a href="#scenarios" className="hover:text-foreground transition-colors">scenarios</a>
          <a href="#deploy" className="hover:text-foreground transition-colors">deploy</a>
          <a href="#" className="hover:text-foreground transition-colors">docs</a>
        </nav>
        <div className="flex items-center gap-3">
          <button className="hidden sm:inline-flex text-sm font-mono text-muted-foreground hover:text-foreground">sign in</button>
          <button className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition">
            launch console <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative pt-20 pb-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs font-mono text-muted-foreground mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-primary blink" />
              v0.4.2 — multi-cloud orchestrator online
            </div>
            <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight leading-[1.02]">
              Provision <span className="text-primary text-glow">vulnerable</span><br />
              infrastructure<br />
              <span className="text-muted-foreground">on demand.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
              A few clicks spin up purposely-misconfigured environments across AWS, GCP, and Azure.
              Train red teams, run CTFs, validate detections — without manually building target infra.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition glow-primary">
                <Rocket className="h-4 w-4" /> start building
              </button>
              <button className="inline-flex items-center gap-2 rounded-md border border-border bg-card/50 px-5 py-3 text-sm font-medium hover:bg-card transition">
                <GitBranch className="h-4 w-4" /> view scenarios
              </button>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
              <Stat label="scenarios" value="42" />
              <Stat label="cloud apis" value="3" />
              <Stat label="deploy time" value="< 90s" />
            </div>
          </div>

          <div className="lg:col-span-5">
            <DeployPreviewCard />
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l-2 border-primary/40 pl-3">
      <div className="font-mono text-2xl font-semibold">{value}</div>
      <div className="font-mono text-xs text-muted-foreground uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}

function DeployPreviewCard() {
  return (
    <div className="relative scanline rounded-xl border border-border bg-card/80 backdrop-blur shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/40">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-success pulse-ring" />
          <span className="font-mono text-xs text-muted-foreground">env / x9k2 — provisioning</span>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">live</span>
      </div>

      <div className="p-5 space-y-3">
        <DeployRow provider="aws" color="var(--color-aws)" name="s3-public-buckets" tag="CWE-732" status="done" />
        <DeployRow provider="gcp" color="var(--color-gcp)" name="over-privileged-sa" tag="IAM-014" status="active" />
        <DeployRow provider="az"  color="var(--color-azure)" name="exposed-rdp-ssh" tag="NET-007" status="queued" />

        <div className="pt-3 mt-3 border-t border-border flex items-center justify-between">
          <div className="font-mono text-[11px] text-muted-foreground">
            chained attack path · 3 resources
          </div>
          <button className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline">
            open console <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function DeployRow({ provider, color, name, tag, status }: { provider: string; color: string; name: string; tag: string; status: "done" | "active" | "queued" }) {
  const statusStyle = {
    done:   { dot: "bg-success", text: "deployed",     cls: "text-success" },
    active: { dot: "bg-primary blink", text: "deploying…", cls: "text-primary" },
    queued: { dot: "bg-muted-foreground/50", text: "queued", cls: "text-muted-foreground" },
  }[status];

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background/40 px-3 py-2.5">
      <div className="flex items-center gap-3 min-w-0">
        <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded" style={{ background: `color-mix(in oklab, ${color} 15%, transparent)`, color }}>{provider}</span>
        <span className="font-mono text-sm truncate">{name}</span>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="font-mono text-[10px] text-muted-foreground hidden sm:inline">{tag}</span>
        <span className={`flex items-center gap-1.5 font-mono text-[11px] ${statusStyle.cls}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
          {statusStyle.text}
        </span>
      </div>
    </div>
  );
}

function ProvidersSection() {
  const providers = [
    { name: "AWS", code: "aws", color: "var(--color-aws)", services: ["S3", "IAM", "EC2", "Lambda", "RDS"], scenarios: 18 },
    { name: "GCP", code: "gcp", color: "var(--color-gcp)", services: ["GCS", "IAM", "GCE", "Cloud Run", "BigQuery"], scenarios: 12 },
    { name: "Azure", code: "az", color: "var(--color-azure)", services: ["Blob", "AAD", "VM", "Functions", "SQL"], scenarios: 12 },
  ];
  return (
    <section id="providers" className="relative py-24 border-t border-border/60">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader eyebrow="01 — providers" title="Three clouds. One interface." subtitle="Native primitives for each provider, orchestrated through a single declarative spec." />
        <div className="mt-12 grid md:grid-cols-3 gap-4">
          {providers.map((p) => (
            <div key={p.code} className="group relative rounded-xl border border-border bg-card/60 p-6 hover:bg-card transition">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: `color-mix(in oklab, ${p.color} 20%, transparent)`, border: `1px solid color-mix(in oklab, ${p.color} 40%, transparent)` }}>
                    <Cloud className="h-5 w-5" style={{ color: p.color }} />
                  </div>
                  <div>
                    <div className="font-display font-semibold text-lg">{p.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">provider/{p.code}</div>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition" />
              </div>
              <div className="mt-6 flex flex-wrap gap-1.5">
                {p.services.map((s) => (
                  <span key={s} className="font-mono text-[11px] px-2 py-0.5 rounded border border-border bg-background/50 text-muted-foreground">{s}</span>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-border flex items-center justify-between font-mono text-xs">
                <span className="text-muted-foreground">scenarios</span>
                <span className="text-foreground font-semibold">{p.scenarios}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ScenariosSection() {
  const scenarios = [
    { icon: Database, name: "Public S3 buckets", id: "S3-001", severity: "critical", provider: "aws", desc: "Object-level ACLs allowing anonymous read/write." },
    { icon: Lock, name: "Over-privileged service account", id: "IAM-014", severity: "high", provider: "gcp", desc: "SA with project-wide owner role attached to a Compute VM." },
    { icon: Server, name: "Exposed RDP / SSH", id: "NET-007", severity: "high", provider: "az", desc: "NSG with 0.0.0.0/0 ingress on port 22 and 3389." },
    { icon: Cpu, name: "SSRF-prone metadata endpoint", id: "EC2-022", severity: "critical", provider: "aws", desc: "IMDSv1 enabled, role with broad permissions." },
    { icon: Box, name: "Unencrypted blob storage", id: "BLB-003", severity: "medium", provider: "az", desc: "Containers without CMK or server-side encryption." },
    { icon: Activity, name: "Disabled audit logging", id: "LOG-009", severity: "medium", provider: "gcp", desc: "Cloud Audit Logs turned off across data services." },
  ];
  return (
    <section id="scenarios" className="relative py-24 border-t border-border/60">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <SectionHeader eyebrow="02 — scenarios" title="Curated misconfigurations." subtitle="Mapped to MITRE ATT&CK and CWE. Versioned, reproducible, isolated." className="max-w-xl" />
          <button className="font-mono text-sm text-primary hover:underline inline-flex items-center gap-1">browse all 42 <ChevronRight className="h-4 w-4" /></button>
        </div>

        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {scenarios.map((s) => <ScenarioCard key={s.id} {...s} />)}
        </div>
      </div>
    </section>
  );
}

function ScenarioCard({ icon: Icon, name, id, severity, provider, desc }: any) {
  const sev = {
    critical: "text-destructive border-destructive/40 bg-destructive/10",
    high: "text-accent border-accent/40 bg-accent/10",
    medium: "text-warning border-warning/40 bg-warning/10",
  }[severity as string];
  const provColor = { aws: "var(--color-aws)", gcp: "var(--color-gcp)", az: "var(--color-azure)" }[provider as string];
  return (
    <div className="group relative rounded-lg border border-border bg-card/60 p-5 hover:border-primary/40 hover:bg-card transition cursor-pointer">
      <div className="flex items-start justify-between gap-3">
        <div className="h-9 w-9 rounded-md bg-background border border-border flex items-center justify-center">
          <Icon className="h-4 w-4 text-foreground" />
        </div>
        <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${sev}`}>{severity}</span>
      </div>
      <div className="mt-4 font-mono text-[11px] text-muted-foreground flex items-center gap-2">
        <span className="px-1.5 py-0.5 rounded" style={{ background: `color-mix(in oklab, ${provColor} 15%, transparent)`, color: provColor }}>{provider}</span>
        <span>{id}</span>
      </div>
      <h3 className="mt-2 font-display font-semibold">{name}</h3>
      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{desc}</p>
      <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between font-mono text-xs text-muted-foreground">
        <span>deploy scenario</span>
        <ChevronRight className="h-3.5 w-3.5 group-hover:text-primary group-hover:translate-x-0.5 transition" />
      </div>
    </div>
  );
}

function DeploySection() {
  const steps = [
    { n: "01", title: "Connect cloud accounts", desc: "OIDC federation with read-only role for inventory + scoped role for deploy.", icon: Cloud },
    { n: "02", title: "Compose environment", desc: "Pick scenarios, chain attack paths, set lifetime and blast radius.", icon: Layers },
    { n: "03", title: "Deploy & monitor", desc: "Live console, network map, and an auto-teardown timer that you control.", icon: Activity },
  ];
  return (
    <section id="deploy" className="relative py-24 border-t border-border/60">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader eyebrow="03 — workflow" title="From zero to vulnerable in 90 seconds." />
        <div className="mt-12 grid md:grid-cols-3 gap-px bg-border rounded-xl overflow-hidden border border-border">
          {steps.map((s) => (
            <div key={s.n} className="bg-card p-8 relative">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground">{s.n}</span>
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-6 font-display text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-warning/30 bg-warning/5 p-5 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-semibold text-warning">isolation guarantee.</span>{" "}
            <span className="text-muted-foreground">Every environment runs in a dedicated sub-account/project, tagged, time-boxed, and torn down on expiry. Never deploy on top of production.</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="relative py-32 border-t border-border/60">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <Zap className="h-10 w-10 text-primary mx-auto" />
        <h2 className="mt-6 font-display text-4xl md:text-6xl font-bold tracking-tight">
          Stop building targets.<br />
          <span className="text-primary text-glow">Start breaking them.</span>
        </h2>
        <p className="mt-5 text-muted-foreground max-w-xl mx-auto">
          Free tier includes 5 environments per month across all providers. No credit card.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 glow-primary">
            <MousePointerClick className="h-4 w-4" /> get started — free
          </button>
          <button className="inline-flex items-center gap-2 rounded-md border border-border bg-card/50 px-6 py-3 text-sm font-medium hover:bg-card">
            book a demo
          </button>
        </div>
      </div>
    </section>
  );
}

function SectionHeader({ eyebrow, title, subtitle, className = "" }: { eyebrow: string; title: string; subtitle?: string; className?: string }) {
  return (
    <div className={className}>
      <div className="font-mono text-xs text-primary uppercase tracking-widest">{eyebrow}</div>
      <h2 className="mt-3 font-display text-3xl md:text-5xl font-bold tracking-tight">{title}</h2>
      {subtitle && <p className="mt-3 text-muted-foreground max-w-2xl">{subtitle}</p>}
    </div>
  );
}

function Footer() {
  return (
    <footer className="relative border-t border-border/60 mt-12">
      <div className="mx-auto max-w-7xl px-6 py-10 flex flex-wrap items-center justify-between gap-4 font-mono text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-primary" />
          <span>vulnerabuild © 2026 — for authorized security research only</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-foreground">terms</a>
          <a href="#" className="hover:text-foreground">aup</a>
          <a href="#" className="hover:text-foreground">github</a>
          <a href="#" className="hover:text-foreground">status</a>
        </div>
      </div>
    </footer>
  );
}
