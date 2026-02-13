/**
 * Email Service with TEST_MODE support
 *
 * When TEST_MODE=true:
 * - All emails redirect to TEST_EMAIL_RECIPIENT
 * - Email subjects prefixed with [TEST]
 * - Safe to test without spamming real users
 */

import { ENV } from "../_core/env";
import * as db from "../db";

// Email template types
export type EmailTemplateType =
  | "verification_code"
  | "announcement"
  | "event"
  | "event_confirmation"
  | "event_reminder"
  | "article"
  | "reply_notification"
  | "mention_notification"
  | "support_update"
  | "newsletter";

export interface SendEmailOptions {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
  templateType: EmailTemplateType;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  redirectedTo?: string; // Set when TEST_MODE redirects email
}

// Map templateType to the email_type DB enum.
// IMPORTANT: only return values that exist in the original Postgres enum:
//   announcement, reply, mention, ticket, group_notification, newsletter
// The more specific name is preserved in the template_type VARCHAR column.
function templateToEmailType(templateType: EmailTemplateType): string {
  const map: Record<EmailTemplateType, string> = {
    verification_code: "ticket",
    announcement: "announcement",
    event: "announcement",
    event_confirmation: "announcement",
    event_reminder: "announcement",
    article: "announcement",
    reply_notification: "reply",
    mention_notification: "mention",
    support_update: "ticket",
    newsletter: "newsletter",
  };
  return map[templateType] || "ticket";
}

/**
 * Send an email via SendGrid with TEST_MODE support
 */
export async function sendEmail(
  options: SendEmailOptions
): Promise<EmailResult> {
  let { to, toName, subject, html, text, templateType } = options;

  // Apply TEST_MODE transformations
  const originalRecipient = to;
  if (ENV.isTestMode) {
    if (!ENV.testEmailRecipient) {
      console.warn(
        "[Email] TEST_MODE is enabled but TEST_EMAIL_RECIPIENT is not set"
      );
      return {
        success: false,
        error: "TEST_MODE enabled but no test recipient configured",
      };
    }

    // Redirect to test recipient
    to = ENV.testEmailRecipient;
    subject = `[TEST] ${subject}`;

    // Add original recipient info to email body
    const testBanner = `
      <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 12px; margin-bottom: 20px; border-radius: 4px;">
        <strong>TEST MODE</strong><br>
        Original recipient: ${originalRecipient} (${toName || "No name"})<br>
        This email was redirected for testing.
      </div>
    `;
    html = testBanner + html;

    console.log(
      `[Email] TEST_MODE: Redirecting email from ${originalRecipient} to ${to}`
    );
  }

  // Log the email attempt
  let logId: number | undefined;
  try {
    logId = await db.createEmailLog({
      recipientEmail: originalRecipient,
      recipientName: toName || null,
      subject: options.subject, // Log original subject
      content: html, // Include HTML content for log readability
      emailType: templateToEmailType(templateType),
      templateType,
      status: "pending",
    });
  } catch (err: any) {
    console.error(
      "[Email] Failed to create email log:",
      err?.message || err,
      "| Data:",
      { to: originalRecipient, subject: options.subject, templateType }
    );
  }

  // Check if SendGrid is configured
  if (!ENV.sendGridApiKey) {
    const error = "SendGrid API key not configured";
    console.warn(`[Email] ${error}`);

    if (logId) {
      await db.updateEmailLogStatus(logId, "failed", error);
    } else {
      console.warn("[Email] No log entry created — see error above");
    }

    // In development without SendGrid, log but still mark as not sent
    if (!ENV.isProduction) {
      console.log("[Email] Would send (dev mode, no SendGrid):", {
        to,
        subject,
        templateType,
      });
      return { success: false, error, messageId: "dev-mode-no-send" };
    }

    return { success: false, error };
  }

  try {
    // SendGrid API call
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.sendGridApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: to, name: toName }],
          },
        ],
        from: {
          email: ENV.emailFrom,
          name: "MojiTax Connect",
        },
        subject,
        content: [
          ...(text ? [{ type: "text/plain", value: text }] : []),
          { type: "text/html", value: html },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SendGrid error: ${response.status} - ${errorText}`);
    }

    // Get message ID from headers
    const messageId = response.headers.get("x-message-id") || undefined;

    // Update log as sent
    if (logId) {
      await db.updateEmailLogStatus(logId, "sent");
    }

    console.log(`[Email] Sent successfully to ${to} (${templateType})`);

    return {
      success: true,
      messageId,
      redirectedTo: ENV.isTestMode ? to : undefined,
    };
  } catch (error: any) {
    const errorMessage = error.message || "Unknown error";
    console.error("[Email] Failed to send:", errorMessage);

    if (logId) {
      await db.updateEmailLogStatus(logId, "failed", errorMessage);
    }

    return { success: false, error: errorMessage };
  }
}

// ============= Shared Email Layout =============

const LOGO_URL = "https://connect.mojitax.co.uk/mojitax-logo.png";

function emailHeader(): string {
  return `<div style="text-align: center; padding: 20px 0 10px 0;">
      <a href="https://connect.mojitax.co.uk" style="text-decoration: none;">
        <img src="${LOGO_URL}" alt="MojiTax" style="height: 60px; width: auto;" />
      </a>
    </div>`;
}

function emailFooter(): string {
  return `<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
      <div style="text-align: center; padding: 10px 0;">
        <a href="https://connect.mojitax.co.uk" style="text-decoration: none;">
          <img src="${LOGO_URL}" alt="MojiTax" style="height: 36px; width: auto; opacity: 0.6;" />
        </a>
        <p style="color: #9ca3af; font-size: 12px; margin: 8px 0 0 0;">MojiTax Connect - connect.mojitax.co.uk</p>
      </div>`;
}

// ============= Email Templates =============

/**
 * Send verification code email for member login
 */
export async function sendVerificationCode(
  email: string,
  name: string | null,
  code: string
): Promise<EmailResult> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      ${emailHeader()}
      <h2 style="color: #1a1a1a;">Your Verification Code</h2>
      <p>Hi ${name || "there"},</p>
      <p>Use the following code to sign in to MojiTax Connect:</p>
      <div style="background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a;">${code}</span>
      </div>
      <p style="color: #6b7280; font-size: 14px;">This code expires in 10 minutes.</p>
      <p style="color: #6b7280; font-size: 14px;">If you didn't request this code, you can safely ignore this email.</p>
      ${emailFooter()}
    </div>
  `;

  return sendEmail({
    to: email,
    toName: name || undefined,
    subject: `${code} is your MojiTax Connect verification code`,
    html,
    templateType: "verification_code",
  });
}

