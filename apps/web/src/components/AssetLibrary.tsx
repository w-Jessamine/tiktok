import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ImageUp, Search, UploadCloud } from "lucide-react";
import { useMemo, useState } from "react";
import { api, type ProductDto } from "../lib/api";
import { useAppStore } from "../lib/store";
import { Button, Input, Panel, Select, StatusPill, Textarea } from "./ui";

export const AssetLibrary = ({ products }: { products: ProductDto[] }) => {
  const queryClient = useQueryClient();
  const selectedProductId = useAppStore((state) => state.selectedProductId);
  const setSelectedProductId = useAppStore((state) => state.setSelectedProductId);
  const [query, setQuery] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sourceStatement, setSourceStatement] = useState(
    "Merchant-owned or licensed ecommerce product material."
  );
  const [assetType, setAssetType] = useState("PRODUCT_IMAGE");
  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId),
    [products, selectedProductId]
  );

  const assetsQuery = useQuery({
    queryKey: ["assets", query, selectedProductId],
    queryFn: () => api.searchAssets({ q: query, productId: selectedProductId })
  });

  const upload = useMutation({
    mutationFn: () => {
      if (!file) {
        throw new Error("Choose a file first");
      }
      return api.uploadAsset({
        file,
        productId: selectedProductId,
        type: assetType as "PRODUCT_IMAGE",
        sourceStatement
      });
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["assets"] });
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      useAppStore.getState().setActiveJobId(result.job.id);
      useAppStore.getState().setView("jobs");
    }
  });

  const review = useMutation({
    mutationFn: (assetId: string) =>
      api.reviewCompliance({ objectType: "ASSET", objectId: assetId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assets"] })
  });

  const approve = useMutation({
    mutationFn: async (assetId: string) => {
      const result = await api.reviewCompliance({ objectType: "ASSET", objectId: assetId });
      return api.decideCompliance(result.id, {
        status: "APPROVED",
        reviewerNote: "Merchant confirmed rights and product authenticity."
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assets"] })
  });

  return (
    <div className="grid gap-5 xl:grid-cols-[0.95fr_1.35fr]">
      <Panel title="Product Material Intake" action={<ImageUp className="h-5 w-5 text-mint" />}>
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-semibold">
            Product
            <Select
              value={selectedProductId ?? ""}
              onChange={(event) => setSelectedProductId(event.target.value || undefined)}
            >
              <option value="">Unassigned material</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.title}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Asset type
            <Select value={assetType} onChange={(event) => setAssetType(event.target.value)}>
              <option value="PRODUCT_IMAGE">Product image</option>
              <option value="PRODUCT_VIDEO">Product video</option>
              <option value="REFERENCE_IMAGE">Reference image</option>
              <option value="REFERENCE_VIDEO">Reference video</option>
            </Select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            File
            <Input
              type="file"
              accept="image/*,video/*"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Source statement
            <Textarea
              value={sourceStatement}
              onChange={(event) => setSourceStatement(event.target.value)}
            />
          </label>
          <Button disabled={!file || upload.isPending} onClick={() => upload.mutate()}>
            <UploadCloud className="h-4 w-4" />
            {upload.isPending ? "Uploading..." : "Upload & Analyze"}
          </Button>
          {selectedProduct && (
            <div className="rounded-md bg-mist p-3 text-sm text-ink/75">
              Active product: <strong>{selectedProduct.title}</strong> · {selectedProduct.category}
            </div>
          )}
        </div>
      </Panel>

      <Panel
        title="Structured Asset Search"
        action={
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink/40" />
            <Input
              className="pl-9"
              placeholder="keyword, tag, slice..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        }
      >
        <div className="grid gap-3">
          {assetsQuery.data?.map((asset) => (
            <article key={asset.id} className="grid gap-3 rounded-md border border-ink/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{asset.filename}</h3>
                  <p className="text-sm text-ink/60">
                    {asset.videoSummary ?? "Waiting for multimodal analysis."}
                  </p>
                </div>
                <StatusPill
                  tone={
                    asset.complianceStatus === "APPROVED"
                      ? "good"
                      : asset.complianceStatus === "REJECTED"
                        ? "bad"
                        : "warn"
                  }
                >
                  {asset.complianceStatus}
                </StatusPill>
              </div>
              <div className="flex flex-wrap gap-2">
                {asset.productTags.map((tag) => (
                  <StatusPill key={tag}>{tag}</StatusPill>
                ))}
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {asset.slices?.map((slice) => (
                  <div key={slice.id} className="rounded-md bg-mist p-3 text-sm">
                    {slice.thumbnailUrl && (
                      <img
                        src={slice.thumbnailUrl}
                        alt=""
                        className="mb-2 aspect-video w-full rounded object-cover"
                      />
                    )}
                    <strong>{Math.round((slice.endMs - slice.startMs) / 1000)}s slice</strong>
                    <p className="mt-1 text-ink/65">{slice.summary}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  disabled={review.isPending}
                  onClick={() => review.mutate(asset.id)}
                >
                  Review compliance
                </Button>
                {asset.complianceStatus !== "APPROVED" && (
                  <Button
                    variant="ghost"
                    disabled={approve.isPending}
                    onClick={() => approve.mutate(asset.id)}
                  >
                    <Check className="h-4 w-4" />
                    Manual approve
                  </Button>
                )}
              </div>
            </article>
          ))}
          {!assetsQuery.data?.length && (
            <div className="rounded-md border border-dashed border-ink/20 p-8 text-center text-sm text-ink/60">
              Upload product material to build the structured asset library.
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
};
