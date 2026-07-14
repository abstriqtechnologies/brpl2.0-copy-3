"use client";

import React from "react";
import { getImageUrl } from "@/utils/imageHelper";
import { useCollections } from "@/components/SiteContextProvider";

export interface TeamMemberItem {
  id: string;
  name: string;
  role: string;
  image: string;
  bio: string;
}

interface TeamGridSectionProps {
  title?: string;
  subtitle?: string;
  items?: TeamMemberItem[];
}

const DEFAULT_TITLE = "Meet Our Team";
const DEFAULT_SUBTITLE = "The people behind Brpl — building India's most accessible T10 cricket league.";

const TeamGridSection: React.FC<TeamGridSectionProps> = ({
  title,
  subtitle,
  items: itemsProp,
}) => {
  // If items come from props, render those. Else fall back to teams collection.
  const { teams: cmsTeams } = useCollections();

  const itemsFromCms: TeamMemberItem[] = Array.isArray(cmsTeams)
    ? cmsTeams.map((m: any, idx: number) => ({
        id: m._id?.toString?.() || `cms-team-${idx}`,
        name: m.name || "",
        role: m.role || "",
        image: m.image || "",
        bio: m.bio || "",
      }))
    : [];

  const items =
    Array.isArray(itemsProp) && itemsProp.length > 0
      ? itemsProp
      : itemsFromCms;

  if (!items || items.length === 0) return null;

  return (
    <section className="bg-[#f5f7fb] py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10 md:mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-[#111a45] font-oswald tracking-tight">
            {title || DEFAULT_TITLE}
          </h2>
          {subtitle && (
            <p className="text-gray-600 mt-3 max-w-2xl mx-auto leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto place-items-center">
          {items.map((member) => (
            <div key={member.id} className="flex justify-center w-full">
              <div className="bg-transparent max-w-xs w-full flex flex-col group">
                <div className="relative bg-white rounded-3xl shadow-[0_18px_45px_rgba(0,0,0,0.14)] overflow-hidden w-full h-[450px]">
                  <div className="w-full h-full overflow-hidden">
                    {member.image ? (
                      <img
                        src={getImageUrl(member.image)}
                        alt={member.name}
                        className="w-full h-full object-cover object-top"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                        No Image
                      </div>
                    )}
                  </div>

                  {member.bio && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 absolute inset-0">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent" />
                      <div className="absolute inset-0 p-6 flex flex-col justify-end">
                        <p className="text-white/95 text-xs md:text-sm leading-relaxed text-justify">
                          {member.bio}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative z-10 mt-[-90px] mx-4 mb-2 bg-white rounded-2xl shadow-[0_12px_30px_rgba(0,0,0,0.16)] px-6 py-4 text-center transition-all duration-300 group-hover:opacity-0 min-h-[90px] flex flex-col justify-center">
                  <h3 className="text-lg md:text-xl font-extrabold text-[#111827] leading-tight">
                    {member.name}
                  </h3>
                  <p className="text-sm md:text-base text-gray-700 mt-1 leading-snug">
                    {member.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TeamGridSection;