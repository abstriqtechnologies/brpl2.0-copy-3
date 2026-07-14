"use client";

import React from "react";

/**
 * Renders media from a stored URL. Detects direct video file vs YouTube/Vimeo
 * embed URL and uses the right HTML element:
 *   - .mp4 / .webm / .mov / .m4v / .ogv → <video>
 *   - youtube.com / youtu.be / vimeo.com → <iframe> embed
 *   - anything else → <img>
 *
 * Used by every public component that previously hardcoded <img>.
 */
export interface MediaEmbedProps {
    src: string;
    alt: string;
    className?: string;
    /** For <video>: include controls? Defaults true. */
    controls?: boolean;
    /** For <video>: autoplay/loop/muted/playsinline? Defaults true. */
    autoLoop?: boolean;
}

function isVideoUrl(url?: string | null): boolean {
    if (!url) return false;
    const cleaned = url.split("?")[0].split("#")[0].toLowerCase();
    return /\.(mp4|webm|mov|m4v|ogv)$/.test(cleaned);
}

function parseYoutubeId(url: string): string | null {
    const m =
        url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{6,})/) ||
        null;
    return m ? m[1] : null;
}

function parseVimeoId(url: string): string | null {
    const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return m ? m[1] : null;
}

export function MediaEmbed({
    src,
    alt,
    className,
    controls = true,
    autoLoop = true,
}: MediaEmbedProps) {
    if (!src) return null;
    const cleanSrc = src.startsWith("http") || src.startsWith("/") ? src : `/${src}`;

    const ytId = parseYoutubeId(src);
    if (ytId) {
        return (
            <iframe
                src={`https://www.youtube.com/embed/${ytId}`}
                title={alt}
                className={className}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
                frameBorder={0}
            />
        );
    }

    const vimeoId = parseVimeoId(src);
    if (vimeoId) {
        return (
            <iframe
                src={`https://player.vimeo.com/video/${vimeoId}`}
                title={alt}
                className={className}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                loading="lazy"
                frameBorder={0}
            />
        );
    }

    if (isVideoUrl(src)) {
        return (
            <video
                src={cleanSrc}
                controls={controls}
                autoPlay={autoLoop}
                muted={autoLoop}
                loop={autoLoop}
                playsInline={autoLoop}
                className={className ?? "w-full h-full object-cover bg-black"}
            />
        );
    }

    return <img src={cleanSrc} alt={alt} className={className} loading="lazy" />;
}
