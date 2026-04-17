# Manual Web del Sistema

Este documento explica cómo funciona la aplicación desde la web, qué hace cada módulo y cómo se crean o actualizan los datos principales desde la interfaz.

## 1. Flujo general del sistema

El sistema está organizado en dos grupos de módulos:

- Operación: Home, Dashboard, Pedidos Maestro, Mis Tareas y Remisiones.
- Administración: Propietarios, Roles, Usuarios, Directorio, Materiales y Homologación.

El acceso a cada módulo depende del rol del usuario. Si un rol no tiene permiso de visualización sobre un módulo, ese módulo no estará disponible en el menú o redirigirá al inicio.

## 2. Ingreso al sistema

### Login

Ruta: /login

Desde esta pantalla el usuario ingresa con:

- Usuario
- Contraseña

Funciones disponibles:

- Iniciar sesión.
- Recordar usuario en el navegador.
- Recuperar acceso con la opción ¿No recuerdas tu contraseña?.

### Primer ingreso y cambio de contraseña

Si el usuario entra por primera vez, el sistema lo redirige a la pantalla de registro en modo cambio de contraseña para que actualice su clave temporal.

### Recuperación de acceso

La recuperación se hace desde la misma ruta de registro, pero en modo de recuperación. El usuario puede solicitar el proceso y después definir una nueva contraseña.

## 3. Inicio y navegación

### Home

Ruta: /home

Es la pantalla principal de bienvenida. Desde aquí el usuario navega a los módulos que tenga habilitados por permisos.

### Dashboard

Ruta: /dashboard

Muestra el resumen general del sistema, como avance operativo, volúmenes y vistas rápidas del estado de la operación.

Se usa principalmente para:

- Consultar el estado general.
- Ver métricas rápidas.
- Tener contexto antes de operar o administrar datos.

## 4. Módulos administrativos y creación de datos

### 4.1 Propietarios

Ruta: /owners

Este módulo administra las empresas propietarias o entidades dueñas de la operación.

#### Datos que se crean

- Nombre de la empresa
- NIT o RUT
- Correo corporativo
- Ciudad
- Dirección fiscal
- Teléfono
- Estado activo o inactivo

#### Cómo crear un propietario

1. Entrar al módulo Propietarios.
2. Hacer clic en el botón de crear o nuevo propietario.
3. Completar el formulario.
4. Definir si la entidad queda activa.
5. Guardar.

#### Cómo editar un propietario

1. Buscar el propietario en la tabla.
2. Abrir la opción de edición.
3. Ajustar los campos necesarios.
4. Guardar los cambios.

#### Uso dentro del sistema

El propietario es una entidad base. Después se relaciona con:

- Clientes
- Tiendas
- Materiales
- Usuarios
- Procesos operativos

Por eso conviene crear primero los propietarios antes de continuar con otros catálogos.

### 4.2 Roles y permisos

Ruta: /roles

Este módulo define qué puede hacer cada tipo de usuario dentro del sistema.

#### Qué se configura en un rol

- Nombre del rol
- Descripción
- Estado activo o inactivo
- Permisos por módulo

#### Tipos de permisos que maneja la matriz

Según el módulo, se pueden habilitar permisos como:

- Ver
- Crear
- Editar
- Eliminar
- Importar
- Exportar
- Imprimir

#### Cómo crear un rol

1. Entrar a Roles y permisos.
2. Hacer clic en nueva creación.
3. Escribir el nombre del rol.
4. Marcar los permisos por cada módulo.
5. Guardar.

#### Cómo usarlo después

El rol creado se asigna luego a los usuarios en el módulo de Usuarios.

### 4.3 Usuarios

Ruta: /users

Aquí se crean las cuentas que ingresan al sistema.

#### Datos que se crean

- Nombre completo
- Correo electrónico
- Tipo de documento
- Número de documento
- Teléfono
- Rol
- Método OTP
- Estado activo o inactivo
- Lista de propietarios asignados

El sistema además calcula el identificador de ingreso a partir del tipo y número de documento.

#### Cómo crear un usuario

1. Entrar a Usuarios.
2. Hacer clic en nuevo usuario.
3. Completar la información básica.
4. Seleccionar el rol.
5. Abrir el selector de propietarios y asociar uno o varios.
6. Guardar.

