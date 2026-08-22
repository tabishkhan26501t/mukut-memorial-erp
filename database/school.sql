-- Mukut Memorial School ERP Database
-- MySQL Database Schema

CREATE DATABASE IF NOT EXISTS school_erp
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE school_erp;

-- Admin Table
CREATE TABLE IF NOT EXISTS `Admin` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) DEFAULT 'admin',
  `phone` VARCHAR(20),
  `photo` VARCHAR(500),
  `isActive` BOOLEAN DEFAULT TRUE,
  `refreshToken` TEXT,
  `lastLogin` DATETIME,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_admin_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Teacher Table (created before Class due to FK dependency)
CREATE TABLE IF NOT EXISTS `Teacher` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `teacherId` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `phone` VARCHAR(20),
  `gender` VARCHAR(10),
  `dob` DATE,
  `qualification` VARCHAR(500),
  `experience` INT,
  `joiningDate` DATE,
  `salary` DECIMAL(10, 2),
  `address` TEXT,
  `city` VARCHAR(100),
  `state` VARCHAR(100),
  `pinCode` VARCHAR(20),
  `photo` VARCHAR(500),
  `bloodGroup` VARCHAR(10),
  `subjects` TEXT,
  `isActive` BOOLEAN DEFAULT TRUE,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_teacher_email` (`email`),
  INDEX `idx_teacher_id` (`teacherId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Class Table
CREATE TABLE IF NOT EXISTS `Class` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `section` VARCHAR(50),
  `classTeacherId` INT,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_class_section` (`name`, `section`),
  INDEX `idx_class_name` (`name`),
  CONSTRAINT `fk_class_teacher` FOREIGN KEY (`classTeacherId`) REFERENCES `Teacher`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Student Table
CREATE TABLE IF NOT EXISTS `Student` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `admissionNo` VARCHAR(50) NOT NULL UNIQUE,
  `rollNo` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `dob` DATE NOT NULL,
  `gender` VARCHAR(10) NOT NULL,
  `bloodGroup` VARCHAR(10),
  `nationality` VARCHAR(100) DEFAULT 'Indian',
  `religion` VARCHAR(100),
  `caste` VARCHAR(100),
  `aadhaarNo` VARCHAR(20),
  `phone` VARCHAR(20),
  `email` VARCHAR(255),
  `address` TEXT,
  `city` VARCHAR(100),
  `state` VARCHAR(100),
  `pinCode` VARCHAR(20),
  `fatherName` VARCHAR(255) NOT NULL,
  `fatherPhone` VARCHAR(20),
  `fatherOccupation` VARCHAR(100),
  `motherName` VARCHAR(255) NOT NULL,
  `motherPhone` VARCHAR(20),
  `motherOccupation` VARCHAR(100),
  `guardianName` VARCHAR(255),
  `guardianPhone` VARCHAR(20),
  `photo` VARCHAR(500),
  `classId` INT NOT NULL,
  `isActive` BOOLEAN DEFAULT TRUE,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_student_admission` (`admissionNo`),
  INDEX `idx_student_class` (`classId`),
  INDEX `idx_student_name` (`name`),
  CONSTRAINT `fk_student_class` FOREIGN KEY (`classId`) REFERENCES `Class`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Subject Table
CREATE TABLE IF NOT EXISTS `Subject` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `code` VARCHAR(50),
  `classId` INT NOT NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_subject_class` (`name`, `classId`),
  INDEX `idx_subject_class` (`classId`),
  CONSTRAINT `fk_subject_class` FOREIGN KEY (`classId`) REFERENCES `Class`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Document Table
CREATE TABLE IF NOT EXISTS `Document` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `studentId` INT NOT NULL,
  `type` VARCHAR(100) NOT NULL,
  `fileName` VARCHAR(500) NOT NULL,
  `filePath` VARCHAR(500) NOT NULL,
  `fileSize` VARCHAR(50),
  `mimeType` VARCHAR(100),
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_student_document` (`studentId`, `type`),
  INDEX `idx_document_student` (`studentId`),
  CONSTRAINT `fk_document_student` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Exam Table
