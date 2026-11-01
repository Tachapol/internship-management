const { PrismaClient, UserRole, UserStatus } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const studentsData = [
  {
    name: "Oliver Bennett",
    email: "devplus.student.demo01@gmail.com",
    companyName: "DevPlus Software Solutions",
    teamName: "Frontend Engineering Team",
    mentorName: "David Miller",
    phone: "+1 (555) 301-0001",
  },
  {
    name: "Emma Wilson",
    email: "devplus.student.demo02@gmail.com",
    companyName: "DevPlus Software Solutions",
    teamName: "Frontend Engineering Team",
    mentorName: "David Miller",
    phone: "+1 (555) 301-0002",
  },
  {
    name: "Lucas Parker",
    email: "devplus.student.demo03@gmail.com",
    companyName: "DevPlus Software Solutions",
    teamName: "Backend & Cloud Services Team",
    mentorName: "Elena Rostova",
    phone: "+1 (555) 301-0003",
  },
  {
    name: "Sophia Hayes",
    email: "devplus.student.demo04@gmail.com",
    companyName: "DevPlus Software Solutions",
    teamName: "Backend & Cloud Services Team",
    mentorName: "Elena Rostova",
    phone: "+1 (555) 301-0004",
  },
  {
    name: "James Carter",
    email: "devplus.student.demo05@gmail.com",
    companyName: "DevPlus Software Solutions",
    teamName: "Frontend Engineering Team",
    mentorName: "David Miller",
    phone: "+1 (555) 301-0005",
  },
  {
    name: "Kim Minjun",
    email: "devplus.student.demo06@gmail.com",
    companyName: "Nexus Tech Labs",
    teamName: "Mobile App Development Team",
    mentorName: "Marcus Vance",
    phone: "+1 (555) 302-0006",
  },
  {
    name: "Lee Seoyeon",
    email: "devplus.student.demo07@gmail.com",
    companyName: "Nexus Tech Labs",
    teamName: "Mobile App Development Team",
    mentorName: "Marcus Vance",
    phone: "+1 (555) 302-0007",
  },
  {
    name: "Park Jihoon",
    email: "devplus.student.demo08@gmail.com",
    companyName: "Nexus Tech Labs",
    teamName: "QA & Automation Team",
    mentorName: "Thanh Thao",
    phone: "+1 (555) 302-0008",
  },
  {
    name: "Choi Subin",
    email: "devplus.student.demo09@gmail.com",
    companyName: "Nexus Tech Labs",
    teamName: "QA & Automation Team",
    mentorName: "Thanh Thao",
    phone: "+1 (555) 302-0009",
  },
  {
    name: "Jung Haeun",
    email: "devplus.student.demo10@gmail.com",
    companyName: "Nexus Tech Labs",
    teamName: "Mobile App Development Team",
    mentorName: "Marcus Vance",
    phone: "+1 (555) 302-0010",
  },
];

async function addStudents() {
  console.log("Adding 10 demo students...");
  const passwordHash = await bcrypt.hash("Password1234!", 10);

  const companies = await prisma.company.findMany();
  const teams = await prisma.team.findMany();
  const mentors = await prisma.user.findMany({ where: { role: UserRole.MENTOR } });

  const compMap = new Map(companies.map(c => [c.name, c.id]));
  const teamMap = new Map(teams.map(t => [t.name, t.id]));
  const mentorMap = new Map(mentors.map(m => [m.name, m.id]));

  for (const s of studentsData) {
    const companyId = compMap.get(s.companyName) || companies[0]?.id;
    const teamId = teamMap.get(s.teamName) || null;
    const mentorId = mentorMap.get(s.mentorName) || null;

    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: {
        name: s.name,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        companyId,
        teamId,
        mentorId,
        phone: s.phone,
        deletedAt: null,
      },
      create: {
        name: s.name,
        email: s.email,
        passwordHash,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        companyId,
        teamId,
        mentorId,
        phone: s.phone,
      },
    });

    console.log(`✓ Added/Updated: ${user.name} <${user.email}> (ID: ${user.id})`);
  }

  console.log("All 10 students added successfully!");
}

addStudents()
  .catch(err => {
    console.error("Error adding students:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

