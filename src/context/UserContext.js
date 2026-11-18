import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabaseClient';

const UserContext = createContext(null);

const RENIEC_API_KEY = process.env.EXPO_PUBLIC_RENIEC_API_KEY || '';
export const CITIZEN_SESSION_KEY = '@omniguard_citizen_session';

function separarNombresYApellidos(data, fallbackNombre = '') {
    const rawNombres = (data?.first_name || data?.nombres || '').trim();
    const rawApellidos = [
        data?.first_last_name || data?.apellidoPaterno || data?.apellido_paterno,
        data?.second_last_name || data?.apellidoMaterno || data?.apellido_materno,
    ]
        .filter(Boolean)
        .join(' ')
        .trim();

    if (rawNombres && rawApellidos) {
        return { nombres: rawNombres, apellidos: rawApellidos };
    }

    if (rawNombres && data?.apellidos) {
        return { nombres: rawNombres, apellidos: String(data.apellidos).trim() };
    }

    const fullName = (data?.full_name || data?.nombre_completo || fallbackNombre || '').trim();
    const words = fullName.split(/\s+/).filter(Boolean);

    if (words.length >= 3) {
        return {
            nombres: words.slice(0, -2).join(' '),
            apellidos: words.slice(-2).join(' '),
        };
    }

    if (words.length === 2) {
        return {
            nombres: words[0],
            apellidos: words[1],
        };
    }

    return {
        nombres: rawNombres || fullName || 'Ciudadano',
        apellidos: rawApellidos || '',
    };
}

async function sincronizarUsuarioSupabase(dni, nombres, apellidos) {
    const { data: usuarioExistente, error: selectError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('dni', dni)
        .maybeSingle();

    if (selectError) {
        throw selectError;
    }

    if (usuarioExistente?.id) {
        const { data: usuarioActualizado, error: updateError } = await supabase
            .from('usuarios')
            .update({
                nombres,
                apellidos,
                verificado: true,
            })
            .eq('id', usuarioExistente.id)
            .select('*')
            .single();

        if (updateError) {
            throw updateError;
        }

        return usuarioActualizado;
    }

    const { data: nuevoUsuario, error: insertError } = await supabase
        .from('usuarios')
        .insert({
            dni,
            nombres,
            apellidos,
            fecha_nacimiento: null,
            foto_dni_url: null,
            verificado: true,
        })
        .select('*')
        .single();

    if (insertError) {
        throw insertError;
    }

    return nuevoUsuario;
}

export function UserProvider({ children }) {
    const [user, setUser] = useState(null);

    const consultarDniReniec = useCallback(async (dni) => {
        const dniLimpio = String(dni || '').trim();
        if (!/^\d{8}$/.test(dniLimpio)) {
            throw new Error('El DNI debe tener 8 dígitos.');
        }

        let datosReniec = null;
        let nombres = 'Ciudadano';
        let apellidos = 'Verificado';

        if (RENIEC_API_KEY) {
            try {
                const response = await fetch(`https://api.decolecta.com/v1/reniec/dni?numero=${dniLimpio}`, {
                    headers: {
                        Authorization: `Bearer ${RENIEC_API_KEY}`,
                        Accept: 'application/json',
                    },
                });

                const data = await response.json();

                if (!response.ok || data.error) {
                    throw new Error(data.error || 'DNI no encontrado o error en la consulta.');
                }

                datosReniec = data;
                const separados = separarNombresYApellidos(data);
                nombres = separados.nombres;
                apellidos = separados.apellidos;
            } catch (reniecError) {
                console.warn('[UserContext] Error al consultar API Decolecta RENIEC (SSL/Red):', reniecError.message);

                // Si ya existe en la base de datos de Supabase, recuperamos sus nombres y apellidos reales
                try {
                    const { data: usuarioExistente } = await supabase
                        .from('usuarios')
                        .select('*')
                        .eq('dni', dniLimpio)
                        .maybeSingle();

                    if (usuarioExistente?.nombres) {
                        nombres = usuarioExistente.nombres;
                        apellidos = usuarioExistente.apellidos || '';
                    } else if (reniecError.message && !reniecError.message.includes('SSLHandshakeException') && !reniecError.message.includes('fetch failed')) {
                        // Si fue un error de negocio real (DNI inexistente), lanzamos el error
                        throw reniecError;
                    }
                } catch (dbCheckError) {
                    console.warn('[UserContext] Error verificando usuario local:', dbCheckError.message);
                }
            }
        }

        const usuarioDb = await sincronizarUsuarioSupabase(
            datosReniec?.document_number || dniLimpio,
            nombres,
            apellidos
        );

        const nombreCompleto = `${usuarioDb.nombres || nombres} ${usuarioDb.apellidos || apellidos}`.trim();

        return {
            ...usuarioDb,
            nombre: nombreCompleto,
            datosReniec,
        };
    }, []);

    const login = useCallback(async (userData) => {
        setUser(userData);
        if (userData && userData.rol !== 'bombero') {
            try {
                await AsyncStorage.setItem(CITIZEN_SESSION_KEY, JSON.stringify(userData));
            } catch (error) {
                console.warn('[UserContext] No se pudo guardar la sesión ciudadana:', error);
            }
        }
    }, []);

    const logout = useCallback(async () => {
        setUser(null);
        try {
            await AsyncStorage.removeItem(CITIZEN_SESSION_KEY);
        } catch (error) {
            console.warn('[UserContext] Error al limpiar sesión ciudadana:', error);
        }
        try {
            await supabase.removeAllChannels();
        } catch (error) {
            console.warn('[UserContext] Error al cancelar suscripciones Realtime:', error);
        }
    }, []);

    const value = useMemo(
        () => ({ user, login, logout, consultarDniReniec, RENIEC_API_KEY }),
        [user, login, logout, consultarDniReniec]
    );

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
    const ctx = useContext(UserContext);
    if (!ctx) throw new Error('useUser debe usarse dentro de un <UserProvider>');
    return ctx;
}
