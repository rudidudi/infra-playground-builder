import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";

import appCss from "../styles.css?url";

const COOKIE_CONSENT_KEY = "vbuild-cookie-consent";

function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Runs client-side only. Show the banner unless a choice was already stored.
    try {
      if (!localStorage.getItem(COOKIE_CONSENT_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const choose = (value: "accepted" | "declined") => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, value);
    } catch {
      // storage blocked (private mode, etc.), just dismiss for this session
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4">
      <div className="mx-auto max-w-3xl rounded-lg border border-border bg-card/95 backdrop-blur shadow-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="text-xs text-muted-foreground leading-relaxed flex-1">
          We use essential local storage to keep the console working and to remember this choice.
          No tracking or third-party advertising cookies.
        </p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => choose("declined")}
            className="rounded-md border border-border bg-background/60 px-3 py-1.5 font-mono text-xs text-muted-foreground hover:text-foreground hover:bg-background transition"
          >
            decline
          </button>
          <button
            onClick={() => choose("accepted")}
            className="rounded-md bg-primary px-3.5 py-1.5 font-mono text-xs font-medium text-primary-foreground hover:opacity-90 transition"
          >
            accept
          </button>
        </div>
      </div>
    </div>
  );
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center font-mono">
        <p className="text-primary text-sm">[ERR_404]</p>
        <h1 className="mt-2 text-6xl font-bold text-foreground">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">resource_not_found</p>
        <Link to="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          ./return-home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Vulnerabuild: Provision vulnerable cloud infrastructure" },
      { name: "description", content: "Spin up intentionally vulnerable AWS, GCP, and Azure infrastructure for security training, red team exercises, and CTFs." },
      { property: "og:title", content: "Vulnerabuild: Provision vulnerable cloud infrastructure" },
      { property: "og:description", content: "Spin up intentionally vulnerable AWS, GCP, and Azure infrastructure for security training, red team exercises, and CTFs." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Vulnerabuild: Provision vulnerable cloud infrastructure" },
      { name: "twitter:description", content: "Spin up intentionally vulnerable AWS, GCP, and Azure infrastructure for security training, red team exercises, and CTFs." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/bbd2b1d6-655c-459e-82d8-1197f11dbbbb/id-preview-220cf6c6--c5733d47-f274-4ebc-8c41-ccac1ca21148.lovable.app-1778746746710.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/bbd2b1d6-655c-459e-82d8-1197f11dbbbb/id-preview-220cf6c6--c5733d47-f274-4ebc-8c41-ccac1ca21148.lovable.app-1778746746710.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <CookieConsent />
    </QueryClientProvider>
  );
}
