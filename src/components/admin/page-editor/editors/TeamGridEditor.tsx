"use client";

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/admin/ImageUpload";
import type { PageSection } from "@/types/pages";

export interface TeamMemberItem {
  id: string;
  name: string;
  role: string;
  image: string;
  bio: string;
}

interface Props {
  section: PageSection;
  onChange: (updated: PageSection) => void;
  defaultData: Record<string, any>;
}

function newItem(): TeamMemberItem {
  return {
    id: `tm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: "",
    role: "",
    image: "",
    bio: "",
  };
}

export default function TeamGridEditor({ section, onChange, defaultData }: Props) {
  const merged = { ...defaultData, ...(section.data || {}) };
  const items: TeamMemberItem[] = Array.isArray(merged.items) ? merged.items : [];

  const setItems = (next: TeamMemberItem[]) =>
    onChange({ ...section, data: { ...(section.data || {}), items: next } });

  const updateItem = (idx: number, patch: Partial<TeamMemberItem>) => {
    const next = items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    setItems(next);
  };

  const addItem = () => setItems([...items, newItem()]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

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
        <Label>Section Title</Label>
        <Input
          value={merged.title || ""}
          onChange={(e) =>
            onChange({
              ...section,
              data: { ...(section.data || {}), title: e.target.value },
            })
          }
          placeholder="Meet Our Team"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Section Subtitle</Label>
        <Input
          value={merged.subtitle || ""}
          onChange={(e) =>
            onChange({
              ...section,
              data: { ...(section.data || {}), subtitle: e.target.value },
            })
          }
          placeholder="Short intro line"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Team Members ({items.length})
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addItem}
            className="h-8 text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Member
          </Button>
        </div>

        {items.length === 0 && (
          <div className="rounded-md border border-dashed border-slate-300 dark:border-slate-700 px-3 py-6 text-center text-sm text-slate-500">
            No team members yet. Click &quot;Add Member&quot; to start.
          </div>
        )}

        {items.map((member, idx) => (
          <div
            key={member.id || idx}
            className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/30"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Member #{idx + 1}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  value={member.name || ""}
                  onChange={(e) => updateItem(idx, { name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Input
                  value={member.role || ""}
                  onChange={(e) => updateItem(idx, { role: e.target.value })}
                  placeholder="e.g. Head Coach"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Photo</Label>
              <ImageUpload
                value={member.image || ""}
                onChange={(url) => updateItem(idx, { image: url })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Bio</Label>
              <Textarea
                value={member.bio || ""}
                onChange={(e) => updateItem(idx, { bio: e.target.value })}
                rows={3}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}