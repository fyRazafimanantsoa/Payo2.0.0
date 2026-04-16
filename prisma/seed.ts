import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";
import { systemTemplates } from "../src/lib/templates/seed-templates";

async function main() {
  console.log("=== Payo v3 Seed Script ===\n");

  // ---------------------------------------------------------------------------
  // 1. Create admin user
  // ---------------------------------------------------------------------------
  console.log("1. Creating admin user...");

  const adminEmail = "admin@payo.com";
  const adminPassword = "admin123";
  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  try {
    const admin = await db.user.create({
      data: {
        email: adminEmail,
        hashedPassword,
        businessName: "Payo Admin",
        defaultReminderTone: "friendly",
        planType: "pro",
        subscriptionStatus: "active",
        isAdmin: true,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });
    console.log(`   ✅ Admin user created: ${admin.email} (id: ${admin.id})`);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.log(`   ⚠️  Admin user creation skipped: ${msg}`);
  }

  // ---------------------------------------------------------------------------
  // 2. Seed system templates
  // ---------------------------------------------------------------------------
  console.log(`\n2. Seeding ${systemTemplates.length} system templates...`);

  let created = 0;
  let skipped = 0;

  for (const template of systemTemplates) {
    try {
      await db.template.create({ data: template });
      created++;
      console.log(`   ✅ Created: ${template.name} (${template.triggerPoint} / ${template.tone})`);
    } catch {
      skipped++;
      console.log(`   ⏭️  Skipped (exists): ${template.name}`);
    }
  }

  console.log(`\n=== Seed Complete ===`);
  console.log(`   Templates: ${created} created, ${skipped} skipped of ${systemTemplates.length} total`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
