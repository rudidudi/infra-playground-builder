import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, ChevronLeft, Target, ArrowRight, BookOpen } from "lucide-react";
import { ATTACK_PATHS, type AttackPath } from "./build";

export const Route = createFileRoute("/attack-paths")({
  head: () => ({
    meta: [
      { title: "Attack paths — Vulnerabuild" },
      { name: "description", content: "Curated multi-step attack scenarios that chain catalog vulnerabilities into a single objective." },
    ],
  }),
  component: AttackPathsPage,
});

const difficultyClass: Record<AttackPath["difficulty"], string> = {
  easy: "text-success border-success/40 bg-success/10",
  medium: "text-warning border-warning/40 bg-warning/10",
  hard: "text-destructive border-destructive/40 bg-destructive/10",
};

function AttackPathsPage() {
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
              <span className="font-mono text-sm font-semibold">vulnerabuild<span className="text-primary">_</span> / attack-paths</span>
            </div>
          </div>
          <Link to="/build" className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground">
            blank build <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-6 py-10">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 font-mono text-xs text-primary uppercase tracking-widest">
            <BookOpen className="h-3.5 w-3.5" /> 01 — attack paths
          </div>
          <h1 className="mt-3 font-display text-3xl md:text-5xl font-bold tracking-tight">
            Curated misconfig chains.
          </h1>
          <p className="mt-3 text-muted-foreground">
            Each path bundles two or more catalog scenarios into a single attacker storyline — starting position, objective, and the
            exact steps that exploit each misconfiguration. Open one in the builder to pre-select the components and embed the playbook
            in the generated IaC.
          </p>
        </div>

        <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ATTACK_PATHS.map((p) => (
            <PathCard key={p.id} path={p} />
          ))}
        </div>
      </main>
    </div>
  );
}

function PathCard({ path }: { path: AttackPath }) {
  return (
    <Link
      to="/build"
      search={{ path: path.id }}
      className="group relative rounded-xl border border-border bg-card/60 p-5 hover:border-primary/40 hover:bg-card transition flex flex-col"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="h-9 w-9 rounded-md bg-background border border-border flex items-center justify-center flex-shrink-0">
          <Target className="h-4 w-4 text-primary" />
        </div>
        <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${difficultyClass[path.difficulty]}`}>
          {path.difficulty}
        </span>
      </div>
      <h3 className="mt-4 font-display font-semibold">{path.name}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed flex-1">{path.objective}</p>
      <div className="mt-4 flex flex-wrap gap-1 font-mono text-[10px] text-muted-foreground">
        <span className="px-1.5 py-0.5 rounded border border-border bg-background/40">cloud: {path.cloud}</span>
        <span className="px-1.5 py-0.5 rounded border border-border bg-background/40">~ {path.estTime}</span>
        <span className="px-1.5 py-0.5 rounded border border-border bg-background/40">{path.steps.length} steps</span>
        <span className="px-1.5 py-0.5 rounded border border-border bg-background/40">{path.components.length} components</span>
      </div>
      <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between font-mono text-xs text-muted-foreground">
        <span>open in builder</span>
        <ArrowRight className="h-3.5 w-3.5 group-hover:text-primary group-hover:translate-x-0.5 transition" />
      </div>
    </Link>
  );
}
