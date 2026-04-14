import 'server-only';

import crypto from 'crypto';
import type { NextResponse } from 'next/server';

import { isPlaceholderValue } from '@/lib/env';
import { getAuthenticatedUserByLoginId } from '@/lib/password-recovery.server';

export const SESSION_COOKIE_NAME = 'certified_order_session';
export const SESSION_MAX_AGE_SECONDS = 20 * 60;

type SessionPayload = {
  loginId: string;
  exp: number;
};

const getSessionSecret = () => {
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret || isPlaceholderValue(secret)) {
    throw new Error('JWT_SECRET no está configurado con un valor real.');
  }

  return secret;
};

const toBase64Url = (value: string) => Buffer.from(value, 'utf8').toString('base64url');

const fromBase64Url = (value: string) => Buffer.from(value, 'base64url').toString('utf8');

const signValue = (value: string) =>
  crypto.createHmac('sha256', getSessionSecret()).update(value).digest('base64url');

export const createSessionToken = (loginId: string) => {
  const payload: SessionPayload = {
    loginId: loginId.trim().toUpperCase(),
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  };

  const encodedPayload = toBase64Url(JSON.stringify(payload));
  return `${encodedPayload}.${signValue(encodedPayload)}`;
};

export const verifySessionToken = (token: string): SessionPayload => {
  const [encodedPayload, signature] = token.split('.');

  if (!encodedPayload || !signature) {
    throw new Error('La sesión no es válida.');
  }

  const expectedSignature = signValue(encodedPayload);
  if (signature !== expectedSignature) {
    throw new Error('La firma de la sesión es inválida.');
  }

  const payload = JSON.parse(fromBase64Url(encodedPayload)) as SessionPayload;

  if (!payload.loginId || !payload.exp) {
    throw new Error('La sesión está incompleta.');
  }

  if (Date.now() > payload.exp) {
    throw new Error('La sesión ha expirado.');
  }

  return payload;
};

export const getSessionLoginId = (cookieValue?: string | null) => {
  if (!cookieValue) {
    return null;
  }

  try {
    return verifySessionToken(cookieValue).loginId;
  } catch {
    return null;
  }
};

export const getSessionUser = async (cookieValue?: string | null) => {
  const loginId = getSessionLoginId(cookieValue);

  if (!loginId) {
    return null;
  }

  return getAuthenticatedUserByLoginId(loginId);
};

export const attachSessionCookie = (response: NextResponse, loginId: string) => {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: createSessionToken(loginId),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return response;
};

export const clearSessionCookie = (response: NextResponse) => {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });

  return response;
};