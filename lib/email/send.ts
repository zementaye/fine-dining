import { Resend } from "resend";
import twilio from "twilio";
import { ReservationConfirmation } from "./templates/ReservationConfirmation";
import { ReservationReminder } from "./templates/ReservationReminder";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "reservations@gursharestaurant.com"; // TODO: replace with the real sending domain once verified in Resend

const twilioClient =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

type ReservationEmailArgs = {
  to: string;
  guestName: string;
  confirmationCode: string;
  date: string;
  time: string;
  partySize: number;
};

export async function sendReservationConfirmationEmail(args: ReservationEmailArgs) {
  await resend.emails.send({
    from: FROM,
    to: args.to,
    subject: `Your reservation is confirmed — ${args.date}`,
    react: ReservationConfirmation(args),
  });
}

export async function sendReminderEmail(args: {
  to: string;
  guestName: string;
  date: string;
  time: string;
  partySize: number;
  label: "24h" | "2h";
}) {
  await resend.emails.send({
    from: FROM,
    to: args.to,
    subject:
      args.label === "24h"
        ? "See you tomorrow — reservation reminder"
        : "See you soon — reservation reminder",
    react: ReservationReminder(args),
  });
}

export async function sendReminderSms(args: { to: string; date: string; time: string }) {
  if (!twilioClient) {
    console.warn("Twilio not configured — skipping SMS reminder (optional per spec)");
    return;
  }
  await twilioClient.messages.create({
    to: args.to,
    from: process.env.TWILIO_FROM_NUMBER,
    body: `Reminder: your table is booked for ${args.date} at ${args.time}. Reply or call us with questions.`,
  });
}

export async function sendPrivateEventAdminNotification(inquiry: {
  contactName: string;
  contactEmail: string;
  eventType: string;
  preferredDate: string;
  partySize: number;
}) {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "events@gursharestaurant.com";
  await resend.emails.send({
    from: FROM,
    to: adminEmail,
    subject: `New private event inquiry: ${inquiry.eventType}`,
    text: `${inquiry.contactName} (${inquiry.contactEmail}) inquired about a ${inquiry.eventType} for ${inquiry.partySize} on ${inquiry.preferredDate}.`,
  });
}
