import { supabase } from '../../services/supabaseClient';

/**
 * Autentica un bombero exclusivamente contra la tabla `usuarios_dashboard` en Supabase.
 */
export async function authenticateBombero(identificador, password) {
    const identificadorLimpio = (identificador || '').trim();
    const cleanPass = (password || '').trim();

    if (!identificadorLimpio || !cleanPass) {
        throw new Error('Ingresa tu placa/correo y contraseña.');
    }

    const { data: rows, error: queryError } = await supabase
        .from('usuarios_dashboard')
        .select(
            'id, email, placa_servicio, password_hash, nombre, rol, compania_id, unidad_asignada_id, activo, companias_bomberos(id, nombre, unidades_disponibles, unidades_totales)'
        )
        .eq('activo', true)
        .eq('rol', 'bombero')
        .or(`placa_servicio.eq.${identificadorLimpio},email.eq.${identificadorLimpio}`);

    if (queryError) {
        throw new Error(queryError.message || 'Error al consultar credenciales en Supabase.');
    }

    if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error('Credenciales inválidas o cuenta de operador inactiva.');
    }

    const dbUser = rows[0];
    if (String(dbUser.password_hash ?? '') !== cleanPass) {
        throw new Error('Contraseña incorrecta.');
    }

    const companiaObj = Array.isArray(dbUser.companias_bomberos)
        ? dbUser.companias_bomberos[0]
        : dbUser.companias_bomberos;
    const companiaNombre = companiaObj?.nombre || 'Central de Bomberos';

    return {
        id: String(dbUser.id),
        usuario: dbUser.placa_servicio || dbUser.email,
        correo: dbUser.email || identificadorLimpio,
        compania_id: dbUser.compania_id || null,
        unidad_asignada_id: dbUser.unidad_asignada_id || null,
        nombre: dbUser.nombre || 'Bombero Operador',
        rango: 'Efectivo CBP',
        codigoBombero: dbUser.placa_servicio || 'Sin placa',
        compania: companiaNombre,
        direccionEstacion: companiaNombre,
        unidadesDisponibles: companiaObj?.unidades_disponibles ?? 0,
        unidadesTotales: companiaObj?.unidades_totales ?? 0,
        telefono: 'Central 116',
        turno: 'En Servicio Activo',
        rol: dbUser.rol || 'bombero',
        origen: 'supabase:usuarios_dashboard',
    };
}

/**
 * Obtiene en vivo desde Supabase una cuenta representativa por cada compañía activa.
 */
export async function getCuentasDemoBomberos() {
    const { data: rows, error } = await supabase
        .from('usuarios_dashboard')
        .select('id, nombre, placa_servicio, email, password_hash, compania_id, companias_bomberos(nombre)')
        .eq('rol', 'bombero')
        .eq('activo', true)
        .order('creado_en', { ascending: true });

    if (error) {
        console.error('[bomberoService] Error al obtener cuentas de central:', error);
        throw error;
    }

    if (!Array.isArray(rows) || rows.length === 0) {
        return [];
    }

    const porCompania = new Map();
    for (const row of rows) {
        const key = row.compania_id || row.id;
        if (!porCompania.has(key)) {
            const companiaObj = Array.isArray(row.companias_bomberos)
                ? row.companias_bomberos[0]
                : row.companias_bomberos;
            porCompania.set(key, {
                id: String(row.id),
                nombre: row.nombre || 'Operador',
                placa_servicio: row.placa_servicio || '',
                email: row.email || '',
                password_hash: row.password_hash || '',
                compania_id: row.compania_id || null,
                compania_nombre: companiaObj?.nombre || 'Central de Bomberos',
            });
        }
    }

    return Array.from(porCompania.values());
}

/**
 * Valida si un valor tiene formato UUID estándar para evitar errores 22P02 en PostgreSQL.
 */
export function esUuidValido(valor) {
    if (typeof valor !== 'string') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor.trim());
}

/**
 * Normaliza variantes de estado (minúsculas o guiones bajos) a los valores exactos de la UI.
 */
