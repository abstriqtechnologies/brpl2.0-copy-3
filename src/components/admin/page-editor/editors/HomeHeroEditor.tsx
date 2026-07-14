"use client";

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MediaUpload } from "@/components/admin/MediaUpload";
import type { PageSection } from "@/types/pages";

export interface HomeHeroBanner {
  background: string;
  videoUrl?: string;
}

interface Props {
  section: PageSection;
  onChange: (updated: PageSection) => void;
  defaultData: Record<string, any>;
}

export default function HomeHeroEditor({ section, onChange, defaultData }: Props) {
  const merged = { ...defaultData, ...(section.data || {}) };
  const items: HomeHeroBanner[] = Array.isArray(merged.items) ? merged.items : [];

  const setItems = (next: HomeHeroBanner[]) =>
    onChange({ ...section, data: { ...(section.data || {}), items: next } });

  const updateItem = (idx: number, patch: Partial<HomeHeroBanner>) => {
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const addItem = () =>
    setItems([...items, { background: "", videoUrl: "" }]);

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const update = (field: string, value: any) =>
    onChange({ ...section, data: { ...(section.data || {}), [field]: value } });

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
        <Label>CTA Text (button label)</Label>
        <Input
          value={merged.ctaText || ""}
          onChange={(e) => update("ctaText", e.target.value)}
          placeholder="REGISTER NOW"
        />
      </div>

      <div className="space-y-1.5">
        <Label>CTA Link</Label>
        <Input
          value={merged.ctaLink || ""}
          onChange={(e) => update("ctaLink", e.target.value)}
          placeholder="/login"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Banner Slides ({items.length})
          </Label>
          <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-8 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Slide
          </Button>
        </div>

        {items.length === 0 && (
          <div className="rounded-md border border-dashed border-slate-300 dark:border-slate-700 px-3 py-6 text-center text-sm text-slate-500">
            No slides yet. Default banner will show. Click &quot;Add Slide&quot; to override.
          </div>
        )}

        {items.map((slide, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/30"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Slide #{idx + 1}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeItem(idx)}
                className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Remove
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label>Background Image / Video</Label>
              <MediaUpload
                value={slide.background || ""}
                onChange={(url) => updateItem(idx, { background: url })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Video URL (optional, plays in modal)</Label>
              <Input
                value={slide.videoUrl || ""}
                onChange={(e) => updateItem(idx, { videoUrl: e.target.value })}
                placeholder="https://… or /uploads/…"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
