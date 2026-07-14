import dotenv from "dotenv";
dotenv.config({ path: ".env" });
import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db();

const filter = { "sections.type": "trust-bar" };
const docs = await db.collection("sitepages").find(filter).toArray();
console.log(`Found ${docs.length} page(s) with trust-bar sections:`);
for (const d of docs) {
  const before = d.sections.length;
  const kept = d.sections.filter((s) => s.type !== "trust-bar");
  const removed = before - kept.length;
  console.log(`  ${d.key}: dropping ${removed} (${before} -> ${kept.length})`);
  await db.collection("sitepages").updateOne(
    { _id: d._id },
    { $set: { sections: kept, updatedAt: new Date() } },
  );
}

await client.close();
