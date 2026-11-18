import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as FileSystem from 'expo-file-system/legacy';

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

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function decodeBase64ToArrayBuffer(base64) {
  const clean = String(base64 || '').replace(/^data:[^;]+;base64,/, '').replace(/[\r\n\s]/g, '');
  let bufferLength = clean.length * 0.75;
  if (clean.endsWith('==')) {
    bufferLength -= 2;
  } else if (clean.endsWith('=')) {
    bufferLength -= 1;
  }

  const bytes = new Uint8Array(bufferLength);
  let p = 0;

  for (let i = 0; i < clean.length; i += 4) {
    const encoded1 = BASE64_CHARS.indexOf(clean[i]);
    const encoded2 = BASE64_CHARS.indexOf(clean[i + 1]);
    const encoded3 = BASE64_CHARS.indexOf(clean[i + 2]);
    const encoded4 = BASE64_CHARS.indexOf(clean[i + 3]);

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    if (encoded3 !== -1) {
      bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    }
    if (encoded4 !== -1) {
      bytes[p++] = ((encoded3 & 3) << 6) | encoded4;
    }
  }

  return bytes.buffer;
}

/**
 * Sube una evidencia fotografica local al bucket de Supabase Storage sin sobrescribir archivos existentes.
 * @param {string} localUri URI local de la imagen capturada o seleccionada.
 * @param {string} carpeta Carpeta destino dentro del bucket.
 * @param {string} identificador Identificador base para el archivo.
 * @param {string|null} base64Opcional Contenido Base64 opcional ya capturado por ImagePicker.
 * @returns {Promise<string>} URL publica del archivo subido.
 */
export async function subirEvidenciaFotografica(localUri, carpeta, identificador, base64Opcional = null) {
  if (!localUri && !base64Opcional) {
    throw new Error('La URI local de la evidencia es requerida.');
  }

  const base64Data =
    base64Opcional ||
    (await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    }));

  if (!base64Data) {
    throw new Error('No se pudo leer el contenido Base64 de la imagen.');
  }

  const arrayBuffer = decodeBase64ToArrayBuffer(base64Data);
  const cleanUri = (localUri || 'evidencia.jpg').split('?')[0];
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
