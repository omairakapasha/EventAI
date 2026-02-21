const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function checkAndFixAdmin() {
  console.log('🔍 Checking admin account...\n');
  
  const admin = await prisma.vendorUser.findUnique({
    where: { email: 'admin@eventai.com' },
    include: { vendor: true }
  });
  
  if (!admin) {
    console.log('❌ Admin not found, creating new admin...\n');
    
    const vendor = await prisma.vendor.create({
      data: { 
        name: 'Event-AI Admin', 
        contactEmail: 'admin@eventai.com', 
        status: 'active' 
      }
    });
    console.log('✅ Created vendor:', vendor.id);
    
    const hash = await bcrypt.hash('AdminPassword123!', 10);
    const newAdmin = await prisma.vendorUser.create({
      data: {
        vendorId: vendor.id,
        email: 'admin@eventai.com',
        passwordHash: hash,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'admin',
        status: 'active',
        emailVerified: true
      }
    });
    
    console.log('✅ Created admin:', newAdmin.id);
    console.log('\n📧 Credentials:');
    console.log('   Email: admin@eventai.com');
    console.log('   Password: AdminPassword123!');
    console.log('   Role: admin');
    console.log('   Status: active');
    
  } else {
    console.log('✅ Admin found:', admin.id);
    console.log('   Role:', admin.role);
    console.log('   Status:', admin.status);
    console.log('   Vendor:', admin.vendor?.id);
    
    // Test password
    const valid = await bcrypt.compare('AdminPassword123!', admin.passwordHash);
    console.log('\n🔑 Password check:', valid ? 'VALID ✓' : 'INVALID ✗');
    
    if (!valid) {
      console.log('\n❌ Password mismatch, updating...');
      const newHash = await bcrypt.hash('AdminPassword123!', 10);
      await prisma.vendorUser.update({
        where: { id: admin.id },
        data: { passwordHash: newHash }
      });
      console.log('✅ Password updated to: AdminPassword123!');
    } else {
      console.log('\n✅ Password is correct');
    }
    
    // Ensure role is admin
    if (admin.role !== 'admin') {
      console.log('\n❌ Role is not admin, fixing...');
      await prisma.vendorUser.update({
        where: { id: admin.id },
        data: { role: 'admin' }
      });
      console.log('✅ Role updated to admin');
    }
    
    // Ensure status is active
    if (admin.status !== 'active') {
      console.log('\n❌ Status is not active, fixing...');
      await prisma.vendorUser.update({
        where: { id: admin.id },
        data: { status: 'active' }
      });
      console.log('✅ Status updated to active');
    }
  }
  
  console.log('\n🚀 Ready to login at: POST /api/v1/auth/login');
  console.log('   Body: {"email":"admin@eventai.com","password":"AdminPassword123!"}');
  
  await prisma.$disconnect();
}

checkAndFixAdmin().catch(e => { 
  console.error('Error:', e); 
  process.exit(1); 
});