export function normalizarEstado(estado) {
    if (!estado) return 'Pendiente';
    const clave = String(estado).trim().toLowerCase().replace(/\s+/g, '_');
    const mapa = {
        pendiente: 'Pendiente',
        asignado: 'Asignado',
        en_camino: 'En Proceso',
        en_atencion: 'En Proceso',
        en_proceso: 'En Proceso',
        resuelto_campo: 'Culminado',
        cerrado: 'Culminado',
        culminado: 'Culminado',
        falsa_alarma: 'Falsa Alarma',
    };
    return mapa[clave] || estado;
}

/**
 * Formatea una fecha ISO de Supabase a formato legible DD/MM/YYYY · HH:mm y fecha corta.
 */
function formatSupabaseDate(isoString) {
    if (!isoString) {
        return { fecha: 'Reciente', fechaCorta: 'Hoy' };
    }
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) {
        return { fecha: String(isoString), fechaCorta: String(isoString) };
    }
    const dia = date.getDate();
    const mes = date.getMonth() + 1;
    const anio = date.getFullYear();
    const horas = String(date.getHours()).padStart(2, '0');
    const minutos = String(date.getMinutes()).padStart(2, '0');
    return {
        fecha: `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${anio} · ${horas}:${minutos}`,
        fechaCorta: `${dia}/${mes}/${anio}`,
    };
}

/**
 * Mapea una fila de la tabla `emergencias` de Supabase al formato esperado por el módulo de bombero.
 */
function mapSupabaseEmergencyRow(row) {
    const { fecha, fechaCorta } = formatSupabaseDate(row.creado_en);
    const lat = Number(row.latitud ?? -12.0464);
    const lng = Number(row.longitud ?? -77.0428);
    const usuarioObj = Array.isArray(row.usuarios) ? row.usuarios[0] : row.usuarios;
    const nombres = [usuarioObj?.nombres, usuarioObj?.apellidos].filter(Boolean).join(' ').trim();
    const nombreReportante = nombres || 'Ciudadano Verificado';
    const dniReportante = usuarioObj?.dni || 'No registrado';
    const estadoNormalizado = normalizarEstado(row.estado);

    return {
        id: String(row.id),
        tipo: row.tipo || 'Emergencia',
        estado: estadoNormalizado,
        fecha,
        fechaCorta,
        direccion: row.direccion || `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)} (Geolocalizado)`,
        referencia: row.referencia || 'Reporte enviado desde plataforma ciudadana OmniGuard',
        coordenadas: { lat, lng },
        testigosCount: row.testigos ?? 1,
        companiaId: row.compania_asignada_id || row.compania_id || null,
        unidadAsignadaId: row.unidad_asignada_id || null,
        unidadAsignada: row.unidad_asignada || row.unidad_asignada_id || null,
        fotoUrl: row.foto_url || null,
        fotoCierreUrl: row.foto_cierre_url || null,
        informeBombero: row.informe_bombero || null,
        iaValidacion: {
            estado: row.ia_estado || 'Aprobado',
            porcentaje: row.ia_porcentaje ?? 95,
        },
        reportante: {
            nombre: nombreReportante,
            dni: dniReportante,
            telefono: '116',
        },
        testigos: [
            {
                id: `t-${row.id}`,
                nombre: nombreReportante,
                dni: dniReportante,
                hora: fecha.includes('·') ? fecha.split('·')[1].trim() : 'Ahora',
                comentario: `Alerta de ${row.tipo || 'Emergencia'} registrada con coordenadas GPS.`,
            },
        ],
        evidencia: {
            descripcion: row.foto_url
                ? `Emergencia "${row.tipo}" registrada con fotografía adjunta y coordenadas GPS.`
                : `Alerta ciudadana de tipo "${row.tipo}" con coordenadas GPS en tiempo real.`,
            confianzaDetalle: 'Validación de incidente recibida desde central OmniGuard.',
            fechaCaptura: fecha,
            Prioridad: estadoNormalizado === 'Pendiente' ? 'ALTA - Pendiente de despacho' : `Estado: ${estadoNormalizado}`,
        },
    };
}

/**
 * Obtiene las emergencias directamente desde la tabla `emergencias` de Supabase,
 * filtradas por compañía asignada y/o unidad asignada. Si no hay registros, retorna [].
 */
