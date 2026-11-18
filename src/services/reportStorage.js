import AsyncStorage from '@react-native-async-storage/async-storage';

export function getReportsStorageKey(userId) {
    return `@omniguard_reports_${userId}`;
}

/**
 * Obtiene la lista de reportes guardados en el almacenamiento local para un usuario específico.
 * @param {string|null} userId - UUID del usuario autenticado en la tabla usuarios.
 */
export async function getStoredReports(userId = null) {
    if (!userId) {
        return [];
    }
    try {
        const jsonValue = await AsyncStorage.getItem(getReportsStorageKey(userId));
        if (jsonValue != null) {
            const parsed = JSON.parse(jsonValue);
            return Array.isArray(parsed) ? parsed : [];
        }
        return [];
    } catch (error) {
        console.error('Error al leer reportes de AsyncStorage:', error);
        return [];
    }
}

/**
 * Actualiza el caché local de reportes para un usuario específico.
 * @param {string} userId - UUID del usuario autenticado.
 * @param {Array} reports - Lista de reportes del usuario.
 */
export async function cacheUserReports(userId, reports) {
    if (!userId) return;
    try {
        await AsyncStorage.setItem(getReportsStorageKey(userId), JSON.stringify(reports || []));
    } catch (error) {
        console.error('Error al cachear reportes en AsyncStorage:', error);
    }
}

/**
 * Agrega un nuevo reporte de emergencia al inicio del historial en AsyncStorage para el usuario.
 * @param {string} tipoEmergencia - Nombre del tipo de emergencia (ej. "Incendio")
 * @param {object|null} user - Datos del usuario reportante (debe incluir id de tabla usuarios)
 * @param {object} extraData - Datos adicionales opcionales (id remoto, coordenadas, fotoUrl)
 */
export async function saveNewReport(tipoEmergencia, user = null, extraData = {}) {
    try {
        const userId = user?.id || extraData.usuarioId || null;
        if (!userId) {
            throw new Error('Se requiere usuario_id para almacenar el reporte.');
        }

        const actuales = await getStoredReports(userId);

        const ahora = new Date();
        const dia = String(ahora.getDate()).padStart(2, '0');
        const mes = String(ahora.getMonth() + 1).padStart(2, '0');
        const anio = ahora.getFullYear();
        const horas = String(ahora.getHours()).padStart(2, '0');
        const minutos = String(ahora.getMinutes()).padStart(2, '0');
        const fechaFormateada = `${dia}/${mes}/${anio} · ${horas}:${minutos}`;

        const nuevoReporte = {
            id: extraData.id ? String(extraData.id) : Date.now().toString(),
            usuario_id: userId,
            tipo: tipoEmergencia,
            fecha: fechaFormateada,
            estado: 'Pendiente',
            reportanteNombre: user?.nombre || 'Ciudadano Verificado',
            reportanteDni: user?.dni || '',
            coordenadas: extraData.coordenadas || null,
            fotoUrl: extraData.fotoUrl || null,
        };

        const nuevaLista = [nuevoReporte, ...actuales];
        await AsyncStorage.setItem(getReportsStorageKey(userId), JSON.stringify(nuevaLista));
        return nuevoReporte;
    } catch (error) {
        console.error('Error al guardar reporte en AsyncStorage:', error);
        throw error;
    }
}
