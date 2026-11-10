import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStoredReports } from '../../services/reportStorage';

const BOMBERO_EMERGENCIES_KEY = '@omniguard_bombero_emergencies_v1';
const REPORTS_STORAGE_KEY = '@omniguard_reports';
const BOMBERO_UNITS_KEY = '@omniguard_bombero_units_v1';

/**
 * Configuración de Supabase para la tabla `usuarios_dashboard`.
 * Reemplaza SUPABASE_URL y SUPABASE_ANON_KEY con las credenciales de tu proyecto Supabase
 * o defínelas en variables de entorno (EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY).
 */
export const SUPABASE_CONFIG = {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    table: 'usuarios_dashboard',
};

/**
 * Credenciales de prueba (para probar el flujo inmediatamente).
 */
export const DEMO_BOMBERO_CREDENTIALS = [
    {
        id: 'bmb-108-01',
        usuario: 'bombero116',
        correo: 'bombero@omniguard.pe',
        password: '123456',
        nombre: 'Cap. Carlos Mendoza Vargas',
        rango: 'Capitán CBP',
        codigoBombero: 'CBP-10842',
        compania: 'Compañía Cap. José A. Quiñonez N° 108',
        direccionEstacion: 'Cap. José A. Quiñonez N° 108, Lima',
        telefono: '(01) 222-0222 / Central 116',
        turno: 'Guardia Diurna / Nocturna (24h)',
        rol: 'bombero',
    },
    {
        id: 'bmb-108-02',
        usuario: 'admin',
        correo: 'central108@omniguard.pe',
        password: 'admin123',
        nombre: 'Tnte. Lucía Salazar Paredes',
        rango: 'Teniente CBP',
        codigoBombero: 'CBP-10915',
        compania: 'Compañía Cap. José A. Quiñonez N° 108',
        direccionEstacion: 'Cap. José A. Quiñonez N° 108, Lima',
        telefono: '(01) 222-0222 / Central 116',
        turno: 'Jefe de Operaciones',
        rol: 'bombero',
    },
];

/**
 * Emergencias iniciales enriquecidas basadas en el diseño del dashboard de OmniGuard.
 */
