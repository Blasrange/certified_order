import 'server-only';

import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSupabaseEnvStatus, isPlaceholderValue } from '@/lib/env';

export type RecoveryPayload = {
  loginId: string;
  email: string;
  exp: number;
};

type RecoveryUser = {
  loginId: string;
  email: string;
  phone?: string;
  name: string;
  isActive: boolean;
};

const normalizePhone = (value: string | undefined | null) =>
  String(value || '').replace(/\D/g, '');

const getRecoverySecret = () => {
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret || isPlaceholderValue(secret)) {
    throw new Error('JWT_SECRET no está configurado con un valor real.');
  }

  return secret;
};

const toBase64Url = (value: string) => Buffer.from(value, 'utf8').toString('base64url');

const fromBase64Url = (value: string) => Buffer.from(value, 'base64url').toString('utf8');

const signValue = (value: string) =>
  crypto.createHmac('sha256', getRecoverySecret()).update(value).digest('base64url');

export const createRecoveryToken = (payload: RecoveryPayload) => {
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = signValue(encodedPayload);
  return `${encodedPayload}.${signature}`;
};

export const verifyRecoveryToken = (token: string): RecoveryPayload => {
  const [encodedPayload, signature] = token.split('.');

  if (!encodedPayload || !signature) {
    throw new Error('El enlace de recuperación no es válido.');
  }

  const expectedSignature = signValue(encodedPayload);
  if (signature !== expectedSignature) {
    throw new Error('La firma del enlace de recuperación es inválida.');
  }

  const payload = JSON.parse(fromBase64Url(encodedPayload)) as RecoveryPayload;

  if (!payload.loginId || !payload.email || !payload.exp) {
    throw new Error('El enlace de recuperación está incompleto.');
  }

  if (Date.now() > payload.exp) {
    throw new Error('El enlace de recuperación ha expirado.');
  }

  return payload;
};

export const findRecoveryUserByLoginId = async (loginId: string): Promise<RecoveryUser | null> => {
  const cleanLoginId = loginId.trim().toUpperCase();
  const env = getSupabaseEnvStatus();

  if (!cleanLoginId) {
    return null;
  }

  if (!env.hasUrl || env.urlIsPlaceholder || !env.hasServiceRoleKey || env.serviceRoleKeyIsPlaceholder) {
    throw new Error('Supabase no está configurado para consultar usuarios de recuperación.');
  }

  const { data, error } = await supabaseAdmin
    .from('app_users')
    .select('login_id, email, phone, name, is_active')
    .eq('login_id', cleanLoginId)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo consultar el usuario de recuperación: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    loginId: data.login_id,
    email: data.email,
    phone: data.phone || undefined,
    name: data.name,
    isActive: data.is_active,
  };
};

export const validateRecoveryIdentity = async ({
  loginId,
  phone,
}: {
  loginId: string;
  phone: string;
}): Promise<RecoveryUser | null> => {
  const user = await findRecoveryUserByLoginId(loginId);

  if (!user) {
    return null;
  }

  const normalizedStoredPhone = normalizePhone(user.phone);
  const normalizedSubmittedPhone = normalizePhone(phone);

  if (!normalizedStoredPhone || !normalizedSubmittedPhone || normalizedStoredPhone !== normalizedSubmittedPhone) {
    return null;
  }

  return user;
};

const getMailerConfig = () => {
  const host = process.env.MAIL_HOST?.trim() || process.env.SMTP_HOST?.trim();
  const port = Number(process.env.MAIL_PORT?.trim() || process.env.SMTP_PORT?.trim() || '587');
  const user = process.env.MAIL_USERNAME?.trim() || process.env.SMTP_USER?.trim();
  const pass = process.env.MAIL_PASSWORD?.trim() || process.env.SMTP_PASS?.trim();
  const from = process.env.MAIL_FROM_ADDRESS?.trim() || process.env.SMTP_FROM?.trim() || user;
  const mailEncryption = (process.env.MAIL_ENCRYPTION?.trim() || '').toLowerCase();
  const explicitSecure = (process.env.SMTP_SECURE?.trim() || '').toLowerCase() === 'true';
  const secure = explicitSecure || mailEncryption === 'ssl' || port === 465;
  const requireTLS = mailEncryption === 'tls' || mailEncryption === 'starttls';

  if (!host || !user || !pass || !from) {
    throw new Error('El correo no está configurado. Define MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD y MAIL_FROM_ADDRESS.');
  }

  if (
    isPlaceholderValue(user) ||
    isPlaceholderValue(pass) ||
    isPlaceholderValue(from)
  ) {
    throw new Error('El correo no está configurado con valores reales. Revisa MAIL_USERNAME, MAIL_PASSWORD y MAIL_FROM_ADDRESS.');
  }

  return {
    host,
    port,
    secure,
    requireTLS,
    auth: {
      user,
      pass,
    },
    from,
  };
};

export const sendRecoveryEmail = async ({
  to,
  name,
  resetUrl,
}: {
  to: string;
  name: string;
  resetUrl: string;
}) => {
  const mailer = getMailerConfig();
  const transport = nodemailer.createTransport({
    host: mailer.host,
    port: mailer.port,
    secure: mailer.secure,
    requireTLS: mailer.requireTLS,
    auth: mailer.auth,
  });

  await transport.sendMail({
    from: mailer.from,
    to,
    subject: 'Recuperación de contraseña - Portal CCL',
    text: `Hola ${name},\n\nRecibimos una solicitud para restablecer tu contraseña. Usa este enlace para continuar:\n${resetUrl}\n\nSi no solicitaste este cambio, puedes ignorar este correo.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <h2 style="margin-bottom: 8px;">Recuperación de contraseña</h2>
        <p>Hola ${name},</p>
        <p>Recibimos una solicitud para restablecer tu contraseña en el Portal CCL.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;">
            Restablecer contraseña
          </a>
        </p>
        <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
      </div>
    `,
  });
};

export const updatePasswordFromRecovery = async ({
  loginId,
  email,
  password,
}: {
  loginId: string;
  email: string;
  password: string;
}) => {
  const env = getSupabaseEnvStatus();

  if (!env.hasUrl || env.urlIsPlaceholder || !env.hasServiceRoleKey || env.serviceRoleKeyIsPlaceholder) {
    throw new Error('Supabase no está configurado para actualizar contraseñas.');
  }

  const { error } = await supabaseAdmin
    .from('app_users')
    .update({
      password_hash: password,
      is_first_login: false,
    })
    .eq('login_id', loginId)
    .eq('email', email);

  if (error) {
    throw new Error(`No se pudo actualizar la contraseña: ${error.message}`);
  }
};
