import 'server-only';

import crypto from 'crypto';
import { promisify } from 'util';
import nodemailer from 'nodemailer';
import { createSupabaseAdminClient, supabaseAdmin } from '@/lib/supabase/admin';
import { getSupabaseEnvStatus, isPlaceholderValue } from '@/lib/env';
import type { User } from '@/lib/types';

const scryptAsync = promisify(crypto.scrypt);

export type RecoveryPayload = {
  loginId: string;
  email: string;
  exp: number;
};

type RecoveryUser = {
  id: number;
  loginId: string;
  email: string;
  phone?: string;
  name: string;
  isActive: boolean;
};

type AuthenticatedUserRow = RecoveryUser & {
  userCode?: string | null;
  roleId?: number | string | null;
  roleCode?: string | null;
  roleName?: string | null;
  avatarUrl?: string | null;
  documentType?: string | null;
  documentNumber?: string | null;
  otpMethod?: 'email' | 'sms' | null;
  isFirstLogin?: boolean;
  passwordHash?: string | null;
  ownerIds: string[];
};

const isSystemAdminRole = (roleCode?: string | null, roleName?: string | null) => {
  const normalizedCode = String(roleCode || '').trim().toLowerCase();
  const normalizedName = String(roleName || '').trim().toLowerCase();

  return normalizedCode === 'admin' || normalizedName.includes('administrador');
};

type EmailMessageStatus = 'pending' | 'queued' | 'sent' | 'failed' | 'cancelled';

const buildRecoveryActorClient = ({
  appUserId,
  loginId,
  userEmail,
}: {
  appUserId?: number | null;
  loginId?: string;
  userEmail?: string;
}) =>
  createSupabaseAdminClient({
    appUserId: appUserId || null,
    loginId: loginId || null,
    userEmail: userEmail || null,
  });

const createEmailMessageRecord = async ({
  createdByUserId,
  recipientEmail,
  recipientName,
  subject,
  bodyText,
  bodyHtml,
  status,
  provider,
  relatedEntityType,
  relatedEntityId,
  metadata,
}: {
  createdByUserId?: number | null;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  status: EmailMessageStatus;
  provider?: string;
  relatedEntityType?: string;
  relatedEntityId?: number;
  metadata?: Record<string, unknown>;
}) => {
  const messageCode = `MAIL-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  const db = buildRecoveryActorClient({
    appUserId: createdByUserId,
    userEmail: recipientEmail,
  });

  const { data, error } = await db
    .from('email_messages')
    .insert({
      message_code: messageCode,
      created_by_user_id: createdByUserId || null,
      recipient_email: recipientEmail,
      recipient_name: recipientName || null,
      subject,
      body_text: bodyText || null,
      body_html: bodyHtml || null,
      status,
      provider: provider || null,
      related_entity_type: relatedEntityType || null,
      related_entity_id: relatedEntityId || null,
      metadata: metadata || {},
    })
    .select('id')
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo registrar el correo saliente: ${error.message}`);
  }

  return data?.id as number | undefined;
};

const updateEmailMessageRecord = async ({
  id,
  status,
  provider,
  providerMessageId,
  sentAt,
  errorMessage,
  metadata,
}: {
  id?: number;
  status: EmailMessageStatus;
  provider?: string;
  providerMessageId?: string;
  sentAt?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}) => {
  if (!id) {
    return;
  }

  const db = buildRecoveryActorClient({
    userEmail: typeof metadata?.recipientEmail === 'string' ? metadata.recipientEmail : undefined,
  });

  const payload: Record<string, unknown> = {
    status,
    provider: provider || null,
    provider_message_id: providerMessageId || null,
    sent_at: sentAt || null,
    error_message: errorMessage || null,
  };

  if (metadata) {
    payload.metadata = metadata;
  }

  const { error } = await db
    .from('email_messages')
    .update(payload)
    .eq('id', id);

  if (error) {
    throw new Error(`No se pudo actualizar el log del correo: ${error.message}`);
  }
};

