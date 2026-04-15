import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  attachSessionCookie,
  clearSessionCookie,
  getSessionUser,
  SESSION_COOKIE_NAME,
} from '@/lib/auth-session.server';
import { authenticateUserCredentials } from '@/lib/password-recovery.server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const user = await getSessionUser(sessionCookie);

  if (!user) {
    return clearSessionCookie(NextResponse.json({ ok: true, user: null }));
  }

  return attachSessionCookie(NextResponse.json({ ok: true, user }), user.loginId || '');
}

export async function POST(request: Request) {
  try {
    const { loginId, password } = (await request.json()) as {
      loginId?: string;
      password?: string;
    };

    if (!loginId || !password) {
      return NextResponse.json(
        { error: 'Debes ingresar el usuario y la contraseña.' },
        { status: 400 }
      );
    }

    const user = await authenticateUserCredentials({ loginId, password });
    return attachSessionCookie(NextResponse.json({ ok: true, user }), user.loginId || loginId);
  } catch (error) {
    return clearSessionCookie(
      NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : 'No fue posible validar las credenciales.',
        },
        { status: 400 }
      )
    );
  }
}

export async function DELETE() {
  return clearSessionCookie(NextResponse.json({ ok: true }));
}