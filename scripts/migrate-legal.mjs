import { MongoClient } from "mongodb";

const COLLECTION = process.env.MONGODB_COLLECTION || "legalpages";

const PRIVACY_CONTENT = `
<h2>1. Information We Collect</h2>
<p>When you use the Website, we may collect both personal and non-personal information.</p>
<h3>(a) Personal Information</h3>
<p>Name, contact details (email, address, phone), payment-related info.</p>
<h3>(b) Non-Personal Information</h3>
<p>IP address, device ID, browser type, OS, access time, geographic location.</p>
<h2>8. Contact Us</h2>
<p>support@brpl.net</p>
`;

const TERMS_CONTENT = `
<h2>Website Purpose</h2>
<p>The Website serves as a platform for players interested in participating in The BRPL League.</p>
<h2>18. Contact Us</h2>
<p>support@brpl.net</p>
`;

const RULE_BOOK_CONTENT = `<p>BRPL Rule Book coming soon.</p>`;

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not set");
    process.exit(1);
  }
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const col = db.collection(COLLECTION);

  const docs = [
    { type: "privacy", title: "Privacy Policy", content: PRIVACY_CONTENT },
    { type: "terms", title: "Terms & Conditions", content: TERMS_CONTENT },
    { type: "rulebook", title: "Rule Book", content: RULE_BOOK_CONTENT },
  ];

  for (const doc of docs) {
    const existing = await col.findOne({ type: doc.type });
    if (existing) {
      console.log(`skip: ${doc.type} (already exists)`);
      continue;
    }
    await col.insertOne(doc);
    console.log(`inserted: ${doc.type}`);
  }

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
