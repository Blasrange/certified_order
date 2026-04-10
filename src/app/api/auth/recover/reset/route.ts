import { NextResponse } from 'next/server';
import {
  updatePasswordFromRecovery,
  verifyRecoveryToken,
} from '@/lib/password-recovery.server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { token, password } = (await request.json()) as {
      token?: string;
      password?: string;
    };

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Faltan datos para completar la recuperación.' },
        { status: 400 }
      );
    }

    if (password.trim().length < 8) {
      return NextResponse.json(
        { error: 'La nueva contraseña debe tener al menos 8 caracteres.' },
        { status: 400 }
      );
    }

    const payload = verifyRecoveryToken(token);

    await updatePasswordFromRecovery({
      loginId: payload.loginId,
      email: payload.email,
      password: password.trim(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo completar el restablecimiento de contraseña.',
      },
      { status: 500 }
    );
  }
}
