import React from "react";
import { MediaEmbed } from "./MediaEmbed";

interface TeamsGridItem {
  name?: string;
  logo?: string;
  videoUrl?: string;
  bg?: string;
}

interface TeamsGridProps {
  title?: string;
  subtitle?: string;
  description?: string;
  items?: TeamsGridItem[];
}

const TeamsGrid: React.FC<TeamsGridProps> = ({ title, subtitle, description, items }) => {
  const list = Array.isArray(items) ? items : [];

  return (
    <section className="relative w-full">
      <div className="relative py-10 md:py-12 lg:py-16 px-4 md:px-8 lg:px-12 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/fixture.webp')" }} />
        <div className="absolute inset-0 bg-[#020617]/40" />

        <div className="relative max-w-7xl mx-auto">
          <div className="flex flex-col items-center mb-10 text-center">
            <h2 className="text-[#FFD700] text-3xl md:text-4xl lg:text-[40px] font-extrabold tracking-[0.05em] mb-4" style={{ fontFamily: "'Rye', serif" }}>
              {title || "Brpl Teams"}
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
            <div className="text-center text-white/60 py-16">No teams available.</div>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 lg:gap-14">
              {list.map((team, idx) => (
                <div key={`${team.name}-${idx}`} className="flex flex-col items-center">
                  <div
                    className={`h-32 w-32 sm:h-44 sm:w-44 md:h-48 md:w-48 lg:h-56 lg:w-56 rounded-full ${team.bg || "bg-[#0F172A]"} flex items-center justify-center shadow-[0_18px_45px_rgba(0,0,0,0.9)] overflow-hidden transition-transform hover:scale-105 duration-300`}
                  >
                    <MediaEmbed
                      src={team.videoUrl || team.logo || "/artist.webp"}
                      alt={team.name || "Team"}
                      className="h-full w-full object-contain p-2"
                      controls
                    />
                  </div>
                  {team.name && (
                    <p className="text-white text-sm md:text-base font-semibold text-center mt-3">{team.name}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default TeamsGrid;