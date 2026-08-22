-- Enforce one primary driver per vehicle (index on nullable column: multiple NULLs allowed).
ALTER TABLE `TransportStaff` ADD UNIQUE INDEX `TransportStaff_assignedVehicleId_key`(`assignedVehicleId`);
