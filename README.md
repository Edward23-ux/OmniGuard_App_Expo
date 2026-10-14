# OmniGuard Móvil

Aplicación móvil orientada a la seguridad ciudadana y la optimización de los canales de respuesta del Cuerpo General de Bomberos Voluntarios del Perú (CGBVP) en Lima Metropolitana. 

Actualmente, las centrales telefónicas de emergencia enfrentan una tasa superior al 70% de llamadas falsas o malintencionadas. Este anonimato genera movilizaciones innecesarias de unidades de rescate, desgaste de combustible y demoras críticas en la atención de siniestros reales con riesgo de vidas humanas.

---

## Propósito del Proyecto

El propósito fundamental de **OmniGuard Móvil** es erradicar el anonimato en el reporte de emergencias urbanas mediante un esquema de identidad digital verificada. La aplicación exige la validación del documento nacional de identidad (DNI) antes de habilitar el envío de alertas, garantizando la trazabilidad del ciudadano, la clasificación inmediata del incidente en un catálogo táctil de baja carga cognitiva y la reducción del desgaste operativo de los cuerpos de auxilio en Lima Metropolitana.

---

## Objetivos del Avance 2

Este avance técnico cubre:

1. **Navegación Híbrida (Stack y Tabs):** Estructuración combinada de un navegador en pila (`@react-navigation/native-stack`) para flujos secuenciales (login, reporte de emergencias) y una barra de pestañas persistente (`@react-navigation/bottom-tabs`) para la navegación global entre inicio, monitor, reportes y perfil.
2. **Manejo de Estados y Eventos con Hooks:** Centralización de la sesión activa a través de Context API (`createContext`, `useContext`) y control del ciclo de vida y reactividad local mediante `useState` y `useEffect`.
3. **Consumo de Servicios Asíncronos y Persistencia Local:** Consulta asíncrona (`fetch`) a servicio REST para la validación del DNI contra registros oficiales y almacenamiento local persistente con `@react-native-async-storage/async-storage` para la lectura, inicialización y guardado de incidentes bajo bloques de captura de errores (`try/catch`).
4. **Calidad de Interfaz y Usabilidad (UI/UX):** Implementación de listas virtuales optimizadas (`FlatList`), componentes interactivos accesibles (`TouchableOpacity`), adaptación dinámica al teclado (`KeyboardAvoidingView`) y diseño consistente centralizado en `globalStyles.js`.

---

## Dependencias del Proyecto

El proyecto está construido sobre el ecosistema **Expo SDK 54**, ejecutando **React Native 0.81** y **React 19**:

| Paquete / Dependencia | Versión | Propósito Arquitectónico |
| :--- | :--- | :--- |
| `expo` | `~54.0.0` | Núcleo del framework y APIs del dispositivo. |
| `@react-navigation/native` | `^7.0.0` | Contenedor principal de rutas y contexto de navegación. |
| `@react-navigation/native-stack` | `^7.0.0` | Enrutamiento en pila para flujos lineales y modales. |
| `@react-navigation/bottom-tabs` | `^7.0.0` | Enrutamiento por pestañas inferiores persistentes. |
| `react-native-screens` | `~4.4.0` | Optimización nativa de memoria para pantallas inactivas. |
| `react-native-safe-area-context` | `~5.1.0` | Gestión de áreas seguras, muescas (*notches*) y barras del sistema. |
| `@react-native-async-storage/async-storage` | `~2.1.0` | Motor de persistencia clave-valor en almacenamiento local. |

---

## Instrucciones de Instalación y Ejecución

### Prerrequisitos
* **Node.js:** Versión 20.19.x o superior.
* **Gestor de paquetes:** `npm` (integrado con Node.js).
* **Entorno de ejecución:** Emulador Android configurado en **Android Studio** (API 33+) o dispositivo móvil físico con la aplicación **Expo Go**.

### 1. Clonación del repositorio
```bash
git clone [https://github.com/Edward23-ux/OmniGuard_App_Expo.git](https://github.com/Edward23-ux/OmniGuard_App_Expo.git)
cd OmniGuard_App_Expo
```

### 2. Instalación de paquetes
Ejecute la instalación de dependencias y verifique la compatibilidad con el SDK:
```bash
npm install
npx expo install --check
```

### 3. Ejecución del proyecto

#### Iniciar el servidor de desarrollo
```bash
npx expo start
```

