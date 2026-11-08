-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    PRIMARY KEY ("roleId", "permissionId"),
    CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "employeeId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "User_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "departmentId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Position_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matricule" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "birthDate" DATETIME,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "photoKey" TEXT,
    "positionId" TEXT NOT NULL,
    "teamId" TEXT,
    "scheduleId" TEXT,
    "hireDate" DATETIME NOT NULL,
    "contractType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "departureDate" DATETIME,
    "extra" TEXT,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Employee_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Employee_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Employee_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "WorkSchedule" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Contract_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "days" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "cancelledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeaveAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leaveRequestId" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeaveAttachment_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "LeaveRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeaveDecision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leaveRequestId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "comment" TEXT,
    "decidedById" TEXT NOT NULL,
    "decidedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeaveDecision_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "LeaveRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LeaveDecision_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "graceMinutes" INTEGER NOT NULL DEFAULT 10,
    "color" TEXT NOT NULL DEFAULT '#EF8200',
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "WorkSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "cycleStart" DATETIME,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "rotationOffset" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Team_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Team_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "WorkSchedule" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmployeeSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "kind" TEXT NOT NULL,
    "shiftId" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmployeeSchedule_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EmployeeSchedule_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "checkIn" DATETIME,
    "checkOut" DATETIME,
    "status" TEXT NOT NULL,
    "lateMinutes" INTEGER NOT NULL DEFAULT 0,
    "overtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "anomalies" TEXT,
    "manualStatus" TEXT,
    "notes" TEXT,
    "resolvedAt" DATETIME,
    "resolvedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AttendanceRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AttendanceRecord_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AttendanceEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "recordId" TEXT,
    "type" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "source" TEXT NOT NULL,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AttendanceEvent_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AttendanceEvent_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "AttendanceRecord" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AttendanceEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "authorId" TEXT NOT NULL,
    "publishedAt" DATETIME,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnnouncementAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "announcementId" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnnouncementAttachment_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnnouncementRead" (
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("announcementId", "userId"),
    CONSTRAINT "AnnouncementRead_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AnnouncementRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "before" TEXT,
    "after" TEXT,
    "ip" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");

-- CreateIndex
CREATE INDEX "User_roleId_idx" ON "User"("roleId");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE INDEX "Department_name_idx" ON "Department"("name");

-- CreateIndex
CREATE INDEX "Position_title_idx" ON "Position"("title");

-- CreateIndex
CREATE UNIQUE INDEX "Position_departmentId_title_key" ON "Position"("departmentId", "title");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_matricule_key" ON "Employee"("matricule");

-- CreateIndex
CREATE INDEX "Employee_lastName_firstName_idx" ON "Employee"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "Employee_positionId_idx" ON "Employee"("positionId");

-- CreateIndex
CREATE INDEX "Employee_status_idx" ON "Employee"("status");

-- CreateIndex
CREATE INDEX "Employee_deletedAt_idx" ON "Employee"("deletedAt");

-- CreateIndex
CREATE INDEX "Contract_employeeId_idx" ON "Contract"("employeeId");

-- CreateIndex
CREATE INDEX "LeaveRequest_employeeId_status_idx" ON "LeaveRequest"("employeeId", "status");

-- CreateIndex
CREATE INDEX "LeaveRequest_status_idx" ON "LeaveRequest"("status");

-- CreateIndex
CREATE INDEX "LeaveRequest_startDate_endDate_idx" ON "LeaveRequest"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveAttachment_fileKey_key" ON "LeaveAttachment"("fileKey");

-- CreateIndex
CREATE INDEX "LeaveDecision_leaveRequestId_idx" ON "LeaveDecision"("leaveRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "Holiday_date_key" ON "Holiday"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Shift_code_key" ON "Shift"("code");

-- CreateIndex
CREATE UNIQUE INDEX "WorkSchedule_name_key" ON "WorkSchedule"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE INDEX "EmployeeSchedule_date_idx" ON "EmployeeSchedule"("date");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeSchedule_employeeId_date_kind_key" ON "EmployeeSchedule"("employeeId", "date", "kind");

-- CreateIndex
CREATE INDEX "AttendanceRecord_date_status_idx" ON "AttendanceRecord"("date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_employeeId_date_key" ON "AttendanceRecord"("employeeId", "date");

-- CreateIndex
CREATE INDEX "AttendanceEvent_employeeId_timestamp_idx" ON "AttendanceEvent"("employeeId", "timestamp");

-- CreateIndex
CREATE INDEX "Announcement_status_publishedAt_idx" ON "Announcement"("status", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AnnouncementAttachment_fileKey_key" ON "AnnouncementAttachment"("fileKey");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
