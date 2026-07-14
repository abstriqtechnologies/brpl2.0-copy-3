"use client";

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { BlogEditor } from "@/components/admin/BlogEditor";
import { MediaUpload } from "@/components/admin/MediaUpload";
import type { PageSection } from "@/types/pages";

export interface TeamsGridItem {
  id: string;
  name: string;
  logo: string;
  videoUrl?: string;
  bg: string;
}

interface Props {
  section: PageSection;
  onChange: (updated: PageSection) => void;
  defaultData: Record<string, any>;
}

function newItem(): TeamsGridItem {
  return {
    id: `tg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: "",
    logo: "",
    videoUrl: "",
    bg: "bg-[#0F172A]",
  };
}

export default function TeamsGridEditor({ section, onChange, defaultData }: Props) {
  const merged = { ...defaultData, ...(section.data || {}) };
  const items: TeamsGridItem[] = Array.isArray(merged.items) ? merged.items : [];

  const update = (field: string, value: any) =>
    onChange({ ...section, data: { ...(section.data || {}), [field]: value } });

  const setItems = (next: TeamsGridItem[]) => update("items", next);
  const updateItem = (idx: number, patch: Partial<TeamsGridItem>) =>
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const addItem = () => setItems([...items, newItem()]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active</Label>
        <Switch checked={section.active} onCheckedChange={(v) => onChange({ ...section, active: v })} />
      </div>
      <div className="space-y-1.5">
        <Label>Title</Label>
        <Input value={merged.title || ""} onChange={(e) => update("title", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Subtitle</Label>
        <Input value={merged.subtitle || ""} onChange={(e) => update("subtitle", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <BlogEditor content={merged.description || ""} onChange={(html) => update("description", html)} minHeight="160px" />
      </div>

      <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Teams ({items.length})</Label>
          <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-8 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Team
          </Button>
        </div>

        {items.length === 0 && (
          <div className="rounded-md border border-dashed border-slate-300 dark:border-slate-700 px-3 py-6 text-center text-sm text-slate-500">
            No teams yet. Click Add Team to start.
          </div>
        )}

        {items.map((it, idx) => (
          <div key={it.id || idx} className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Team #{idx + 1}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(idx)} className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Remove
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label>Team Name</Label>
              <Input value={it.name || ""} onChange={(e) => updateItem(idx, { name: e.target.value })} placeholder="e.g. North East Panthers" />
            </div>
            <div className="space-y-1.5">
              <Label>Logo / Video</Label>
              <MediaUpload value={it.logo || ""} onChange={(url) => updateItem(idx, { logo: url })} />
            </div>
            <div className="space-y-1.5">
              <Label>Video URL (optional)</Label>
              <Input value={it.videoUrl || ""} onChange={(e) => updateItem(idx, { videoUrl: e.target.value })} placeholder="https://… or /uploads/…" />
            </div>
            <div className="space-y-1.5">
              <Label>Background Class</Label>
              <Input value={it.bg || ""} onChange={(e) => updateItem(idx, { bg: e.target.value })} placeholder="bg-[#0F172A]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
