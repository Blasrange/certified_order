import { NextResponse } from 'next/server';
import {
  createRecoveryToken,
  sendRecoveryEmail,
  validateRecoveryIdentity,
} from '@/lib/password-recovery.server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { username, phone } = (await request.json()) as { username?: string; phone?: string };
    const cleanUsername = username?.trim().toUpperCase() || '';
    const cleanPhone = String(phone || '').replace(/\D/g, '');

    if (!cleanUsername || !cleanPhone) {
      return NextResponse.json(
        { error: 'Debes indicar el usuario y el número de teléfono para recuperar el acceso.' },
        { status: 400 }
      );
    }

    const user = await validateRecoveryIdentity({
      loginId: cleanUsername,
      phone: cleanPhone,
    });

    if (!user || !user.isActive || !user.email) {
      return NextResponse.json({ ok: true });
    }

    const token = createRecoveryToken({
      loginId: user.loginId,
      email: user.email,
      exp: Date.now() + 1000 * 60 * 30,
    });

    const origin = new URL(request.url).origin;
    const resetUrl = `${origin}/register?mode=recover-email&token=${encodeURIComponent(token)}`;

    await sendRecoveryEmail({
      to: user.email,
      name: user.name,
      resetUrl,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo enviar el correo de recuperación.',
      },
      { status: 500 }
    );
  }
}
