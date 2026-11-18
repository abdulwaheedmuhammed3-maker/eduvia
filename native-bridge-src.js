import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { LocalNotifications } from '@capacitor/local-notifications';

const isNative = Capacitor.isNativePlatform();
const CAMERA_TARGET_KEY = 'eduvia-camera-target-v1';
const TEST_NOTIFICATION_ID = 2147480000;
const MAX_LOCAL_REMINDERS = 300;
const CHANNEL_ID = 'eduvia-study-alerts';

if (isNative) document.documentElement.classList.add('native-app');

function hashedId(value, used) {
  let hash = 2166136261;
  for (const char of String(value)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  let result = 1 + ((hash >>> 0) % (TEST_NOTIFICATION_ID - 1));
  while (used.has(result)) result = result === TEST_NOTIFICATION_ID - 1 ? 1 : result + 1;
  used.add(result);
  return result;
}

async function createReminderChannel() {
  await LocalNotifications.createChannel({
    id: CHANNEL_ID,
    name: 'Eduvia study reminders',
    description: 'Class and study session alerts',
    importance: 5,
    sound: 'eduvia_beep',
    vibration: true
  });
}

async function clearPendingNotifications() {
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length) {
    await LocalNotifications.cancel({ notifications: pending.notifications.map(({ id }) => ({ id })) });
  }
}

function toNativeNotifications(reminders) {
  const used = new Set([TEST_NOTIFICATION_ID]);
  return reminders
    .filter(item => Number.isFinite(Number(item.fireAt)) && Number(item.fireAt) > Date.now())
    .sort((a, b) => Number(a.fireAt) - Number(b.fireAt))
    .slice(0, MAX_LOCAL_REMINDERS)
    .map(item => ({
      id: hashedId(item.id, used),
      title: String(item.title).slice(0, 100),
      body: String(item.body).slice(0, 220),
      schedule: { at: new Date(Number(item.fireAt)), allowWhileIdle: true },
      channelId: CHANNEL_ID,
      extra: { source: 'eduvia', reminderId: String(item.id) }
    }));
}

async function notificationAccess(request = false) {
  let display = (await LocalNotifications.checkPermissions()).display;
  if (display !== 'granted' && request) display = (await LocalNotifications.requestPermissions()).display;
  let exact = (await LocalNotifications.checkExactNotificationSetting()).exact_alarm;
  if (exact !== 'granted' && request) exact = (await LocalNotifications.changeExactNotificationSetting()).exact_alarm;
  return { display, exact };
}

async function scheduleReminders(reminders) {
  const access = await notificationAccess();
  if (access.display !== 'granted') return { enabled: false, reason: 'notifications' };
  if (access.exact !== 'granted') return { enabled: false, reason: 'exact-alarm' };
  await createReminderChannel();
  await clearPendingNotifications();
  const notifications = toNativeNotifications(reminders);
  if (notifications.length) await LocalNotifications.schedule({ notifications });
  return { enabled: true, scheduled: notifications.length, truncated: reminders.length > notifications.length };
}

async function photoToFile(photo) {
  if (!photo?.dataUrl) throw new Error('Eduvia could not read the photo. Try taking it again.');
  const response = await fetch(photo.dataUrl);
  const blob = await response.blob();
  const type = blob.type || 'image/jpeg';
  const ext = type.includes('png') ? 'png' : 'jpg';
  return new File([blob], `eduvia-photo-${Date.now()}.${ext}`, { type });
}

const EduviaNative = {
  isNative,

  async enableAlerts(reminders) {
    const access = await notificationAccess(true);
    if (access.display !== 'granted') return { enabled: false, reason: 'notifications' };
    if (access.exact !== 'granted') return { enabled: false, reason: 'exact-alarm' };
    const result = await scheduleReminders(reminders);
    if (!result.enabled) return result;
    await LocalNotifications.schedule({ notifications: [{
      id: TEST_NOTIFICATION_ID,
      title: 'Eduvia alerts are on',
      body: 'Class and study reminders will appear on this phone.',
      schedule: { at: new Date(Date.now() + 2000), allowWhileIdle: true },
      channelId: CHANNEL_ID
    }] });
    return result;
  },

  scheduleReminders,

  async disableAlerts() {
    await clearPendingNotifications();
  },

  async capturePhoto(target = 'document') {
    if (!isNative) throw new Error('Take a photo is available in the Eduvia Android app.');
    const permissions = await Camera.checkPermissions();
    const camera = permissions.camera === 'granted'
      ? permissions
      : await Camera.requestPermissions({ permissions: ['camera'] });
    if (camera.camera !== 'granted') throw new Error('Allow camera access in your phone settings, then try again.');
    localStorage.setItem(CAMERA_TARGET_KEY, target);
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        correctOrientation: true,
        width: 2400,
        height: 2400,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });
      const file = await photoToFile(photo);
      localStorage.removeItem(CAMERA_TARGET_KEY);
      return file;
    } catch (error) {
      localStorage.removeItem(CAMERA_TARGET_KEY);
      throw error;
    }
  }
};

window.EduviaNative = EduviaNative;

if (isNative) {
  App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) window.dispatchEvent(new Event('eduvia-native-resume'));
  });
  App.addListener('appRestoredResult', async result => {
    if (result.pluginId !== 'Camera' || result.methodName !== 'getPhoto' || !result.success || !result.data?.dataUrl) return;
    const target = localStorage.getItem(CAMERA_TARGET_KEY) || 'document';
    localStorage.removeItem(CAMERA_TARGET_KEY);
    try {
      const file = await photoToFile(result.data);
      window.setTimeout(() => window.dispatchEvent(new CustomEvent('eduvia-camera-file', { detail: { file, target } })), 500);
    } catch (error) {
      window.setTimeout(() => window.dispatchEvent(new CustomEvent('eduvia-camera-error', { detail: { message: error.message } })), 500);
    }
  });
}
