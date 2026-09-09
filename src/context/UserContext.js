import React, { createContext, useContext, useState, useMemo } from 'react';

/**
 * UserContext (mock)
 * Guarda el DNI validado y un nombre simulado, ya que aún no hay conexión
 * a base de datos. Cuando se integre Supabase, `login()` debe reemplazarse
 * por la consulta real y `user` debe poblarse con la respuesta del backend.
 */
const UserContext = createContext(null);

// Nombres de ejemplo para simular distintos usuarios según el DNI ingresado
const MOCK_NAMES = [
    'Carlos Ramírez Soto',
    'María Fernández Quispe',
    'Jorge Luna Vidal',
    'Ana Torres Meza',
];

export function UserProvider({ children }) {
    const [user, setUser] = useState(null); // { dni, nombre }

    const login = (dni) => {
        const nombre = MOCK_NAMES[Number(dni) % MOCK_NAMES.length];
        setUser({ dni, nombre });
    };

    const logout = () => setUser(null);

    const value = useMemo(() => ({ user, login, logout }), [user]);

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
    const ctx = useContext(UserContext);
    if (!ctx) throw new Error('useUser debe usarse dentro de un <UserProvider>');
    return ctx;
}
