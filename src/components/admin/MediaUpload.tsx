"use client";

import { useState, useRef } from "react";
import { Upload, X, Loader2, ImageIcon, VideoIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface MediaUploadProps {
    value: string;
    onChange: (url: string) => void;
    label?: string;
    /**
     * Restrict the picker to a specific media kind. Defaults to both.
     */
    accept?: "image" | "video" | "both";
}

/**
 * Detect whether a stored URL is a video by extension. Used for the preview
 * pane so the same upload field renders image or video automatically.
 */
function isVideoUrl(url: string): boolean {
    if (!url) return false;
    const cleaned = url.split("?")[0].split("#")[0].toLowerCase();
    return /\.(mp4|webm|mov|m4v|ogv)$/.test(cleaned);
}

/**
 * Media upload component (image + video). Uploads files to the VPS via
 * `/api/admin/upload`, which already validates type and size. The preview
 * area auto-switches between <img> and <video> based on the file extension.
 */
export function MediaUpload({ value, onChange, label, accept = "both" }: MediaUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const allowedVideoTypes = ["video/mp4", "video/webm"];
    const allowedTypes =
        accept === "image"
            ? allowedImageTypes
            : accept === "video"
                ? allowedVideoTypes
                : [...allowedImageTypes, ...allowedVideoTypes];

    const acceptAttr =
        accept === "image"
            ? "image/jpeg,image/png,image/webp,image/gif"
            : accept === "video"
                ? "video/mp4,video/webm"
                : "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm";

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!allowedTypes.includes(file.type)) {
            setError(
                accept === "image"
                    ? "Invalid file type. Allowed: JPG, PNG, WebP, GIF."
                    : accept === "video"
                        ? "Invalid file type. Allowed: MP4, WebM."
                        : "Invalid file type. Allowed: JPG, PNG, WebP, GIF, MP4, WebM.",
            );
            return;
        }
        if (file.size > 50 * 1024 * 1024) {
            setError("File too large. Maximum size is 50 MB.");
            return;
        }

        setError(null);
        setUploading(true);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/admin/upload", {
                method: "POST",
                body: formData,
                credentials: "same-origin",
            });

            const json = await res.json();

            if (json.ok && json.data?.url) {
                onChange(json.data.url);
            } else {
                setError(json.error || "Upload failed");
            }
        } catch {
            setError("Failed to upload file");
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    const handleRemove = () => {
        onChange("");
        setError(null);
    };

    const previewSrc = value
        ? value.startsWith("http") || value.startsWith("/")
            ? value
            : `/${value}`
        : "";
    const showVideo = isVideoUrl(value);

    const formatHelp =
        accept === "image"
            ? "Image only. Max size: 50 MB. JPG, PNG, WebP or GIF recommended."
            : accept === "video"
                ? "Video only. Max size: 50 MB. MP4 or WebM recommended."
                : "Max size: 50 MB. JPG, PNG, WebP, GIF, MP4 or WebM.";

    return (
        <div className="space-y-1.5">
            {label && (
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {label}
                </Label>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">{formatHelp}</p>

            {error && (
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            )}

            <div
                className={cn(
                    "relative flex items-center justify-center rounded-lg border-2 border-dashed transition-colors",
                    value
                        ? "border-emerald-300 dark:border-emerald-700"
                        : "border-slate-300 dark:border-slate-600 hover:border-amber-400 dark:hover:border-amber-500",
                )}
            >
                {value ? (
                    <div className="relative w-full group">
                        {showVideo ? (
                            <video
                                src={previewSrc}
                                controls
                                className="w-full h-48 object-cover rounded-lg bg-black"
                            />
                        ) : (
                            <img
                                src={previewSrc}
                                alt="Preview"
                                className="w-full h-48 object-cover rounded-lg"
                            />
                        )}
                        <button
                            type="button"
                            onClick={handleRemove}
                            className={cn(
                                "absolute top-2 right-2 h-7 w-7 rounded-full",
                                "bg-black/50 hover:bg-black/70 text-white",
                                "flex items-center justify-center",
                                "opacity-0 group-hover:opacity-100 transition-opacity",
                            )}
                            aria-label="Remove media"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        disabled={uploading}
                        className={cn(
                            "w-full h-32 flex flex-col items-center justify-center gap-1.5",
                            "text-slate-400 dark:text-slate-500",
                            "hover:text-slate-600 dark:hover:text-slate-300",
                            "disabled:opacity-50 disabled:cursor-not-allowed",
                            "transition-colors rounded-lg",
                        )}
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                                <span className="text-xs">Uploading…</span>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-1.5">
                                    <Upload className="h-5 w-5" />
                                    {accept === "video" ? (
                                        <VideoIcon className="h-5 w-5" />
                                    ) : accept === "image" ? (
                                        <ImageIcon className="h-5 w-5" />
                                    ) : (
                                        <>
                                            <ImageIcon className="h-5 w-5" />
                                            <VideoIcon className="h-5 w-5" />
                                        </>
                                    )}
                                </div>
                                <span className="text-xs font-medium">Click to upload</span>
                            </>
                        )}
                    </button>
                )}
            </div>

            <input
                ref={inputRef}
                type="file"
                accept={acceptAttr}
                onChange={handleFile}
                className="hidden"
                aria-label={label || "Upload media"}
            />
        </div>
    );
}
