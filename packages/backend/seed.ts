import { PrismaClient } from './src/generated/client/index.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

async function main() {
    console.log('🏗️  Adding new vendors and admin users (keeping existing data)...\n');

    const passwordHash = await bcrypt.hash('Vendor@123', SALT_ROUNDS);
    const adminPasswordHash = await bcrypt.hash('Admin@2026', SALT_ROUNDS);

    // ====== ADDITIONAL RANDOM VENDORS ======
    const newVendors = [
        {
            vendor: {
                name: 'Nikkah Stories Photography',
                businessType: 'Photography',
                contactEmail: 'hello@nikkahstories.pk',
                phone: '+92 311 2345678',
                website: 'https://nikkahstories.pk',
                description: 'Boutique wedding photography studio specializing in Nikkah ceremonies, candid shots, and traditional couple portraits. Serving across Pakistan.',
                status: 'ACTIVE' as const, verified: true, tier: 'SILVER' as const,
                serviceAreas: ['Lahore', 'Islamabad', 'Karachi', 'Peshawar'],
                address: { city: 'Islamabad', state: 'ICT', country: 'Pakistan', street: 'F-8 Markaz' },
            },
            user: { email: 'studio@nikkahstories.pk', firstName: 'Sara', lastName: 'Iqbal' },
            services: [
                { name: 'Nikkah Ceremony Coverage', category: 'photography' as const, description: 'Full Nikkah ceremony coverage with 2 photographers, 300+ edited photos, and a premium leather-bound album', unitType: 'per_event' as const, leadTimeDays: 14 },
                { name: 'Couple Portrait Session', category: 'photography' as const, description: '2-hour outdoor portrait session with professional makeup artist, 50 edited photos', unitType: 'per_event' as const, leadTimeDays: 7 },
            ],
        },
        {
            vendor: {
                name: 'Lahore Lights & Sound',
                businessType: 'Lighting & AV',
                contactEmail: 'events@lahorelights.pk',
                phone: '+92 322 9998877',
                description: 'Professional lighting, LED walls, sound systems, and special effects for weddings, concerts, and corporate events. State-of-the-art equipment.',
                status: 'ACTIVE' as const, verified: true, tier: 'BRONZE' as const,
                serviceAreas: ['Lahore', 'Faisalabad', 'Multan'],
                address: { city: 'Lahore', state: 'Punjab', country: 'Pakistan', street: 'Johar Town' },
            },
            user: { email: 'tech@lahorelights.pk', firstName: 'Tariq', lastName: 'Mehmood' },
            services: [
                { name: 'Premium Lighting Setup', category: 'decoration' as const, description: 'Full venue lighting with intelligent moving heads, LED wash, and fairy lights. Includes setup and teardown.', unitType: 'per_event' as const, leadTimeDays: 7 },
                { name: 'LED Video Wall (P3)', category: 'entertainment' as const, description: '12x8ft indoor LED video wall for slideshows, live feeds, and video playback. Includes operator.', unitType: 'per_event' as const, leadTimeDays: 10 },
                { name: 'Concert Sound System', category: 'music' as const, description: 'JBL line array system for events up to 5,000 attendees. Includes mixing console and technician.', unitType: 'per_event' as const, leadTimeDays: 7 },
            ],
        },
        {
            vendor: {
                name: 'Dulhan Couture',
                businessType: 'Bridal Services',
                contactEmail: 'bookings@dulhancouture.pk',
                phone: '+92 335 1122334',
                website: 'https://dulhancouture.pk',
                description: 'Luxury bridal makeup, hairstyling, and mehndi artistry. Celebrity makeup artist with 10+ years of experience in high-end weddings.',
                status: 'ACTIVE' as const, verified: true, tier: 'GOLD' as const,
                serviceAreas: ['Karachi', 'Lahore', 'Islamabad'],
                address: { city: 'Karachi', state: 'Sindh', country: 'Pakistan', street: 'Zamzama, DHA Phase 5' },
            },
            user: { email: 'artist@dulhancouture.pk', firstName: 'Ayesha', lastName: 'Nawaz' },
            services: [
                { name: 'Bridal Signature Makeup', category: 'other' as const, description: 'Full bridal makeup with airbrush, hairstyling, dupatta setting, and jewelry placement. Includes trial session.', unitType: 'per_event' as const, leadTimeDays: 21 },
                { name: 'Mehndi Art (Bridal Hands & Feet)', category: 'other' as const, description: 'Intricate bridal mehndi design for both hands (full arms) and feet. Premium organic mehndi paste.', unitType: 'per_event' as const, leadTimeDays: 3 },
            ],
        },
        {
            vendor: {
                name: 'Peshawar Tents & Shamiana',
                businessType: 'Tent & Canopy',
                contactEmail: 'orders@peshawartents.pk',
                phone: '+92 302 5554433',
                description: 'Traditional shamiana and modern tent services for outdoor events, weddings, and gatherings in Khyber Pakhtunkhwa and Punjab.',
                status: 'ACTIVE' as const, verified: true, tier: 'BRONZE' as const,
                serviceAreas: ['Peshawar', 'Islamabad', 'Rawalpindi', 'Mardan'],
                address: { city: 'Peshawar', state: 'KPK', country: 'Pakistan', street: 'University Road' },
            },
            user: { email: 'manager@peshawartents.pk', firstName: 'Khurram', lastName: 'Shah' },
            services: [
                { name: 'Premium Shamiana (500 guests)', category: 'venue' as const, description: 'Traditional white shamiana with red carpet, fans/heaters, chairs, and tables for up to 500 guests', unitType: 'per_event' as const, capacity: 500, leadTimeDays: 7 },
                { name: 'Waterproof Event Tent', category: 'venue' as const, description: 'Modern waterproof German tent with AC, chandeliers, and flooring. Capacity 300 guests.', unitType: 'per_event' as const, capacity: 300, leadTimeDays: 10 },
            ],
        },
        {
            vendor: {
                name: 'KarachiSweets & Confections',
                businessType: 'Bakery & Desserts',
                contactEmail: 'orders@karachisweets.pk',
                phone: '+92 300 1112233',
                website: 'https://karachisweets.pk',
                description: 'Artisan wedding cakes, dessert tables, and traditional mithai for celebrations. Custom cake designs with fondant and sugar art.',
                status: 'ACTIVE' as const, verified: true, tier: 'SILVER' as const,
                serviceAreas: ['Karachi', 'Hyderabad'],
                address: { city: 'Karachi', state: 'Sindh', country: 'Pakistan', street: 'Tariq Road' },
            },
            user: { email: 'bakery@karachisweets.pk', firstName: 'Nadia', lastName: 'Sheikh' },
            services: [
                { name: 'Custom Wedding Cake (5 Tier)', category: 'catering' as const, description: '5-tier custom fondant wedding cake with sugar flowers, serves 200+ guests. Includes delivery and setup.', unitType: 'per_event' as const, leadTimeDays: 14 },
                { name: 'Dessert Table Setup', category: 'catering' as const, description: 'Full dessert station with cupcakes, macarons, chocolates, and traditional mithai for 300 guests', unitType: 'per_event' as const, leadTimeDays: 7 },
                { name: 'Traditional Mithai Box (per 100)', category: 'catering' as const, description: 'Premium assorted mithai boxes — barfi, gulab jamun, rasgulla, ladoo. Min order 100 boxes.', unitType: 'per_unit' as const, leadTimeDays: 5 },
            ],
        },
        {
            vendor: {
                name: 'SafariEvents Islamabad',
                businessType: 'Event Management',
                contactEmail: 'plan@safarievents.pk',
                phone: '+92 315 7778899',
                website: 'https://safarievents.pk',
                description: 'Full-service event management company. From corporate conferences to grand weddings — we handle planning, coordination, and execution.',
                status: 'ACTIVE' as const, verified: true, tier: 'GOLD' as const,
                serviceAreas: ['Islamabad', 'Rawalpindi', 'Lahore', 'Karachi'],
                address: { city: 'Islamabad', state: 'ICT', country: 'Pakistan', street: 'Blue Area, Jinnah Avenue' },
            },
            user: { email: 'events@safarievents.pk', firstName: 'Omar', lastName: 'Farooq' },
            services: [
                { name: 'Full Wedding Planning', category: 'planning' as const, description: 'End-to-end wedding planning including venue selection, vendor coordination, day-of management, and timeline. 3-event package (Mehndi, Baraat, Walima).', unitType: 'per_event' as const, leadTimeDays: 60 },
                { name: 'Corporate Event Management', category: 'planning' as const, description: 'Complete corporate event planning — conferences, product launches, galas. Includes AV, catering coordination, and registration.', unitType: 'per_event' as const, leadTimeDays: 30 },
                { name: 'Day-of Coordination', category: 'planning' as const, description: 'Professional event coordinator to manage your event day — vendor arrival, timeline management, guest handling.', unitType: 'per_event' as const, leadTimeDays: 7 },
            ],
        },
    ];

    console.log('📌 Adding new vendors...');
    for (const v of newVendors) {
        // Skip if vendor already exists
        const existing = await prisma.vendor.findUnique({ where: { contactEmail: v.vendor.contactEmail } });
        if (existing) {
            console.log(`  ⏭️  ${v.vendor.name} already exists, skipping`);
            continue;
        }

        const vendor = await prisma.vendor.create({
            data: {
                name: v.vendor.name,
                businessType: v.vendor.businessType || null,
                contactEmail: v.vendor.contactEmail,
                phone: v.vendor.phone || null,
                website: v.vendor.website || null,
                description: v.vendor.description || null,
                status: v.vendor.status,
                verified: v.vendor.verified,
                tier: v.vendor.tier,
                serviceAreas: v.vendor.serviceAreas,
                address: v.vendor.address,
            },
        });

        await prisma.vendorUser.create({
            data: {
                vendorId: vendor.id,
                email: v.user.email,
                passwordHash,
                firstName: v.user.firstName,
                lastName: v.user.lastName,
                role: 'owner',
                emailVerified: true,
            },
        });

        for (const svc of v.services) {
            await prisma.service.create({
                data: {
                    vendorId: vendor.id,
                    name: svc.name,
                    category: svc.category,
                    description: svc.description,
                    unitType: svc.unitType,
                    capacity: (svc as any).capacity || null,
                    leadTimeDays: svc.leadTimeDays || 0,
                    isActive: true,
                },
            });
        }
        console.log(`  ✅ ${vendor.name} — ${v.services.length} services`);
    }

    // ====== ADMIN / SUPER-ADMIN USERS ======
    console.log('\n👑 Adding admin users...');

    // Create a platform admin vendor (umbrella for admin access)
    let adminVendor = await prisma.vendor.findUnique({ where: { contactEmail: 'admin@eventai.pk' } });
    if (!adminVendor) {
        adminVendor = await prisma.vendor.create({
            data: {
                name: 'Event-AI Platform',
                businessType: 'Platform Administration',
                contactEmail: 'admin@eventai.pk',
                phone: '+92 300 0000001',
                website: 'https://eventai.pk',
                description: 'Platform administration and management. Full authority over all vendors, services, bookings, and system settings.',
                status: 'ACTIVE',
                verified: true,
                tier: 'GOLD',
                serviceAreas: ['Pakistan'],
                address: { city: 'Islamabad', state: 'ICT', country: 'Pakistan', street: 'Blue Area' },
            },
        });
        console.log(`  ✅ Created admin vendor: Event-AI Platform`);
    } else {
        console.log(`  ⏭️  Admin vendor already exists`);
    }

    // Admin users with full authority
    const adminUsers = [
        { email: 'superadmin@eventai.pk', firstName: 'Super', lastName: 'Admin', role: 'admin' as const },
        { email: 'admin@eventai.pk', firstName: 'Platform', lastName: 'Admin', role: 'admin' as const },
        { email: 'umair@eventai.pk', firstName: 'Umair', lastName: 'Admin', role: 'admin' as const },
    ];

    for (const au of adminUsers) {
        const existing = await prisma.vendorUser.findUnique({ where: { email: au.email } });
        if (existing) {
            console.log(`  ⏭️  ${au.email} already exists`);
            continue;
        }
        await prisma.vendorUser.create({
            data: {
                vendorId: adminVendor.id,
                email: au.email,
                passwordHash: adminPasswordHash,
                firstName: au.firstName,
                lastName: au.lastName,
                role: au.role,
                emailVerified: true,
            },
        });
        console.log(`  ✅ ${au.email} (role: ${au.role})`);
    }

    // Also add an admin-level user to each existing vendor
    console.log('\n🔑 Adding admin users to existing vendors...');
    const allVendors = await prisma.vendor.findMany({ where: { contactEmail: { not: 'admin@eventai.pk' } } });
    for (const v of allVendors) {
        const adminEmail = `admin@${v.contactEmail.split('@')[1]}`;
        const existing = await prisma.vendorUser.findUnique({ where: { email: adminEmail } });
        if (existing) {
            // Upgrade to admin if not already
            if (existing.role !== 'admin' && existing.role !== 'owner') {
                await prisma.vendorUser.update({ where: { id: existing.id }, data: { role: 'admin' } });
                console.log(`  🔼 Upgraded ${adminEmail} to admin`);
            } else {
                console.log(`  ⏭️  ${adminEmail} already exists as ${existing.role}`);
            }
            continue;
        }
        await prisma.vendorUser.create({
            data: {
                vendorId: v.id,
                email: adminEmail,
                passwordHash: adminPasswordHash,
                firstName: 'Admin',
                lastName: v.name.split(' ')[0],
                role: 'admin',
                emailVerified: true,
            },
        });
        console.log(`  ✅ ${adminEmail} → ${v.name}`);
    }

    // ====== PLATFORM USERS (User table) ======
    console.log('\n👤 Adding platform users...');
    const userPasswordHash = await bcrypt.hash('User@2026', SALT_ROUNDS);
    const platformUsers = [
        { email: 'user@eventai.pk', firstName: 'Test', lastName: 'User', phone: '+92 300 1234567' },
        { email: 'umair@eventai.pk', firstName: 'Umair', lastName: 'User', phone: '+92 300 7654321' },
    ];

    for (const u of platformUsers) {
        const existing = await prisma.user.findUnique({ where: { email: u.email } });
        if (existing) {
            if (existing.status !== 'approved') {
                await prisma.user.update({ where: { id: existing.id }, data: { status: 'approved', emailVerified: true } });
                console.log(`  🔼 Approved existing user: ${u.email}`);
            } else {
                console.log(`  ⏭️  User ${u.email} already exists and is approved`);
            }
            continue;
        }
        await prisma.user.create({
            data: {
                email: u.email,
                passwordHash: userPasswordHash,
                firstName: u.firstName,
                lastName: u.lastName,
                phone: u.phone,
                status: 'approved',
                emailVerified: true,
            },
        });
        console.log(`  ✅ Created user: ${u.email}`);
    }

    // ====== SUMMARY ======
    const vendorCount = await prisma.vendor.count();
    const vendorUserCount = await prisma.vendorUser.count();
    const platformUserCount = await prisma.user.count();
    const serviceCount = await prisma.service.count();

    console.log(`\n🎉 Database now has:`);
    console.log(`   📦 ${vendorCount} vendors`);
    console.log(`   👤 ${vendorUserCount} vendor users`);
    console.log(`   👥 ${platformUserCount} platform users`);
    console.log(`   🛠️  ${serviceCount} services`);

    console.log('\n📧 Login credentials:');
    console.log('   Vendor accounts (password: Vendor@123):');
    const vendors = await prisma.vendorUser.findMany({ where: { role: 'owner' }, include: { vendor: true } });
    for (const u of vendors) {
        console.log(`     • ${u.vendor.name}: ${u.email}`);
    }
    console.log('\n   Admin accounts (password: Admin@2026):');
    const admins = await prisma.vendorUser.findMany({ where: { role: 'admin' }, include: { vendor: true } });
    for (const u of admins) {
        console.log(`     • ${u.vendor.name}: ${u.email}`);
    }
    console.log('\n   Platform User accounts (password: User@2026):');
    for (const u of platformUsers) {
        console.log(`     • ${u.email}`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
