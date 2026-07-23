import { LocalNotifications } from '@capacitor/local-notifications';
import { supabase } from '../lib/supabase';

/**
 * Super Engine for Local Push Notifications in LuminaSync.
 * Dual-layer notification engine:
 * 1. Visual In-App Toast Banner & Audio Chime (Always visible on active screen).
 * 2. Native Android OS System Tray / Notification Shade (Capacitor LocalNotifications).
 * 3. Realtime Cross-Device Synchronization via Supabase Broadcast.
 */
class NotificationService {
  constructor() {
    this.recentTriggers = new Map();
    this.isInitialized = false;
    this.initPromise = this.init();
    this.initRealtimeBroadcast();
  }

  get isCapacitor() {
    if (typeof window === 'undefined') return false;
    return !!(
      window.Capacitor?.isNativePlatform?.() ||
      window.Capacitor?.platform === 'android' ||
      window.Capacitor?.platform === 'ios' ||
      window.Capacitor?.isPluginAvailable?.('LocalNotifications')
    );
  }

  async init() {
    if (!this.isCapacitor) return;
    try {
      // 1. Create high priority notification channel for Android Control Center
      await LocalNotifications.createChannel({
        id: 'lumina_notifications',
        name: 'Notificaciones LuminaSync',
        description: 'Alertas de cultos, reuniones, servicios, poesía, sonido y campañas',
        importance: 5, // MAX High Priority for heads-up banners, sound & notification shade
        visibility: 1, // Show on lock screen and notification shade
        vibration: true,
        sound: 'default',
        lights: true,
        lightColor: '#6366F1'
      });

      // 2. Register listeners for native notifications
      LocalNotifications.addListener('localNotificationReceived', (notification) => {
        console.log('🔔 [Capacitor Native] Notification delivered to Android System Shade:', notification);
      });

      LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
        console.log('👆 [Capacitor Native] Notification tapped in Android Control Center:', action);
      });

