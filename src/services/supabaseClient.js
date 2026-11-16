import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const STORAGE_BUCKET = 'evidencias-emergencias';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Sube una evidencia fotografica local al bucket de Supabase Storage sin sobrescribir archivos existentes.
 * @param {string} localUri URI local de la imagen capturada o seleccionada.
 * @param {string} carpeta Carpeta destino dentro del bucket.
 * @param {string} identificador Identificador base para el archivo.
 * @returns {Promise<string>} URL publica del archivo subido.
 */
export async function subirEvidenciaFotografica(localUri, carpeta, identificador) {
  if (!localUri) {
    throw new Error('La URI local de la evidencia es requerida.');
  }

  const response = await fetch(localUri);
  if (!response.ok) {
    throw new Error(`No se pudo leer el archivo local (${response.status}).`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const cleanUri = localUri.split('?')[0];
  const rawExt = cleanUri.includes('.') ? cleanUri.split('.').pop().toLowerCase() : 'jpg';
  const ext = rawExt || 'jpg';
  const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  const filePath = `${carpeta}/${identificador}_${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, arrayBuffer, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}
