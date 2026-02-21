// Admin Seeder Script
// Run with: ADMIN_EMAIL=admin@eventai.com ADMIN_PASSWORD=YourSecurePass123! npx ts-node src/scripts/seed-admin.ts

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

async function seedAdmin() {
    try {
        if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
            console.error('❌ ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required.');
            console.error('   Usage: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=SecurePass123! npx ts-node src/scripts/seed-admin.ts');
            process.exit(1);
        }

        if (ADMIN_PASSWORD.length < 12) {
            console.error('❌ ADMIN_PASSWORD must be at least 12 characters long.');
            process.exit(1);
        }

        console.log('🔧 Seeding admin account...');

        // Check if admin already exists
        const existingAdmin = await prisma.vendorUser.findUnique({
            where: { email: ADMIN_EMAIL },
        });

        if (existingAdmin) {
            console.log('✅ Admin already exists:', ADMIN_EMAIL);
            return;
        }

        // Create admin vendor
        const vendor = await prisma.vendor.create({
            data: {
                name: 'Event-AI Admin',
                contactEmail: ADMIN_EMAIL,
                status: 'active',
            },
        });

        console.log('✅ Created vendor:', vendor.id);

        // Hash password
        const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

        // Create admin user
        const admin = await prisma.vendorUser.create({
            data: {
                vendorId: vendor.id,
                email: ADMIN_EMAIL,
                passwordHash,
                firstName: 'Super',
                lastName: 'Admin',
                role: 'admin',
                status: 'active',
                emailVerified: true,
            },
        });

        console.log('✅ Created admin user:', admin.id);
        console.log('📧 Admin email:', ADMIN_EMAIL);
        console.log('🚀 Admin login: POST /api/v1/auth/login');
        console.log('⚠️  Change the default password after first login.');

    } catch (error) {
        console.error('❌ Failed to seed admin:', error);
    } finally {
        await prisma.$disconnect();
    }
}

seedAdmin();
