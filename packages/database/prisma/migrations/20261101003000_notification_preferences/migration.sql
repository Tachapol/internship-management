CREATE TABLE "notification_preferences" (
  "userId" UUID NOT NULL,
  "leaveAlerts" BOOLEAN NOT NULL DEFAULT true,
  "attendanceReminders" BOOLEAN NOT NULL DEFAULT true,
  "trainingPlanUpdates" BOOLEAN NOT NULL DEFAULT true,
  "announcements" BOOLEAN NOT NULL DEFAULT true,
  "emailNotifications" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
