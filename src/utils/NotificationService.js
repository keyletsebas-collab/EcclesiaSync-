import { LocalNotifications } from '@capacitor/local-notifications';
import { supabase } from '../lib/supabase';

/**
 * Motor de Notificaciones LuminaSync
 * Maneja alertas locales, canales de alta prioridad en Android 12+
 * y suscripciones Realtime a nichos en PostgreSQL (Supabase).
 */
class NotificationService {
  constructor() {
    this.recentTriggers = new Map();
    this.isInitialized = false;
    this.initPromise = this.init();
    this.realtimeSubscriptions = new Map();
    this.initRealtimeBroadcast();
  }

  get isCapacitor() {
    if (typeof window === 'undefined') return false;
    return !!(
      window.Capacitor?.isNativePlatform?.() ||
      window.Capacitor?.platform === 'android' ||
      window.Capacitor?.platform === 'ios'
    );
  }

  async init() {
    if (!this.isCapacitor) return;

    try {
      // 1. Crear canal de alta prioridad para la persiana de Android
      await LocalNotifications.createChannel({
        id: 'lumina_notifications',
        name: 'Notificaciones LuminaSync',
        description: 'Alertas de cultos, reuniones, servicios, poesía, sonido y campañas',
        importance: 5, // MAX High Priority
        visibility: 1, // Muestra en pantalla de bloqueo
        vibration: true,
        sound: 'default',
        lights: true,
        lightColor: '#6366F1'
      });

      // 2. Registrar Listeners
      LocalNotifications.addListener('localNotificationReceived', (notification) => {
        console.log('🔔 [Android Control Center] Notificación recibida:', notification);
      });

      LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
        console.log('👆 [Android Control Center] Notificación pulsada:', action);
      });

