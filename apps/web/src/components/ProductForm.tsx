import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { api } from "../lib/api";
import { useAppStore } from "../lib/store";
import { Button, Input, Panel, Textarea } from "./ui";

export const ProductForm = () => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("GlowLift Travel Serum");
  const [category, setCategory] = useState("Beauty / Skincare");
  const [sellingPoints, setSellingPoints] = useState(
    "fast absorption\ntravel-friendly\nvisible glow"
  );
  const [audience, setAudience] = useState("busy skincare shoppers");
  const [scenario, setScenario] = useState("morning routine before work");
  const create = useMutation({
    mutationFn: () =>
      api.createProduct({
        title,
        category,
        sellingPoints: sellingPoints
          .split("\n")
          .map((point) => point.trim())
          .filter(Boolean),
        audience,
        scenario,
        language: "en-US"
      }),
    onSuccess: async (product) => {
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      useAppStore.getState().setSelectedProductId(product.id);
    }
  });

  return (
    <Panel title="Product Brief">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold">
          Title
          <Input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Category
          <Input value={category} onChange={(event) => setCategory(event.target.value)} />
        </label>
        <label className="grid gap-2 text-sm font-semibold md:col-span-2">
          Selling points
          <Textarea
            value={sellingPoints}
            onChange={(event) => setSellingPoints(event.target.value)}
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Audience
          <Input value={audience} onChange={(event) => setAudience(event.target.value)} />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Scenario
          <Input value={scenario} onChange={(event) => setScenario(event.target.value)} />
        </label>
        <div className="md:col-span-2">
          <Button disabled={create.isPending} onClick={() => create.mutate()}>
            <Plus className="h-4 w-4" />
            {create.isPending ? "Creating..." : "Create product"}
          </Button>
        </div>
      </div>
    </Panel>
  );
};