#### Cómo editar un usuario

1. Buscar el usuario en la tabla.
2. Abrir edición.
3. Cambiar rol, estado, datos de contacto o propietarios.
4. Guardar.

#### Recomendación operativa

Antes de crear usuarios, ya deberían existir:

- Los propietarios
- Los roles

### 4.4 Directorio maestro

Ruta: /directory

Este módulo administra dos catálogos: clientes y tiendas.

#### Pestañas del módulo

- Clientes
- Tiendas

### Clientes

#### Datos que se crean

- Nombre
- NIT
- Ciudad
- Dirección
- Teléfono
- Estado
- Propietario asociado

#### Cómo crear un cliente

1. Abrir la pestaña Clientes.
2. Hacer clic en nuevo registro.
3. Completar el formulario.
4. Seleccionar el propietario desde el modal de selección.
5. Guardar.

### Tiendas

#### Datos que se crean

- Nombre de tienda
- Código
- Ciudad
- Dirección
- Teléfono
- Cliente asociado
- Propietario asociado
- Estado

#### Cómo crear una tienda

1. Abrir la pestaña Tiendas.
2. Crear un nuevo registro.
3. Completar la información general.
4. Seleccionar el socio vinculado o cliente.
5. Seleccionar el propietario.
6. Guardar.

#### Importación y exportación

El directorio permite importar y exportar información con archivos Excel. Esto sirve para cargas masivas cuando no se quiere crear los registros uno a uno.

#### Orden recomendado de creación

1. Propietarios
2. Clientes
3. Tiendas

### 4.5 Catálogo de materiales

Ruta: /materials

Este módulo administra los productos o materiales que se usarán en los pedidos.

#### Datos principales del material

- Código del material
- Descripción
- Código opcional
- Tipo de producto
- Cliente asociado
- Propietario asociado
- Estado

#### Datos logísticos complementarios

- Unidad primaria
- Unidad secundaria
- Código EAN13
- Código EAN14
- Embalaje
- Lista de UOM o unidades de medida

#### Qué es una UOM dentro del sistema

Cada UOM representa una forma logística de manejo del producto y puede incluir:

- Unidad
- Tipo de EAN
- Valor del EAN
- Numerador y denominador
- Alto, ancho, largo y peso

#### Cómo crear un material

1. Entrar a Materiales.
2. Hacer clic en nuevo material.
3. Completar identificación, descripción y clasificación.
4. Seleccionar el propietario.
5. Seleccionar el cliente relacionado.
6. Agregar una o más UOM.
7. Guardar.

#### Importación y exportación

El módulo también soporta cargas por Excel y exportación de información.

#### Orden recomendado de creación

1. Propietarios
2. Clientes
3. Materiales

### 4.6 Homologación de plantillas

Ruta: /mapping

Este módulo define cómo interpreta el sistema las columnas de un Excel cuando se importan pedidos.

#### Datos que se configuran

- Nombre de la plantilla
- Estado activo o inactivo
- Nombre de la columna para cada campo requerido

#### Campos que se mapean

- Pedido o PO
- NIT
- SKU o código
- Cantidad
- Número de orden interna
- Lote
- Fecha de vencimiento
- Fecha de fabricación
- Código de tienda

#### Cómo crear una homologación

1. Entrar a Homologación.
2. Hacer clic en Nueva homologación.
3. Escribir el nombre de la plantilla.
4. Llenar el nombre exacto de cada columna del archivo Excel.
5. Guardar.

#### Cuándo se usa

Esta configuración se usa más adelante cuando se importan procesos o pedidos en el módulo Pedidos Maestro.

## 5. Módulos operativos

### 5.1 Pedidos Maestro

Ruta: /orders

Este es el módulo principal de operación. Aquí se crean los procesos de certificación a partir de archivos Excel.

#### Qué crea realmente este módulo

Cuando se importa un archivo, el sistema crea un proceso agrupado con órdenes e ítems asociados.

#### Información que interviene en la creación del proceso

- Propietario
- Plantilla de homologación
- Archivo Excel
- Validación contra clientes, tiendas y materiales existentes

#### Cómo crear un proceso desde la web