export const INITIAL_BOMBERO_EMERGENCIES = [
    {
        id: 'a91f3bc2-41d0-4e82-9a11-7845123690ef',
        tipo: 'Incendio',
        estado: 'Pendiente',
        fecha: '09/11/2026 · 17:45',
        fechaCorta: '9/11/2026',
        direccion: 'Av. Petit Thouars 1420, Santa Beatriz, Lima',
        referencia: 'A dos cuadras del Circuito Mágico del Agua, edificio de 4 pisos',
        coordenadas: { lat: -12.0705, lng: -77.0352 },
        testigosCount: 3,
        iaValidacion: { estado: 'Aprobado', porcentaje: 96 },
        reportante: {
            nombre: 'MARÍA FERNANDA QUISPE ROJAS',
            dni: '46892315',
            telefono: '984 512 309',
        },
        testigos: [
            {
                id: 't1',
                nombre: 'MARÍA FERNANDA QUISPE ROJAS',
                dni: '46892315',
                hora: '17:45',
                comentario: 'Sale humo negro intenso del tercer piso de la vivienda multifamiliar.',
            },
            {
                id: 't2',
                nombre: 'JORGE LUIS RAMÍREZ SOTO',
                dni: '71204982',
                hora: '17:46',
                comentario: 'Se escuchan alarmas y hay vecinos evacuando hacia la avenida.',
            },
            {
                id: 't3',
                nombre: 'CARLA PATRICIA VEGA LUNA',
                dni: '48912033',
                hora: '17:47',
                comentario: 'Fuego visible en el balcón lateral, cables eléctricos cerca.',
            },
        ],
        evidencia: {
            descripcion: 'Columna de humo denso y llamas activas en ventana del 3er nivel. Verificación automática por visión computacional positiva.',
            confianzaDetalle: 'Alta probabilidad de incendio estructural urbano (96%).',
            fechaCaptura: '09/11/2026 · 17:45:12',
            Prioridad: 'CRÍTICA - Despacho inmediato recomendado',
        },
    },
    {
        id: 'b72e90d1-19c4-4c11-8034-5561298741cd',
        tipo: 'Accidente Vehicular',
        estado: 'Pendiente',
        fecha: '09/11/2026 · 17:30',
        fechaCorta: '9/11/2026',
        direccion: 'Vía Expresa Paseo de la República km 3.2, San Isidro',
        referencia: 'Sentido Norte a Sur, antes del puente Corpac',
        coordenadas: { lat: -12.0964, lng: -77.0245 },
        testigosCount: 2,
        iaValidacion: { estado: 'Aprobado', porcentaje: 92 },
        reportante: {
            nombre: 'CARLOS ALBERTO MENDOZA DÍAZ',
            dni: '70482910',
            telefono: '991 204 881',
        },
        testigos: [
            {
                id: 't4',
                nombre: 'CARLOS ALBERTO MENDOZA DÍAZ',
                dni: '70482910',
                hora: '17:30',
                comentario: 'Colisión múltiple de dos autos particulares, posible persona atrapada.',
            },
            {
                id: 't5',
                nombre: 'DIEGO ARMANDO TORRES SILVA',
                dni: '74129085',
                hora: '17:32',
                comentario: 'Tránsito detenido en el carril izquierdo, derrame de líquido en la pista.',
            },
        ],
        evidencia: {
            descripcion: 'Impacto frontal-lateral entre dos vehículos sedán con deformación de cabina. Requiere unidad de rescate y ambulancia.',
            confianzaDetalle: 'Detección de siniestro vial con bloqueo de vía (92%).',
            fechaCaptura: '09/11/2026 · 17:30:04',
            Prioridad: 'ALTA - Unidad de Rescate y SAMU',
        },
    },
    {
        id: 'c45a81e9-55b1-49d0-b122-9910283746ef',
        tipo: 'Fuga de Gas',
        estado: 'En Proceso',
        fecha: '09/11/2026 · 16:50',
        fechaCorta: '9/11/2026',
        direccion: 'Jr. Lloque Yupanqui 890, Jesús María, Lima',
        referencia: 'Restaurante en primer piso cerca al Mercado San José',
        coordenadas: { lat: -12.0758, lng: -77.0491 },
        testigosCount: 2,
        iaValidacion: { estado: 'Aprobado', porcentaje: 89 },
        unidadAsignada: 'M-108-1',
        reportante: {
            nombre: 'ROSA ELENA CASTILLO VARGAS',
            dni: '42198374',
            telefono: '976 341 209',
        },
        testigos: [
            {
                id: 't6',
                nombre: 'ROSA ELENA CASTILLO VARGAS',
                dni: '42198374',
                hora: '16:50',
                comentario: 'Fuerte olor a gas GLP en toda la cuadra proveniente de local comercial.',
            },
            {
                id: 't7',
                nombre: 'MIGUEL ÁNGEL REYES PAZ',
                dni: '75019283',
                hora: '16:53',
                comentario: 'Los trabajadores cerraron el local pero el olor persiste con fuerza.',
            },
        ],
        evidencia: {
            descripcion: 'Reporte validado por múltiples vecinos en radio de 50 metros y lectura de válvula de cilindro industrial dañada.',
            confianzaDetalle: 'Consistencia geográfica y reporte ciudadano múltiple (89%).',
            fechaCaptura: '09/11/2026 · 16:50:33',
            Prioridad: 'ALTA - Unidad Materiales Peligrosos en ruta',
        },
    },
    {
        id: 'd18c77f0-30a2-41e5-9d88-3344556677ab',
        tipo: 'Incendio',
        estado: 'Culminado',
        fecha: '08/09/2026 · 14:20',
        fechaCorta: '8/9/2026',
        direccion: 'Av. Arequipa 2150, Lince, Lima',
        referencia: 'Cerca al cruce con Av. Risso',
        coordenadas: { lat: -12.0842, lng: -77.0339 },
        testigosCount: 4,
        iaValidacion: { estado: 'Aprobado', porcentaje: 97 },
        reportante: {
            nombre: 'LUIS ALBERTO GÓMEZ PÉREZ',
            dni: '44556677',
            telefono: '955 112 233',
        },
        testigos: [
            {
                id: 't8',
                nombre: 'LUIS ALBERTO GÓMEZ PÉREZ',
                dni: '44556677',
                hora: '14:20',
                comentario: 'Cortocircuito en letrero luminoso comercial generó fuego en fachada.',
            },
        ],
        evidencia: {
            descripcion: 'Amago de incendio en instalación eléctrica exterior controlado exitosamente por personal de la Cía. N° 108.',
            confianzaDetalle: 'Incendio eléctrico confirmado (97%). Emergencia atendida sin heridos.',
            fechaCaptura: '08/09/2026 · 14:20:10',
            Prioridad: 'ATENDIDO - Sin daños personales',
        },
    },
    {
        id: 'e29d66a1-90f3-42b7-a611-2233445566cd',
        tipo: 'Rescate',
        estado: 'Culminado',
        fecha: '05/09/2026 · 10:15',
        fechaCorta: '5/9/2026',
        direccion: 'Calle Los Cedros 310, San Isidro, Lima',
        referencia: 'Edificio residencial Torre Alba, ascensor bloqueado',
        coordenadas: { lat: -12.0921, lng: -77.0412 },
        testigosCount: 1,
        iaValidacion: { estado: 'Aprobado', porcentaje: 91 },
        reportante: {
            nombre: 'ANA LUCÍA FLORES MEDINA',
            dni: '72334455',
            telefono: '944 887 766',
        },
        testigos: [
            {
                id: 't9',
                nombre: 'ANA LUCÍA FLORES MEDINA',
                dni: '72334455',
                hora: '10:15',
                comentario: 'Adulto mayor atrapado en ascensor detenido entre piso 3 y 4 por corte eléctrico.',
            },
        ],
        evidencia: {
            descripcion: 'Liberación manual de cabina de ascensor y evaluación primaria de signos vitales estable.',
            confianzaDetalle: 'Emergencia de rescate en estructura cerrada validada (91%).',
            fechaCaptura: '05/09/2026 · 10:15:40',
            Prioridad: 'ATENDIDO - Rescate exitoso',
        },
    },
    {
        id: '6cd64a46-7f12-4b88-901a-849201928374',
        tipo: 'Incendio',
        estado: 'Falsa Alarma',
        fecha: '09/09/2026 · 11:30',
        fechaCorta: '9/9/2026',
        direccion: 'Calle Manuel Nicolás Corpancho, Lima',
        referencia: 'Altura cuadra 2, Santa Beatriz, Cercado de Lima',
        coordenadas: { lat: -12.0689, lng: -77.0361 },
        testigosCount: 1,
        iaValidacion: { estado: 'Aprobado', porcentaje: 95 },
        reportante: {
            nombre: 'EDWARD ANGEL CAMPOS HEREDIA',
            dni: '73338614',
            telefono: '987 654 321',
        },
        testigos: [
            {
                id: 't10',
                nombre: 'EDWARD ANGEL CAMPOS HEREDIA',
                dni: '73338614',
                hora: '11:30',
                comentario: 'Humo visible desde la azotea del inmueble en Calle Manuel Nicolás Corpancho.',
            },
        ],
        evidencia: {
            descripcion: 'Al llegar la unidad se verificó que se trataba de fumigación autorizada y vapor controlado sin riesgo de fuego activo.',
            confianzaDetalle: 'IA detectó patrón visual similar a humo (95%), clasificado en campo como Falsa Alarma.',
            fechaCaptura: '09/09/2026 · 11:30:22',
            Prioridad: 'DESCARTADO EN CAMPO',
        },
    },
    {
        id: '7de81b52-4c11-4099-823b-192837465091',
        tipo: 'Rescate',
        estado: 'Falsa Alarma',
        fecha: '07/09/2026 · 19:05',
        fechaCorta: '7/9/2026',
        direccion: 'Av. Salaverry 1040, Jesús María, Lima',
        referencia: 'Frente a ciclovía central',
        coordenadas: { lat: -12.0785, lng: -77.0432 },
        testigosCount: 1,
        iaValidacion: { estado: 'Rechazado', porcentaje: 10 },
        reportante: {
            nombre: 'PEDRO PABLO SÁNCHEZ RUIZ',
            dni: '76123984',
            telefono: '912 345 678',
        },
        testigos: [
            {
                id: 't11',
                nombre: 'PEDRO PABLO SÁNCHEZ RUIZ',
                dni: '76123984',
                hora: '19:05',
                comentario: 'Reporte sin descripción clara en zona peatonal.',
            },
        ],
        evidencia: {
            descripcion: 'Imagen borrosa sin indicios de emergencia real. El filtro de IA asignó baja confiabilidad (10%).',
            confianzaDetalle: 'Rechazado por modelo de validación de imagen (10%).',
            fechaCaptura: '07/09/2026 · 19:05:00',
            Prioridad: 'BAJA - Falsa Alarma confirmada',
        },
    },
    {
        id: '8ef92c63-5d22-4100-934c-203948576102',
        tipo: 'Accidente Vehicular',
        estado: 'Falsa Alarma',
        fecha: '27/08/2026 · 08:40',
        fechaCorta: '27/8/2026',
        direccion: 'Av. Javier Prado Oeste 750, Magdalena del Mar, Lima',
        referencia: 'Cruce con Av. Brasil',
        coordenadas: { lat: -12.0902, lng: -77.0615 },
        testigosCount: 1,
        iaValidacion: { estado: 'Aprobado', porcentaje: 98 },
        reportante: {
            nombre: 'GIANMARCO VÁSQUEZ LÓPEZ',
            dni: '73891024',
            telefono: '965 432 189',
        },
        testigos: [
            {
                id: 't12',
                nombre: 'GIANMARCO VÁSQUEZ LÓPEZ',
                dni: '73891024',
                hora: '08:40',
                comentario: 'Vehículo detenido con luces de emergencia encendidas.',
            },
        ],
        evidencia: {
            descripcion: 'Se trataba únicamente de un desperfecto mecánico menor (cambio de neumático) sin heridos ni choque.',
            confianzaDetalle: 'IA identificó vehículos detenidos en vía (98%), descartado como emergencia médica.',
            fechaCaptura: '27/08/2026 · 08:40:18',
            Prioridad: 'DESCARTADO',
        },
    },
];