#### Ejecución directa en emulador Android:
Con el emulador de Android Studio previamente abierto:
```bash
npm run android
```
*(También puede presionar la tecla `a` en la consola interactiva de `npx expo start`).*

#### Ejecución en dispositivo móvil físico:
1. Conecte el dispositivo móvil a la misma red local (Wi-Fi) de la computadora.
2. Abra la aplicación **Expo Go** en Android.
3. Escanee el código QR desplegado en la terminal.

#### Ejecución en navegador web:
```bash
npm run web
```

---

## Estructura Modular del Repositorio

Organización de código fuente bajo arquitectura por capas en `src/`:

```text
OmniGuard_App_Expo/
├── assets/                     # Recursos gráficos (iconos de aplicación, splash screen)
├── src/
│   ├── context/
│   │   └── UserContext.js      # Manejo global de la sesión del usuario (Context API)
│   ├── navigation/
│   │   ├── AppNavigator.js     # Navegador principal en pila (Native Stack)
│   │   └── MainTabNavigator.js # Navegador de barra inferior (Bottom Tabs)
│   ├── screens/                # Vistas principales de la aplicación
│   │   ├── HomeScreen.js           # Panel central con botón crítico de auxilio
│   │   ├── LoginScreen.js          # Captura, validación y consulta de DNI
│   │   ├── MisReportesScreen.js    # Historial de emergencias con FlatList
│   │   ├── MonitorScreen.js        # Alertas de incidentes activos por zona
│   │   ├── ProfileScreen.js        # Datos del ciudadano y cierre de sesión
│   │   └── ReportEmergencyScreen.js# Catálogo táctil de incidentes por categoría
│   ├── services/
│   │   └── reportStorage.js    # Capa de abstracción y persistencia (AsyncStorage)
│   └── styles/
│       └── globalStyles.js     # Paleta de color, tipografía y tokens de diseño
├── App.js                      # Inicialización raíz del árbol de componentes y Providers
├── app.json                    # Manifiesto y metadatos de configuración Expo / Android
├── eas.json                    # Configuración de compilación para perfiles EAS
├── package.json                # Lista de dependencias, dependencias de desarrollo y scripts
└── README.md                   # Documentación técnica de entrega
```

---

## Módulos y Flujo Operativo

1. **Autenticación Ciudadana (`LoginScreen.js`):** El usuario ingresa su documento de identidad de 8 dígitos. Se envía una petición HTTP asíncrona mediante `fetch` al servicio RENIEC/Decolecta, registrando el usuario en el contexto global si la consulta es exitosa.
2. **Panel Principal (`HomeScreen.js`):** Presenta el botón de reporte de emergencia con diseño de alto contraste visual para activación rápida bajo situaciones de estrés, junto a accesos directos a líneas de auxilio.
3. **Catálogo de Incidentes (`ReportEmergencyScreen.js`):** Despliega una matriz de selección con categorías predeterminadas (incendio, accidente, fuga de gas, derrumbe, inundación, etc.), eliminando la necesidad de redacción manual en situaciones críticas.
4. **Historial de Reportes (`MisReportesScreen.js`):** Muestra los reportes emitidos por el usuario en memoria virtualizada con `FlatList`. Los registros se leen y actualizan de forma asíncrona desde `reportStorage.js`, indicando el estado del reporte (`Pendiente`, `En Proceso`, `Culminado`, `Falsa Alarma`).
5. **Monitor Urbano (`MonitorScreen.js`):** Presenta una lista de incidentes activos geolocalizados en distritos de la capital para conocimiento del entorno ciudadano.
6. **Perfil de Usuario (`ProfileScreen.js`):** Despliega el nombre y número de documento del usuario autenticado persistido en el contexto, permitiendo la destrucción de la sesión activa y el retorno a la pantalla de acceso.

---

## Compilación y Pruebas en Android (APK)

Para generar e instalar un instalador binario autónomo para pruebas sin requerir Expo Go:

1. **Instalar el CLI de Expo Application Services:**
   ```bash
   npm install --global eas-cli
   eas login
   ```
2. **Generar el binario APK:**
   ```bash
   eas build --platform android --profile preview
   ```
Al concluir la compilación en la nube de EAS, se obtiene un enlace directo para descargar el archivo `.apk` e instalarlo en cualquier dispositivo Android o arrastrarlo al emulador de Android Studio.
