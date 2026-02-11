import * as db from "../db";
import * as emailService from "./email";

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes

/**
 * Checks for events that are due for an auto-reminder and sends them.
 * Runs on an interval — no external job queue required.
 */
async function checkAndSendReminders() {
  try {
    const events = await db.getEventsDueForReminder();

    for (const event of events) {
      try {
        const rsvps = await db.getEventRsvps(event.id);
        const eligible = rsvps.filter(
          r => r.status === "confirmed" || r.status === "interested"
        );

        if (eligible.length === 0) {
          // Mark as sent even with no recipients so we don't keep checking
          await db.updatePost(event.id, { autoReminderSentAt: new Date() });
          continue;
        }

        let sentCount = 0;
        for (const rsvp of eligible) {
          try {
            await emailService.sendEventReminder(rsvp.email, rsvp.name, {
              title: event.title,
              content: event.content,
              date: new Date(event.eventDate!),
              location: event.eventLocation || undefined,
              reminderMessage: `This is an automatic reminder — the event is coming up in ${event.reminderHours} hour${event.reminderHours === 1 ? "" : "s"}.`,
            });
            await db.updateEventRsvp(rsvp.id, {
              reminderSentAt: new Date(),
            });
            sentCount++;
          } catch (err) {
            console.error(
              `[AutoReminder] Failed to send reminder to ${rsvp.email}:`,
              err
            );
          }
        }

        // Mark auto-reminder as sent for this event
        await db.updatePost(event.id, { autoReminderSentAt: new Date() });
        console.log(
          `[AutoReminder] Sent ${sentCount} reminders for event "${event.title}" (ID: ${event.id})`
        );
      } catch (err) {
        console.error(
          `[AutoReminder] Error processing event ${event.id}:`,
          err
        );
      }
    }
  } catch (err) {
    console.error("[AutoReminder] Error checking for due reminders:", err);
  }
}

/**
 * Start the auto-reminder scheduler. Call once at server startup.
 */
export function startReminderScheduler() {
  console.log(
    `[AutoReminder] Scheduler started — checking every ${CHECK_INTERVAL_MS / 1000 / 60} minutes`
  );
  // Run once immediately on startup
  checkAndSendReminders();
  // Then schedule periodic checks
  setInterval(checkAndSendReminders, CHECK_INTERVAL_MS);
}
