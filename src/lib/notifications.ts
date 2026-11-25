'use server';

import nodemailer from 'nodemailer';
import { emailConfig } from './notifications-config';

interface EmailPayload {
  to: string; // Can be a single email or a comma-separated list
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const { host, port, user, pass } = emailConfig;

  if (!host || !port || !user || !pass) {
    const errorMessage = `La configuración del servidor de correo está incompleta.`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  const transporter = nodemailer.createTransport({
    host: host,
    port: Number(port),
    secure: Number(port) === 465, // true for 465, false for other ports
    auth: {
      user: user,
      pass: pass,
    },
  });

  // Split the 'to' string into an array of individual email addresses
  const recipients = payload.to.split(',').map(email => email.trim()).filter(email => email);

  // Send an individual email to each recipient
  for (const recipient of recipients) {
    const mailOptions = {
      from: `"DMR Proyectos" <${user}>`,
      to: recipient, // Send to a single recipient
      subject: payload.subject,
      html: payload.html,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Correo enviado exitosamente a ${recipient}`);
    } catch (error) {
      console.error(`Error al enviar el correo a ${recipient} a través de Nodemailer:`, error);
      // We will log the error but not throw, to allow other emails to be sent.
      // throw new Error(`Error al enviar el correo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }
}
