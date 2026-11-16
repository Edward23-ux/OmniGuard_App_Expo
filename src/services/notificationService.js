import { Alert, Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

export const ANDROID_CHANNEL_ID = 'omniguard-emergencias-alta';
const isExpoGo = Constants.appOwnership === 'expo';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Configura el canal de notificaciones en Android y solicita permisos en tiempo de ejecucion.
 * @returns {Promise<boolean>} true si el permiso fue concedido, false en caso contrario.
 */
export async function inicializarNotificacionesNativas() {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: 'Alertas de Emergencia OmniGuard',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 300, 200, 300],
        lightColor: '#EF3B4E',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      Alert.alert(
        'Permiso de notificaciones requerido',
        'OmniGuard necesita permisos de notificaciones para alertarte sobre emergencias en tiempo real. Puedes habilitarlos desde la configuracion del dispositivo.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Abrir configuracion',
            onPress: () => Linking.openSettings(),
          },
        ]
      );
      return false;
    }

    return true;
  } catch (error) {
    if (!isExpoGo) {
      console.warn('[notificationService] Error al inicializar notificaciones:', error);
    }
    return false;
  }
}

/**
 * Dispara una notificacion local inmediata en el canal de emergencias configurado.
 * @param {string} titulo Titulo de la notificacion.
 * @param {string} cuerpo Mensaje principal de la notificacion.
 * @param {Record<string, unknown>} data Datos adicionales adjuntos a la notificacion.
 * @returns {Promise<string|null>} Identificador de la notificacion programada o null si falla.
 */
export async function dispararNotificacionLocal(titulo, cuerpo, data = {}) {
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: titulo,
        body: cuerpo,
        data,
        sound: true,
      },
      trigger: Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : null,
    });
  } catch (error) {
    console.warn('[notificationService] No se pudo disparar notificacion local:', error);
    return null;
  }
}
