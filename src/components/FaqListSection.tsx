"use client";

import React, { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FaqItem {
  id?: string;
  question?: string;
  answer?: string;
}

interface FaqListSectionProps {
  title?: string;
  items?: FaqItem[];
}

function buildFaqPageSchema(items: FaqItem[]) {
  const valid = items.filter((i) => i.question && i.answer);
  if (valid.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: valid.map((i) => ({
      "@type": "Question",
      name: i.question,
      acceptedAnswer: { "@type": "Answer", text: i.answer },
    })),
  };
}

const FaqListSection: React.FC<FaqListSectionProps> = ({ title, items }) => {
  const list = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const schema = useMemo(() => buildFaqPageSchema(list), [list]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {schema && (
        <Helmet>
          <script type="application/ld+json">{JSON.stringify(schema)}</script>
        </Helmet>
      )}

      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 md:p-12">
          {title && (
            <h2 className="text-3xl font-extrabold text-[#111a45] mb-8 text-center">{title}</h2>
          )}

          {list.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No FAQs available at the moment.</div>
          ) : (
            <Accordion type="single" collapsible className="w-full space-y-4">
              {list.map((faq, index) => (
                <AccordionItem
                  key={faq.id || index}
                  value={`item-${index}`}
                  className="border rounded-lg px-4 bg-slate-50 data-[state=open]:bg-white data-[state=open]:shadow-sm transition-all"
                >
                  <AccordionTrigger className="text-lg font-semibold text-slate-800 hover:text-yellow-600 text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-slate-600 text-base leading-relaxed whitespace-pre-wrap p-5">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </div>
    </div>
  );
};

export default FaqListSection;
