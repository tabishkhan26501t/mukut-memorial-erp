-- 1. Rename Admin table to User (data-preserving)
RENAME TABLE Admin TO User;

-- 2. Create Role table (id, name, description, isSystem, timestamps)
CREATE TABLE Role (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(191) NOT NULL,
    description VARCHAR(191) NULL,
    isSystem BOOLEAN NOT NULL DEFAULT false,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE INDEX Role_name_key(name)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 3. Create Permission table (id, name, module, description, timestamps)
CREATE TABLE Permission (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(191) NOT NULL,
    module VARCHAR(191) NOT NULL,
    description VARCHAR(191) NULL,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE INDEX Permission_name_key(name)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 4. Create RolePermission junction table (roleId, permissionId, timestamps)
CREATE TABLE RolePermission (
    id INT NOT NULL AUTO_INCREMENT,
    roleId INT NOT NULL,
    permissionId INT NOT NULL,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE INDEX RolePermission_roleId_permissionId_key(roleId, permissionId),
    INDEX RolePermission_permissionId_idx(permissionId),
    CONSTRAINT RolePermission_roleId_fkey FOREIGN KEY (roleId) REFERENCES Role(id) ON DELETE Cascade,
    CONSTRAINT RolePermission_permissionId_fkey FOREIGN KEY (permissionId) REFERENCES Permission(id) ON DELETE Cascade
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 5. Add roleId column to User table
ALTER TABLE User ADD COLUMN roleId INT NULL;

-- 6. Add teacherId column to User table (if not already present from earlier schema evolution)
ALTER TABLE User ADD COLUMN teacherId INT NULL;

-- 7. Add foreign key: User.roleId → Role.id
ALTER TABLE User ADD CONSTRAINT User_roleId_fkey FOREIGN KEY (roleId) REFERENCES Role(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- 8. Add foreign key: User.teacherId → Teacher.id
ALTER TABLE User ADD CONSTRAINT User_teacherId_fkey FOREIGN KEY (teacherId) REFERENCES Teacher(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- 9. Insert default system roles
INSERT INTO Role (name, description, isSystem) VALUES ('SUPER_ADMIN', 'Super administrator with full access', TRUE);
INSERT INTO Role (name, description, isSystem) VALUES ('PRINCIPAL', 'School principal', TRUE);
INSERT INTO Role (name, description, isSystem) VALUES ('TEACHER', 'Teacher', TRUE);
INSERT INTO Role (name, description, isSystem) VALUES ('ACCOUNTANT', 'School accountant', TRUE);
INSERT INTO Role (name, description, isSystem) VALUES ('RECEPTION', 'School reception', TRUE);
INSERT INTO Role (name, description, isSystem) VALUES ('STAFF', 'School staff', TRUE);

-- 10. Insert default permissions
INSERT INTO Permission (name, module, description) VALUES ('TRANSPORT_VIEW', 'transport', 'View transport module');
INSERT INTO Permission (name, module, description) VALUES ('TRANSPORT_CREATE', 'transport', 'Create transport records');
INSERT INTO Permission (name, module, description) VALUES ('TRANSPORT_UPDATE', 'transport', 'Update transport records');
INSERT INTO Permission (name, module, description) VALUES ('TRANSPORT_DELETE', 'transport', 'Delete transport records');
INSERT INTO Permission (name, module, description) VALUES ('FEES_VIEW', 'fees', 'View fees module');
INSERT INTO Permission (name, module, description) VALUES ('FEES_MANAGE', 'fees', 'Manage fees records');
INSERT INTO Permission (name, module, description) VALUES ('REPORT_VIEW', 'reports', 'View reports');
INSERT INTO Permission (name, module, description) VALUES ('REPORT_PRINT', 'reports', 'Print reports');

-- 11. Assign permissions to roles
-- SUPER_ADMIN: all permissions
INSERT INTO RolePermission (roleId, permissionId) SELECT r.id, p.id FROM Role r, Permission p WHERE r.name = 'SUPER_ADMIN';

-- PRINCIPAL: transport view+manage, fees view+manage, reports view+print
INSERT INTO RolePermission (roleId, permissionId) SELECT r.id, p.id FROM Role r, Permission p WHERE r.name = 'PRINCIPAL' AND p.name IN ('TRANSPORT_VIEW', 'TRANSPORT_UPDATE', 'FEES_VIEW', 'FEES_MANAGE', 'REPORT_VIEW', 'REPORT_PRINT');

-- TEACHER: transport view only
INSERT INTO RolePermission (roleId, permissionId) SELECT r.id, p.id FROM Role r, Permission p WHERE r.name = 'TEACHER' AND p.name = 'TRANSPORT_VIEW';

-- RECEPTION: transport view only
INSERT INTO RolePermission (roleId, permissionId) SELECT r.id, p.id FROM Role r, Permission p WHERE r.name = 'RECEPTION' AND p.name = 'TRANSPORT_VIEW';

-- ACCOUNTANT: fees view+manage, reports view+print
INSERT INTO RolePermission (roleId, permissionId) SELECT r.id, p.id FROM Role r, Permission p WHERE r.name = 'ACCOUNTANT' AND p.name IN ('FEES_VIEW', 'FEES_MANAGE', 'REPORT_VIEW', 'REPORT_PRINT');

-- 12. Migrate existing Admin (now User) data: set SUPER_ADMIN role
-- First, get the SUPER_ADMIN role ID
SET @super_admin_id = (SELECT id FROM Role WHERE name = 'SUPER_ADMIN');

-- Update all User records to have SUPER_ADMIN role (since Admin data is being migrated)
UPDATE User SET roleId = @super_admin_id WHERE roleId IS NULL;

-- 13. Update teacherId from Teacher table if applicable (example mapping)
-- This assumes teacher records exist; adjust as needed for your environment
UPDATE User u JOIN Teacher t ON u.name = t.name SET u.teacherId = t.id WHERE u.teacherId IS NULL AND t.id IS NOT NULL;

-- Drop the legacy 'role' column from User if it exists (migration may have had it)
-- ALTER TABLE User DROP COLUMN role;
