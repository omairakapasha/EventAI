const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createAdmin() {
  const email = 'admin@eventai.com';
  const password = 'AdminPassword123!';
  
  // Check if vendor exists
  let vendor = await prisma.vendor.findUnique({
    where: { contactEmail: email }
  });
  
  if (!vendor) {
    vendor = await prisma.vendor.create({
      data: { 
        name: 'Event-AI Admin', 
        contactEmail: email, 
        status: 'active' 
      }
    });
    console.log('Created vendor:', vendor.id);
  } else {
    console.log('Vendor exists:', vendor.id);
  }
  
  // Check if admin exists
  let admin = await prisma.vendorUser.findUnique({
    where: { email }
  });
  
  const hash = await bcrypt.hash(password, 10);
  
  if (admin) {
    // Update existing admin
    admin = await prisma.vendorUser.update({
      where: { email },
      data: {
        passwordHash: hash,
        role: 'admin',
        status: 'active',
        emailVerified: true
      }
    });
    console.log('Updated admin:', admin.id);
  } else {
    // Create new admin
    admin = await prisma.vendorUser.create({
      data: {
        vendorId: vendor.id,
        email,
        passwordHash: hash,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'admin',
        status: 'active',
        emailVerified: true
      }
    });
    console.log('Created admin:', admin.id);
  }
  
  console.log('\n=== ADMIN CREDENTIALS ===');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('Role:', admin.role);
  console.log('Status:', admin.status);
  console.log('========================\n');
  
  await prisma.disconnect();
}

createAdmin().catch(e => { 
  console.error('Error:', e); 
  prisma.disconnect();
  process.exit(1); 
});
