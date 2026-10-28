import nodemailer from 'nodemailer';
import { config } from './config.js';

const { host, port, secure, user, pass, from } = config.mail;

export const mailConfigured = Boolean(host && from);

const transport = mailConfigured
  ? nodemailer.createTransport({ host, port, secure, auth: user ? { user, pass } : undefined })
  : null;

// Sends in the background: a failed email is logged and never fails the request that caused it.
export function sendMail(message) {
  if (!transport) return;
  transport.sendMail({ from, ...message }).catch((error) => {
    console.error(`Email to ${message.to} failed: ${error.message}`);
  });
}
