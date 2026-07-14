import dynamic from "next/dynamic";
import type { ComponentType } from "react";

interface SectionRegistryEntry {
  component?: ComponentType<any>;
  editor: ComponentType<any>;
  /**
   * Default values seeded into a section when DB data is empty.
   * Mirrors the hardcoded fallback in the public component so the admin
   * editor shows the same content currently visible on the public site.
   */
  defaultData: Record<string, any>;
}

const DEFAULT_MISSION_DESCRIPTION = `
<p>For way too long, cricket has been a game for the privileged. Access to coaching, exposure, and opportunity usually decide who gets to play at the national level. At Brpl, our mission is to empower cricket players at the grassroots level and create an inclusive ecosystem.</p>
<p>We believe that no matter their background, every aspiring cricketer deserves a platform to shine. Our team will interact with local communities, encourage youth participation, and connect with them through local digital creators. To ensure widespread participation, we will conduct nationwide trials and discover the next generation of India's cricket stars. We promise to treat every participant fairly and provide them with equal opportunities and long-term growth.</p>
`;

const DEFAULT_VISION_DESCRIPTION = `
<p>"If they can dream it, they can achieve it." This belief lies at the heart of the Brpl (Brpl). Our vision is to make Brpl the most inclusive and sustainable <strong>T10 tennis ball cricket league</strong> platform in India.</p>
<p>From a child playing in a village field, a youngster practicing under streetlights, to communities that live and breathe cricket, we want everyone to feel that this league belongs to them. By giving a professional platform to the underprivileged, we aim to revolutionize cricket at the grassroots. We want to see cricket thrive in local communities, schools, and small towns.</p>
<p>Our team will continuously work on improving the format and introduce exciting rules to keep the league exciting to watch. This will ensure that every season brings something new for both players and fans. Ultimately, we want Brpl to become a movement that unites India through the love of cricket.</p>
`;

const DEFAULT_ABOUT_DESCRIPTION = `
<p>What comes in mind when you think about cricket? It's usually high-stakes matches, world-class players, big stadiums, etc. The cricket dream has become so big, it seems unachievable by the common man. But if one has the passion and the skill, why shouldn't they have a platform?</p>
<p>This is what we want to change with the <strong>Brpl (Brpl)</strong>. We bring you a fresh <strong>T10 tennis ball cricket league</strong> format league that will transform how cricket is played and experienced. With nationwide trials in place, expect to see raw talent from every corner of the country. Guided by the vision "Bharat ki League, Bhartiyo ka Sapna," we have a strong focus on inclusivity, community, sustainability, and, of course, the entertainment factor.</p>
<p>Our management team has experience in major tournaments like <strong>the IPL</strong> and the <strong>ICC World Cup</strong>, and they will leave no stone unturned to make Brpl the biggest cricket event in the country. So when it comes to us, expect the unexpected. With six talented teams, thrilling <strong>double-header matches</strong>, and unique <strong>X-Factor Rules</strong>, you are in for a treat.</p>
`;

const DEFAULT_WHO_WE_ARE_DESCRIPTION = `
<p class="text-gray-400 leading-relaxed mb-4">
<span class="text-white font-semibold">Brpl (Brpl)</span> is India's premier <span class="text-white font-semibold">T10 tennis-ball cricket league</span>, built to give every aspiring cricketer — regardless of city, background, or contacts — a fair, structured pathway to professional cricket. Through nationwide <span class="text-white font-semibold">cricket trials</span> and open <span class="text-white font-semibold">player registration</span> across five zones, Brpl is rewriting how talent is discovered in Indian cricket.
</p>
<p class="text-gray-400 leading-relaxed mb-4">
What makes Brpl different is its commitment to <span class="text-white font-semibold">grassroots access</span>. Whether you're playing gully cricket in a small town or representing your district side, Brpl's zonal trials are designed to surface raw talent that conventional scouting overlooks. Selected players join franchise teams, compete in a fast-paced T10 format, and gain real exposure to scouts, mentors, and live broadcasts.
</p>
<p class="text-gray-400 leading-relaxed">
Player benefits include <span class="text-white font-semibold">professional coaching, performance tracking, prize money, and scouting exposure</span> — a genuine shot at a long-term cricketing career. Every selected player represents their zone, wears their colours, and plays for a chance to inspire the next generation back home.
</p>
`;

const DEFAULT_TEAMS_SUBTITLE = "Bharat ki League, Bharatiyon ka Sapna";

const DEFAULT_TEAMS_DESCRIPTION =
  "Five franchise teams. Five zones. One league. Discover the squads competing in India's most accessible T10 tennis-ball cricket tournament.";

