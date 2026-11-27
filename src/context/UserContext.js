import React, { createContext, useContext, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabaseClient';

const UserContext = createContext(null);

const RENIEC_API_KEY = process.env.EXPO_PUBLIC_RENIEC_API_KEY || '';
export const CITIZEN_SESSION_KEY = '@omniguard_citizen_session';
export const BOMBERO_SESSION_KEY = '@omniguard_bombero_session';

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

async function sincronizarUsuarioSupabase(dni, nombres, apellidos, verificado = true) {
    const { data: usuarioExistente, error: selectError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('dni', dni)
        .maybeSingle();

    if (selectError) {
        throw selectError;
    }

    if (usuarioExistente?.id) {
        const updatePayload = {};
        if (nombres && nombres !== 'Ciudadano') {
            updatePayload.nombres = nombres;
        }
        if (apellidos && apellidos !== 'Verificado') {
            updatePayload.apellidos = apellidos;
        }
        if (verificado) {
            updatePayload.verificado = true;
        }

        if (Object.keys(updatePayload).length === 0) {
            return usuarioExistente;
        }

        const { data: usuarioActualizado, error: updateError } = await supabase
            .from('usuarios')
            .update(updatePayload)
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
            verificado,
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
    const [sessionLoaded, setSessionLoaded] = useState(false);
    const userRef = useRef(null);

    useEffect(() => {
        userRef.current = user;
    }, [user]);

    // Restaurar sesión persistente (Bombero o Ciudadano) desde AsyncStorage al abrir la app
    useEffect(() => {
        let mounted = true;

        const restaurarSesion = async () => {
            try {
                const [bomberoJson, citizenJson] = await Promise.all([
                    AsyncStorage.getItem(BOMBERO_SESSION_KEY),
                    AsyncStorage.getItem(CITIZEN_SESSION_KEY),
                ]);

                if (bomberoJson) {
                    const parsedBombero = JSON.parse(bomberoJson);
                    if (parsedBombero?.id && parsedBombero?.rol === 'bombero') {
                        if (mounted) setUser(parsedBombero);
                        return;
                    }
                }

                if (citizenJson) {
                    const parsedCitizen = JSON.parse(citizenJson);
                    if (parsedCitizen?.id && parsedCitizen?.dni) {
                        if (mounted) setUser(parsedCitizen);
                        return;
                    }
                }
            } catch (error) {
                console.warn('[UserContext] No se pudo restaurar la sesión desde AsyncStorage:', error?.message || error);
            } finally {
                if (mounted) setSessionLoaded(true);
            }
        };

        restaurarSesion();

        return () => {
            mounted = false;
        };
    }, []);

    const consultarDniReniec = useCallback(async (dni, options = {}) => {
        const { verificado = true } = options;
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

                const contentType = response.headers.get('content-type') || '';
                const rawBody = await response.text();
                const pareceJson =
                    contentType.toLowerCase().includes('application/json') ||
                    rawBody.trim().startsWith('{') ||
                    rawBody.trim().startsWith('[');

                if (!pareceJson) {
                    const httpErr = new Error(
                        `Respuesta no JSON del servicio RENIEC (HTTP ${response.status}).`
                    );
                    httpErr.isNetworkOrGateway = true;
                    throw httpErr;
                }

                let data;
                try {
                    data = JSON.parse(rawBody);
                } catch {
                    const parseErr = new Error(
                        `No se pudo interpretar la respuesta de RENIEC (HTTP ${response.status}).`
                    );
                    parseErr.isNetworkOrGateway = true;
                    throw parseErr;
                }

                if (!response.ok || data.error) {
                    const apiErr = new Error(data.error || 'DNI no encontrado o error en la consulta.');
                    apiErr.isBusinessError = response.status === 400 || response.status === 404 || Boolean(data.error);
                    throw apiErr;
                }

                datosReniec = data;
                const separados = separarNombresYApellidos(data);
                nombres = separados.nombres;
                apellidos = separados.apellidos;
            } catch (reniecError) {
                console.warn('[UserContext] Aviso al consultar API Decolecta RENIEC:', reniecError.message);

                let usuarioExistente = null;
                try {
                    const { data } = await supabase
                        .from('usuarios')
                        .select('*')
                        .eq('dni', dniLimpio)
                        .maybeSingle();
                    usuarioExistente = data;
                } catch (dbCheckError) {
                    console.warn('[UserContext] Error verificando usuario en Supabase:', dbCheckError.message);
                }

                if (usuarioExistente?.nombres) {
                    nombres = usuarioExistente.nombres;
                    apellidos = usuarioExistente.apellidos || '';
                } else if (reniecError.isBusinessError) {
                    throw reniecError;
                }
            }
        }

        const usuarioDb = await sincronizarUsuarioSupabase(
            datosReniec?.document_number || dniLimpio,
            nombres,
            apellidos,
            verificado
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
        if (!userData) return;

        try {
            if (userData.rol === 'bombero') {
                await AsyncStorage.setItem(BOMBERO_SESSION_KEY, JSON.stringify(userData));
                await AsyncStorage.removeItem(CITIZEN_SESSION_KEY);
            } else {
                await AsyncStorage.setItem(CITIZEN_SESSION_KEY, JSON.stringify(userData));
                await AsyncStorage.removeItem(BOMBERO_SESSION_KEY);
            }
        } catch (error) {
            console.warn('[UserContext] No se pudo guardar la sesión en AsyncStorage:', error);
        }
    }, []);

    const logout = useCallback(async () => {
        const currentUser = userRef.current;
        setUser(null);

        if (currentUser && currentUser.rol !== 'bombero' && currentUser.id) {
            try {
                await supabase
                    .from('usuarios')
                    .update({ verificado: false })
                    .eq('id', currentUser.id);
            } catch (error) {
                console.warn('[UserContext] No se pudo actualizar verificado=false en Supabase:', error);
            }
        }

        try {
            await AsyncStorage.multiRemove([CITIZEN_SESSION_KEY, BOMBERO_SESSION_KEY]);
        } catch (error) {
            console.warn('[UserContext] Error al limpiar sesión en AsyncStorage:', error);
        }

        try {
            await supabase.removeAllChannels();
        } catch (error) {
            console.warn('[UserContext] Error al cancelar suscripciones Realtime:', error);
        }
    }, []);

    const value = useMemo(
        () => ({ user, sessionLoaded, login, logout, consultarDniReniec, RENIEC_API_KEY }),
        [user, sessionLoaded, login, logout, consultarDniReniec]
    );

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
    const ctx = useContext(UserContext);
    if (!ctx) throw new Error('useUser debe usarse dentro de un <UserProvider>');
    return ctx;
}
