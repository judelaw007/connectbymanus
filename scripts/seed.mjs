import { drizzle } from "drizzle-orm/mysql2";
import { channels } from "../drizzle/schema.js";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

async function seed() {
  console.log("🌱 Seeding database...");

  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection);

  // Default channels
  const defaultChannels = [
    {
      name: "General",
      description: "General discussions for all tax professionals",
      type: "general",
      isPrivate: false,
      createdBy: 1, // System user
    },
    {
      name: "ADIT Exam Discussion",
      description: "Discuss ADIT exam preparation and strategies",
      type: "topic",
      isPrivate: false,
      createdBy: 1,
    },
    {
      name: "VAT Questions",
      description: "Ask and answer VAT-related questions",
      type: "topic",
      isPrivate: false,
      createdBy: 1,
    },
    {
      name: "Transfer Pricing",
      description: "Transfer pricing discussions and updates",
      type: "topic",
      isPrivate: false,
      createdBy: 1,
    },
    {
      name: "International Tax",
      description: "Cross-border tax issues and regulations",
      type: "topic",
      isPrivate: false,
      createdBy: 1,
    },
    {
      name: "Corporate Tax",
      description: "Corporate taxation strategies and compliance",
      type: "topic",
      isPrivate: false,
      createdBy: 1,
    },
    {
      name: "Indirect Tax",
      description: "Indirect taxation including customs and excise",
      type: "topic",
      isPrivate: false,
      createdBy: 1,
    },
    {
      name: "Tax Technology",
      description: "Tax software, automation, and digital transformation",
      type: "topic",
      isPrivate: false,
      createdBy: 1,
    },
  ];

  try {
    for (const channel of defaultChannels) {
      await db.insert(channels).values(channel).onDuplicateKeyUpdate({
        set: { name: channel.name },
      });
      console.log(`✓ Created channel: ${channel.name}`);
    }

    console.log("✅ Database seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seed();