export async function getBomberoEmergencies(companiaId = null, unidadAsignadaId = null) {
    try {
        let query = supabase
            .from('emergencias')
            .select('*, usuarios(dni, nombres, apellidos)');

        const hasCompania = esUuidValido(companiaId);
        const hasUnidad = esUuidValido(unidadAsignadaId);

        if (hasCompania && hasUnidad) {
            query = query.or(
                `compania_asignada_id.eq.${companiaId.trim()},unidad_asignada_id.eq.${unidadAsignadaId.trim()}`
            );
        } else if (hasCompania) {
            query = query.eq('compania_asignada_id', companiaId.trim());
        } else if (hasUnidad) {
            query = query.eq('unidad_asignada_id', unidadAsignadaId.trim());
        }

        const { data: remoteRows, error: remoteError } = await query.order('creado_en', {
            ascending: false,
        });

        if (remoteError) {
            console.error('[bomberoService] Error al consultar emergencias en Supabase:', remoteError);
            return [];
        }

        if (!Array.isArray(remoteRows) || remoteRows.length === 0) {
            return [];
        }

        return remoteRows.map(mapSupabaseEmergencyRow);
    } catch (error) {
        console.error('[bomberoService] Error al obtener emergencias de bombero:', error);
        return [];
    }
}

export const getEmergenciasBombero = getBomberoEmergencies;

/**
 * Actualiza el estado de una emergencia en la tabla `emergencias` de Supabase.
 */
export async function updateEmergencyStatus(
    emergencyId,
    nuevoEstado,
    datosCierre = { fotoCierreUrl: null, informeBombero: null, bomberoId: null }
) {
    const estadoNormalizado = normalizarEstado(nuevoEstado);
    const updatePayload = { estado: estadoNormalizado };

    if (datosCierre?.fotoCierreUrl) {
        updatePayload.foto_cierre_url = datosCierre.fotoCierreUrl;
    }
    if (datosCierre?.informeBombero) {
        updatePayload.informe_bombero = datosCierre.informeBombero;
    }
    updatePayload.bombero_cierre_id = esUuidValido(datosCierre?.bomberoId)
        ? datosCierre.bomberoId.trim()
        : null;

    const { data: updatedRow, error: updateError } = await supabase
        .from('emergencias')
        .update(updatePayload)
        .eq('id', emergencyId)
        .select('*, usuarios(dni, nombres, apellidos)')
        .maybeSingle();

    if (updateError) {
        console.error('[bomberoService] Error al actualizar emergencia en Supabase:', updateError);
        throw updateError;
    }

    return updatedRow ? mapSupabaseEmergencyRow(updatedRow) : null;
}

/**
 * Obtiene métricas reales de unidades desde `companias_bomberos` y `unidades_bomberos` en Supabase.
 */
export async function getStationUnits(companiaId = null) {
    if (!esUuidValido(companiaId)) {
        return { disponibles: 0, total: 0 };
    }

    try {
        const cleanCompaniaId = companiaId.trim();

        const [companiaRes, unidadesRes] = await Promise.all([
            supabase
                .from('companias_bomberos')
                .select('unidades_disponibles, unidades_totales')
                .eq('id', cleanCompaniaId)
                .maybeSingle(),
            supabase
                .from('unidades_bomberos')
                .select('id, estado')
                .eq('compania_id', cleanCompaniaId),
        ]);

        const compania = companiaRes.data;
        const unidades = Array.isArray(unidadesRes.data) ? unidadesRes.data : [];

        if (
            compania &&
            typeof compania.unidades_disponibles === 'number' &&
            typeof compania.unidades_totales === 'number'
        ) {
            return {
                disponibles: compania.unidades_disponibles,
                total: compania.unidades_totales,
            };
        }

        if (unidades.length > 0) {
            const disponibles = unidades.filter(
                (u) => String(u.estado || '').trim().toLowerCase() === 'disponible'
            ).length;
            return {
                disponibles,
                total: unidades.length,
            };
        }

        return { disponibles: 0, total: 0 };
    } catch (error) {
        console.error('[bomberoService] Error al consultar unidades de estación:', error);
        return { disponibles: 0, total: 0 };
    }
}