const DEFAULT_HOME_BANNERS = [
  {
    background: "/banner-Brpl.webp",
    videoUrl: "https://Brpl-public-uploads.s3.ap-south-1.amazonaws.com/Brpl_Launch_Film.mp4",
  },
];

export const DEFAULT_EVENTS = [
  {
    id: "evt-1",
    title: "Brpl Zonal Trials",
    image: "/artist.webp",
    date: "Upcoming",
    location: "Pan-India",
  },
  {
    id: "evt-2",
    title: "Franchise Auctions",
    image: "/artist.webp",
    date: "TBA",
    location: "Mumbai",
  },
  {
    id: "evt-3",
    title: "T10 Season Opener",
    image: "/artist.webp",
    date: "TBA",
    location: "Delhi NCR",
  },
  {
    id: "evt-4",
    title: "Grassroots Showcases",
    image: "/artist.webp",
    date: "Year-round",
    location: "All Zones",
  },
];

const DEFAULT_AMBASSADORS = [
  { id: "amb-1", name: "Brpl Ambassador", image: "/artist.webp", designation: "Coming Soon" },
  { id: "amb-2", name: "Brpl Ambassador", image: "/artist.webp", designation: "Coming Soon" },
  { id: "amb-3", name: "Brpl Ambassador", image: "/artist.webp", designation: "Coming Soon" },
  { id: "amb-4", name: "Brpl Ambassador", image: "/artist.webp", designation: "Coming Soon" },
];

const DEFAULT_LINEAR_TV = [
  { id: "l1", type: "linear", name: "DD Sports", logo: "/dd-image.webp" },
  { id: "l2", type: "linear", name: "Sony Sports Network", logo: "/sony-image.webp" },
  { id: "l3", type: "linear", name: "Star Sports", logo: "/star-sports.webp" },
];

const DEFAULT_OTT = [
  { id: "o1", type: "ott", name: "JioHotstar", logo: "/jio-hotstar-image.webp" },
  { id: "o2", type: "ott", name: "SonyLIV", logo: "/sonylive-images.webp" },
  { id: "o3", type: "ott", name: "FanCode", logo: "/fancode-image.webp" },
];

export const DEFAULT_TEAMS_ITEMS = [
  { id: "t1", name: "North East Panthers", logo: "/2.webp", bg: "bg-[#0F172A]" },
  { id: "t2", name: "Central Strikers", logo: "/5.webp", bg: "bg-[#0F172A]" },
  { id: "t3", name: "Western Heroes", logo: "/4.webp", bg: "bg-[#0F172A]" },
  { id: "t4", name: "Northern Dabanggss", logo: "/3.webp", bg: "bg-[#0F172A]" },
  { id: "t5", name: "Southern Lions", logo: "/1.webp", bg: "bg-[#0F172A]" },
];

export const DEFAULT_FAQS = [
  {
    id: "faq-1",
    question: "1. Is the fee refundable?",
    answer: "The registration fee is non-refundable as it covers your backend processing and kit costs.",
  },
  {
    id: "faq-2",
    question: "2. What if I don't get selected?",
    answer:
      "Even if you are not selected for this season, your registration remains valuable. When you register for the next season, you will receive an exclusive offer on the registration fee.",
  },
  {
    id: "faq-3",
    question: "3. What is the Age Limit?",
    answer:
      "Open for players aged 18 to 40. Each team will include a minimum of 2 players from the 18-20 age group, with 1 player in the playing XI for every match.",
  },
  {
    id: "faq-4",
    question: "4. Can I register now and upload video later?",
    answer:
      "Yes! You can pay ₹1499 now to book your slot (before they fill up) and upload your trial video anytime within 7 days from your dashboard.",
  },
];

