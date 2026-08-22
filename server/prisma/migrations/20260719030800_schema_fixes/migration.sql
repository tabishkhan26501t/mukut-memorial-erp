-- AlterTable: Add reset token fields to Admin
ALTER TABLE `admin` ADD COLUMN `resetToken` VARCHAR(191) NULL;
ALTER TABLE `admin` ADD COLUMN `resetTokenExpiry` DATETIME(3) NULL;
CREATE UNIQUE INDEX `Admin_resetToken_key` ON `admin`(`resetToken`);

-- AlterTable: Make notification.message TEXT (was VARCHAR(191))
ALTER TABLE `notification` MODIFY `message` TEXT NOT NULL;

-- AlterTable: Make setting.value TEXT (was VARCHAR(191))
ALTER TABLE `setting` MODIFY `value` TEXT NOT NULL;
