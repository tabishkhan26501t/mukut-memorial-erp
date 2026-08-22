-- Add users, roles and permissions to the ERP.
-- Non-destructive: renames `Admin` to `User` (data preserved) and adds role/permission tables.

-- 1. Role
CREATE TABLE `Role` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `isSystem` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `Role_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. Permission
CREATE TABLE `Permission` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `module` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `Permission_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 3. RolePermission
CREATE TABLE `RolePermission` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `roleId` INT NOT NULL,
    `permissionId` INT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `RolePermission_roleId_permissionId_key`(`roleId`, `permissionId`),
    INDEX `RolePermission_permissionId_idx`(`permissionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `Permission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Default roles
INSERT INTO `Role` (`name`, `description`, `isSystem`, `createdAt`, `updatedAt`) VALUES
('SUPER_ADMIN', 'Full system access including users, backups and restore', 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('PRINCIPAL', 'School-wide administration (no restore, no disable users)', 0, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('TEACHER', 'Assigned classes: attendance, marks and exams', 0, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('ACCOUNTANT', 'Student view, full fee management and reports', 0, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('RECEPTION', 'Student registration, documents and basic viewing', 0, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('STAFF', 'Only explicitly granted permissions', 0, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

-- 5. Default permissions
INSERT INTO `Permission` (`name`, `module`, `description`, `createdAt`, `updatedAt`) VALUES
('DASHBOARD_VIEW', 'Dashboard', 'View dashboard stats, charts and activity', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('SEARCH', 'Dashboard', 'Use global search across modules', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('STUDENT_VIEW', 'Students', 'View student records', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('STUDENT_CREATE', 'Students', 'Create students (incl. CSV import)', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('STUDENT_UPDATE', 'Students', 'Update students and photos', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('STUDENT_DELETE', 'Students', 'Delete students', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('TEACHER_VIEW', 'Teachers', 'View teacher records', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('TEACHER_CREATE', 'Teachers', 'Create teachers', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('TEACHER_UPDATE', 'Teachers', 'Update teachers and photos', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('TEACHER_DELETE', 'Teachers', 'Delete teachers', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('CLASS_VIEW', 'Classes', 'View classes', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('CLASS_CREATE', 'Classes', 'Create classes', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('CLASS_UPDATE', 'Classes', 'Update classes', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('CLASS_DELETE', 'Classes', 'Delete classes', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('SUBJECT_VIEW', 'Subjects', 'View subjects', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('SUBJECT_CREATE', 'Subjects', 'Create subjects', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('SUBJECT_UPDATE', 'Subjects', 'Update subjects', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('SUBJECT_DELETE', 'Subjects', 'Delete subjects', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('EXAMS_VIEW', 'Exams', 'View exams', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('EXAMS_CREATE', 'Exams', 'Create exams', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('EXAMS_UPDATE', 'Exams', 'Update exams', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('EXAMS_DELETE', 'Exams', 'Delete exams', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('MARKS_VIEW', 'Marks', 'View marks and reports', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('MARKS_CREATE', 'Marks', 'Enter marks', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('MARKS_UPDATE', 'Marks', 'Update/save marks', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('ATTENDANCE_VIEW', 'Attendance', 'View attendance and reports', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('ATTENDANCE_CREATE', 'Attendance', 'Mark student attendance', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('ATTENDANCE_UPDATE', 'Attendance', 'Update attendance records', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('FEES_VIEW', 'Fees', 'View fee records', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('FEES_CREATE', 'Fees', 'Create fee records', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('FEES_UPDATE', 'Fees', 'Update fee records', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('FEES_DELETE', 'Fees', 'Delete fee records', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('NOTIFICATION_VIEW', 'Notifications', 'View notifications and mark read', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('NOTIFICATION_CREATE', 'Notifications', 'Create notifications', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('NOTIFICATION_MANAGE', 'Notifications', 'Delete/manage notifications', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('DOCUMENT_VIEW', 'Documents', 'View and download student documents', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('DOCUMENT_UPLOAD', 'Documents', 'Upload student documents', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('DOCUMENT_DELETE', 'Documents', 'Delete student documents', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('REPORT_VIEW', 'Reports', 'View reports', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('REPORT_PRINT', 'Reports', 'Print/Pdf reports (profiles, marksheets, receipts)', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('SETTINGS_VIEW', 'Settings', 'View school settings', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('SETTINGS_UPDATE', 'Settings', 'Update school settings and logo', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('AUDIT_VIEW', 'Audit', 'View audit logs and export', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('BACKUP_VIEW', 'Backup', 'View and download backups', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('BACKUP_CREATE', 'Backup', 'Create and delete backups', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('BACKUP_RESTORE', 'Backup', 'Restore a backup (Super Admin only by default)', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('USER_VIEW', 'Users', 'View users and roles', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('USER_CREATE', 'Users', 'Create users', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('USER_UPDATE', 'Users', 'Update users and assign roles', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('USER_DISABLE', 'Users', 'Enable/disable user accounts and reset passwords', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('TRANSPORT_VIEW', 'Transport', 'Transport module (future)', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('TRANSPORT_CREATE', 'Transport', 'Transport module (future)', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('TRANSPORT_UPDATE', 'Transport', 'Transport module (future)', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('TRANSPORT_DELETE', 'Transport', 'Transport module (future)', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

-- 6. SUPER_ADMIN gets everything
INSERT INTO `RolePermission` (`roleId`, `permissionId`)
SELECT r.id, p.id FROM `Role` r CROSS JOIN `Permission` p WHERE r.name = 'SUPER_ADMIN';

-- 7. Other role defaults
INSERT INTO `RolePermission` (`roleId`, `permissionId`)
SELECT r.id, p.id FROM `Role` r JOIN `Permission` p ON p.name IN (
  'DASHBOARD_VIEW','SEARCH','STUDENT_VIEW','STUDENT_CREATE','STUDENT_UPDATE','STUDENT_DELETE',
  'TEACHER_VIEW','TEACHER_CREATE','TEACHER_UPDATE','TEACHER_DELETE',
  'CLASS_VIEW','CLASS_CREATE','CLASS_UPDATE','CLASS_DELETE',
  'SUBJECT_VIEW','SUBJECT_CREATE','SUBJECT_UPDATE','SUBJECT_DELETE',
  'EXAMS_VIEW','EXAMS_CREATE','EXAMS_UPDATE','EXAMS_DELETE',
  'MARKS_VIEW','MARKS_CREATE','MARKS_UPDATE',
  'ATTENDANCE_VIEW','ATTENDANCE_CREATE','ATTENDANCE_UPDATE',
  'FEES_VIEW','FEES_CREATE','FEES_UPDATE','FEES_DELETE',
  'NOTIFICATION_VIEW','NOTIFICATION_CREATE','NOTIFICATION_MANAGE',
  'DOCUMENT_VIEW','DOCUMENT_UPLOAD','DOCUMENT_DELETE',
  'REPORT_VIEW','REPORT_PRINT',
  'SETTINGS_VIEW','SETTINGS_UPDATE','AUDIT_VIEW',
  'BACKUP_VIEW','BACKUP_CREATE',
  'USER_VIEW','USER_CREATE','USER_UPDATE'
) WHERE r.name = 'PRINCIPAL';

INSERT INTO `RolePermission` (`roleId`, `permissionId`)
SELECT r.id, p.id FROM `Role` r JOIN `Permission` p ON p.name IN (
  'DASHBOARD_VIEW','SEARCH','STUDENT_VIEW',
  'FEES_VIEW','FEES_CREATE','FEES_UPDATE','FEES_DELETE',
  'NOTIFICATION_VIEW','REPORT_VIEW','REPORT_PRINT'
) WHERE r.name = 'ACCOUNTANT';

INSERT INTO `RolePermission` (`roleId`, `permissionId`)
SELECT r.id, p.id FROM `Role` r JOIN `Permission` p ON p.name IN (
  'DASHBOARD_VIEW','SEARCH','STUDENT_VIEW',
  'CLASS_VIEW','SUBJECT_VIEW','EXAMS_VIEW',
  'MARKS_VIEW','MARKS_CREATE','MARKS_UPDATE',
  'ATTENDANCE_VIEW','ATTENDANCE_CREATE','ATTENDANCE_UPDATE',
  'NOTIFICATION_VIEW','REPORT_VIEW','REPORT_PRINT'
) WHERE r.name = 'TEACHER';

INSERT INTO `RolePermission` (`roleId`, `permissionId`)
SELECT r.id, p.id FROM `Role` r JOIN `Permission` p ON p.name IN (
  'DASHBOARD_VIEW','SEARCH',
  'STUDENT_VIEW','STUDENT_CREATE','STUDENT_UPDATE',
  'CLASS_VIEW','ATTENDANCE_VIEW','FEES_VIEW',
  'NOTIFICATION_VIEW',
  'DOCUMENT_VIEW','DOCUMENT_UPLOAD','DOCUMENT_DELETE',
  'REPORT_VIEW','REPORT_PRINT'
) WHERE r.name = 'RECEPTION';

INSERT INTO `RolePermission` (`roleId`, `permissionId`)
SELECT r.id, p.id FROM `Role` r JOIN `Permission` p ON p.name IN (
  'DASHBOARD_VIEW','NOTIFICATION_VIEW'
) WHERE r.name = 'STAFF';

-- 8. Migrate existing Admin data into User (non-destructive rename)
RENAME TABLE `Admin` TO `User`;

ALTER TABLE `User`
    ADD COLUMN `roleId` INT NULL AFTER `isActive`,
    ADD COLUMN `teacherId` INT NULL AFTER `roleId`,
    ADD UNIQUE INDEX `User_teacherId_key`(`teacherId`);

ALTER TABLE `User`
    ADD CONSTRAINT `User_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `User_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `Teacher`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Existing admins become SUPER_ADMIN (roles were not used before)
UPDATE `User` SET `roleId` = (SELECT id FROM `Role` WHERE `name` = 'SUPER_ADMIN' LIMIT 1) WHERE `roleId` IS NULL;

-- Replace the legacy string role (fully superseded by roleId/role relation)
ALTER TABLE `User` DROP COLUMN `role`;