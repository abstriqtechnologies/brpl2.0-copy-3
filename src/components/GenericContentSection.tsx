"use client";

import React from "react";
import { SafeHtml } from "./SafeHtml";
import { getImageUrl } from "@/utils/imageHelper";

interface GenericContentSectionProps {
  title?: string;
  subtitle?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
}

const GenericContentSection: React.FC<GenericContentSectionProps> = ({
  title,
  subtitle,
  description,
  image,
  imageAlt,
}) => {
  const hasImage = !!image;
  return (
    <section className="container mx-auto px-4 py-16 md:py-24">
      <div
        className={`flex flex-col ${
          hasImage ? "lg:flex-row" : ""
        } gap-12 lg:gap-20 items-center`}
      >
        {hasImage && (
          <div className="w-full lg:w-1/2">
            <img
              src={getImageUrl(image!)}
              alt={imageAlt || title || ""}
              className="w-full h-auto rounded-xl object-cover"
              loading="lazy"
            />
          </div>
        )}

        <div className={`w-full ${hasImage ? "lg:w-1/2" : ""} space-y-6`}>
          {subtitle && (
            <p className="text-amber-500 font-bold uppercase tracking-wider text-xs md:text-sm">
              {subtitle}
            </p>
          )}
          {title && (
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#111a45] font-oswald tracking-tight">
              {title}
            </h2>
          )}
          {description && (
            <SafeHtml
              html={description}
              className="prose max-w-none text-gray-600 text-base md:text-lg leading-relaxed"
            />
          )}
        </div>
      </div>
    </section>
  );
};

export default GenericContentSection;