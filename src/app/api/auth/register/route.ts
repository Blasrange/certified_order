import { NextResponse } from 'next/server';

import { hashPassword } from '@/lib/password-recovery.server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const normalizeLoginId = (value: string) => value.trim().toUpperCase();
const normalizeEmail = (value: string) => value.trim().toLowerCase();
const normalizePhone = (value: string) => value.replace(/\D/g, '');

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      documentType?: string;
      documentNumber?: string;
      loginId?: string;
      phone?: string;
      password?: string;
    };

    const name = String(body.name || '').trim();
    const email = normalizeEmail(String(body.email || ''));
    const documentType = String(body.documentType || '').trim().toUpperCase();
    const documentNumber = String(body.documentNumber || '').trim();
    const loginId = normalizeLoginId(String(body.loginId || ''));
    const phone = normalizePhone(String(body.phone || ''));
    const password = String(body.password || '');

    if (!name || !email || !documentType || !documentNumber || !loginId || !phone || !password) {
      return NextResponse.json(
        { error: 'Debes completar todos los campos obligatorios para crear la cuenta.' },
        { status: 400 }
      );
    }

    if (phone.length < 10) {
      return NextResponse.json(
        { error: 'El teléfono debe tener al menos 10 dígitos.' },
        { status: 400 }
      );
    }

    if (password.trim().length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres.' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    const { error: registerError } = await supabaseAdmin.rpc('register_portal_user', {
      p_name: name,
      p_email: email,
      p_document_type: documentType,
      p_document_number: documentNumber,
      p_login_id: loginId,
      p_phone: phone,
      p_password_hash: passwordHash,
    });

    if (registerError) {
      if (registerError.message.toLowerCase().includes('function public.register_portal_user')) {
        throw new Error('Falta actualizar la base de datos. Ejecuta el script nuevo de database.sql para habilitar el registro público de usuarios.');
      }

      throw new Error(registerError.message);
    }

    return NextResponse.json({
      ok: true,
      message: 'La cuenta fue creada correctamente. Ya puedes iniciar sesión.',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo registrar el usuario en este momento.',
      },
      { status: 500 }
    );
  }
}