      this.isInitialized = true;
    } catch (e) {
      console.warn('⚠️ NotificationService init warning:', e);
    }
  }

  initRealtimeBroadcast() {
    try {
      this.channel = supabase.channel('lumina_global_notifications', {
        config: { broadcast: { self: false } }
      });

      this.channel
        .on('broadcast', { event: 'notification_event' }, (payload) => {
          console.log('📡 [Realtime Broadcast Received]:', payload);
          const { id, title, body, extraData } = payload.payload || {};
          if (title) {
            this.sendLocalNotification(id, title, body, null, extraData, true);
          }
        })
        .subscribe((status) => {
          console.log('📡 Notification Realtime broadcast channel status:', status);
        });
    } catch (e) {
      console.warn('Realtime broadcast init error:', e);
    }
  }

  /**
   * Displays an In-App Toast notification banner with sound on screen.
   */
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
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 99999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 380px;
        width: calc(100vw - 40px);
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.style.cssText = `
      background: rgba(30, 41, 59, 0.95);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(99, 102, 241, 0.4);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px rgba(99, 102, 241, 0.3);
      color: #f8fafc;
      padding: 14px 16px;
      border-radius: 14px;
      pointer-events: auto;
      transform: translateY(-20px) scale(0.95);
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      gap: 12px;
      align-items: flex-start;
    `;

    toast.innerHTML = `
      <div style="background: rgba(99, 102, 241, 0.2); padding: 8px; border-radius: 10px; color: #818cf8; font-size: 1.2rem;">
        🔔
      </div>
      <div style="flex: 1;">
        <div style="font-weight: 700; font-size: 0.9rem; margin-bottom: 3px; color: #ffffff;">${title}</div>
        <div style="font-size: 0.8rem; color: #cbd5e1; line-height: 1.35;">${body}</div>
      </div>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.transform = 'translateY(0) scale(1)';
      toast.style.opacity = '1';
    });

    setTimeout(() => {
      toast.style.transform = 'translateY(-10px) scale(0.95)';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  generateNumericId(input) {
    if (typeof input === 'number' && Number.isInteger(input) && input > 0 && input <= 2147483647) {
      return input;
    }
    const str = String(input || Math.random());
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash = hash & 0x7FFFFFFF;
    }
    return (hash % 2147483640) + 1;
  }

  parseLocalDate(dateStr) {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;

    const match = String(dateStr).trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      return new Date(year, month, day, 9, 0, 0);
    }

    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
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

  async ensurePermissions() {
    if (!this.isCapacitor) return false;
    try {
      const status = await LocalNotifications.checkPermissions();
      if (status.display !== 'granted') {
        const req = await LocalNotifications.requestPermissions();
        return req.display === 'granted';
      }
      return true;
    } catch (e) {
      console.error('Error verifying permissions:', e);
      return false;
    }
  }

  async requestPermissions() {
    return await this.ensurePermissions();
  }

  async sendLocalNotification(id, title, body, scheduleDate = null, extraData = {}, isRemoteBroadcast = false) {
    // Ensure notification channel initialization completes before scheduling
    await this.initPromise;

    const numericId = this.generateNumericId(id);
    const cooldownKey = `${numericId}-${title}`;
    const now = Date.now();

    if (this.recentTriggers.has(cooldownKey) && (now - this.recentTriggers.get(cooldownKey) < 1500)) {
      return;
    }
    this.recentTriggers.set(cooldownKey, now);

    // 1. ALWAYS show In-App Toast banner for instant active session feedback
    if (!scheduleDate || scheduleDate <= new Date()) {
      this.showInAppToast(title, body);
    }

    // 2. Broadcast to other connected devices via Supabase Realtime if instant notification and not remote
    if (!isRemoteBroadcast && (!scheduleDate || scheduleDate <= new Date())) {
      if (this.channel) {
        this.channel.send({
          type: 'broadcast',
          event: 'notification_event',
          payload: { id, title, body, extraData }
        }).catch(err => console.warn('Broadcast send error:', err));
      }
    }

    // 3. Native Android / Capacitor Local Notification
    if (this.isCapacitor) {
      const hasPermission = await this.ensurePermissions();
      if (!hasPermission) {
        console.warn('⚠️ Native notification skipped: Permission denied.');
      } else {
        try {
          const triggerTime = (scheduleDate && scheduleDate > new Date())
            ? scheduleDate
            : new Date(Date.now() + 1000);

          await LocalNotifications.schedule({
            notifications: [
              {
                id: numericId,
                title: title,
                body: body,
                channelId: 'lumina_notifications',
                smallIcon: 'ic_stat_notification',
                schedule: {
                  at: triggerTime,
                  allowWhileIdle: true
                },
                extra: extraData
              }
            ]
          });
          console.log(`📱 [Capacitor Native] Notification scheduled for ${triggerTime.toLocaleTimeString()} (ID: ${numericId}): "${title}"`);
        } catch (err) {
          console.error('❌ Error scheduling Capacitor local notification:', err);
        }
      }
    }

    // 4. Web Browser Native Notification
    if (typeof window !== 'undefined' && 'Notification' in window) {
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

  async syncAllLocalNotifications(currentUser, services = [], members = [], templates = [], users = []) {
    if (!this.isCapacitor) {
      console.log('ℹ️ Local notification sync skipped: not running on Capacitor native platform.');
      return { scheduledCount: 0, status: 'skipped_web' };
    }

    try {
      const hasPermission = await this.ensurePermissions();
      if (!hasPermission) {
        console.warn('⚠️ Notifications permission denied by user.');
        return { scheduledCount: 0, status: 'permission_denied' };
      }

      try {
        const pending = await LocalNotifications.getPending();
        if (pending && pending.notifications && pending.notifications.length > 0) {
          await LocalNotifications.cancel({ notifications: pending.notifications });
          console.log(`🧹 Cleared ${pending.notifications.length} previously scheduled notifications.`);
        }
      } catch (cleanErr) {
        console.warn('Warning clearing pending notifications:', cleanErr);
      }

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
          smallIcon: 'ic_stat_notification',
          extra: extraData
        });
      };

      // --- A. SCHEDULE BIRTHDAYS (1 week before & same day) ---
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

      // --- B. SCHEDULE SERVICES, MEETINGS & CAMPAIGNS (Next 30 days) ---
      const activeUserFullName = currentUser?.username?.toLowerCase().trim() || '';
      const userMemberships = currentUser?.memberships?.map(m => m.fullName?.toLowerCase().trim()).filter(Boolean) || [];

      const isUserMatch = (name) => {
        if (!name) return false;
        const normalized = name.toLowerCase().trim();
        return normalized === activeUserFullName || userMemberships.includes(normalized);
      };

      for (const service of services) {
        const dateStr = service.serviceDate || service.service_date || '';
        if (!dateStr) continue;

        const parsedSrvDate = this.parseLocalDate(dateStr);
        if (!parsedSrvDate) continue;

        const daysDifference = (parsedSrvDate.getTime() - today.getTime()) / (1000 * 3600 * 24);
        if (daysDifference < -1 || daysDifference > 30) continue;

        const template = templates.find(t => t.id === service.templateId);
        const templateName = template?.name || 'Servicio';

        const rawServiceType = service.serviceType || service.service_type || 'Servicio';
        let serviceType = rawServiceType;
        let isFinished = false;
        try {
          const parsed = JSON.parse(rawServiceType);
          if (parsed && typeof parsed === 'object') {
            if (parsed.type !== undefined) serviceType = parsed.type;
            if (parsed.isFinished) isFinished = true;
          }
        } catch (e) {}

        if (isFinished) continue;

        const rawProgram = service.program || '';
        let program = rawProgram;
        try {
          const parsed = JSON.parse(rawProgram);
          if (parsed && typeof parsed === 'object') {
            program = parsed.notes || '';
          }
        } catch (e) {}

        const isUserAssigned = isUserMatch(service.memberName) ||
          service.assignedMembers?.some(m => isUserMatch(m.name));

        const lowerType = serviceType.toLowerCase();
        const lowerProgram = program.toLowerCase();
        const isCampaign = lowerType.includes('campaña') || lowerType.includes('campana') || lowerProgram.includes('campaña') || lowerProgram.includes('campana');
        const isRehearsal = lowerType.includes('ensayo') || lowerType.includes('ensayos') || lowerType.includes('practica') || lowerType.includes('práctica');
        const isOuting = !isRehearsal && (lowerType.includes('salida') || lowerType.includes('salidas'));

        const serviceKey = `srv_${service.id || Math.random()}`;

        let title = '';
        let body = '';

        if (isUserAssigned) {
          title = `📋 Tu Servicio: ${serviceType}`;
          body = `Tienes servicio asignado en "${templateName}". Tarea: ${program || 'Servicio General'}.`;
        } else if (isCampaign) {
          title = `🔥 ¡Campaña Congregacional!`;
          body = `Campaña "${serviceType}" en "${templateName}". Detalles: ${program || '¡Participa con nosotros!'}`;
        } else if (isRehearsal) {
          title = `📢 Ensayo Programado`;
          body = `Ensayo "${serviceType}" en "${templateName}". ${program ? `Detalles: ${program}` : ''}`;
        } else if (isOuting) {
          title = `🚌 Salida Programada`;
          body = `Salida "${serviceType}" en "${templateName}". ${program ? `Detalles: ${program}` : ''}`;
        } else {
          title = `📅 Servicio Programado`;
          body = `Servicio "${templateName}" (${serviceType}). Tarea: ${program || 'Servicio Congregacional'}`;
        }

        const oneDayBefore = new Date(parsedSrvDate.getTime() - 24 * 60 * 60 * 1000);
        oneDayBefore.setHours(9, 0, 0, 0);
        if (oneDayBefore > today) {
          queueNotification(
            `${serviceKey}_1d`,
            `⏰ Mañana: ${title}`,
            body,
            oneDayBefore,
            { type: 'service_reminder_1day', serviceId: service.id }
          );
        }

        const sameDayMorning = new Date(parsedSrvDate);
        sameDayMorning.setHours(9, 0, 0, 0);
        if (sameDayMorning > today) {
          queueNotification(
            `${serviceKey}_today`,
            `⚡ Hoy: ${title}`,
            body,
            sameDayMorning,
            { type: 'service_reminder_today', serviceId: service.id }
          );
        }
      }

      const batchToSchedule = notificationsToSchedule.slice(0, 50);
      if (batchToSchedule.length > 0) {
        await LocalNotifications.schedule({
          notifications: batchToSchedule
        });
        console.log(`🚀 Successfully pre-scheduled ${batchToSchedule.length} local alarms in Android Notification Center.`);
      }

      return { scheduledCount: batchToSchedule.length, status: 'success' };
    } catch (err) {
      console.error('❌ Failed to synchronize local notifications:', err);
      return { scheduledCount: 0, status: 'error', error: err.message };
    }
  }

  // --- 🔄 METODOS DE COMPATIBILIDAD Y DIFUSION REALTIME ---
  async notifyProgramCreated(title, content) {
    await this.sendLocalNotification(
      `prog_${Date.now()}_${Math.random()}`,
      `📋 Nuevo Programa Registrado`,
      `Programa: "${title}". ${content ? `Detalles: ${content}` : ''}`,
      null,
      { type: 'program_created' }
    );
  }

  async notifyKickedFromTemplate(templateName) {
    await this.sendLocalNotification(
      `kick_${Date.now()}_${Math.random()}`,
      `⚠️ Cambio de Acceso en Plantilla`,
      `Ya no formas parte de la plantilla "${templateName}".`,
      null,
      { type: 'kicked_from_template' }
    );
  }

  async notifyRehearsalOrOutingCreated(title, details, isOuting = false) {
    await this.sendLocalNotification(
      `reh_out_${Date.now()}_${Math.random()}`,
      isOuting ? `🚌 Nueva Salida Programada` : `🎼 Nuevo Ensayo Programado`,
      `"${title}". ${details ? `Detalles: ${details}` : ''}`,
      null,
      { type: isOuting ? 'outing_created' : 'rehearsal_created' }
    );
  }

  async notifyCampaignOrAssignment({ serviceDate, assignedMembers = [], serviceType = '', program = '', isCampaign = false }) {
    let title = isCampaign ? `🔥 ¡Nueva Campaña Programada!` : `📋 Nuevo Servicio Asignado`;
    let body = `${serviceType ? `Tipo: "${serviceType}". ` : ''}${serviceDate ? `Fecha: ${serviceDate}. ` : ''}${program ? `Programa: ${program}` : ''}`;

    await this.sendLocalNotification(
      `camp_assign_${Date.now()}_${Math.random()}`,
      title,
      body,
      null,
      { type: isCampaign ? 'campaign_created' : 'service_assigned' }
    );
  }

  // --- 🎭 NOTIFICACIONES DE POESÍA ---
  async notifyPoetryAdded(title, author) {
    await this.sendLocalNotification(
      `poem_${Date.now()}_${Math.random()}`,
      `📖 Nueva Poesía Registrada`,
      `Se ha añadido "${title}" (Autor/Recitador: ${author || 'Anónimo'}) a la biblioteca de poesía.`,
      null,
      { type: 'poetry_added' }
    );
  }

  async notifyPoetryOutingCreated(title, details, date) {
    await this.sendLocalNotification(
      `poetry_outing_${Date.now()}_${Math.random()}`,
      `🚌 Nueva Salida de Poesía`,
      `Salida: "${title}". ${date ? `Fecha: ${date}. ` : ''}${details ? `Detalles: ${details}` : ''}`,
      null,
      { type: 'poetry_outing_created' }
    );
  }

  async notifyPoetryProgramCreated(title, content) {
    await this.sendLocalNotification(
      `poetry_prog_${Date.now()}_${Math.random()}`,
      `📋 Nuevo Programa de Poesía`,
      `Programa: "${title}". Ver detalles en la app.`,
      null,
      { type: 'poetry_program_created' }
    );
  }

  async notifyPoetryRehearsalCreated(details, date) {
    await this.sendLocalNotification(
      `poetry_reh_${Date.now()}_${Math.random()}`,
      `🎼 Nuevo Ensayo / Reunión de Poesía`,
      `Ensayo: "${details}". ${date ? `Fecha: ${date}` : ''}`,
      null,
      { type: 'poetry_rehearsal_created' }
    );
  }

  async notifyPoetryCampaignCreated(title, date, details) {
    await this.sendLocalNotification(
      `poetry_camp_${Date.now()}_${Math.random()}`,
      `🔥 Nueva Campaña de Poesía`,
      `Campaña: "${title}". Fecha: ${date}. ${details ? `Detalles: ${details}` : ''}`,
      null,
      { type: 'poetry_campaign_created' }
    );
  }

  // --- ⛪ NOTIFICACIONES DE DIÁCONOS ---
  async notifyPrayerRequestCreated(memberName) {
    await this.sendLocalNotification(
      `prayer_${Date.now()}_${Math.random()}`,
      `🙏 Nueva Petición de Oración`,
      `Se solicita oración por ${memberName}. ¡Oremos juntos!`,
      null,
      { type: 'prayer_request_created' }
    );
  }

  async notifyDiaconosServiceCreated(memberName, serviceType, serviceDate) {
    await this.sendLocalNotification(
      `diaconos_srv_${Date.now()}_${Math.random()}`,
      `🗓️ Cronograma de Cultos`,
      `Culto asignado a ${memberName}. Función: "${serviceType}". Fecha: ${serviceDate}.`,
      null,
      { type: 'diaconos_service_created' }
    );
  }

  async notifyDiaconosCampaignCreated(title, date, details) {
    await this.sendLocalNotification(
      `diaconos_camp_${Date.now()}_${Math.random()}`,
      `🔥 Nueva Campaña de Diaconado`,
      `Campaña: "${title}". Fecha: ${date}. ${details ? `Detalles: ${details}` : ''}`,
      null,
      { type: 'diaconos_campaign_created' }
    );
  }

  async notifyDiaconosProgramCreated(title, content) {
    await this.sendLocalNotification(
      `diaconos_prog_${Date.now()}_${Math.random()}`,
      `📋 Nuevo Programa de Diáconos`,
      `Programa: "${title}". Ver detalles en la app.`,
      null,
      { type: 'diaconos_program_created' }
    );
  }

  async notifyDiaconosMeetingCreated(details, date) {
    await this.sendLocalNotification(
      `diaconos_meet_${Date.now()}_${Math.random()}`,
      `🤝 Nueva Reunión de Diáconos`,
      `Reunión de personal: "${details}". ${date ? `Fecha: ${date}` : ''}`,
      null,
      { type: 'diaconos_meeting_created' }
    );
  }

  // --- 🔊 NOTIFICACIONES DE SONIDO ---
  async notifySonidoTurnoCreated(memberName, soundRole, date) {
    await this.sendLocalNotification(
      `sonido_turno_${Date.now()}_${Math.random()}`,
      `🎛️ Nuevo Turno de Sonido`,
      `Turno asignado a ${memberName} en consola (${soundRole || 'Audio'}). Fecha: ${date}.`,
      null,
      { type: 'sonido_turno_created' }
    );
  }

  async notifySonidoCampaignCreated(title, date, details) {
    await this.sendLocalNotification(
      `sonido_camp_${Date.now()}_${Math.random()}`,
      `🔥 Nueva Campaña de Sonido`,
      `Campaña: "${title}". Fecha: ${date}. ${details ? `Detalles: ${details}` : ''}`,
      null,
      { type: 'sonido_campaign_created' }
    );
  }

  async notifySonidoProgramCreated(title, content) {
    await this.sendLocalNotification(
      `sonido_prog_${Date.now()}_${Math.random()}`,
      `📋 Nuevo Programa de Equipo de Sonido`,
      `Programa: "${title}". Ver detalles en la app.`,
      null,
      { type: 'sonido_program_created' }
    );
  }

  async notifySonidoMeetingCreated(details, date) {
    await this.sendLocalNotification(
      `sonido_meet_${Date.now()}_${Math.random()}`,
      `🤝 Nueva Reunión de Equipo de Sonido`,
      `Reunión técnica: "${details}". ${date ? `Fecha: ${date}` : ''}`,
      null,
      { type: 'sonido_meeting_created' }
    );
  }
}

export const notificationService = new NotificationService();
export default notificationService;
