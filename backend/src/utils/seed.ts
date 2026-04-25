import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';

async function seed() {
  console.log('Seeding database...');

  const superAdminHash = await bcrypt.hash('SuperAdmin@2026!', 12);
  const adminHash = await bcrypt.hash('Admin@Landview2026!', 12);
  const accountantHash = await bcrypt.hash('Accountant@2026!', 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@landview.com' },
    update: {},
    create: {
      email: 'superadmin@landview.com',
      passwordHash: superAdminHash,
      fullName: 'Super Administrator',
      role: 'super_admin',
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@landview.com' },
    update: {},
    create: {
      email: 'admin@landview.com',
      passwordHash: adminHash,
      fullName: 'Admin User',
      role: 'admin',
      createdBy: superAdmin.id,
    },
  });

  const accountant = await prisma.user.upsert({
    where: { email: 'accountant@landview.com' },
    update: {},
    create: {
      email: 'accountant@landview.com',
      passwordHash: accountantHash,
      fullName: 'John Accountant',
      role: 'accountant',
      createdBy: admin.id,
    },
  });

  // Seed default system settings
  await prisma.systemSetting.upsert({
    where: { key: 'default_interest_rate' },
    update: {},
    create: { key: 'default_interest_rate', value: '15', updatedBy: superAdmin.id },
  });
  await prisma.systemSetting.upsert({
    where: { key: 'company_name' },
    update: {},
    create: { key: 'company_name', value: 'Landview Properties', updatedBy: superAdmin.id },
  });
  await prisma.systemSetting.upsert({
    where: { key: 'notification_days_before_maturity' },
    update: {},
    create: { key: 'notification_days_before_maturity', value: '7', updatedBy: superAdmin.id },
  });

  // Sample investments
  const sampleInvestments = [
    {
      transactionDate: new Date('2025-10-24'),
      clientName: 'Adaeze Okonkwo',
      plotNumber: 'PLT-001A',
      duration: '6 months',
      maturityDate: new Date('2026-04-24'),
      principal: 5000000,
      interestRate: 15,
      roiAmount: 750000,
      maturityAmount: 5750000,
      clientEmail: 'adaeze@example.com',
      realtorName: 'Emeka Realtor',
      realtorEmail: 'emeka@landview.com',
      status: 'active' as const,
      createdBy: accountant.id,
    },
    {
      transactionDate: new Date('2025-07-01'),
      clientName: 'Chukwuemeka Eze',
      plotNumber: 'PLT-002B',
      duration: '12 months',
      maturityDate: new Date('2026-07-01'),
      principal: 10000000,
      interestRate: 20,
      roiAmount: 2000000,
      maturityAmount: 12000000,
      clientEmail: 'chukwu@example.com',
      realtorName: 'Funke Agent',
      realtorEmail: 'funke@landview.com',
      status: 'active' as const,
      createdBy: accountant.id,
    },
    {
      transactionDate: new Date('2025-01-15'),
      clientName: 'Ngozi Williams',
      plotNumber: 'PLT-003C',
      duration: '3 months',
      maturityDate: new Date('2025-04-15'),
      principal: 2500000,
      interestRate: 12,
      roiAmount: 300000,
      maturityAmount: 2800000,
      clientEmail: 'ngozi@example.com',
      realtorName: 'Bola Sales',
      realtorEmail: 'bola@landview.com',
      status: 'completed' as const,
      paymentCompletedBy: admin.id,
      paymentCompletedAt: new Date('2025-04-20'),
      createdBy: accountant.id,
    },
  ];

  for (const inv of sampleInvestments) {
    await prisma.investment.upsert({
      where: { id: `00000000-0000-0000-0000-${inv.plotNumber.replace(/-/g, '').padEnd(12, '0')}` },
      update: {},
      create: {
        id: `00000000-0000-0000-0000-${inv.plotNumber.replace(/-/g, '').padEnd(12, '0')}`,
        ...inv,
      },
    });
  }

  console.log('Seed complete!');
  console.log('Credentials:');
  console.log('  Super Admin: superadmin@landview.com / SuperAdmin@2026!');
  console.log('  Admin:       admin@landview.com / Admin@Landview2026!');
  console.log('  Accountant:  accountant@landview.com / Accountant@2026!');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
