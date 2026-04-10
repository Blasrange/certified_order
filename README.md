# Certificador Pro 📦
### Sistema de Certificación y Trazabilidad Logística de Alto Nivel

**Certificador Pro** es una plataforma empresarial diseñada para optimizar los procesos de certificación de pedidos, garantizando una trazabilidad total desde la carga de archivos maestros hasta la generación de remisiones de despacho. El sistema permite la gestión multi-propietario, permitiendo que operadores logísticos administren múltiples clientes bajo una misma infraestructura segura y eficiente.

---

## 🚀 Guía de Inicio Rápido

Para ejecutar el sistema en tu entorno local de Visual Studio Code, sigue estos pasos:

### 1. Instalación de Dependencias
Abre la terminal integrada en VS Code (`Ctrl + ñ` o `Cmd + J`) y ejecuta:
```bash
npm install
```

### 2. Ejecución en Desarrollo
Para iniciar el servidor de desarrollo con recarga en tiempo real:
```bash
npm run dev
```
*El sistema estará disponible en [http://localhost:9002](http://localhost:9002)*

### 3. Ejecución de Genkit (Inteligencia Artificial)
Si deseas trabajar con el motor de IA para la explicación de errores de Excel:
```bash
npm run genkit:dev
```

---

## 🔐 Acceso Inicial (Seguridad Maestro)

El sistema inicia en un estado limpio de producción. Utiliza las siguientes credenciales para realizar la configuración inicial:

- **Usuario:** `CC1000000001`
- **Contraseña:** `password123`

*Nota: Una vez ingreses, podrás crear nuevos usuarios, roles y configurar los propietarios de carga en el módulo de Administración.*

---
## commit
```bash
git add .
git commit -m "Corregir build de Vercel y uso de Suspense en register"
git push origin main
```

## 🛠️ Arquitectura Técnica

- **Framework:** [Next.js 15 (App Router)](https://nextjs.org/)
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS + ShadCN UI
- **IA:** Genkit (Google Gemini) para validación inteligente de datos.
- **Base de Datos:** Preparado para conexión nativa con **Firebase** o **Supabase** (Configurable en archivo `.env`).

---

## 📂 Estructura de Módulos

### Operación
- **Dashboard:** Panel de control en tiempo real con embudo de proceso y métricas de eficiencia.
- **Pedidos Maestro:** Gestión de contenedores de pedidos y carga masiva vía Excel.
- **Mis Tareas:** Vista operativa para certificadores en bodega con escaneo de códigos de barras.
- **Remisiones:** Consulta de documentos certificados, impresión de etiquetas ZPL y remisiones oficiales.

### Administración
- **Propietarios:** Gestión de entidades dueñas de la carga (Multi-tenant).
- **Homologación:** Configuración de plantillas Excel para carga dinámica de pedidos.
- **Directorio:** Base de datos maestra de Clientes y Puntos de Venta.
- **Catálogo:** Maestra de materiales con configuración de factores de empaque (UOM) y EANs.
- **Seguridad:** Control de accesos granulares basado en Roles (RBAC).

---

## 📡 Conexión a Base de Datos

Para conectar a una base de datos real, edita el archivo `.env` en la raíz del proyecto con tus credenciales de **Supabase** o **Firebase**. El sistema está diseñado para realizar un reseteo del almacenamiento local al detectar la primera conexión exitosa a una base de datos externa.

### Variables mínimas para Supabase

Usa como referencia el archivo `.env.example` y define al menos estas variables en tu `.env` local:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
DATABASE_URL=postgresql://postgres:[TU-PASSWORD]@db.tu-proyecto.supabase.co:5432/postgres
```

### Validación rápida de conexión

Después de arrancar el proyecto con `npm run dev`, puedes validar la configuración en:

```bash
http://localhost:9002/api/supabase/validate
```

La ruta responde si:

- faltan variables obligatorias,
- todavía hay placeholders en el `.env`,
- la URL o la anon key no son válidas,
- o si Next.js ya puede comunicarse con tu proyecto de Supabase.

---
© 2026 Certificador - Logística Inteligente.
