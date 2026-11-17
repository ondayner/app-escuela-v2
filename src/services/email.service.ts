import nodemailer from 'nodemailer';

export interface EmailService {
  sendEmailVerification(to: string, token: string): Promise<void>;
}

const ensureEmailConfigured = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Configura EMAIL_USER y EMAIL_PASS para enviar correos de verificación');
  }
};

const sendEmailVerification: EmailService['sendEmailVerification'] = async (to, token) => {
  ensureEmailConfigured();
  const baseUrl = process.env.API_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;
  const verificationUrl = new URL('/api/auth/verify-email', baseUrl);
  verificationUrl.searchParams.set('token', token);

  const transport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  await transport.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: 'Confirma tu correo electrónico',
    text: `Confirma tu correo abriendo este enlace. El enlace vence en 24 horas; la verificación solo se permite una vez por cuenta: ${verificationUrl.toString()}`,
  });
};

const emailService: EmailService = { sendEmailVerification };

export default emailService;
