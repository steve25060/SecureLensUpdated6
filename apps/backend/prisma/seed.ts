import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { scryptSync, randomBytes } from 'node:crypto';

const connectionString = process.env.DATABASE_URL || 'postgresql://securelens:securelens@localhost:5433/securelens';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

// Password hashing function (same as in auth service)
function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64, { N: 16384 });
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
}

async function main() {
  console.log('🌱 Seeding database...');

  try {
    // Check if demo user already exists
    const existing = await prisma.user.findFirst({
      where: { email: 'test@gmail.com' },
    });

    if (existing) {
      console.log('✅ Demo user already exists with email: test@gmail.com');
      return;
    }

    // Create demo user
    const demoUser = await prisma.user.create({
      data: {
        id: 'test-user-1',
        email: 'test@gmail.com',
        name: 'Demo User',
        passwordHash: hashPassword('Test@1234'),
        role: 'USER',
        organization: 'SecureLens Demo',
        timezone: 'UTC',
      },
    });

    console.log('✅ Demo user created successfully!');
    console.log('📧 Email: test@gmail.com');
    console.log('🔐 Password: Test@1234');
    console.log('👤 User ID:', demoUser.id);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
