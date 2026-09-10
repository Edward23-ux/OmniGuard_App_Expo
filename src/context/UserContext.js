import React, { createContext, useContext, useState, useMemo } from 'react';

const UserContext = createContext(null);

// Espacio reservado para tu API Key de RENIEC (por ahora estático, luego vendrá de Supabase)
const RENIEC_API_KEY = 'sk';

export function UserProvider({ children }) {
    const [user, setUser] = useState(null);

    // Función para consultar la API de RENIEC con el DNI
    const consultarDniReniec = async (dni) => {
        try {
            const response = await fetch(`https://api.decolecta.com/v1/reniec/dni?numero=${dni}`, {
                headers: {
                    'Authorization': `Bearer ${RENIEC_API_KEY}`,
                    'Accept': 'application/json',
                },
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(data.error || 'DNI no encontrado o error en la consulta.');
            }

            const nombres = data.first_name || '';
            const apellidos = [data.first_last_name, data.second_last_name].filter(Boolean).join(' ');
            const nombreFormateado = `${nombres} ${apellidos}`.trim() || data.full_name;

            return {
                dni: data.document_number || dni,
                nombre: nombreFormateado,
                datosReniec: data,
            };
        } catch (error) {
            console.error('Error al consultar RENIEC:', error);
            throw error;
        }
    };

    const login = (userData) => {
        // userData puede ser { dni, nombre } directamente
        setUser(userData);
    };

    const logout = () => setUser(null);

    const value = useMemo(() => ({ user, login, logout, consultarDniReniec, RENIEC_API_KEY }), [user]);

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
    const ctx = useContext(UserContext);
    if (!ctx) throw new Error('useUser debe usarse dentro de un <UserProvider>');
    return ctx;
}