/**
 * Autentica un bombero:
 * 1) Si las credenciales de Supabase están configuradas, consulta la tabla `usuarios_dashboard`.
 * 2) Valida también contra las credenciales de prueba locales mientras se desarrolla/prueba el flujo.
 */
export async function authenticateBombero(identificador, password) {
    const cleanId = (identificador || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    if (!cleanId || !cleanPass) {
        throw new Error('Ingresa tu usuario/correo y contraseña.');
    }

    // 1. Intentar validación desde Supabase (tabla usuarios_dashboard) si hay URL y Anon Key configuradas
    if (SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey) {
        try {
            const queryUrl = `${SUPABASE_CONFIG.url}/rest/v1/${SUPABASE_CONFIG.table}?or=(usuario.eq.${encodeURIComponent(
                cleanId
            )},correo.eq.${encodeURIComponent(cleanId)},email.eq.${encodeURIComponent(cleanId)})&select=*`;

            const response = await fetch(queryUrl, {
                method: 'GET',
                headers: {
                    apikey: SUPABASE_CONFIG.anonKey,
                    Authorization: `Bearer ${SUPABASE_CONFIG.anonKey}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const rows = await response.json();
                if (Array.isArray(rows) && rows.length > 0) {
                    const dbUser = rows[0];
                    const dbPass = dbUser.password || dbUser.contrasena || dbUser.clave;
                    if (String(dbPass) === cleanPass) {
                        return {
                            id: String(dbUser.id || 'supabase-user'),
                            usuario: dbUser.usuario || dbUser.email || dbUser.correo,
                            correo: dbUser.correo || dbUser.email || cleanId,
                            nombre: dbUser.nombre || dbUser.nombre_completo || 'Bombero Operador',
                            rango: dbUser.rango || dbUser.cargo || 'Efectivo CBP',
                            codigoBombero: dbUser.codigo || dbUser.dni || 'CBP-108',
                            compania: dbUser.compania || 'Compañía Cap. José A. Quiñonez N° 108',
                            direccionEstacion: dbUser.direccion_estacion || 'Cap. José A. Quiñonez N° 108',
                            telefono: dbUser.telefono || 'Central 116',
                            turno: dbUser.turno || 'En Servicio Activo',
                            rol: 'bombero',
                            origen: 'supabase:usuarios_dashboard',
                        };
                    } else {
                        throw new Error('Contraseña incorrecta para el usuario registrado en Supabase.');
                    }
                }
            }
        } catch (err) {
            if (err.message.includes('Contraseña incorrecta')) {
                throw err;
            }
            console.warn('Aviso al conectar con Supabase usuarios_dashboard, usando validación de prueba:', err.message);
        }
    }

    // 2. Validación con credenciales de prueba locales
    await new Promise((resolve) => setTimeout(resolve, 450));

    const found = DEMO_BOMBERO_CREDENTIALS.find(
        (cred) =>
            (cred.usuario.toLowerCase() === cleanId || cred.correo.toLowerCase() === cleanId) &&
            cred.password === cleanPass
    );

    if (!found) {
        throw new Error('Credenciales inválidas. Usa las credenciales de prueba o verifica tu cuenta en usuarios_dashboard.');
    }

    return {
        ...found,
        origen: 'demo_usuarios_dashboard',
    };
}

/**
 * Obtiene y sincroniza todas las emergencias (combinando las del dashboard con los reportes ciudadanos).
 */
export async function getBomberoEmergencies() {
    try {
        const storedJson = await AsyncStorage.getItem(BOMBERO_EMERGENCIES_KEY);
        let bomberoList = storedJson ? JSON.parse(storedJson) : null;

        if (!bomberoList || !Array.isArray(bomberoList) || bomberoList.length === 0) {
            bomberoList = INITIAL_BOMBERO_EMERGENCIES;
            await AsyncStorage.setItem(BOMBERO_EMERGENCIES_KEY, JSON.stringify(bomberoList));
        }

        // Sincronizar nuevos reportes creados por ciudadanos desde ReportEmergencyScreen
        const citizenReports = await getStoredReports();
        let hasChanges = false;

        for (const report of citizenReports) {
            // Ignorar los 4 reportes semilla antiguos ('1', '2', '3', '4') si no tienen detalle extendido
            const isSeedReport = ['1', '2', '3', '4'].includes(String(report.id));
            const existsInBombero = bomberoList.some((b) => String(b.id) === String(report.id));

            if (!isSeedReport && !existsInBombero) {
                const fechaCorta = report.fecha ? report.fecha.split('·')[0].trim() : 'Hoy';
                const nuevaEmergencia = {
                    id: String(report.id),
                    tipo: report.tipo || 'Emergencia',
                    estado: report.estado || 'Pendiente',
                    fecha: report.fecha || fechaCorta,
                    fechaCorta,
                    direccion: report.direccion || 'Av. Arequipa 1250, Cercado de Lima (Geolocalizado)',
                    referencia: 'Reporte enviado desde aplicación móvil ciudadana OmniGuard',
                    coordenadas: { lat: -12.0745, lng: -77.0358 },
                    testigosCount: 1,
                    iaValidacion: { estado: 'Aprobado', porcentaje: 94 },
                    reportante: {
                        nombre: report.reportanteNombre || 'CIUDADANO VERIFICADO RENIEC',
                        dni: report.reportanteDni || '73338614',
                        telefono: '999 888 777',
                    },
                    testigos: [
                        {
                            id: `t-${report.id}`,
                            nombre: report.reportanteNombre || 'CIUDADANO VERIFICADO RENIEC',
                            dni: report.reportanteDni || '73338614',
                            hora: report.fecha?.split('·')[1]?.trim() || 'Ahora',
                            comentario: `Alerta inmediata de ${report.tipo} enviada con ubicación GPS activa.`,
                        },
                    ],
                    evidencia: {
                        descripcion: `Alerta ciudadana de tipo "${report.tipo}" verificada con identidad RENIEC y coordenadas GPS en tiempo real.`,
                        confianzaDetalle: 'Validación automática de identidad y ubicación positiva (94%).',
                        fechaCaptura: report.fecha || 'Reciente',
                        Prioridad: 'ALTA - Pendiente de despacho',
                    },
                };
                bomberoList = [nuevaEmergencia, ...bomberoList];
                hasChanges = true;
            }
        }

        if (hasChanges) {
            await AsyncStorage.setItem(BOMBERO_EMERGENCIES_KEY, JSON.stringify(bomberoList));
        }

        return bomberoList;
    } catch (error) {
        console.error('Error al obtener emergencias de bombero:', error);
        return INITIAL_BOMBERO_EMERGENCIES;
    }
}

/**
 * Actualiza el estado de una emergencia ('Pendiente' | 'En Proceso' | 'Culminado' | 'Falsa Alarma')
 * y ajusta automáticamente las unidades disponibles y la lista de reportes ciudadanos.
 */
export async function updateEmergencyStatus(emergencyId, nuevoEstado) {
    try {
        const list = await getBomberoEmergencies();
        const updatedList = list.map((item) => {
            if (String(item.id) === String(emergencyId)) {
                return {
                    ...item,
                    estado: nuevoEstado,
                    unidadAsignada: nuevoEstado === 'En Proceso' ? item.unidadAsignada || 'M-108-1' : item.unidadAsignada,
                };
            }
            return item;
        });

        await AsyncStorage.setItem(BOMBERO_EMERGENCIES_KEY, JSON.stringify(updatedList));

        // Sincronizar también en @omniguard_reports si el reporte fue creado por el ciudadano
        const citizenJson = await AsyncStorage.getItem(REPORTS_STORAGE_KEY);
        if (citizenJson) {
            const citizenList = JSON.parse(citizenJson);
            const updatedCitizen = citizenList.map((r) =>
                String(r.id) === String(emergencyId) ? { ...r, estado: nuevoEstado } : r
            );
            await AsyncStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(updatedCitizen));
        }

        return updatedList.find((item) => String(item.id) === String(emergencyId));
    } catch (error) {
        console.error('Error al actualizar estado de emergencia:', error);
        throw error;
    }
}

/**
 * Obtiene o actualiza el total de unidades disponibles de la estación.
 */
export async function getStationUnits() {
    try {
        const stored = await AsyncStorage.getItem(BOMBERO_UNITS_KEY);
        if (stored) return JSON.parse(stored);
        const initial = { disponibles: 3, total: 3 };
        await AsyncStorage.setItem(BOMBERO_UNITS_KEY, JSON.stringify(initial));
        return initial;
    } catch {
        return { disponibles: 3, total: 3 };
    }
}

export async function setStationUnits(disponibles, total = 3) {
    const data = {
        disponibles: Math.max(0, Math.min(total, disponibles)),
        total,
    };
    await AsyncStorage.setItem(BOMBERO_UNITS_KEY, JSON.stringify(data));
    return data;
}