/**
 * Send announcement notification email
 */
export async function sendAnnouncementEmail(
  email: string,
  name: string | null,
  announcement: { title: string; content: string; authorName?: string }
): Promise<EmailResult> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      ${emailHeader()}
      <h2 style="color: #1a1a1a;">New Announcement</h2>
      <p>Hi ${name || "there"},</p>
      <p>A new announcement has been posted on MojiTax Connect:</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; color: #1a1a1a;">${announcement.title}</h3>
        <div style="color: #374151;">${announcement.content}</div>
        ${announcement.authorName ? `<p style="color: #6b7280; font-size: 14px; margin-top: 15px;">Posted by ${announcement.authorName}</p>` : ""}
      </div>
      <a href="https://connect.mojitax.co.uk" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">View on Connect</a>
      ${emailFooter()}
    </div>
  `;

  return sendEmail({
    to: email,
    toName: name || undefined,
    subject: `[Announcement] ${announcement.title}`,
    html,
    templateType: "announcement",
  });
}

/**
 * Send event notification email
 */
export async function sendEventEmail(
  email: string,
  name: string | null,
  event: {
    title: string;
    content: string;
    date: Date;
    location?: string;
    authorName?: string;
    postId?: number;
  }
): Promise<EmailResult> {
  const dateStr = event.date.toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const interestUrl = event.postId
    ? `https://connect.mojitax.co.uk/events/${event.postId}/interest`
    : "https://connect.mojitax.co.uk";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      ${emailHeader()}
      <h2 style="color: #1a1a1a;">You're Invited!</h2>
      <p>Hi ${name || "there"},</p>
      <p>You're invited to an upcoming MojiTax event:</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; color: #1a1a1a;">${event.title}</h3>
        <p style="color: #6b7280; margin: 5px 0;"><strong>Date:</strong> ${dateStr}</p>
        ${event.location ? `<p style="color: #6b7280; margin: 5px 0;"><strong>Location:</strong> ${event.location}</p>` : ""}
        <div style="color: #374151; margin-top: 15px;">${event.content}</div>
        ${event.authorName ? `<p style="color: #6b7280; font-size: 14px; margin-top: 15px;">Posted by ${event.authorName}</p>` : ""}
      </div>
      <p style="color: #374151; margin-bottom: 15px;">Interested in attending? Click below to let us know and we'll send you the full event details and reminders.</p>
      <a href="${interestUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Indicate Interest</a>
      ${emailFooter()}
    </div>
  `;

  return sendEmail({
    to: email,
    toName: name || undefined,
    subject: `[Event Invitation] ${event.title} - ${dateStr}`,
    html,
    templateType: "event",
  });
}

/**
 * Send event confirmation email (with actual event link/details)
 */
export async function sendEventConfirmation(
  email: string,
  name: string | null,
  event: {
    title: string;
    content: string;
    date: Date;
    location?: string;
    authorName?: string;
    eventLink?: string;
    additionalInfo?: string;
  }
): Promise<EmailResult> {
  const dateStr = event.date.toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      ${emailHeader()}
      <h2 style="color: #1a1a1a;">Event Confirmed!</h2>
      <p>Hi ${name || "there"},</p>
      <p>Great news! Your interest in the following event has been confirmed:</p>
      <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
        <h3 style="margin: 0 0 10px 0; color: #1a1a1a;">${event.title}</h3>
        <p style="color: #6b7280; margin: 5px 0;"><strong>Date:</strong> ${dateStr}</p>
        ${event.location ? `<p style="color: #6b7280; margin: 5px 0;"><strong>Location:</strong> ${event.location}</p>` : ""}
        <div style="color: #374151; margin-top: 15px;">${event.content}</div>
        ${event.additionalInfo ? `<div style="color: #374151; margin-top: 10px; padding-top: 10px; border-top: 1px solid #d1fae5;">${event.additionalInfo}</div>` : ""}
      </div>
      ${event.eventLink ? `<a href="${event.eventLink}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Join Event</a>` : ""}
      ${emailFooter()}
    </div>
  `;

  return sendEmail({
    to: email,
    toName: name || undefined,
    subject: `[Event Confirmed] ${event.title} - ${dateStr}`,
    html,
    templateType: "event_confirmation",
  });
}

/**
 * Send event reminder email
 */
export async function sendEventReminder(
  email: string,
  name: string | null,
  event: {
    title: string;
    content: string;
    date: Date;
    location?: string;
    eventLink?: string;
    reminderMessage?: string;
  }
): Promise<EmailResult> {
  const dateStr = event.date.toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      ${emailHeader()}
      <h2 style="color: #1a1a1a;">Event Reminder</h2>
      <p>Hi ${name || "there"},</p>
      <p>This is a reminder about an upcoming event you expressed interest in:</p>
      <div style="background: #fefce8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #eab308;">
        <h3 style="margin: 0 0 10px 0; color: #1a1a1a;">${event.title}</h3>
        <p style="color: #6b7280; margin: 5px 0;"><strong>Date:</strong> ${dateStr}</p>
        ${event.location ? `<p style="color: #6b7280; margin: 5px 0;"><strong>Location:</strong> ${event.location}</p>` : ""}
        ${event.reminderMessage ? `<div style="color: #374151; margin-top: 15px;">${event.reminderMessage}</div>` : ""}
      </div>
      ${event.eventLink ? `<a href="${event.eventLink}" style="display: inline-block; background: #eab308; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Join Event</a>` : ""}
      ${emailFooter()}
    </div>
  `;

  return sendEmail({
    to: email,
    toName: name || undefined,
    subject: `[Reminder] ${event.title} - ${dateStr}`,
    html,
    templateType: "event_reminder",
  });
}

/**
 * Send newsletter notification email
 */
export async function sendNewsletterEmail(
  email: string,
  name: string | null,
  newsletter: { title: string; content: string; authorName?: string }
): Promise<EmailResult> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      ${emailHeader()}
      <h2 style="color: #1a1a1a;">MojiTax Newsletter</h2>
      <p>Hi ${name || "there"},</p>
      <p>A new newsletter has been published on MojiTax Connect:</p>
      <div style="background: #f5f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8b5cf6;">
        <h3 style="margin: 0 0 10px 0; color: #1a1a1a;">${newsletter.title}</h3>
        <div style="color: #374151;">${newsletter.content}</div>
        ${newsletter.authorName ? `<p style="color: #6b7280; font-size: 14px; margin-top: 15px;">Published by ${newsletter.authorName}</p>` : ""}
      </div>
      <a href="https://connect.mojitax.co.uk" style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">Read on Connect</a>
      ${emailFooter()}
    </div>
  `;

  return sendEmail({
    to: email,
    toName: name || undefined,
    subject: `[Newsletter] ${newsletter.title}`,
    html,
    templateType: "newsletter",
  });
}

