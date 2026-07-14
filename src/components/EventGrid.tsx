import React from "react";
import { MapPin, Calendar } from "lucide-react";
import { MediaEmbed } from "./MediaEmbed";

interface EventGridItem {
  _id?: string;
  title?: string;
  image?: string;
  videoUrl?: string;
  date?: string;
  location?: string;
}

interface EventGridProps {
  title?: string;
  subtitle?: string;
  description?: string;
  items?: EventGridItem[];
}

const EventGrid: React.FC<EventGridProps> = ({ title, subtitle, description, items }) => {
  const list = Array.isArray(items) ? items : [];

  return (
    <section className="relative w-full">
      <div className="relative py-10 md:py-12 lg:py-16 px-4 md:px-8 lg:px-12 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/artist.webp')" }} />
        <div className="absolute inset-0 bg-[#020617]/60" />

        <div className="relative max-w-7xl mx-auto">
          <div className="flex flex-col items-center mb-10 text-center">
            <h2 className="text-white text-3xl md:text-4xl lg:text-[40px] font-extrabold tracking-[0.05em] mb-4" style={{ fontFamily: "'Rye', serif" }}>
              {title || "Brpl Events"}
            </h2>
            <div className="h-1 w-24 bg-[#FFC928] rounded-full" />
            {description && (
              <p className="max-w-2xl text-center text-gray-200 text-sm md:text-base mt-4 leading-relaxed">{description}</p>
            )}
            {subtitle && (
              <p className="text-center text-amber-500 font-bold uppercase tracking-wider text-sm md:text-base mt-4 italic">{subtitle}</p>
            )}
          </div>

          {list.length === 0 ? (
            <div className="text-center text-white/60 py-16">No events available.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {list.map((it, idx) => (
                <div key={it._id || idx} className="group relative rounded-xl overflow-hidden shadow-xl border border-white/10 bg-[#0F172A]">
                  <div className="aspect-square w-full">
                    <MediaEmbed
                      src={it.videoUrl || it.image || "/artist.webp"}
                      alt={it.title || "Event"}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 bg-black"
                      controls
                    />
                  </div>
                  <div className="p-4 bg-gradient-to-t from-black via-black/80 to-transparent">
                    <h3 className="text-white text-lg font-bold mb-2 leading-tight">{it.title}</h3>
                    <div className="space-y-1">
                      {it.date && (
                        <div className="flex items-center text-gray-300 text-xs">
                          <Calendar className="w-3 h-3 mr-1.5 text-[#FFC928]" />
                          {it.date}
                        </div>
                      )}
                      {it.location && (
                        <div className="flex items-center text-gray-300 text-xs">
                          <MapPin className="w-3 h-3 mr-1.5 text-[#FFC928]" />
                          {it.location}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default EventGrid;