CREATE TABLE `emailLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipientEmail` varchar(320) NOT NULL,
	`recipientName` text,
	`subject` text NOT NULL,
	`content` text NOT NULL,
	`emailType` enum('announcement','reply','mention','ticket','group_notification','newsletter') NOT NULL,
	`status` enum('sent','failed','pending') NOT NULL DEFAULT 'pending',
	`sentAt` timestamp,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `emailLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mojiKnowledgeBase` (
	`id` int AUTO_INCREMENT NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`category` varchar(255),
	`tags` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mojiKnowledgeBase_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `recipient_idx` ON `emailLogs` (`recipientEmail`);--> statement-breakpoint
CREATE INDEX `type_idx` ON `emailLogs` (`emailType`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `emailLogs` (`status`);--> statement-breakpoint
CREATE INDEX `sentAt_idx` ON `emailLogs` (`sentAt`);--> statement-breakpoint
CREATE INDEX `category_idx` ON `mojiKnowledgeBase` (`category`);--> statement-breakpoint
CREATE INDEX `active_idx` ON `mojiKnowledgeBase` (`isActive`);