"use client";

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { BlogEditor } from "@/components/admin/BlogEditor";
import { ImageUpload } from "@/components/admin/ImageUpload";
import type { PageSection } from "@/types/pages";

export interface BroadcastingItem {
  id: string;
  type: "linear" | "ott";
  name: string;
  logo: string;
}

interface Props {
  section: PageSection;
  onChange: (updated: PageSection) => void;
  defaultData: Record<string, any>;
}

function newItem(type: "linear" | "ott"): BroadcastingItem {
  return {
    id: `bc-${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    name: "",
    logo: "",
  };
}

export default function BroadcastingEditor({ section, onChange, defaultData }: Props) {
  const merged = { ...defaultData, ...(section.data || {}) };
  const items: BroadcastingItem[] = Array.isArray(merged.items) ? merged.items : [];

  const update = (field: string, value: any) =>
    onChange({ ...section, data: { ...(section.data || {}), [field]: value } });

  const setItems = (next: BroadcastingItem[]) => update("items", next);
  const updateItem = (idx: number, patch: Partial<BroadcastingItem>) =>
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const addItem = (type: "linear" | "ott") => setItems([...items, newItem(type)]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const linear = items.filter((it) => it.type === "linear");
  const ott = items.filter((it) => it.type === "ott");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Active
        </Label>
        <Switch
          checked={section.active}
          onCheckedChange={(v) => onChange({ ...section, active: v })}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Title</Label>
        <Input value={merged.title || ""} onChange={(e) => update("title", e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label>Subtitle</Label>
        <Input
          value={merged.subtitle || ""}
          onChange={(e) => update("subtitle", e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Description (Rich Text)</Label>
        <BlogEditor
          content={merged.description || ""}
          onChange={(html) => update("description", html)}
          minHeight="200px"
        />
      </div>

      {(["linear", "ott"] as const).map((kind) => {
        const list = kind === "linear" ? linear : ott;
        return (
          <div key={kind} className="border rounded-lg p-4 space-y-3 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider">
                {kind === "linear" ? "Linear TV Partners" : "OTT Partners"} ({list.length})
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addItem(kind)}
                className="h-8 text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add {kind === "linear" ? "TV" : "OTT"}
              </Button>
            </div>

            {list.length === 0 && (
              <div className="rounded-md border border-dashed border-slate-300 dark:border-slate-700 px-3 py-4 text-center text-xs text-slate-500">
                No {kind === "linear" ? "TV" : "OTT"} partners yet.
              </div>
            )}

            {list.map((it) => {
              const idx = items.indexOf(it);
              return (
                <div
                  key={it.id || idx}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-2 bg-white dark:bg-slate-900/40"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {it.name || `New ${kind === "linear" ? "TV" : "OTT"} Partner`}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(idx)}
                      className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={it.name || ""}
                      onChange={(e) => updateItem(idx, { name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Logo</Label>
                    <ImageUpload
                      value={it.logo || ""}
                      onChange={(url) => updateItem(idx, { logo: url })}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}