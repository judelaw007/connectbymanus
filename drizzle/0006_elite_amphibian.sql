ALTER TABLE `supportTickets` ADD `resolutionType` enum('bot-answered','human-answered','no-answer','escalated');--> statement-breakpoint
ALTER TABLE `supportTickets` ADD `enquiryType` varchar(100);--> statement-breakpoint
ALTER TABLE `supportTickets` ADD `tags` text;--> statement-breakpoint
ALTER TABLE `supportTickets` ADD `botInteractionCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `supportTickets` ADD `humanInteractionCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `supportTickets` ADD `satisfactionRating` int;