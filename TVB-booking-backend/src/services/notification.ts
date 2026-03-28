import nodemailer from "nodemailer";
import twilio from "twilio";
import type { NotificationPreference } from "../model/createPayBody";

const smtpConfigured: boolean = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
const twilioConfigured: boolean = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);

const transporter = smtpConfigured
    ? nodemailer.createTransport({
          host: process.env.SMTP_HOST || `smtp.gmail.com`,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: false,
          auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS
          }
      })
    : null;

const twilioClient = twilioConfigured
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

async function sendEmail(to: string, subject: string, text: string): Promise<void> {
    if (!transporter) {
        console.warn(`SMTP not configured — skipping email to ${to}`);
        return;
    }
    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || `noreply@tvb.com`,
            to,
            subject,
            text
        });
        console.log(`Email sent to ${to}`);
    } catch (err) {
        console.error(`Failed to send email to ${to}:`, err);
    }
}

async function sendSMS(to: string, body: string): Promise<void> {
    if (!twilioClient) {
        console.warn(`Twilio not configured — skipping SMS to ${to}`);
        return;
    }
    try {
        await twilioClient.messages.create({
            body,
            from: process.env.TWILIO_PHONE_NUMBER,
            to
        });
        console.log(`SMS sent to ${to}`);
    } catch (err) {
        console.error(`Failed to send SMS to ${to}:`, err);
    }
}

export async function notifyPlayerPromotion(
    email: string,
    phone: string,
    firstName: string,
    preference: NotificationPreference | undefined
): Promise<void> {
    if (!preference) {
        console.log(`No notification preference set for ${firstName} — skipping notification`);
        return;
    }

    const subject = `You're in! A spot opened up for TVB`;
    const message = `Hi ${firstName}, a spot has opened up and you've been moved from the waiting list to the active roster for this Sunday's TVB session. See you there!`;

    if (preference === `email` || preference === `both`) {
        await sendEmail(email, subject, message);
    }
    if (preference === `sms` || preference === `both`) {
        await sendSMS(phone, message);
    }
}
