const { PrismaClient, AttendanceStatus } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🗓️ Generating attendance records for November 2026...');

  // Target all active students and Sophia Martinez
  const students = await prisma.user.findMany({
    where: {
      role: 'STUDENT',
      OR: [
        { status: 'ACTIVE' },
        { email: 'intern.sophia@nexustech.io' },
        { email: 'thachapol47@gmail.com' }
      ]
    },
    select: { id: true, name: true, email: true, company: { select: { name: true } } }
  });

  console.log(`Found ${students.length} students to generate attendance for:`);
  students.forEach(s => console.log(` - ${s.name} (${s.email}) [${s.company?.name || 'No Company'}]`));

  // Locations pool
  const locations = [
    'Headquarters Desk A-12',
    'DevPlus Main Office - Floor 4',
    'Nexus Tech Innovation Lab',
    'Remote / Home Office',
    'Engineering Lab Room 302',
  ];

  let totalCreatedOrUpdated = 0;

  // Days in November 2026: 1 to 30
  for (let day = 1; day <= 30; day++) {
    // 2026-11-01 to 2026-11-30
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `2026-11-${dayStr}`;
    const dateObj = new Date(`${dateStr}T00:00:00.000Z`);

    // Day of week: 0 = Sun, 6 = Sat
    const dayOfWeek = dateObj.getUTCDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // Weekend, skip
      continue;
    }

    for (const student of students) {
      let status = AttendanceStatus.PRESENT;
      let note = null;
      let checkIn = null;
      let checkOut = null;
      let checkInIp = `192.168.1.${10 + (student.name.length * 3 + day) % 80}`;
      let checkOutIp = checkInIp;
      let checkInLocation = locations[(day + student.name.length) % locations.length];
      let checkOutLocation = checkInLocation;

      // Handle specific known leaves in November 2026
      if (student.email === 'intern.olivia@devplus.io' && (day === 2 || day === 3)) {
        status = AttendanceStatus.ON_LEAVE;
        note = 'Approved Leave: Severe migraine and acute food poisoning, doctor recommended 2 days rest.';
      } else if (student.email === 'intern.ethan@devplus.io' && (day === 4 || day === 5)) {
        status = AttendanceStatus.ON_LEAVE;
        note = 'Approved Leave: Attending university capstone project presentation and final defense.';
      } else if (student.email === 'intern.liam@devplus.io' && day === 10) {
        status = AttendanceStatus.ON_LEAVE;
        note = 'Approved Leave: Scheduled government passport renewal appointment.';
      } else if (student.email === 'thachapol47@gmail.com' && day === 18) {
        status = AttendanceStatus.ON_LEAVE;
        note = 'Approved Leave: Personal university administrative errand.';
      } else if ((day === 9 && student.email === 'thachapol47@gmail.com') ||
                 (day === 16 && student.email === 'intern.ethan@devplus.io') ||
                 (day === 12 && student.email === 'intern.olivia@devplus.io') ||
                 (day === 23 && student.email === 'intern.liam@devplus.io') ||
                 (day === 6 && student.email === 'intern.sophia@nexustech.io')) {
        // Late arrivals
        status = AttendanceStatus.LATE;
        // Check in between 08:15 and 08:35 local (+7), which is 01:15 to 01:35 UTC
        const lateMinute = 15 + ((day * 7 + student.name.length) % 20);
        checkIn = new Date(`${dateStr}T01:${String(lateMinute).padStart(2, '0')}:12.000Z`);
        checkOut = new Date(`${dateStr}T10:45:00.000Z`); // 17:45 local
        note = 'Traffic congestion delay';
      } else if (day === 27 && student.email === 'intern.sophia@nexustech.io') {
        // One absent day for Sophia
        status = AttendanceStatus.ABSENT;
        note = 'Absent without notice';
      } else {
        // Standard PRESENT
        // Check in between 07:42 and 07:56 local (+7), which is 00:42 to 00:56 UTC
        const presentMinute = 42 + ((day * 3 + student.name.length) % 15);
        checkIn = new Date(`${dateStr}T00:${String(presentMinute).padStart(2, '0')}:25.000Z`);
        
        // Check out between 17:05 and 17:35 local (+7), which is 10:05 to 10:35 UTC
        const outMinute = 5 + ((day * 5 + student.name.length) % 30);
        checkOut = new Date(`${dateStr}T10:${String(outMinute).padStart(2, '0')}:40.000Z`);
      }

      await prisma.attendance.upsert({
        where: {
          userId_date: {
            userId: student.id,
            date: dateObj,
          },
        },
        update: {
          checkIn,
          checkOut,
          checkInIp: status === AttendanceStatus.ON_LEAVE || status === AttendanceStatus.ABSENT ? null : checkInIp,
          checkOutIp: status === AttendanceStatus.ON_LEAVE || status === AttendanceStatus.ABSENT ? null : checkOutIp,
          checkInLocation: status === AttendanceStatus.ON_LEAVE || status === AttendanceStatus.ABSENT ? null : checkInLocation,
          checkOutLocation: status === AttendanceStatus.ON_LEAVE || status === AttendanceStatus.ABSENT ? null : checkOutLocation,
          status,
          note,
        },
        create: {
          userId: student.id,
          date: dateObj,
          checkIn,
          checkOut,
          checkInIp: status === AttendanceStatus.ON_LEAVE || status === AttendanceStatus.ABSENT ? null : checkInIp,
          checkOutIp: status === AttendanceStatus.ON_LEAVE || status === AttendanceStatus.ABSENT ? null : checkOutIp,
          checkInLocation: status === AttendanceStatus.ON_LEAVE || status === AttendanceStatus.ABSENT ? null : checkInLocation,
          checkOutLocation: status === AttendanceStatus.ON_LEAVE || status === AttendanceStatus.ABSENT ? null : checkOutLocation,
          status,
          note,
        },
      });

      totalCreatedOrUpdated++;
    }
  }

  console.log(`✅ Successfully seeded/updated ${totalCreatedOrUpdated} attendance records for November 2026 across ${students.length} students.`);
}

main()
  .catch((e) => {
    console.error('Error seeding attendance:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
