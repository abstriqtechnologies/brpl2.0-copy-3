"use client";

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { BlogEditor } from "@/components/admin/BlogEditor";
import type { PageSection } from "@/types/pages";

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

interface Props {
  section: PageSection;
  onChange: (updated: PageSection) => void;
  defaultData: Record<string, any>;
}

function newItem(): FaqItem {
  return {
    id: `faq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    question: "",
    answer: "",
  };
}

export default function FaqListEditor({ section, onChange, defaultData }: Props) {
  const merged = { ...defaultData, ...(section.data || {}) };
  const items: FaqItem[] = Array.isArray(merged.items) ? merged.items : [];

  const update = (field: string, value: any) =>
    onChange({ ...section, data: { ...(section.data || {}), [field]: value } });

  const setItems = (next: FaqItem[]) => update("items", next);
  const updateItem = (idx: number, patch: Partial<FaqItem>) =>
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
        <Label>Section Title</Label>
        <Input value={merged.title || ""} onChange={(e) => update("title", e.target.value)} />
      </div>

      <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">FAQs ({items.length})</Label>
          <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-8 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add FAQ
          </Button>
        </div>

        {items.length === 0 && (
          <div className="rounded-md border border-dashed border-slate-300 dark:border-slate-700 px-3 py-6 text-center text-sm text-slate-500">
            No FAQs yet. Click Add FAQ to start.
          </div>
        )}

        {items.map((it, idx) => (
          <div key={it.id || idx} className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">FAQ #{idx + 1}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(idx)} className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Remove
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label>Question</Label>
              <Input
                value={it.question || ""}
                onChange={(e) => updateItem(idx, { question: e.target.value })}
                placeholder="What is the age limit?"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Answer (Rich Text)</Label>
              <BlogEditor
                content={it.answer || ""}
                onChange={(html) => updateItem(idx, { answer: html })}
                minHeight="120px"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
