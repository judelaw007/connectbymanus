CREATE TABLE `supportMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketId` int NOT NULL,
	`senderId` int NOT NULL,
	`senderType` enum('user','admin') NOT NULL,
	`content` text NOT NULL,
	`isRead` boolean NOT NULL DEFAULT false,
	`emailSent` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supportMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `supportTickets` MODIFY COLUMN `status` enum('open','in-progress','closed') NOT NULL DEFAULT 'open';--> statement-breakpoint
ALTER TABLE `supportTickets` ADD `subject` varchar(500) NOT NULL;--> statement-breakpoint
ALTER TABLE `supportTickets` ADD `priority` enum('low','medium','high') DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE `supportTickets` ADD `assignedToAdminId` int;--> statement-breakpoint
ALTER TABLE `supportTickets` ADD `lastMessageAt` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `supportTickets` ADD `closedAt` timestamp;--> statement-breakpoint
CREATE INDEX `ticket_idx` ON `supportMessages` (`ticketId`);--> statement-breakpoint
CREATE INDEX `sender_idx` ON `supportMessages` (`senderId`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `supportMessages` (`createdAt`);--> statement-breakpoint
CREATE INDEX `assigned_idx` ON `supportTickets` (`assignedToAdminId`);--> statement-breakpoint
CREATE INDEX `last_message_idx` ON `supportTickets` (`lastMessageAt`);--> statement-breakpoint
ALTER TABLE `supportTickets` DROP COLUMN `channelId`;--> statement-breakpoint
ALTER TABLE `supportTickets` DROP COLUMN `assignedTo`;--> statement-breakpoint
ALTER TABLE `supportTickets` DROP COLUMN `resolvedAt`;