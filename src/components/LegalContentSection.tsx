"use client";

import React from "react";
import { SafeHtml } from "./SafeHtml";

interface LegalContentSectionProps {
  title?: string;
  content?: string;
}

const LegalContentSection: React.FC<LegalContentSectionProps> = ({ title, content }) => {
  return (
    <section className="container mx-auto px-4 py-16 md:py-24">
      <div className="max-w-4xl mx-auto">
        {title && (
          <h1 className="text-3xl md:text-4xl font-bold text-[#111a45] font-oswald tracking-tight mb-8">
            {title}
          </h1>
        )}
        {content && (
          <SafeHtml
            html={content}
            className="prose prose-slate max-w-none text-slate-700 leading-relaxed"
          />
        )}
      </div>
    </section>
  );
};

export default LegalContentSection;