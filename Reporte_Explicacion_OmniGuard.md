# Reporte de Código: OmniGuard App

Hola! Este documento está diseñado para explicarte qué hace cada archivo de código (`.js`) en tu aplicación móvil "OmniGuard", sin usar términos técnicos complicados. Imagina que tu aplicación es una casa; aquí te explicaremos para qué sirve cada habitación y por qué se construyó de esa manera.

---

## 1. `src/context/UserContext.js`
**¿Qué hace?**
Guarda la "memoria" de quién está usando la aplicación. Cuando ingresas tu DNI, este archivo recuerda tu nombre y DNI para que no tengas que volver a escribirlo en cada pantalla.

**¿Por qué se escribe así y por qué se usa?**
En programación, a esto se le llama "Contexto" (Context). Se usa porque si no tuviéramos esto, tendríamos que pasar la información del usuario de mano en mano por cada pantalla de la app, lo cual es muy desordenado. Funciona como una "nube privada" dentro de la app donde cualquier pantalla puede preguntar "¿Quién está conectado ahora mismo?".

---

## 2. `src/navigation/AppNavigator.js`
**¿Qué hace?**
Es el "mapa" o "GPS" de la aplicación. Define qué pantallas existen y cómo viajar entre ellas (por ejemplo, ir de la pantalla de inicio a la pantalla de perfil).

**¿Por qué se escribe así y por qué se usa?**
Utiliza una herramienta llamada "Stack Navigator" (Navegador de Pila). Imagina un mazo de cartas: cuando abres una nueva pantalla, pones una carta encima. Cuando le das "atrás", quitas esa carta y vuelves a la anterior. Se escribe así para que la app sepa exactamente qué mostrar en cada momento y evite que te pierdas.

---

## 3. `src/styles/globalStyles.js`
**¿Qué hace?**
Es el "manual de diseño" o el "guardarropa" de la aplicación. Aquí se guardan los colores exactos (como el rojo principal), los tamaños de letra, los espacios y las formas de los botones.

**¿Por qué se escribe así y por qué se usa?**
Si no tuviéramos este archivo, tendríamos que decirle a cada botón de la app: "sé de color rojo #EF3B4E y ten bordes redondeados". Si un día queremos cambiar el rojo por azul, tendríamos que buscar botón por botón. Al tener un archivo global, cambiamos el color aquí una sola vez y automáticamente toda la app se actualiza. ¡Ahorra muchísimo tiempo!

---

## 4. `src/screens/LoginScreen.js`
**¿Qué hace?**
Es la "puerta de entrada" de la app. Aquí es donde el ciudadano escribe su DNI de 8 dígitos para poder ingresar. También verifica que solo se escriban números y que sean exactamente 8.

**¿Por qué se escribe así y por qué se usa?**
Tiene partes específicas para controlar qué pasa cuando el usuario escribe (validar que sean números) y para asegurarse de que el teclado del celular no tape el botón de ingresar (usando algo llamado `KeyboardAvoidingView`). Se usa para proteger la app y asegurar que los reportes de emergencia sean de personas reales.

---

## 5. `src/screens/HomeScreen.js`
**¿Qué hace?**
Es la "sala principal" o panel de control. Es lo primero que ves al entrar. Tiene un botón gigante para reportar una emergencia rápidamente y botones más pequeños para ver tu historial o el monitor de la ciudad.

**¿Por qué se escribe así y por qué se usa?**
Está diseñado pensando en la urgencia. El botón de emergencia es el elemento más grande y llamativo porque en una situación de crisis, el usuario no tiene tiempo para buscar opciones escondidas. Se divide en "tarjetas" visuales para que sea fácil de tocar con el dedo (botones táctiles grandes).

---

## 6. `src/screens/ReportEmergencyScreen.js`
**¿Qué hace?**
Es el formulario rápido donde eliges qué tipo de emergencia está ocurriendo (Incendio, Accidente, etc.) tocando un icono.

**¿Por qué se escribe así y por qué se usa?**
En lugar de hacer que la persona escriba "Hay un accidente vehicular" (lo cual toma tiempo y es difícil si estás nervioso), este código crea una cuadrícula de botones visuales con emojis y texto corto. Cuando tocas uno, se selecciona, y luego presionas el botón de enviar. ¡Es rápido y salva vidas!

---

## 7. `src/screens/MisReportesScreen.js`
**¿Qué hace?**
Es el "historial" o "archivo". Muestra una lista de todas las emergencias que has reportado en el pasado y en qué estado se encuentran (Pendiente, En Proceso, Culminado).

**¿Por qué se escribe así y por qué se usa?**
Utiliza un componente llamado `FlatList` (Lista Plana). Se usa porque es muy eficiente; si tuvieras 1,000 reportes, cargar todos al mismo tiempo congelaría tu celular. La lista plana solo carga en la memoria los reportes que estás viendo en tu pantalla en ese momento, haciendo la app muy rápida.

---

## 8. `src/screens/MonitorScreen.js`
**¿Qué hace?**
Es el "radar" de la ciudad. Aquí podrás ver un mapa y una lista de emergencias que están ocurriendo cerca de ti en tiempo real.

**¿Por qué se escribe así y por qué se usa?**
Actualmente tiene datos "simulados" (de prueba) y un espacio reservado para poner un mapa interactivo más adelante. Se usa para mantener informados a los ciudadanos sobre zonas de peligro que deben evitar en su ciudad.

---

## 9. `src/screens/ProfileScreen.js`
**¿Qué hace?**
Es tu "carnet de identidad" digital. Muestra tu nombre, tus iniciales, tu DNI y un botón para cerrar sesión (salir de la cuenta).

**¿Por qué se escribe así y por qué se usa?**
Toma la información que guardamos en el `UserContext` (el primer archivo del que hablamos) y la dibuja en la pantalla. Se escribe de esta forma para darle al usuario la seguridad de que su identidad ha sido validada y darle control total para salir de la app cuando quiera.

---

### Resumen Final
Cada archivo `.js` es como una pieza de Lego. Algunos son bloques estructurales (como la Navegación y el Contexto), otros son pintura y decoración (Estilos), y otros son las habitaciones de la casa (Pantallas). Juntos, ensamblados de manera ordenada, crean la aplicación móvil completa.
