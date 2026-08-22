-- Transportation Management Module.
-- Non-destructive: only creates new tables and inserts new permission rows.

-- 1. Vehicle
CREATE TABLE `Vehicle` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `vehicleId` VARCHAR(191) NOT NULL,
    `registrationNumber` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'bus',
    `model` VARCHAR(191) NULL,
    `manufacturer` VARCHAR(191) NULL,
    `capacity` INT NOT NULL DEFAULT 20,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `purchaseDate` DATETIME(3) NULL,
    `registrationDate` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `Vehicle_vehicleId_key`(`vehicleId`),
    UNIQUE INDEX `Vehicle_registrationNumber_key`(`registrationNumber`),
    INDEX `Vehicle_status_idx`(`status`),
    INDEX `Vehicle_registrationNumber_idx`(`registrationNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. TransportStaff
CREATE TABLE `TransportStaff` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `staffId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `dob` DATETIME(3) NULL,
    `address` VARCHAR(191) NULL,
    `licenseNumber` VARCHAR(191) NULL,
    `licenseCategory` VARCHAR(191) NULL,
    `licenseExpiry` DATETIME(3) NULL,
    `joiningDate` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `assignedVehicleId` INT NULL,
    `emergencyContact` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `TransportStaff_staffId_key`(`staffId`),
    UNIQUE INDEX `TransportStaff_licenseNumber_key`(`licenseNumber`),
    INDEX `TransportStaff_status_idx`(`status`),
    INDEX `TransportStaff_licenseExpiry_idx`(`licenseExpiry`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 3. TransportRoute
CREATE TABLE `TransportRoute` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `routeCode` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `startPoint` VARCHAR(191) NULL,
    `endPoint` VARCHAR(191) NULL,
    `assignedVehicleId` INT NULL,
    `assignedDriverId` INT NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `TransportRoute_routeCode_key`(`routeCode`),
    INDEX `TransportRoute_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 4. TransportStop
CREATE TABLE `TransportStop` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `routeId` INT NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `sequence` INT NOT NULL,
    `pickupTime` VARCHAR(191) NULL,
    `dropTime` VARCHAR(191) NULL,
    `landmark` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `TransportStop_routeId_idx`(`routeId`),
    UNIQUE INDEX `TransportStop_routeId_name_key`(`routeId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 5. VehicleDocument
CREATE TABLE `VehicleDocument` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `vehicleId` INT NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `documentNumber` VARCHAR(191) NULL,
    `issueDate` DATETIME(3) NULL,
    `expiryDate` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `VehicleDocument_expiryDate_idx`(`expiryDate`),
    INDEX `VehicleDocument_vehicleId_idx`(`vehicleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 6. StudentTransportAssignment
CREATE TABLE `StudentTransportAssignment` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `studentId` INT NOT NULL,
    `routeId` INT NOT NULL,
    `pickupStopId` INT NOT NULL,
    `dropStopId` INT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `startDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endDate` DATETIME(3) NULL,
    `feeAmount` DECIMAL(10,2) NULL,
    `feeDueDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `StudentTransportAssignment_studentId_idx`(`studentId`),
    INDEX `StudentTransportAssignment_routeId_idx`(`routeId`),
    INDEX `StudentTransportAssignment_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Foreign keys
ALTER TABLE `TransportStaff` ADD CONSTRAINT `TransportStaff_assignedVehicleId_fkey` FOREIGN KEY (`assignedVehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `TransportRoute` ADD CONSTRAINT `TransportRoute_assignedVehicleId_fkey` FOREIGN KEY (`assignedVehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `TransportRoute` ADD CONSTRAINT `TransportRoute_assignedDriverId_fkey` FOREIGN KEY (`assignedDriverId`) REFERENCES `TransportStaff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `TransportStop` ADD CONSTRAINT `TransportStop_routeId_fkey` FOREIGN KEY (`routeId`) REFERENCES `TransportRoute`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `VehicleDocument` ADD CONSTRAINT `VehicleDocument_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `StudentTransportAssignment` ADD CONSTRAINT `StudentTransportAssignment_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `StudentTransportAssignment` ADD CONSTRAINT `StudentTransportAssignment_routeId_fkey` FOREIGN KEY (`routeId`) REFERENCES `TransportRoute`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `StudentTransportAssignment` ADD CONSTRAINT `StudentTransportAssignment_pickupStopId_fkey` FOREIGN KEY (`pickupStopId`) REFERENCES `TransportStop`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `StudentTransportAssignment` ADD CONSTRAINT `StudentTransportAssignment_dropStopId_fkey` FOREIGN KEY (`dropStopId`) REFERENCES `TransportStop`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- 7. Transport permissions (update placeholders, add new ones)
UPDATE `Permission` SET `module` = 'Transport', `description` = 'View transport module (vehicles, drivers, routes, assignments)' WHERE `name` = 'TRANSPORT_VIEW';
UPDATE `Permission` SET `module` = 'Transport', `description` = 'Create transport records (vehicles, drivers, routes)' WHERE `name` = 'TRANSPORT_CREATE';
UPDATE `Permission` SET `module` = 'Transport', `description` = 'Update transport records and student assignments' WHERE `name` = 'TRANSPORT_UPDATE';
UPDATE `Permission` SET `module` = 'Transport', `description` = 'Delete transport records' WHERE `name` = 'TRANSPORT_DELETE';

INSERT INTO `Permission` (`name`, `module`, `description`, `createdAt`, `updatedAt`) VALUES
('TRANSPORT_FEES_VIEW', 'Transport', 'View transport fee records and summaries', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('TRANSPORT_FEES_MANAGE', 'Transport', 'Create and update transport fee records', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('TRANSPORT_REPORT_VIEW', 'Transport', 'View transport reports', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('TRANSPORT_REPORT_PRINT', 'Transport', 'Print/PDF transport reports', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

-- 8. Role -> permission mappings
INSERT INTO `RolePermission` (`roleId`, `permissionId`, `createdAt`)
SELECT r.id, p.id, CURRENT_TIMESTAMP(3)
FROM `Role` r, `Permission` p
WHERE (r.name = 'PRINCIPAL' AND p.name IN ('TRANSPORT_VIEW','TRANSPORT_CREATE','TRANSPORT_UPDATE','TRANSPORT_DELETE','TRANSPORT_FEES_VIEW','TRANSPORT_FEES_MANAGE','TRANSPORT_REPORT_VIEW','TRANSPORT_REPORT_PRINT'))
   OR (r.name = 'ACCOUNTANT' AND p.name IN ('TRANSPORT_VIEW','TRANSPORT_FEES_VIEW','TRANSPORT_FEES_MANAGE','TRANSPORT_REPORT_VIEW','TRANSPORT_REPORT_PRINT'))
   OR (r.name = 'RECEPTION' AND p.name IN ('TRANSPORT_VIEW'))
   OR (r.name = 'TEACHER' AND p.name IN ('TRANSPORT_VIEW'));
