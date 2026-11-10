# OmniGuard Móvil

Aplicación móvil de OmniGuard para que una persona pueda identificarse con su DNI, reportar una emergencia, consultar sus reportes y revisar un monitor de emergencias.

La aplicación está construida con **Expo SDK 54**, **React Native 0.81** y **React 19**. Utiliza React Navigation para las pantallas y AsyncStorage para conservar reportes en el dispositivo.

## Funciones

- **Inicio de sesión:** solicita un DNI de ocho dígitos y consulta los datos mediante el servicio RENIEC de Decolecta.
- **Inicio:** ofrece acceso al reporte de emergencia y a llamadas a líneas de ayuda.
- **Reportar emergencia:** permite elegir el tipo de emergencia y guardar un reporte.
- **Mis reportes:** presenta el historial guardado en el teléfono, con su fecha y estado.
- **Monitor:** muestra una lista de emergencias de ejemplo. Aún no está conectado a un mapa ni a un servicio en tiempo real.
- **Perfil:** muestra los datos de la sesión y permite cerrarla.

> La consulta de DNI necesita conexión a Internet. El historial se guarda localmente en cada dispositivo y no se sincroniza con un servidor. El monitor y los reportes iniciales son datos de demostración.

## Requisitos

- Node.js **20.19.x o superior**, según el requisito de Expo SDK 54.
- npm (incluido con Node.js).
- Para ejecutar en un teléfono Android: Expo Go instalado y el teléfono y el computador en la misma red Wi-Fi.
- Para compilar con EAS: una cuenta de Expo y acceso a Internet.

## Instalar y ejecutar en desarrollo

Clona o descarga este repositorio y abre una terminal en la carpeta del proyecto, donde se encuentra `package.json`.

```bash
npm ci
npx expo start
```

Se mostrará un código QR en la terminal. Escanéalo con Expo Go en Android. También puedes iniciar directamente con:

```bash
npm run android
```

Para abrir la versión web o iniciar el servidor orientado a iOS, están disponibles `npm run web` y `npm run ios`. La ejecución y compilación nativa de iOS requiere macOS y Xcode.

Si Expo informa de dependencias incompatibles, revisa el proyecto con `npx expo install --check`. La referencia de la versión usada está en la [documentación de Expo SDK 54](https://docs.expo.dev/versions/v54.0.0/).

## Uso de la aplicación

1. En **Iniciar sesión**, introduce un DNI de ocho dígitos. La consulta externa devuelve los datos del titular si la solicitud es válida.
2. En **Inicio**, toca el botón de emergencia para abrir el formulario. También puedes usar los accesos de llamada disponibles en esa pantalla.
3. Selecciona una categoría de emergencia y confirma el envío. La app guarda el reporte en el almacenamiento del teléfono y luego puedes verlo en **Mis reportes**.
4. Usa la barra inferior para cambiar entre **Inicio**, **Monitor**, **Mis reportes** y **Perfil**.
5. En **Perfil**, cierra la sesión para regresar a la pantalla de acceso.

Al primer acceso a **Mis reportes**, la app inicializa el almacenamiento con registros de ejemplo. Los reportes nuevos se agregan a esa lista y quedan en el dispositivo; borrar los datos de la app puede eliminarlos.

## Distribuir en Android

Este repositorio ya incluye perfiles de EAS en `eas.json`:

- `preview`: crea un **APK** para instalar directamente en dispositivos Android o compartir para pruebas internas.
- `production`: crea un **Android App Bundle (AAB)** para Google Play y permite que EAS gestione el incremento de versión.

### Preparar EAS

Instala y autentica EAS CLI:

```bash
npm install --global eas-cli
eas login
```

El proyecto ya tiene un identificador de EAS en `app.json`, así que en principio no hace falta volver a ejecutar `eas init`. Si EAS indica que el proyecto no está vinculado a tu cuenta, revisa `extra.eas.projectId` con la persona propietaria del proyecto antes de cambiarlo.

El identificador Android configurado es `com.dev_edward.omniguard_app`. Debe ser único y mantenerse igual para futuras actualizaciones publicadas como la misma aplicación.

### Crear un APK para pruebas o instalación directa

Desde la raíz del proyecto:

```bash
eas build --platform android --profile preview
```

Cuando termine la compilación, EAS proporcionará un enlace para descargar el APK. Descárgalo en el teléfono Android e instálalo; el sistema puede pedir autorización para instalar aplicaciones desde esa fuente. El perfil `preview` del proyecto está configurado para distribución interna y formato APK.

### Crear un AAB para Google Play

Genera el artefacto de producción:

```bash
eas build --platform android --profile production
```

El resultado es un archivo `.aab`. Google Play utiliza AAB para distribuir la aplicación optimizada a los dispositivos; no se instala directamente tocándolo como un APK.

Para publicarlo:

1. Crea la ficha de OmniGuard en Google Play Console y completa los requisitos de la cuenta de desarrollador y de la aplicación.
2. Descarga el AAB desde el enlace de la compilación de EAS.
3. Sube el AAB en la pista deseada de Play Console (por ejemplo, prueba interna) o configura las credenciales de Google Play y utiliza EAS Submit:

   ```bash
   eas submit --platform android --profile production
   ```

La primera carga automatizada requiere que la app exista en Play Console y que EAS tenga una clave de cuenta de servicio de Google Play configurada para el identificador de paquete. La subida no completa por sí sola la ficha ni la revisión de Google Play.

Más detalles en las guías de Expo para [generar APK](https://docs.expo.dev/build-reference/apk/), [crear un build Android de producción](https://docs.expo.dev/tutorial/eas/android-production-build/) y [enviar a Google Play con EAS Submit](https://docs.expo.dev/submit/android/).

## Estructura del proyecto

```text
.
├── App.js                       # Proveedores globales y contenedor de navegación
├── index.js                     # Punto de entrada Expo
├── app.json                     # Configuración de Expo y Android
├── eas.json                     # Perfiles de compilación y envío
├── src/
│   ├── context/
│   │   └── UserContext.js       # Sesión y consulta del DNI
│   ├── navigation/
│   │   ├── AppNavigator.js      # Navegación principal tipo stack
│   │   └── MainTabNavigator.js  # Pestañas inferiores
│   ├── screens/                 # Pantallas de la app
│   ├── services/
│   │   └── reportStorage.js     # Persistencia local de reportes
│   └── styles/
│       └── globalStyles.js      # Colores, espacios y estilos compartidos
└── assets/                      # Iconos, splash y favicon
```

## Seguridad y configuración

La consulta RENIEC se realiza desde el cliente móvil. Una credencial incluida en el código de una app puede extraerse del paquete distribuido; antes de una publicación real, se recomienda revocar cualquier clave expuesta y mover la consulta a un backend que proteja la credencial. No publiques claves, contraseñas ni archivos de credenciales en el repositorio.

## Comandos disponibles

| Comando | Propósito |
| --- | --- |
| `npm start` | Inicia Expo |
| `npm run android` | Inicia Expo y abre Android si hay dispositivo/emulador disponible |
| `npm run ios` | Inicia Expo para iOS |
| `npm run web` | Inicia la versión web |

