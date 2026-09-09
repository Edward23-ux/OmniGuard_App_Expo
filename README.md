# OmniGuard – Setup de las pantallas nuevas

## 1. Instalar dependencias de navegación
Instálalas con el comando de Expo
(resuelve versiones compatibles automáticamente):

```bash
npx expo install @react-navigation/native @react-navigation/native-stack react-native-screens react-native-safe-area-context
```

## 2. Ejecutar
```bash
npx expo start
```

## Flujo de pantallas
1. **Login** → valida que el DNI tenga 8 dígitos (mock: no consulta backend aún,
   `UserContext.login()` simula un nombre según el DNI ingresado).
2. **Home** → botón rojo "Reportar Emergencia", tarjetas "Mis Reportes" y
   "Monitor", ícono de perfil (avatar con iniciales) arriba a la derecha.
3. **ReportEmergency** → grid de 8 tipos de emergencia (Incendio, Accidente
   Vehicular, Fuga de Gas, Rescate, Derrumbe, Inundación, Explosión, Otro).
   Al confirmar, muestra un `Alert` de éxito (mock) y navega a Mis Reportes.
4. **MisReportes** → historial mock con badges de estado (Pendiente, En
   Proceso, Culminado, Falsa Alarma) — mismos estados del dashboard web.
5. **Monitor** → placeholder de mapa (para integrar `react-native-maps` más
   adelante) + lista mock de emergencias activas.
6. **Profile** → muestra DNI y nombre del usuario logueado, botón de cerrar
   sesión que limpia el contexto y regresa a Login.