/**
 * Send article notification email
 */
export async function sendArticleEmail(
  email: string,
  name: string | null,
  article: {
    title: string;
    content: string;
    tags?: string;
    authorName?: string;
  }
): Promise<EmailResult> {
  // Strip HTML tags for summary, then truncate
  const plainText = article.content.replace(/<[^>]*>/g, "");
  const summary =
    plainText.length > 200 ? plainText.substring(0, 200) + "..." : plainText;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      ${emailHeader()}
      <h2 style="color: #1a1a1a;">New Article Published</h2>
      <p>Hi ${name || "there"},</p>
      <p>A new article has been posted on MojiTax Connect:</p>
      <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
        <h3 style="margin: 0 0 10px 0; color: #1a1a1a;">${article.title}</h3>
        <p style="color: #374151;">${summary}</p>
        ${article.tags ? `<p style="color: #6b7280; font-size: 14px; margin-top: 15px;">Tags: ${article.tags}</p>` : ""}
        ${article.authorName ? `<p style="color: #6b7280; font-size: 14px; margin-top: 5px;">Written by ${article.authorName}</p>` : ""}
      </div>
      <a href="https://connect.mojitax.co.uk" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Read Full Article on Connect</a>
      ${emailFooter()}
    </div>
  `;

  return sendEmail({
    to: email,
    toName: name || undefined,
    subject: `[Article] ${article.title}`,
    html,
    templateType: "article",
  });
}

/**
 * Send reply notification email
 */
export async function sendReplyNotification(
  email: string,
  name: string | null,
  reply: {
    replierName: string;
    originalContent: string;
    replyContent: string;
    channelName: string;
  }
): Promise<EmailResult> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      ${emailHeader()}
      <h2 style="color: #1a1a1a;">New Reply to Your Message</h2>
      <p>Hi ${name || "there"},</p>
      <p><strong>${reply.replierName}</strong> replied to your message in <strong>${reply.channelName}</strong>:</p>
      <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #9ca3af;">
        <p style="color: #6b7280; font-size: 14px; margin: 0;">Your message:</p>
        <p style="color: #374151; margin: 5px 0 0 0;">${reply.originalContent}</p>
      </div>
      <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #2563eb;">
        <p style="color: #1e40af; font-size: 14px; margin: 0;">${reply.replierName}'s reply:</p>
        <p style="color: #1e3a5f; margin: 5px 0 0 0;">${reply.replyContent}</p>
      </div>
      <a href="https://connect.mojitax.co.uk" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">View Conversation</a>
      ${emailFooter()}
    </div>
  `;

  return sendEmail({
    to: email,
    toName: name || undefined,
    subject: `${reply.replierName} replied to your message`,
    html,
    templateType: "reply_notification",
  });
}