const safeUpdateEmailMessageRecord = async (params: Parameters<typeof updateEmailMessageRecord>[0]) => {
  try {
    await updateEmailMessageRecord(params);
  } catch (error) {
    console.error('No se pudo actualizar email_messages.', error);
  }
};

const normalizePhone = (value: string | undefined | null) =>
  String(value || '').replace(/\D/g, '');

const PASSWORD_HASH_PREFIX = 'scrypt';

const isStructuredPasswordHash = (value?: string | null) =>
  typeof value === 'string' && value.startsWith(`${PASSWORD_HASH_PREFIX}$`);

const timingSafeEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

export const hashPassword = async (password: string) => {
  const normalizedPassword = password.trim();

  if (normalizedPassword.length < 8) {
    throw new Error('La contraseña debe tener al menos 8 caracteres.');
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(normalizedPassword, salt, 64)) as Buffer;
  return `${PASSWORD_HASH_PREFIX}$${salt}$${derivedKey.toString('hex')}`;
};

export const verifyPassword = async ({
  password,
  storedHash,
}: {
  password: string;
  storedHash?: string | null;
}) => {
  const normalizedPassword = password.trim();
  const safeStoredHash = String(storedHash || '');

  if (!safeStoredHash) {
    return false;
  }

  if (!isStructuredPasswordHash(safeStoredHash)) {
    return timingSafeEqual(normalizedPassword, safeStoredHash);
  }

  const [, salt, expectedHash] = safeStoredHash.split('$');

  if (!salt || !expectedHash) {
    return false;
  }

  const derivedKey = (await scryptAsync(normalizedPassword, salt, 64)) as Buffer;
  return timingSafeEqual(derivedKey.toString('hex'), expectedHash);
};

const generateTemporaryPassword = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%';
  return Array.from({ length: 12 }, () => alphabet[crypto.randomInt(0, alphabet.length)]).join('');
};

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

  if (!cleanLoginId) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .rpc('get_portal_recovery_user', { p_login_id: cleanLoginId })
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo consultar el usuario de recuperación: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    loginId: data.login_id,
    email: data.email,
    phone: data.phone || undefined,
    name: data.name,
    isActive: data.is_active,
  };
};

