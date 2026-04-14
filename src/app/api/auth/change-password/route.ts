import { NextResponse } from 'next/server';

import { changePasswordForUser } from '@/lib/password-recovery.server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { loginId, email, password } = (await request.json()) as {
      loginId?: string;
      email?: string;
      password?: string;
    };

    if (!loginId || !password) {
      return NextResponse.json(
        { error: 'Debes indicar el usuario y la nueva contraseña.' },
        { status: 400 }
      );
    }

    if (password.trim().length < 8) {
      return NextResponse.json(
        { error: 'La nueva contraseña debe tener al menos 8 caracteres.' },
        { status: 400 }
      );
    }

    const user = await changePasswordForUser({
      loginId,
      email,
      password,
    });

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo actualizar la contraseña.',
      },
      { status: 500 }
    );
  }
}