CREATE TABLE IF NOT EXISTS `Exam` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `term` VARCHAR(50),
  `type` VARCHAR(50) NOT NULL,
  `startDate` DATE,
  `endDate` DATE,
  `classId` INT NOT NULL,
  `isActive` BOOLEAN DEFAULT TRUE,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_exam_class` (`classId`),
  CONSTRAINT `fk_exam_class` FOREIGN KEY (`classId`) REFERENCES `Class`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ExamSubject Table
CREATE TABLE IF NOT EXISTS `ExamSubject` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `examId` INT NOT NULL,
  `subjectId` INT NOT NULL,
  `maxMarks` INT DEFAULT 100,
  `passingMarks` INT DEFAULT 33,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_exam_subject` (`examId`, `subjectId`),
  INDEX `idx_examsubject_exam` (`examId`),
  INDEX `idx_examsubject_subject` (`subjectId`),
  CONSTRAINT `fk_examsubject_exam` FOREIGN KEY (`examId`) REFERENCES `Exam`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_examsubject_subject` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Mark Table
CREATE TABLE IF NOT EXISTS `Mark` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `examSubjectId` INT NOT NULL,
  `studentId` INT NOT NULL,
  `subjectId` INT NOT NULL,
  `examId` INT NOT NULL,
  `marksObtained` DECIMAL(6, 2),
  `grade` VARCHAR(10),
  `remarks` TEXT,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_examsubject_student` (`examSubjectId`, `studentId`),
  INDEX `idx_mark_exam` (`examId`),
  INDEX `idx_mark_student` (`studentId`),
  INDEX `idx_mark_subject` (`subjectId`),
  CONSTRAINT `fk_mark_examsubject` FOREIGN KEY (`examSubjectId`) REFERENCES `ExamSubject`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mark_student` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mark_subject` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mark_exam` FOREIGN KEY (`examId`) REFERENCES `Exam`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Attendance Table
CREATE TABLE IF NOT EXISTS `Attendance` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `studentId` INT NOT NULL,
  `date` DATE NOT NULL,
  `status` VARCHAR(20) NOT NULL,
  `remarks` TEXT,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_student_date` (`studentId`, `date`),
  INDEX `idx_attendance_date` (`date`),
  CONSTRAINT `fk_attendance_student` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TeacherAttendance Table
CREATE TABLE IF NOT EXISTS `TeacherAttendance` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `teacherId` INT NOT NULL,
  `date` DATE NOT NULL,
  `status` VARCHAR(20) NOT NULL,
  `remarks` TEXT,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_teacher_date` (`teacherId`, `date`),
  INDEX `idx_teacherattendance_date` (`date`),
  CONSTRAINT `fk_teacherattendance_teacher` FOREIGN KEY (`teacherId`) REFERENCES `Teacher`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notification Table
CREATE TABLE IF NOT EXISTS `Notification` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `type` VARCHAR(50) DEFAULT 'info',
  `targetRole` VARCHAR(50),
  `isRead` BOOLEAN DEFAULT FALSE,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_notification_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Setting Table
CREATE TABLE IF NOT EXISTS `Setting` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(255) NOT NULL UNIQUE,
  `value` TEXT NOT NULL,
  INDEX `idx_setting_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert Default Admin (password: admin123 - bcrypt hash)
INSERT INTO `Admin` (`name`, `email`, `password`, `role`, `isActive`)
VALUES ('Super Admin', 'admin@mukutmemorial.com', '$2a$12$LJ3m4ys3Lg3YOCw2vjC6jO5gQ0GHRmH4X1Y2H3Z4W5A6B7C8D9E0F', TRUE);

-- Insert Default Settings
INSERT INTO `Setting` (`key`, `value`) VALUES
('school_name', 'Mukut Memorial School'),
('school_address', '123, Education Road, City, State - 123456'),
('school_phone', '+91-1234567890'),
('school_email', 'info@mukutmemorial.com'),
('school_website', 'https://mukutmemorial.com'),
('school_logo', ''),
('academic_year', '2025-2026'),
('grading_system', '{"A+":"90-100","A":"80-89","B+":"70-79","B":"60-69","C":"50-59","D":"40-49","F":"0-39"}');