export const SECTION_REGISTRY: Record<string, SectionRegistryEntry> = {
  "hero-banner": {
    component: dynamic(() => import("@/components/HeroBannerSection")),
    editor: dynamic(() => import("./editors/HeroBannerEditor")),
    defaultData: {
      title: "Page Title",
      subtitle: "",
      image: "/tenis.webp",
      imageMobile: "",
      ctaText: "",
      ctaLink: "",
    },
  },
  "home-hero": {
    component: dynamic(() => import("@/components/Banner")),
    editor: dynamic(() => import("./editors/HomeHeroEditor")),
    defaultData: {
      title: "",
      subtitle: "",
      description: "",
      image: "",
      imageMobile: "",
      videoUrl: "",
      ctaText: "REGISTER NOW",
      ctaLink: "/login",
      items: DEFAULT_HOME_BANNERS,
    },
  },
  "who-we-are": {
    component: dynamic(() => import("@/components/WhoWeAre")),
    editor: dynamic(() => import("./editors/WhoWeAreEditor")),
    defaultData: {
      title: "Brpl",
      subtitle: "India's Grassroots T10 Cricket League",
      tagline: '"Brpl – Bharat ki League, Bharatiyon ka Sapna"',
      description: DEFAULT_WHO_WE_ARE_DESCRIPTION,
      image: "/home2.webp",
      videoUrl: "",
    },
  },
  "about-text": {
    component: dynamic(() => import("@/components/AboutSection")),
    editor: dynamic(() => import("./editors/AboutTextEditor")),
    defaultData: {
      title: "About Brpl",
      description: DEFAULT_ABOUT_DESCRIPTION,
      image: "/trophy image.webp",
      videoUrl: "",
    },
  },
  "mission-vision": {
    component: dynamic(() => import("@/components/MissionVisionSection")),
    editor: dynamic(() => import("./editors/MissionVisionEditor")),
    defaultData: {
      missionTitle: "Our Mission",
      missionDescription: DEFAULT_MISSION_DESCRIPTION,
      missionImage: "/about-2.webp",
      missionVideoUrl: "",
      visionTitle: "Our Vision",
      visionDescription: DEFAULT_VISION_DESCRIPTION,
      visionImage: "/vision.webp",
      visionVideoUrl: "",
    },
  },
  "team-grid": {
    component: dynamic(() => import("@/components/TeamGridSection")),
    editor: dynamic(() => import("./editors/TeamGridEditor")),
    defaultData: {
      title: "Meet Our Team",
      subtitle: "The people behind Brpl — building India's most accessible T10 cricket league.",
      items: [],
    },
  },
  "generic-content": {
    component: dynamic(() => import("@/components/GenericContentSection")),
    editor: dynamic(() => import("./editors/GenericContentEditor")),
    defaultData: {
      title: "",
      subtitle: "",
      description: "",
      image: "",
    },
  },
  "event-grid": {
    component: dynamic(() => import("@/components/EventGrid")),
    editor: dynamic(() => import("./editors/EventGridEditor")),
    defaultData: {
      title: "Brpl Events",
      subtitle: "Bharat ki League, Bharatiyon ka Sapna",
      description: "",
      items: DEFAULT_EVENTS,
    },
  },
  "teams-grid": {
    component: dynamic(() => import("@/components/TeamsGrid")),
    editor: dynamic(() => import("./editors/TeamsGridEditor")),
    defaultData: {
      title: "Brpl Teams",
      subtitle: "Bharat ki League, Bharatiyon ka Sapna",
      description: "",
      items: DEFAULT_TEAMS_ITEMS,
    },
  },
  "faq-list": {
    component: dynamic(() => import("@/components/FaqListSection")),
    editor: dynamic(() => import("./editors/FaqListEditor")),
    defaultData: {
      title: "Frequently Asked Questions",
      items: DEFAULT_FAQS,
    },
  },
  "legal-content": {
    component: dynamic(() => import("@/components/LegalContentSection")),
    editor: dynamic(() => import("./editors/LegalContentEditor")),
    defaultData: {
      title: "",
      content: "",
    },
  },
  "event-gallery": {
    component: dynamic(() => import("@/components/EventGallerySlider")),
    editor: dynamic(() => import("./editors/EventGalleryEditor")),
    defaultData: {
      title: "Brpl Event Gallery",
      subtitle: DEFAULT_TEAMS_SUBTITLE,
      description: "",
      items: DEFAULT_EVENTS,
    },
  },
  ambassadors: {
    component: dynamic(() => import("@/components/AmbassadorsSection")),
    editor: dynamic(() => import("./editors/AmbassadorsEditor")),
    defaultData: {
      title: "Brpl Ambassadors",
      subtitle: DEFAULT_TEAMS_SUBTITLE,
      description: "",
      items: DEFAULT_AMBASSADORS,
    },
  },
  "teams-slider": {
    component: dynamic(() => import("@/components/Teams")),
    editor: dynamic(() => import("./editors/TeamsSliderEditor")),
    defaultData: {
      title: "Brpl Teams",
      subtitle: DEFAULT_TEAMS_SUBTITLE,
      description: DEFAULT_TEAMS_DESCRIPTION,
      items: DEFAULT_TEAMS_ITEMS,
    },
  },
  broadcasting: {
    component: dynamic(() => import("@/components/BroadcastingPartners")),
    editor: dynamic(() => import("./editors/BroadcastingEditor")),
    defaultData: {
      title: "Proposed Broadcasting Partners",
      subtitle: DEFAULT_TEAMS_SUBTITLE,
      description: "",
      items: [...DEFAULT_LINEAR_TV, ...DEFAULT_OTT],
    },
  },
};