/**
 * Send @mention notification email
 */
export async function sendMentionNotification(
  email: string,
  name: string | null,
  mention: {
    mentionerName: string;
    messageContent: string;
    channelName: string;
  }
): Promise<EmailResult> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      ${emailHeader()}
      <h2 style="color: #1a1a1a;">You Were Mentioned</h2>
      <p>Hi ${name || "there"},</p>
      <p><strong>${mention.mentionerName}</strong> mentioned you in <strong>${mention.channelName}</strong>:</p>
      <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #f59e0b;">
        <p style="color: #92400e; margin: 0;">${mention.messageContent}</p>
      </div>
      <a href="https://connect.mojitax.co.uk" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">View Message</a>
      ${emailFooter()}
    </div>
  `;

  return sendEmail({
    to: email,
    toName: name || undefined,
    subject: `${mention.mentionerName} mentioned you in ${mention.channelName}`,
    html,
    templateType: "mention_notification",
  });
}

/**
 * Send support ticket update email
 */
export async function sendSupportUpdate(
  email: string,
  name: string | null,
  update: {
    ticketId: number;
    subject: string;
    status: string;
    latestMessage?: string;
  }
): Promise<EmailResult> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      ${emailHeader()}
      <h2 style="color: #1a1a1a;">Support Ticket Update</h2>
      <p>Hi ${name || "there"},</p>
      <p>Your support ticket has been updated:</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Ticket:</strong> #${update.ticketId}</p>
        <p style="margin: 5px 0;"><strong>Subject:</strong> ${update.subject}</p>
        <p style="margin: 5px 0;"><strong>Status:</strong> ${update.status}</p>
        ${update.latestMessage ? `<div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;"><p style="color: #6b7280; font-size: 14px; margin: 0 0 5px 0;">Latest response:</p><p style="color: #374151; margin: 0;">${update.latestMessage}</p></div>` : ""}
      </div>
      <a href="https://connect.mojitax.co.uk/support" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">View Ticket</a>
      ${emailFooter()}
    </div>
  `;

  return sendEmail({
    to: email,
    toName: name || undefined,
    subject: `Support Ticket #${update.ticketId} - ${update.status}`,
    html,
    templateType: "support_update",
  });
}

/**
 * Get email service status (for debugging)
 */
export function getEmailServiceStatus() {
  return {
    isConfigured: !!ENV.sendGridApiKey,
    isTestMode: ENV.isTestMode,
    testRecipient: ENV.isTestMode ? ENV.testEmailRecipient : undefined,
    fromAddress: ENV.emailFrom,
  };
}
