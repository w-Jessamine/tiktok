import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GripVertical, RefreshCcw, WandSparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { api, type ProductDto, type ScriptDto } from "../lib/api";
import { useAppStore } from "../lib/store";
import { Button, Input, Panel, Select, StatusPill, Textarea } from "./ui";

const SortableShot = ({
  shot,
  onChange,
  onRegenerate
}: {
  shot: ScriptDto["shots"][number];
  onChange: (shot: ScriptDto["shots"][number]) => void;
  onRegenerate: () => void;
}) => {
  const sortable = useSortable({ id: shot.id });
  return (
    <div
      ref={sortable.setNodeRef}
      style={{ transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition }}
      className="grid gap-3 rounded-md border border-ink/10 bg-white p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button {...sortable.attributes} {...sortable.listeners} className="rounded p-1 hover:bg-mist" title="Drag shot">
            <GripVertical className="h-4 w-4" />
          </button>
          <strong>Shot {shot.order + 1}</strong>
          <StatusPill>{(shot.durationMs / 1000).toFixed(1)}s</StatusPill>
        </div>
        <Button variant="ghost" onClick={onRegenerate}>
          <RefreshCcw className="h-4 w-4" />
          Regenerate
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
        <Textarea value={shot.visualPrompt} onChange={(event) => onChange({ ...shot, visualPrompt: event.target.value })} />
        <div className="grid gap-2">
          <Input value={shot.subtitle} onChange={(event) => onChange({ ...shot, subtitle: event.target.value })} />
          <Input value={shot.materialQuery} onChange={(event) => onChange({ ...shot, materialQuery: event.target.value })} />
          <Input
            type="number"
            value={shot.durationMs}
            min={1200}
            max={5000}
            onChange={(event) => onChange({ ...shot, durationMs: Number(event.target.value) })}
          />
        </div>
      </div>
    </div>
  );
};

export const ScriptStudio = ({ products }: { products: ProductDto[] }) => {
  const queryClient = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor));
  const selectedProductId = useAppStore((state) => state.selectedProductId);
  const selectedScriptId = useAppStore((state) => state.selectedScriptId);
  const setSelectedProductId = useAppStore((state) => state.setSelectedProductId);
  const setSelectedScriptId = useAppStore((state) => state.setSelectedScriptId);
  const [prompt, setPrompt] = useState("Make the tone premium, trustworthy and conversion-oriented.");
  const scriptsQuery = useQuery({
    queryKey: ["scripts", selectedProductId],
    queryFn: () => api.scripts(selectedProductId),
    enabled: Boolean(selectedProductId)
  });
  const scripts = scriptsQuery.data ?? [];
  const activeScript = useMemo(
    () => scripts.find((script) => script.id === selectedScriptId) ?? scripts[0],
    [scripts, selectedScriptId]
  );
  const [draftShots, setDraftShots] = useState<ScriptDto["shots"] | null>(null);
  const shots = draftShots ?? activeScript?.shots ?? [];

  const generate = useMutation({
    mutationFn: () =>
      api.generateScripts({
        productId: selectedProductId!,
        prompt,
        count: 3,
        mode: "auto"
      }),
    onSuccess: async (newScripts) => {
      await queryClient.invalidateQueries({ queryKey: ["scripts"] });
      setSelectedScriptId(newScripts[0]?.id);
      setDraftShots(null);
    }
  });

  const patch = useMutation({
    mutationFn: () =>
      api.patchScript(activeScript!.id, {
        prompt,
        shots: shots.map((shot, order) => ({ ...shot, order }))
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["scripts"] });
      setDraftShots(null);
    }
  });

  const regenerate = useMutation({
    mutationFn: (shotId: string) =>
      api.regenerateShot(activeScript!.id, shotId, { prompt: "Refresh this shot with stronger product proof." }),
    onSuccess: (job) => {
      useAppStore.getState().setActiveJobId(job.id);
      useAppStore.getState().setView("jobs");
    }
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const oldIndex = shots.findIndex((shot) => shot.id === active.id);
    const newIndex = shots.findIndex((shot) => shot.id === over.id);
    setDraftShots(arrayMove(shots, oldIndex, newIndex).map((shot, order) => ({ ...shot, order })));
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.4fr]">
      <Panel title="Script Generation" action={<WandSparkles className="h-5 w-5 text-plum" />}>
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-semibold">
            Product
            <Select value={selectedProductId ?? ""} onChange={(event) => setSelectedProductId(event.target.value || undefined)}>
              <option value="">Choose product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.title}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Prompt adjustment
            <Textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} />
          </label>
          <Button disabled={!selectedProductId || generate.isPending} onClick={() => generate.mutate()}>
            <WandSparkles className="h-4 w-4" />
            {generate.isPending ? "Generating..." : "Generate 3 scripts"}
          </Button>
          <div className="grid gap-2">
            {scripts.map((script) => (
              <button
                key={script.id}
                onClick={() => {
                  setSelectedScriptId(script.id);
                  setDraftShots(null);
                }}
                className={`rounded-md border p-3 text-left transition ${
                  activeScript?.id === script.id ? "border-mint bg-mint/5" : "border-ink/10 bg-white hover:border-mint/50"
                }`}
              >
                <strong>{script.title}</strong>
                <p className="mt-1 text-sm text-ink/60">{script.visualStyle}</p>
              </button>
            ))}
          </div>
        </div>
      </Panel>

      <Panel
        title="Storyboard Editor"
        action={
          <Button variant="secondary" disabled={!activeScript || patch.isPending} onClick={() => patch.mutate()}>
            Save script
          </Button>
        }
      >
        {activeScript ? (
          <div className="grid gap-4">
            <div className="rounded-md bg-mist p-4">
              <h3 className="font-bold">{activeScript.title}</h3>
              <p className="mt-1 text-sm text-ink/65">{activeScript.narrative}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {activeScript.constraints.map((constraint) => (
                  <StatusPill key={constraint}>{constraint}</StatusPill>
                ))}
              </div>
            </div>
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <SortableContext items={shots.map((shot) => shot.id)} strategy={verticalListSortingStrategy}>
                <div className="grid gap-3">
                  {shots.map((shot, index) => (
                    <SortableShot
                      key={shot.id}
                      shot={{ ...shot, order: index }}
                      onChange={(updated) =>
                        setDraftShots(shots.map((candidate) => (candidate.id === updated.id ? updated : candidate)))
                      }
                      onRegenerate={() => regenerate.mutate(shot.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-ink/20 p-8 text-center text-sm text-ink/60">
            Choose a product and generate scripts to edit shot-level details.
          </div>
        )}
      </Panel>
    </div>
  );
};