      this.isInitialized = true;
    } catch (e) {
      console.warn('⚠️ Error al inicializar canales nativos:', e);
    }
  }

  generateNumericId(input) {
    if (typeof input === 'number' && Number.isInteger(input) && input > 0 && input <= 2147483647) {
      return input;
    }
    const str = String(input || Math.random());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash % 2147483640) + 1;
  }

  parseLocalDate(dateStr) {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;

    const str = String(dateStr).trim();
    const match = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      return new Date(year, month, day, 9, 0, 0);
    }

    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  async ensurePermissions() {
    if (this.isCapacitor) {
      try {
        const status = await LocalNotifications.checkPermissions();
        if (status.display !== 'granted') {
          const req = await LocalNotifications.requestPermissions();
          return req.display === 'granted';
        }
        return true;
      } catch (e) {
        console.error('Error al verificar permisos:', e);
        return false;
      }
    } else if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        if (Notification.permission !== 'granted') {
          const res = await Notification.requestPermission();
          return res === 'granted';
        }
        return true;
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  async checkPermissionStatus() {
    if (this.isCapacitor) {
      try {
        const status = await LocalNotifications.checkPermissions();
        return status.display;
      } catch (e) {
        return 'unsupported';
      }
    } else if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  }

  async requestPermissions() {
    return await this.ensurePermissions();
  }

  showInAppToast(title, body) {
    if (typeof document === 'undefined') return;

    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {}

    let container = document.getElementById('lumina-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'lumina-toast-container';
      container.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 99999;
        display: flex; flex-direction: column; gap: 10px; max-width: 380px;
        width: calc(100vw - 40px); pointer-events: none;
      `;
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.style.cssText = `
      background: rgba(30, 41, 59, 0.95); backdrop-filter: blur(12px);
      border: 1px solid rgba(99, 102, 241, 0.4); color: #f8fafc; padding: 14px 16px;
      border-radius: 14px; pointer-events: auto; opacity: 0; transition: all 0.3s ease;
      display: flex; gap: 12px; align-items: flex-start;
    `;
    toast.innerHTML = `
      <div style="background: rgba(99, 102, 241, 0.2); padding: 8px; border-radius: 10px; color: #818cf8; font-size: 1.2rem;">🔔</div>
      <div style="flex: 1;">
        <div style="font-weight: 700; color: #fff; margin-bottom: 3px;">${title}</div>
        <div style="font-size: 0.8rem; color: #cbd5e1; line-height: 1.35;">${body}</div>
      </div>
    `;
    container.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 4000);
  }

  async sendLocalNotification(id, title, body, scheduleDate = null, extraData = {}, isRemoteBroadcast = false) {
    await this.initPromise;

    const numericId = this.generateNumericId(id);
    const cooldownKey = `${numericId}-${title}`;
    const now = Date.now();

    if (this.recentTriggers.has(cooldownKey) && (now - this.recentTriggers.get(cooldownKey) < 1000)) {
      return;
    }
    this.recentTriggers.set(cooldownKey, now);

    // 1. Mostrar Toast flotante In-App
    if (!scheduleDate || scheduleDate <= new Date()) {
      this.showInAppToast(title, body);
    }

    // 2. Broadcast a otros dispositivos vía Supabase Realtime si es inmediata y no remota
    if (!isRemoteBroadcast && (!scheduleDate || scheduleDate <= new Date())) {
      if (this.channel) {
        this.channel.send({
          type: 'broadcast',
          event: 'notification_event',
          payload: { id, title, body, extraData }
        }).catch(err => console.warn('Broadcast send error:', err));
      }
    }

    // 3. Enviar a la Persiana / Panel de Control de Android
    if (this.isCapacitor) {
      const hasPermission = await this.ensurePermissions();
      if (!hasPermission) {
        console.warn('⚠️ Permisos de notificación denegados en Android.');
        return;
      }

      try {
        const notifPayload = {
          id: numericId,
          title: title,
          body: body,
          channelId: 'lumina_notifications',
          smallIcon: 'ic_launcher', // Usa el ícono estándar del paquete APK
          iconColor: '#6366F1',
          extra: extraData
        };

        // SI ES FUTURA: usa schedule. SI ES INMEDIATA: omite schedule para no requerir AlarmManager en Android 12+
        if (scheduleDate && new Date(scheduleDate) > new Date()) {
          notifPayload.schedule = {
            at: new Date(scheduleDate),
            allowWhileIdle: true
          };
        }

        await LocalNotifications.schedule({
          notifications: [notifPayload]
        });

        console.log(`✅ [Android] Notificación enviada al panel: "${title}"`);
      } catch (err) {
        console.error('❌ Error agendando en la persiana de Android:', err);
      }
    } else if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        if (Notification.permission === 'granted') {
          if (!scheduleDate || scheduleDate <= new Date()) {
            new Notification(title, { body, icon: '/logo.png', data: extraData });
          }
        }
      } catch (err) {
        console.error('❌ Error showing Web Notification:', err);
      }
    }
  }

  // Método de prueba instantáneo para el Panel de Control
  async testAndroidNotification() {
    await this.sendLocalNotification(
      `test_${Date.now()}`,
      `🔔 PRUEBA LUMINA SYNC`,
      `Si ves este mensaje en la persiana superior, las notificaciones funcionan correctamente.`,
      null,
      { type: 'test' }
    );
  }

  initRealtimeBroadcast() {
    // Desactivado: las notificaciones en tiempo real son gestionadas por StorageContext respetando permisos de plantilla y cuenta.
  }

  subscribeToNicheTable(tableName, titlePrefix, getBodyFn) {
    // Desactivado en favor del filtrado por plantilla en StorageContext
  }

  listenToAllNiches() {
    // Desactivado: las notificaciones son filtradas por pertenencia a plantilla en StorageContext
  }

  async syncAllLocalNotifications(currentUser, services = [], members = [], templates = [], users = []) {
    if (!this.isCapacitor) {
      return { scheduledCount: 0, status: 'skipped_web' };
    }

    try {
      const hasPermission = await this.ensurePermissions();
      if (!hasPermission) {
        return { scheduledCount: 0, status: 'permission_denied' };
      }

      try {
        const pending = await LocalNotifications.getPending();
        if (pending && pending.notifications && pending.notifications.length > 0) {
          await LocalNotifications.cancel({ notifications: pending.notifications });
        }
      } catch (cleanErr) {}

      const today = new Date();
      const notificationsToSchedule = [];

      const queueNotification = (rawId, title, body, scheduleDate, extraData) => {
        if (!scheduleDate || scheduleDate <= today) return;
        const numericId = this.generateNumericId(rawId);
        notificationsToSchedule.push({
          id: numericId,
          title: title,
          body: body,
          schedule: { at: scheduleDate, allowWhileIdle: true },
          channelId: 'lumina_notifications',
          smallIcon: 'ic_launcher',
          iconColor: '#6366F1',
          extra: extraData
        });
      };

      const currentYear = today.getFullYear();
      const people = [
        ...users.map(u => ({
          name: u.memberships?.[0]?.fullName || u.username || u.name,
          birthday: u.birthday,
          id: u.uid
        })),
        ...members.map(m => ({
          name: m.name,
          birthday: m.birthday || m.identifications?.birthday,
          id: m.id
        }))
      ].filter(p => p.birthday && p.name);

      const uniquePeople = Array.from(new Map(people.map(p => [p.name.toLowerCase().trim(), p])).values());

      for (const person of uniquePeople) {
        const parsedBday = this.parseLocalDate(person.birthday);
        if (!parsedBday) continue;

        let bdayThisYear = new Date(currentYear, parsedBday.getMonth(), parsedBday.getDate(), 9, 0, 0);
        if (bdayThisYear < today) {
          bdayThisYear = new Date(currentYear + 1, parsedBday.getMonth(), parsedBday.getDate(), 9, 0, 0);
        }

        const bdayMinus7 = new Date(bdayThisYear.getTime() - 7 * 24 * 60 * 60 * 1000);
        bdayMinus7.setHours(9, 0, 0, 0);
        const baseKey = `bday_${person.name}`;

        if (bdayMinus7 > today) {
          const formattedDate = bdayThisYear.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
          queueNotification(
            `${baseKey}_7d`,
            `🎉 Próximo Cumpleaños: ${person.name}`,
            `¡En 1 semana es el cumpleaños de ${person.name}! (${formattedDate}). ¡Prepara tus felicitaciones!`,
            bdayMinus7,
            { type: 'birthday_week_notice', personName: person.name }
          );
        }

        if (bdayThisYear > today) {
          queueNotification(
            `${baseKey}_today`,
            `🎂 ¡Hoy es el Cumpleaños de ${person.name}!`,
            `Demos gracias a Dios por la vida de ${person.name} en su día especial. ¡Felicitaciones!`,
            bdayThisYear,
            { type: 'birthday_today', personName: person.name }
          );
        }
      }

      const batchToSchedule = notificationsToSchedule.slice(0, 50);
      if (batchToSchedule.length > 0) {
        await LocalNotifications.schedule({ notifications: batchToSchedule });
      }

      return { scheduledCount: batchToSchedule.length, status: 'success' };
    } catch (err) {
      console.error('Failed to sync local notifications:', err);
      return { scheduledCount: 0, status: 'error', error: err.message };
    }
  }

  // --- MÉTODOS DE CADA NICHO ---
  async notifyPoetryAdded(title, author) {
    await this.sendLocalNotification(
      `poem_${Date.now()}`,
      `📖 Nueva Poesía Registrada`,
      `"${title}" por ${author || 'Anónimo'}`,
      null,
      { type: 'poetry' }
    );
  }

  async notifyPoetryOutingCreated(title, details, date) {
    await this.sendLocalNotification(`poetry_outing_${Date.now()}`, `🚌 Nueva Salida de Poesía`, `Salida: "${title}". ${date ? `Fecha: ${date}. ` : ''}${details ? `Detalles: ${details}` : ''}`, null, { type: 'poetry_outing_created' });
  }

  async notifyPoetryProgramCreated(title, content) {
    await this.sendLocalNotification(`poetry_prog_${Date.now()}`, `📋 Nuevo Programa de Poesía`, `Programa: "${title}". Ver detalles en la app.`, null, { type: 'poetry_program_created' });
  }

  async notifyPoetryRehearsalCreated(details, date) {
    await this.sendLocalNotification(`poetry_reh_${Date.now()}`, `🎼 Nuevo Ensayo / Reunión de Poesía`, `Ensayo: "${details}". ${date ? `Fecha: ${date}` : ''}`, null, { type: 'poetry_rehearsal_created' });
  }

  async notifyPoetryCampaignCreated(title, date, details) {
    await this.sendLocalNotification(`poetry_camp_${Date.now()}`, `🔥 Nueva Campaña de Poesía`, `Campaña: "${title}". Fecha: ${date}. ${details ? `Detalles: ${details}` : ''}`, null, { type: 'poetry_campaign_created' });
  }

  async notifyPrayerRequestCreated(memberName) {
    await this.sendLocalNotification(`prayer_${Date.now()}`, `🙏 Nueva Petición de Oración`, `Se solicita oración por ${memberName}. ¡Oremos juntos!`, null, { type: 'prayer_request_created' });
  }

  async notifyDiaconosServiceCreated(memberName, serviceType, serviceDate) {
    await this.sendLocalNotification(
      `diac_${Date.now()}`,
      `⛪ Nuevo Culto / Servicio`,
      `Asignado: ${memberName || 'Hermano(a)'} | Servicio: ${serviceType || 'General'} (${serviceDate || 'Próximamente'})`,
      null,
      { type: 'diaconos' }
    );
  }

  async notifyDiaconosCampaignCreated(title, date, details) {
    await this.sendLocalNotification(`diaconos_camp_${Date.now()}`, `🔥 Nueva Campaña de Diaconado`, `Campaña: "${title}". Fecha: ${date}. ${details ? `Detalles: ${details}` : ''}`, null, { type: 'diaconos_campaign_created' });
  }

  async notifyDiaconosProgramCreated(title, content) {
    await this.sendLocalNotification(`diaconos_prog_${Date.now()}`, `📋 Nuevo Programa de Diáconos`, `Programa: "${title}". Ver detalles en la app.`, null, { type: 'diaconos_program_created' });
  }

  async notifyDiaconosMeetingCreated(details, date) {
    await this.sendLocalNotification(`diaconos_meet_${Date.now()}`, `🤝 Nueva Reunión de Diáconos`, `Reunión de personal: "${details}". ${date ? `Fecha: ${date}` : ''}`, null, { type: 'diaconos_meeting_created' });
  }

  async notifySonidoTurnoCreated(memberName, soundRole, date) {
    await this.sendLocalNotification(
      `sonido_${Date.now()}`,
      `🎛️ Nuevo Turno de Sonido`,
      `Técnico: ${memberName || 'Asignado'} | Rol: ${soundRole || 'Consola'} (${date || 'Próximamente'})`,
      null,
      { type: 'sonido' }
    );
  }

  async notifySonidoCampaignCreated(title, date, details) {
    await this.sendLocalNotification(`sonido_camp_${Date.now()}`, `🔥 Nueva Campaña de Sonido`, `Campaña: "${title}". Fecha: ${date}. ${details ? `Detalles: ${details}` : ''}`, null, { type: 'sonido_campaign_created' });
  }

  async notifySonidoProgramCreated(title, content) {
    await this.sendLocalNotification(`sonido_prog_${Date.now()}`, `📋 Nuevo Programa de Equipo de Sonido`, `Programa: "${title}". Ver detalles en la app.`, null, { type: 'sonido_program_created' });
  }

  async notifySonidoMeetingCreated(details, date) {
    await this.sendLocalNotification(`sonido_meet_${Date.now()}`, `🤝 Nueva Reunión de Equipo de Sonido`, `Reunión técnica: "${details}". ${date ? `Fecha: ${date}` : ''}`, null, { type: 'sonido_meeting_created' });
  }

  async notifyMeetingCreated(title, date, nicheName = 'General') {
    await this.sendLocalNotification(
      `meet_${Date.now()}`,
      `🤝 Nueva Reunión (${nicheName})`,
      `${title} - Fecha: ${date || 'Por confirmar'}`,
      null,
      { type: 'meeting' }
    );
  }

  async notifyProgramCreated(title, content) {
    await this.sendLocalNotification(`prog_${Date.now()}`, `📋 Nuevo Programa Registrado`, `Programa: "${title}". ${content ? `Detalles: ${content}` : ''}`, null, { type: 'program_created' });
  }

  async notifyRehearsalOrOutingCreated(title, details, isOuting = false) {
    await this.sendLocalNotification(`reh_out_${Date.now()}`, isOuting ? `🚌 Nueva Salida Programada` : `🎼 Nuevo Ensayo Programado`, `"${title}". ${details ? `Detalles: ${details}` : ''}`, null, { type: isOuting ? 'outing_created' : 'rehearsal_created' });
  }

  async notifyCampaignOrAssignment({ serviceDate, assignedMembers = [], serviceType = '', program = '', isCampaign = false }) {
    let title = isCampaign ? `🔥 ¡Nueva Campaña Programada!` : `📋 Nuevo Servicio Asignado`;
    let body = `${serviceType ? `Tipo: "${serviceType}". ` : ''}${serviceDate ? `Fecha: ${serviceDate}. ` : ''}${program ? `Programa: ${program}` : ''}`;
    await this.sendLocalNotification(`camp_assign_${Date.now()}`, title, body, null, { type: isCampaign ? 'campaign_created' : 'service_assigned' });
  }
}

export const notificationService = new NotificationService();
export default notificationService;
