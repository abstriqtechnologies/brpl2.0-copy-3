"use client";
import React, { useEffect, useState } from "react";

const DEFAULT_TEAMS = [
  {
    name: "North East Panthers",
    logo: "/2.webp",
    bg: "bg-[#0F172A]",
  },
  {
    name: "Central Strikers",
    logo: "/5.webp",
    bg: "bg-[#0F172A]",
  },
  {
    name: "Western Heroes",
    logo: "/4.webp",
    bg: "bg-[#0F172A]",
  },
  {
    name: "Northern Dabanggss",
    logo: "/3.webp",
    bg: "bg-[#0F172A]", // Dark background from image
  },
  {
    name: "Southern Lions",
    logo: "/1.webp",
    bg: "bg-[#0F172A]",
  },
];

interface TeamsProps {
  title?: string;
  subtitle?: string;
  description?: string;
  items?: Array<{ name?: string; logo?: string; bg?: string }>;
}

const Teams: React.FC<TeamsProps> = (props) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Section.data.items override hardcoded teams; otherwise use defaults.
  const teams: typeof DEFAULT_TEAMS =
    Array.isArray(props.items) && props.items.length > 0
      ? props.items.map((t: any) => ({
          name: t.name || "",
          logo: t.logo || "/artist.webp",
          bg: t.bg || "bg-[#0F172A]",
        }))
      : DEFAULT_TEAMS;

  const [visibleCount, setVisibleCount] = useState(5);
  const total = teams.length;

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        // Show 2 items on mobile as per requirement
        setVisibleCount(2);
      } else if (window.innerWidth < 1024) {
        setVisibleCount(3);
      } else {
        setVisibleCount(5);
      }
    };

    // Initial check
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % total);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      nextSlide();
    }, 3000); // auto slide every 3 seconds

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getVisibleTeams = () => {
    const items: typeof teams = [];
    for (let i = 0; i < Math.min(visibleCount, total); i++) {
      const index = (currentIndex + i) % total;
      items.push(teams[index]);
    }
    return items;
  };

  const visibleTeams = getVisibleTeams();

  const headerTitle = props.title || "Brpl Teams";

  return (
    <section className="relative w-full">
      {/* Stadium background same style as design */}
      <div className="relative py-8 md:py-12 lg:py-14 px-4 md:px-8 lg:px-12 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/fixture.webp')" }}
        />
        {/* Slight dark overlay for contrast */}
        <div className="absolute inset-0 bg-[#020617]/10" />

        <div className="relative max-w-12xl mx-auto flex flex-col items-center">
          {/* Heading */}
          <h2
            className="text-center text-[#FFD700] text-3xl md:text-4xl lg:text-[40px] font-extrabold tracking-[0.05em] mb-4"
            style={{ fontFamily: "'Rye', serif" }}
          >
            {headerTitle}
          </h2>
          <p className="max-w-2xl text-center text-gray-200 text-sm md:text-base mb-4 leading-relaxed">
            {props.description ||
              "Five franchise teams. Five zones. One league. Discover the squads competing in India's most accessible T10 tennis-ball cricket tournament."}
          </p>
          {props.subtitle && (
            <p className="text-center text-amber-500 font-bold uppercase tracking-wider text-sm md:text-base mb-8 md:mb-10 italic">
              {props.subtitle}
            </p>
          )}
          {!props.subtitle && (
            <p className="text-center text-amber-500 font-bold uppercase tracking-wider text-sm md:text-base mb-8 md:mb-10 italic">
              Bharat ki League, Bharatiyon ka Sapna
            </p>
          )}

          {/* Logos slider - auto slide only (no arrows) */}
          <div className="relative w-full">
            <div className="flex items-center justify-center gap-4 sm:gap-6 md:gap-10 lg:gap-14 w-full">
              {visibleTeams.map((team) => (
                <div
                  key={team.name}
                  className={`h-32 w-32 sm:h-44 sm:w-44 md:h-48 md:w-48 lg:h-56 lg:w-56 rounded-full ${team.bg} flex items-center justify-center shadow-[0_18px_45px_rgba(0,0,0,0.9)] overflow-hidden transition-transform hover:scale-105 duration-300`}
                >
                  <img
                    src={team.logo}
                    alt={team.name}
                    className="h-full w-full object-contain p-2"
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Teams;
