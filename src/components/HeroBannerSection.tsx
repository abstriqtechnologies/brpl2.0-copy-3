"use client";

import React from "react";
import PageBanner from "./PageBanner";

/**
 * Adapter: the admin page editor saves hero-banner sections with these
 * field names: { title, subtitle, image, imageMobile, videoUrl, ctaText, ctaLink }.
 * PageBanner expects: { title, currentPage, videoSrc, imageSrc, scrollToId, pageKey }.
 *
 * This component bridges the two. For home page hero, we keep the carousel-style
 * Banner instead — but PageBanner works for every other page that defines a
 * hero-banner section. The pageKey prop tells PageBanner which admin PageBanner
 * model entry to pull defaults from.
 */
interface HeroBannerSectionProps {
  title?: string;
  subtitle?: string;
  description?: string;
  image?: string;
  imageMobile?: string;
  videoUrl?: string;
  ctaText?: string;
  ctaLink?: string;
  pageKey?: string;
  currentPage?: string;
}

const HeroBannerSection: React.FC<HeroBannerSectionProps> = ({
  title,
  subtitle,
  description,
  image,
  videoUrl,
  pageKey,
  currentPage,
}) => {
  // Default to "home" if no key supplied — matches the home page's first section.
  return (
    <PageBanner
      title={title || ""}
      currentPage={currentPage || (pageKey ? capitalize(pageKey) : "")}
      imageSrc={image}
      videoSrc={videoUrl}
      pageKey={pageKey}
    />
  );
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default HeroBannerSection;