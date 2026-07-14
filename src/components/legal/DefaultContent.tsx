import React from "react";
import Link from "next/link";

const H1Cls = "text-3xl md:text-4xl font-bold font-display text-[#111a45] mb-8";
const H2Cls = "text-2xl font-bold font-display text-[#111a45] mb-5";
const PCls = "text-slate-600 text-[1.05rem] leading-relaxed";
const Space = "mt-12 space-y-10";

export function PrivacyPolicyDefault() {
  return (
    <>
      <h1 className={H1Cls}>Privacy Policy</h1>
      <div className="space-y-6 text-sm md:text-[1.05rem] leading-relaxed text-slate-600">
        <p>
          Greetings from <span className="font-bold text-slate-900">Beyond Reach Premier League (BRPL)</span> (hereinafter referred to as the &quot;<span className="font-bold">Website</span>&quot;). The Website is owned and operated by <span className="font-bold text-slate-900">BRPL PVT. LTD.</span>, having its registered address at Ground Floor, Suite G-01, Procapitus Business Park, D-247/4A, D Block, Sector 63, Noida, Uttar Pradesh 201309.
        </p>
        <p>
          By accessing or using the Website through any computer, laptop, mobile phone, tablet, or any other electronic device, you expressly agree to be bound by this <Link href="/privacy-policy" className="font-bold text-blue-600 hover:underline">Privacy Policy</Link>.
        </p>
        <p>
          We value the privacy of our users and the confidentiality of the information they share with us. This Privacy Policy demonstrates our commitment to protecting your information.
        </p>
        <p>
          We encourage you to read this Privacy Policy carefully when: <br />(i) accessing or using our Website through any device; or <br />(ii) availing of any products or services offered by or through the Website. <br />By continuing to use the Website, you acknowledge and consent to the practices described herein.
        </p>
      </div>
      <div className={Space}>
        <section>
          <h2 className={H2Cls}>1. Information We Collect</h2>
          <p className={`${PCls} mb-4`}>When you use the Website, we may collect both <span className="font-bold">personal</span> and <span className="font-bold">non-personal</span> information.</p>
          <div className="space-y-6 pl-4 border-l-2 border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">(a) Personal Information</h3>
              <p className={`${PCls} leading-relaxed`}>This refers to data that can directly identify you, such as your name, contact details (email, address, phone number), or other identifiers. We may also collect payment-related information when you purchase products or services from the Website.</p>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">(b) Non-Personal Information</h3>
              <p className={`${PCls} leading-relaxed`}>We may collect non-identifiable data, including but not limited to, your IP address, device ID, browser type, operating system, access time, geographic location, and referring website information.</p>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">(c) Location Data</h3>
              <p className={`${PCls} leading-relaxed`}>If you permit, the Website may collect location data from your device to enhance user experience.</p>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">(d) Minors</h3>
              <p className={`${PCls} leading-relaxed`}>We do not knowingly collect any information from individuals under the age of 18. If you are below 18 or considered a minor under your jurisdiction, please refrain from submitting any personal information.</p>
            </div>
          </div>
        </section>
        <section>
          <h2 className={H2Cls}>8. Contact Us</h2>
          <p className={`${PCls} bg-blue-50 p-6 rounded-xl border border-blue-100`}>
            For any questions, concerns, or feedback regarding this Privacy Policy or the Website, you may contact us at: <a href="mailto:support@brpl.net" className="text-blue-600 hover:underline font-semibold">support@brpl.net</a>
          </p>
        </section>
      </div>
    </>
  );
}

export function TermsAndConditionsDefault() {
  return (
    <>
      <h1 className={H1Cls}>Terms &amp; Condition</h1>
      <div className="space-y-6 text-sm md:text-[1.05rem] leading-relaxed text-slate-600">
        <p>
          Greetings from <span className="font-bold text-slate-900">Beyond Reach Premier League (BRPL)</span>. The Website is owned and operated by <span className="font-bold text-slate-900">BRPL PVT. LTD.</span>, having its registered address at Ground Floor, Suite G-01, Procapitus Business Park, D-247/4A, D Block, Sector 63, Noida, Uttar Pradesh 201309.
        </p>
        <p>
          <span className="font-bold text-slate-900">BRPL PVT. LTD.</span> is a sports management organization dedicated to scouting talented cricketers.
        </p>
        <p>
          We scout players from remote fields, offering a robust platform to showcase their talent at the BRPL League.
        </p>
      </div>
      <div className={Space}>
        <section>
          <h2 className={H2Cls}>Website Purpose</h2>
          <p className={PCls}>The Website serves as a platform for players interested in participating in The BRPL League.</p>
        </section>
        <section>
          <h2 className={H2Cls}>18. Contact Us</h2>
          <p className={`${PCls} bg-blue-50 p-6 rounded-xl border border-blue-100`}>
            For any questions or concerns, please contact us at: <a href="mailto:support@brpl.net" className="text-blue-600 hover:underline font-semibold">support@brpl.net</a>
          </p>
        </section>
      </div>
    </>
  );
}

export function RuleBookDefault() {
  return (
    <>
      <h1 className={H1Cls}>Rule Book</h1>
      <div className="space-y-6 text-sm md:text-[1.05rem] leading-relaxed text-slate-600">
        <p>The official BRPL Rule Book governs all matches, player conduct, and league operations.</p>
        <p>Detailed sections covering match format, player eligibility, conduct, doping, and dispute resolution will be published here.</p>
      </div>
    </>
  );
}