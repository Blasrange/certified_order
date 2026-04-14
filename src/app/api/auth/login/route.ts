import { NextResponse } from 'next/server';

import { authenticateUserCredentials } from '@/lib/password-recovery.server';

export const dynamic = 'force-dynamic';

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

    const user = await authenticateUserCredentials({
      loginId,
      password,
    });

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'No fue posible validar las credenciales.',
      },
      { status: 400 }
    );
  }
}