1. Entrar a Pedidos Maestro.
2. Iniciar una nueva carga.
3. Seleccionar el propietario del proceso.
4. Seleccionar la plantilla de homologación.
5. Cargar el archivo Excel.
6. Revisar la validación previa.
7. Confirmar la importación.

#### Qué valida el sistema antes de crear

- Que exista el cliente por NIT.
- Que exista la tienda.
- Que exista el material o SKU.
- Que la estructura del archivo coincida con la homologación.

#### Otras acciones del módulo

- Consultar procesos creados.
- Ver detalle de órdenes.
- Asignar usuarios a órdenes o tareas.
- Editar datos operativos del proceso.
- Continuar certificación.

### 5.2 Mis Tareas

Ruta: /my-tasks

Este módulo muestra las tareas u órdenes asignadas al usuario actual.

#### Qué puede hacer el usuario aquí

- Ver sus asignaciones.
- Abrir el detalle de una tarea.
- Avanzar en la certificación.
- Registrar verificación de cantidades o estados según el flujo operativo.

En términos prácticos, este módulo consume lo que fue creado o asignado desde Pedidos Maestro.

### 5.3 Remisiones

Ruta: /referrals

Este módulo reúne la salida documental de órdenes ya certificadas o listas para despacho.

#### Funciones disponibles

- Ver remisiones.
- Consultar detalle de documentos.
- Imprimir remisión.
- Imprimir etiquetas o tags.
- Exportar información.

#### Cuándo aparecen datos aquí

Las remisiones no se crean manualmente como un catálogo independiente. Se derivan del flujo operativo de certificación de órdenes.

## 6. Relación recomendada para crear datos en el sistema

Si el sistema está nuevo o vacío, el orden más seguro para parametrizarlo desde la web es este:

1. Crear propietarios.
2. Crear roles.
3. Crear usuarios.
4. Crear clientes.
5. Crear tiendas.
6. Crear materiales.
7. Crear plantillas de homologación.
8. Importar procesos o pedidos.
9. Asignar tareas.
10. Certificar y generar remisiones.

## 7. Cómo se relaciona cada dato

- Un usuario puede quedar asociado a uno o varios propietarios.
- Un cliente pertenece a un propietario.
- Una tienda pertenece a un cliente y también a un propietario.
- Un material pertenece a un propietario y normalmente se relaciona con un cliente.
- Un pedido importado depende de una homologación y de datos maestros válidos.
- Las tareas y remisiones nacen del proceso operativo, no de un formulario maestro independiente.

## 8. Buenas prácticas de uso

- Crear primero los maestros antes de importar pedidos.
- Mantener activa sólo la homologación correcta para cada formato de Excel.
- Revisar que clientes, tiendas y materiales existan antes de cargar órdenes.
- Asignar correctamente propietarios a usuarios para evitar faltantes de visibilidad.
- Usar importación Excel cuando el volumen de datos sea alto.

## 9. Resumen rápido por módulo

| Módulo | Ruta | Para qué sirve | Qué crea o administra |
|---|---|---|---|
| Login | /login | Acceso al sistema | Sesión del usuario |
| Home | /home | Inicio y navegación | No crea datos |
| Dashboard | /dashboard | Resumen operativo | No crea datos |
| Propietarios | /owners | Empresas base del modelo | Propietarios |
| Roles | /roles | Seguridad por permisos | Roles y permisos |
| Usuarios | /users | Accesos del sistema | Usuarios |
| Directorio | /directory | Clientes y tiendas | Clientes y tiendas |
| Materiales | /materials | Catálogo logístico | Materiales y UOM |
| Homologación | /mapping | Lectura de archivos Excel | Plantillas de mapeo |
| Pedidos Maestro | /orders | Carga y operación de pedidos | Procesos, órdenes e ítems |
| Mis Tareas | /my-tasks | Trabajo del usuario asignado | Avance de certificación |
| Remisiones | /referrals | Salida documental | Remisiones derivadas |

## 10. Alcance de este manual

Este manual está basado en el comportamiento actual de la interfaz web del proyecto. Si más adelante se agregan campos, validaciones o nuevos flujos, conviene actualizar este documento para mantenerlo alineado con la aplicación.