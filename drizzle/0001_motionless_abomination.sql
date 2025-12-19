CREATE TABLE `channelMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`channelId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','moderator','member') NOT NULL DEFAULT 'member',
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`notificationsEnabled` boolean NOT NULL DEFAULT true,
	CONSTRAINT `channelMembers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `channels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`type` enum('general','topic','study_group','support') NOT NULL,
	`isPrivate` boolean NOT NULL DEFAULT false,
	`inviteCode` varchar(64),
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`isClosed` boolean NOT NULL DEFAULT false,
	CONSTRAINT `channels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`channelId` int NOT NULL,
	`userId` int,
	`content` text NOT NULL,
	`messageType` enum('user','admin','bot','system') NOT NULL DEFAULT 'user',
	`isPinned` boolean NOT NULL DEFAULT false,
	`replyToId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('reply','mention','ticket','group_owner','announcement') NOT NULL,
	`content` text NOT NULL,
	`relatedId` int,
	`isRead` boolean NOT NULL DEFAULT false,
	`emailSent` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`channelId` int,
	`postType` enum('event','announcement','article','newsletter') NOT NULL,
	`title` varchar(500) NOT NULL,
	`content` text NOT NULL,
	`authorId` int NOT NULL,
	`isPinned` boolean NOT NULL DEFAULT false,
	`eventDate` timestamp,
	`eventLocation` text,
	`tags` text,
	`featuredImage` text,
	`distributionList` text,
	`scheduledFor` timestamp,
	`priorityLevel` enum('low','medium','high','urgent'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supportTickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`channelId` int,
	`status` enum('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
	`assignedTo` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`resolvedAt` timestamp,
	CONSTRAINT `supportTickets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `channel_user_idx` ON `channelMembers` (`channelId`,`userId`);--> statement-breakpoint
CREATE INDEX `createdBy_idx` ON `channels` (`createdBy`);--> statement-breakpoint
CREATE INDEX `type_idx` ON `channels` (`type`);--> statement-breakpoint
CREATE INDEX `channel_idx` ON `messages` (`channelId`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `messages` (`userId`);--> statement-breakpoint
CREATE INDEX `createdAt_idx` ON `messages` (`createdAt`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `notifications` (`userId`);--> statement-breakpoint
CREATE INDEX `type_idx` ON `notifications` (`type`);--> statement-breakpoint
CREATE INDEX `channel_idx` ON `posts` (`channelId`);--> statement-breakpoint
CREATE INDEX `author_idx` ON `posts` (`authorId`);--> statement-breakpoint
CREATE INDEX `type_idx` ON `posts` (`postType`);--> statement-breakpoint
CREATE INDEX `pinned_idx` ON `posts` (`isPinned`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `supportTickets` (`userId`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `supportTickets` (`status`);