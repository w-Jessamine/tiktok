import { useQuery } from "@tanstack/react-query";
import { Activity, Boxes, Clapperboard, Film, LineChart, PackagePlus } from "lucide-react";
import type { ComponentType } from "react";
import { api } from "./lib/api";
import { useAppStore, type WorkspaceView } from "./lib/store";
import { AnalyticsDashboard } from "./components/AnalyticsDashboard";
import { AssetLibrary } from "./components/AssetLibrary";
import { CreationStudio } from "./components/CreationStudio";
import { JobCenter } from "./components/JobCenter";
import { ProductForm } from "./components/ProductForm";
import { ScriptStudio } from "./components/ScriptStudio";

const navItems: Array<{
  id: WorkspaceView;
  label: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { id: "assets", label: "Assets", icon: Boxes },
  { id: "scripts", label: "Scripts", icon: Clapperboard },
  { id: "create", label: "Create", icon: Film },
  { id: "jobs", label: "Jobs", icon: Activity },
  { id: "analytics", label: "Analytics", icon: LineChart }
];

export const App = () => {
  const view = useAppStore((state) => state.view);
  const setView = useAppStore((state) => state.setView);
  const productsQuery = useQuery({ queryKey: ["products"], queryFn: api.products });
  const products = productsQuery.data ?? [];

  return (
    <main className="min-h-screen bg-mist">
      <header className="border-b border-ink/10 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 lg:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-md bg-ink text-white">
              <PackagePlus className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-black">TikTok Shop VideoPilot</h1>
              <p className="text-sm text-ink/60">
                AIGC workflow with labeled Ark/material/fallback exports
              </p>
            </div>
          </div>
          <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
                    view === item.id ? "bg-ink text-white" : "bg-mist text-ink hover:bg-ink/10"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 lg:px-6">
        <section className="grid gap-4 rounded-lg border border-ink/10 bg-white p-5 shadow-panel lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm font-semibold uppercase text-mint">End-to-end merchant demo</p>
            <h2 className="mt-2 text-2xl font-black text-ink">
              Material to script to source-labeled export
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65">
              Build product asset memory, generate conversion scripts, edit storyboard shots, render
              previews, and inspect provider/fallback trace from one operational surface. Every MP4
              states whether it came from Ark, merchant material, or local fallback rendering.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-md bg-mist p-3">
              <strong className="text-xl">{products.length}</strong>
              <p className="text-xs text-ink/55">Products</p>
            </div>
            <div className="rounded-md bg-mist p-3">
              <strong className="text-xl">
                {products.reduce((sum, p) => sum + (p.assets?.length ?? 0), 0)}
              </strong>
              <p className="text-xs text-ink/55">Assets</p>
            </div>
            <div className="rounded-md bg-mist p-3">
              <strong className="text-xl">
                {products.reduce((sum, p) => sum + (p.scripts?.length ?? 0), 0)}
              </strong>
              <p className="text-xs text-ink/55">Scripts</p>
            </div>
          </div>
        </section>

        {view === "assets" && (
          <>
            <ProductForm />
            <AssetLibrary products={products} />
          </>
        )}
        {view === "scripts" && <ScriptStudio products={products} />}
        {view === "create" && <CreationStudio products={products} />}
        {view === "jobs" && <JobCenter />}
        {view === "analytics" && <AnalyticsDashboard />}
      </div>
    </main>
  );
};
