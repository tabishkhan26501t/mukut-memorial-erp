/*
  Warnings:

  - Added the required column `updatedAt` to the `ExamSubject` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `examsubject` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `student` ADD COLUMN `apaarId` VARCHAR(191) NULL,
    ADD COLUMN `childId` VARCHAR(191) NULL,
    ADD COLUMN `fatherAadhaar` VARCHAR(191) NULL,
    ADD COLUMN `motherAadhaar` VARCHAR(191) NULL;
