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
  const env = getSupabaseEnvStatus();

  if (!cleanLoginId) {
    return null;
  }

  if (!env.hasUrl || env.urlIsPlaceholder || !env.hasServiceRoleKey || env.serviceRoleKeyIsPlaceholder) {
    throw new Error('Supabase no está configurado para consultar usuarios de recuperación.');
  }

  const { data, error } = await supabaseAdmin
    .from('app_users')
    .select('id, login_id, email, phone, name, is_active')
    .eq('login_id', cleanLoginId)
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
    .from('app_users')
    .select('id, user_code, login_id, email, phone, name, is_active, role_id, avatar_url, document_type, document_number, otp_method, is_first_login, password_hash')
    .eq('login_id', cleanLoginId)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo consultar la cuenta: ${error.message}`);
  }

  if (!user) {
    return null;
  }

  const [{ data: role, error: roleError }, { data: ownerAccess, error: ownerAccessError }] = await Promise.all([
    supabaseAdmin
      .from('app_roles')
      .select('id, role_code, name')
      .eq('id', user.role_id)
      .maybeSingle(),
    supabaseAdmin
      .from('user_owner_access')
      .select('owner_id, owners(owner_code)')
      .eq('user_id', user.id),
  ]);

  if (roleError) {
    throw new Error(`No se pudo consultar el rol del usuario: ${roleError.message}`);
  }

  if (ownerAccessError) {
    throw new Error(`No se pudo consultar los propietarios del usuario: ${ownerAccessError.message}`);
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
    roleCode: role?.role_code || null,
    roleName: role?.name || null,
    avatarUrl: user.avatar_url || null,
    documentType: user.document_type || null,
    documentNumber: user.document_number || null,
    otpMethod: user.otp_method || 'email',
    isFirstLogin: user.is_first_login,
    passwordHash: user.password_hash || null,
    ownerIds: (ownerAccess || []).map((row) => {
      const owner = Array.isArray(row.owners) ? row.owners[0] : row.owners;
      return owner?.owner_code ? String(owner.owner_code) : String(row.owner_id);
    }),
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
    const db = buildRecoveryActorClient({
      appUserId: user.id,
      loginId: user.loginId,
      userEmail: user.email,
    });

    const { error } = await db
      .from('app_users')
      .update({ password_hash: upgradedHash })
      .eq('id', user.id);

    if (error) {
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
  const subject = 'Recuperacion de contrasena';
  const bodyText = `Hola ${name},\n\nRecibimos una solicitud para restablecer tu contraseña. Usa este enlace para continuar:\n${resetUrl}\n\nSi no solicitaste este cambio, puedes ignorar este correo.`;
  const bodyHtml = `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <h2 style="margin-bottom: 8px;">Recuperación de contraseña</h2>
        <p>Hola ${name},</p>
        <p>Recibimos una solicitud para restablecer tu contraseña en el Portal de Certificación Logística.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;">
            Restablecer contraseña
          </a>
        </p>
        <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
      </div>
    `;

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
  const subject = 'Acceso inicial al sistema de certificacion';
  const bodyText = `Hola ${name},\n\nTu cuenta fue creada correctamente.\n\nUsuario: ${loginId}\nContraseña temporal: ${temporaryPassword}\n\nIngresa al portal y cambia tu contraseña en el primer acceso:\n${loginUrl}\n\nSi no reconoces este mensaje, comunícate con el administrador.`;
  const bodyHtml = `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <h2 style="margin-bottom: 8px;">Cuenta creada correctamente</h2>
        <p>Hola ${name},</p>
        <p>Tu usuario fue creado en el Portal de Certificación Logística.</p>
        <p><strong>Usuario:</strong> ${loginId}</p>
        <p><strong>Contraseña temporal:</strong> ${temporaryPassword}</p>
        <p>En tu primer ingreso el sistema te pedirá actualizar la contraseña.</p>
        <p>
          <a href="${loginUrl}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;">
            Ingresar al portal
          </a>
        </p>
      </div>
    `;

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
  const db = buildRecoveryActorClient({
    appUserId: user.id,
    loginId: user.loginId,
    userEmail: user.email,
  });

  const { error } = await db
    .from('app_users')
    .update({
      password_hash: passwordHash,
      is_first_login: false,
    })
    .eq('id', user.id);

  if (error) {
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
  const db = buildRecoveryActorClient({
    appUserId: user?.id || null,
    loginId,
    userEmail: email,
  });

  const { error } = await db
    .from('app_users')
    .update({
      password_hash: await hashPassword(password),
      is_first_login: false,
    })
    .eq('login_id', loginId)
    .eq('email', email);

  if (error) {
    throw new Error(`No se pudo actualizar la contraseña: ${error.message}`);
  }
};