const findAuthenticatedUserByLoginId = async (loginId: string): Promise<AuthenticatedUserRow | null> => {
  const cleanLoginId = loginId.trim().toUpperCase();

  if (!cleanLoginId) {
    return null;
  }

  const { data: user, error } = await supabaseAdmin
    .rpc('get_portal_auth_user', { p_login_id: cleanLoginId })
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo consultar la cuenta: ${error.message}`);
  }

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    userCode: user.user_code || null,
    loginId: user.login_id,
    email: user.email,
    phone: user.phone || undefined,
    name: user.name,
    isActive: user.is_active,
    roleId: user.role_id,
    roleCode: user.role_code || null,
    roleName: user.role_name || null,
    avatarUrl: user.avatar_url || null,
    documentType: user.document_type || null,
    documentNumber: user.document_number || null,
    otpMethod: user.otp_method || 'email',
    isFirstLogin: user.is_first_login,
    passwordHash: user.password_hash || null,
    ownerIds: Array.isArray(user.owner_ids) ? user.owner_ids.map((value) => String(value)) : [],
  };
};

const toSafeAuthenticatedUser = (user: AuthenticatedUserRow): User => ({
  id: user.userCode || String(user.id),
  name: user.name,
  email: user.email,
  avatar: user.avatarUrl || '',
  role: user.roleCode || String(user.roleId || ''),
  isSystemAdmin: isSystemAdminRole(user.roleCode, user.roleName),
  documentType: user.documentType || undefined,
  documentNumber: user.documentNumber || undefined,
  loginId: user.loginId,
  phone: user.phone || undefined,
  otpMethod: user.otpMethod || 'email',
  isActive: user.isActive,
  isFirstLogin: user.isFirstLogin,
  ownerIds: user.ownerIds,
});

export const authenticateUserCredentials = async ({
  loginId,
  password,
}: {
  loginId: string;
  password: string;
}) => {
  const user = await findAuthenticatedUserByLoginId(loginId);

  if (!user) {
    throw new Error('Credenciales inválidas. Verifique su usuario y contraseña.');
  }

  if (!user.isActive) {
    throw new Error('Tu cuenta está inactivada. Contacta al administrador.');
  }

  const isValid = await verifyPassword({
    password,
    storedHash: user.passwordHash,
  });

  if (!isValid) {
    throw new Error('Credenciales inválidas. Verifique su usuario y contraseña.');
  }

  if (!isStructuredPasswordHash(user.passwordHash)) {
    const upgradedHash = await hashPassword(password);

    const { data: updated, error } = await supabaseAdmin.rpc('update_portal_user_password', {
      p_login_id: user.loginId,
      p_email: user.email,
      p_password_hash: upgradedHash,
      p_is_first_login: user.isFirstLogin ?? false,
    });

    if (error || !updated) {
      throw new Error(`No se pudo actualizar la seguridad de la cuenta: ${error.message}`);
    }
  }

  return toSafeAuthenticatedUser(user);
};

export const getAuthenticatedUserByLoginId = async (loginId: string) => {
  const user = await findAuthenticatedUserByLoginId(loginId);
  return user ? toSafeAuthenticatedUser(user) : null;
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

const buildEmailTemplate = ({
  eyebrow,
  title,
  intro,
  outro,
  ctaLabel,
  ctaUrl,
  highlightRows = [],
}: {
  eyebrow: string;
  title: string;
  intro: string;
  outro: string;
  ctaLabel: string;
  ctaUrl: string;
  highlightRows?: Array<{ label: string; value: string }>;
}) => {
  const rowsMarkup = highlightRows.length
    ? `
      <div style="margin:24px 0;padding:18px;border:1px solid #dbeafe;border-radius:20px;background:linear-gradient(180deg,#f8fbff 0%,#eef6ff 100%);">
        ${highlightRows
          .map(
            ({ label, value }) => `
              <div style="display:flex;justify-content:space-between;gap:16px;padding:${highlightRows[0]?.label === label ? '0 0 12px' : '12px 0'};${highlightRows[highlightRows.length - 1]?.label === label ? '' : 'border-bottom:1px solid #dbeafe;'}">
                <span style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">${label}</span>
                <span style="font-size:14px;font-weight:700;color:#0f172a;text-align:right;">${value}</span>
              </div>
            `
          )
          .join('')}
      </div>
    `
    : '';

  return `
    <div style="margin:0;padding:32px 16px;background:#f8fafc;font-family:Inter,Arial,sans-serif;color:#0f172a;">
      <div style="max-width:640px;margin:0 auto;border:1px solid #e2e8f0;border-radius:28px;overflow:hidden;background:#ffffff;box-shadow:0 24px 60px rgba(15,23,42,0.12);">
        <div style="padding:32px;background:linear-gradient(135deg,#eff6ff 0%,#ffffff 62%,#f8fafc 100%);border-bottom:1px solid #e2e8f0;">
          <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:#dbeafe;color:#1d4ed8;font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;">${eyebrow}</div>
          <h1 style="margin:18px 0 10px;font-size:30px;line-height:1.1;font-weight:800;color:#0f172a;">${title}</h1>
          <p style="margin:0;font-size:15px;line-height:1.7;color:#475569;">${intro}</p>
          ${rowsMarkup}
          <div style="margin-top:26px;">
            <a href="${ctaUrl}" style="display:inline-block;padding:14px 22px;border-radius:16px;background:linear-gradient(135deg,#2563eb 0%,#3b82f6 100%);color:#ffffff;text-decoration:none;font-size:14px;font-weight:800;box-shadow:0 14px 30px rgba(37,99,235,0.28);">
              ${ctaLabel}
            </a>
          </div>
        </div>
        <div style="padding:24px 32px 32px;">
          <div style="padding:16px 18px;border-radius:18px;background:#f8fafc;border:1px solid #e2e8f0;">
            <p style="margin:0;font-size:13px;line-height:1.7;color:#475569;">${outro}</p>
          </div>
          <p style="margin:20px 0 0;font-size:12px;line-height:1.7;color:#94a3b8;">Portal Certificados</p>
        </div>
      </div>
    </div>
  `;
};

export const sendRecoveryEmail = async ({
  userId,
  to,
  name,
  resetUrl,
}: {
  userId?: number;
  to: string;
  name: string;
  resetUrl: string;
}) => {
  const mailer = getMailerConfig();
  const subject = 'Recupera tu acceso al portal';
  const bodyText = `Hola ${name},\n\nRecibimos una solicitud para restablecer tu contraseña en Portal Certificados.\n\nUsa este enlace para continuar:\n${resetUrl}\n\nSi no solicitaste este cambio, puedes ignorar este mensaje con tranquilidad.`;
  const bodyHtml = buildEmailTemplate({
    eyebrow: 'Recuperación',
    title: `Hola ${name}, recupera tu acceso`,
    intro: 'Recibimos una solicitud para restablecer tu contraseña. Usa el botón de abajo para crear una nueva clave y volver a ingresar al portal de forma segura.',
    outro: 'Si no solicitaste este cambio, puedes ignorar este mensaje. Tu cuenta seguirá protegida y no se aplicará ninguna modificación hasta que completes el proceso.',
    ctaLabel: 'Restablecer contraseña',
    ctaUrl: resetUrl,
  });

  let emailMessageId: number | undefined;

  try {
    emailMessageId = await createEmailMessageRecord({
      createdByUserId: userId || null,
      recipientEmail: to,
      recipientName: name,
      subject,
      bodyText,
      bodyHtml,
      status: 'queued',
      provider: 'smtp',
      relatedEntityType: 'password_recovery',
      relatedEntityId: userId,
      metadata: {
        loginFlow: 'password_recovery',
        recipientEmail: to,
      },
    });
  } catch (error) {
    console.error('No se pudo registrar el correo en email_messages.', error);
  }

  const transport = nodemailer.createTransport({
    host: mailer.host,
    port: mailer.port,
    secure: mailer.secure,
    requireTLS: mailer.requireTLS,
    auth: mailer.auth,
  });

  try {
    const info = await transport.sendMail({
      from: mailer.from,
      to,
      subject,
      text: bodyText,
      html: bodyHtml,
    });

    await safeUpdateEmailMessageRecord({
      id: emailMessageId,
      status: 'sent',
      provider: 'smtp',
      providerMessageId: info.messageId,
      sentAt: new Date().toISOString(),
      metadata: {
        loginFlow: 'password_recovery',
        recipientEmail: to,
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo enviar el correo.';

    await safeUpdateEmailMessageRecord({
      id: emailMessageId,
      status: 'failed',
      provider: 'smtp',
      errorMessage: message,
      metadata: {
        loginFlow: 'password_recovery',
        recipientEmail: to,
      },
    });

    throw error;
  }
};

export const sendUserWelcomeEmail = async ({
  userId,
  to,
  name,
  loginId,
  temporaryPassword,
  loginUrl,
}: {
  userId?: number;
  to: string;
  name: string;
  loginId: string;
  temporaryPassword: string;
  loginUrl: string;
}) => {
  const mailer = getMailerConfig();
  const subject = 'Tu acceso inicial está listo';
  const bodyText = `Hola ${name},\n\nTu cuenta fue creada correctamente en Portal Certificados.\n\nUsuario: ${loginId}\nContraseña temporal: ${temporaryPassword}\n\nIngresa al portal desde este enlace:\n${loginUrl}\n\nPor seguridad, en el primer acceso deberás cambiar la contraseña. Si no reconoces este mensaje, comunícate con el administrador.`;
  const bodyHtml = buildEmailTemplate({
    eyebrow: 'Nuevo acceso',
    title: `Hola ${name}, tu cuenta ya está lista`,
    intro: 'Tu usuario fue creado correctamente en Portal Certificados. A continuación encontrarás tus datos de acceso temporal para ingresar por primera vez.',
    outro: 'Por seguridad, en tu primer ingreso el sistema te pedirá actualizar la contraseña. Si no reconoces este mensaje, comunícate con el administrador del portal.',
    ctaLabel: 'Ingresar al portal',
    ctaUrl: loginUrl,
    highlightRows: [
      { label: 'Usuario', value: loginId },
      { label: 'Contraseña temporal', value: temporaryPassword },
    ],
  });

  let emailMessageId: number | undefined;

  try {
    emailMessageId = await createEmailMessageRecord({
      createdByUserId: userId || null,
      recipientEmail: to,
      recipientName: name,
      subject,
      bodyText,
      bodyHtml,
      status: 'queued',
      provider: 'smtp',
      relatedEntityType: 'app_user',
      relatedEntityId: userId,
      metadata: {
        loginFlow: 'new_user_onboarding',
        recipientEmail: to,
        loginId,
      },
    });
  } catch (error) {
    console.error('No se pudo registrar el correo de bienvenida en email_messages.', error);
  }

  const transport = nodemailer.createTransport({
    host: mailer.host,
    port: mailer.port,
    secure: mailer.secure,
    requireTLS: mailer.requireTLS,
    auth: mailer.auth,
  });

  try {
    const info = await transport.sendMail({
      from: mailer.from,
      to,
      subject,
      text: bodyText,
      html: bodyHtml,
    });

    await safeUpdateEmailMessageRecord({
      id: emailMessageId,
      status: 'sent',
      provider: 'smtp',
      providerMessageId: info.messageId,
      sentAt: new Date().toISOString(),
      metadata: {
        loginFlow: 'new_user_onboarding',
        recipientEmail: to,
        loginId,
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo enviar el correo de bienvenida.';

    await safeUpdateEmailMessageRecord({
      id: emailMessageId,
      status: 'failed',
      provider: 'smtp',
      errorMessage: message,
      metadata: {
        loginFlow: 'new_user_onboarding',
        recipientEmail: to,
        loginId,
      },
    });

    console.error('No se pudo enviar el correo de bienvenida.', error);
  }
};

export const changePasswordForUser = async ({
  loginId,
  email,
  password,
}: {
  loginId: string;
  email?: string;
  password: string;
}) => {
  const user = await findAuthenticatedUserByLoginId(loginId);

  if (!user) {
    throw new Error('No se encontró la cuenta que se intenta actualizar.');
  }

  if (email && user.email.toLowerCase() !== email.trim().toLowerCase()) {
    throw new Error('La cuenta no coincide con el correo registrado.');
  }

  const passwordHash = await hashPassword(password);

  const { data: updated, error } = await supabaseAdmin.rpc('update_portal_user_password', {
    p_login_id: user.loginId,
    p_email: user.email,
    p_password_hash: passwordHash,
    p_is_first_login: false,
  });

  if (error || !updated) {
    throw new Error(`No se pudo actualizar la contraseña: ${error.message}`);
  }

  return {
    ...toSafeAuthenticatedUser({ ...user, isFirstLogin: false }),
    isFirstLogin: false,
  } as User;
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

  const user = await findRecoveryUserByLoginId(loginId);

  const { data: updated, error } = await supabaseAdmin.rpc('update_portal_user_password', {
    p_login_id: loginId,
    p_email: email,
    p_password_hash: await hashPassword(password),
    p_is_first_login: false,
  });

  if (error || !updated) {
    throw new Error(`No se pudo actualizar la contraseña: ${error.message}`);
  }
};
