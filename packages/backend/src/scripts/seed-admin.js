// Admin Seeder - Run with: node src/scripts/seed-admin.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@eventai.com';
const ADMIN_PASSWORD = 'AdminPassword123!';

async function seedAdmin() {
    try {
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
        const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

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
        console.log('\n📧 Admin Credentials:');
        console.log('   Email:', ADMIN_EMAIL);
        console.log('   Password:', ADMIN_PASSWORD);
        console.log('\n🚀 Login: POST http://localhost:3001/api/v1/auth/login');
        console.log('   Body: {"email": "admin@eventai.com", "password": "AdminPassword123!"}');

    } catch (error) {
        console.error('❌ Failed to seed admin:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

seedAdmin();
