import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@omniguard_reports';

export const INITIAL_REPORTS = [
    { id: '1', tipo: 'Incendio', fecha: '05/09/2026 · 18:42', estado: 'En Proceso' },
    { id: '2', tipo: 'Accidente Vehicular', fecha: '02/09/2026 · 09:10', estado: 'Culminado' },
    { id: '3', tipo: 'Fuga de Gas', fecha: '28/08/2026 · 21:05', estado: 'Falsa Alarma' },
    { id: '4', tipo: 'Inundación', fecha: '20/08/2026 · 07:33', estado: 'Culminado' },
];

/**
 * Obtiene la lista de reportes guardados en el almacenamiento local.
 * Si es la primera vez que se inicia la app, inicializa con los reportes base.
 */
export async function getStoredReports() {
    try {
        const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
        if (jsonValue != null) {
            return JSON.parse(jsonValue);
        }
        // Inicializar almacenamiento con la lista base
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_REPORTS));
        return INITIAL_REPORTS;
    } catch (error) {
        console.error('Error al leer reportes de AsyncStorage:', error);
        return INITIAL_REPORTS;
    }
}

/**
 * Agrega un nuevo reporte de emergencia al inicio del historial en AsyncStorage.
 * @param {string} tipoEmergencia - Nombre del tipo de emergencia (ej. "Incendio")
 */
export async function saveNewReport(tipoEmergencia) {
    try {
        const actuales = await getStoredReports();

        const ahora = new Date();
        const dia = String(ahora.getDate()).padStart(2, '0');
        const mes = String(ahora.getMonth() + 1).padStart(2, '0');
        const anio = ahora.getFullYear();
        const horas = String(ahora.getHours()).padStart(2, '0');
        const minutos = String(ahora.getMinutes()).padStart(2, '0');
        const fechaFormateada = `${dia}/${mes}/${anio} · ${horas}:${minutos}`;

        const nuevoReporte = {
            id: Date.now().toString(),
            tipo: tipoEmergencia,
            fecha: fechaFormateada,
            estado: 'Pendiente',
        };

        const nuevaLista = [nuevoReporte, ...actuales];
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nuevaLista));
        return nuevoReporte;
    } catch (error) {
        console.error('Error al guardar reporte en AsyncStorage:', error);
        throw error;
    }
}
