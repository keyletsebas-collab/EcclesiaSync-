import { LocalNotifications } from '@capacitor/local-notifications';

/**
 * Service for managing local push notifications in VerbumSync.
 * Supports Android via @capacitor/local-notifications with Web fallback.
 */
class NotificationService {
  constructor() {
    this.isCapacitor = typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform();
    this.recentTriggers = new Map();
    this.init();
  }

  async init() {
    try {
      if (this.isCapacitor) {
        const status = await LocalNotifications.checkPermissions();
        if (status.display !== 'granted') {
          await LocalNotifications.requestPermissions();
        }
        await LocalNotifications.createChannel({
          id: 'verbumsync_channel',
          name: 'Notificaciones VerbumSync',
          description: 'Notificaciones de cumpleaños, ensayos, salidas y campañas',
          importance: 5,
          visibility: 1,
          vibration: true,
          sound: 'default',
          lights: true,
          lightColor: '#6366F1'
        });

        // Listen for foreground notification delivery
        LocalNotifications.addListener('localNotificationReceived', (notification) => {
          console.log('🔔 [Capacitor] Notification received in foreground:', notification);
        });
      } else if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          Notification.requestPermission().catch(() => {});
        }
      }
    } catch (e) {
      console.warn('NotificationService init error:', e);
    }
  }

  /**
   * Generates a collision-free 31-bit positive integer ID safe for Android NotificationManager.
   */
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

  /**
   * Parses YYYY-MM-DD string into a local Date without UTC shift.
   */
  parseLocalDate(dateStr) {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;

    // Handle "YYYY-MM-DD"
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
        return status.display; // 'granted', 'denied', 'prompt'
      } catch (e) {
        return 'unsupported';
      }
    } else if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission; // 'granted', 'denied', 'default'
    }
    return 'unsupported';
  }

  async requestPermissions() {
    if (this.isCapacitor) {
      try {
        const req = await LocalNotifications.requestPermissions();
        return req.display === 'granted';
      } catch (e) {
        console.error('Error requesting Capacitor permissions:', e);
        return false;
      }
    } else if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const res = await Notification.requestPermission();
        return res === 'granted';
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  async sendLocalNotification(id, title, body, scheduleDate = null, extraData = {}) {
    const numericId = this.generateNumericId(id);
    const cooldownKey = `${numericId}-${title}`;
    const now = Date.now();

    if (this.recentTriggers.has(cooldownKey) && (now - this.recentTriggers.get(cooldownKey) < 2000)) {
      console.log(`⚠️ Notification throttle active for: ${cooldownKey}`);
      return;
    }
    this.recentTriggers.set(cooldownKey, now);

    try {
      if (this.isCapacitor) {
        const notif = {
          id: numericId,
          title: title,
          body: body,
          channelId: 'verbumsync_channel',
          smallIcon: 'ic_stat_notification',
          extra: extraData
        };

        if (scheduleDate && scheduleDate > new Date()) {
          notif.schedule = { at: scheduleDate };
        }

        await LocalNotifications.schedule({
          notifications: [notif]
        });
        console.log(`📱 [Capacitor] Notification scheduled/sent (ID: ${numericId}): "${title}"`);
      } else if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          if (!scheduleDate || scheduleDate <= new Date()) {
            new Notification(title, { body, icon: '/logo.png', data: extraData });
            console.log(`💻 [Web] Notification displayed: "${title}"`);
          }
        }
      }
    } catch (err) {
      console.error('❌ Error sending local notification:', err);
    }
  }

  /**
   * Syncs all upcoming events and pre-schedules them natively inside the Android OS Scheduler.
   */
  async syncAllLocalNotifications(currentUser, services = [], members = [], templates = [], users = []) {
    if (!this.isCapacitor) {
      console.log('ℹ️ Local notification sync skipped: not running on Capacitor native platform.');
      return { scheduledCount: 0, status: 'skipped_web' };
    }

    try {
      // 1. Check permissions
      const status = await LocalNotifications.checkPermissions();
      if (status.display !== 'granted') {
        const req = await LocalNotifications.requestPermissions();
        if (req.display !== 'granted') {
          console.warn('⚠️ Notifications permission denied by user.');
          return { scheduledCount: 0, status: 'permission_denied' };
        }
      }

      // 2. Clear pending notifications to avoid duplicates
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
          schedule: { at: scheduleDate },
          channelId: 'verbumsync_channel',
          smallIcon: 'ic_stat_notification',
          extra: extraData
        });
      };

      // --- A. SCHEDULE BIRTHDAYS (Within next 30 days) ---
      const currentYear = today.getFullYear();
      const people = [
        ...users.map(u => ({ name: u.username || u.name, birthday: u.birthday, id: u.uid })),
        ...members.map(m => ({ name: m.name, birthday: m.birthday, id: m.id }))
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

      // --- B. SCHEDULE SERVICES & ASSIGNMENTS (Next 30 days) ---
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
        const tNameLower = (templateName || '').toLowerCase();
        const isCampaign = lowerType.includes('campaña') || lowerType.includes('campana') || lowerProgram.includes('campaña') || lowerProgram.includes('campana');
        const isRehearsal = lowerType.includes('ensayo') || lowerType.includes('ensayos') || lowerType.includes('practica') || lowerType.includes('práctica') || lowerType.includes('practicas') || lowerType.includes('prácticas') || lowerType.includes('ensayar') || lowerProgram.includes('ensayo') || lowerProgram.includes('ensayos') || lowerProgram.includes('practica') || lowerProgram.includes('práctica') || lowerProgram.includes('practicas') || lowerProgram.includes('prácticas') || lowerProgram.includes('ensayar') || tNameLower.includes('ensayo') || tNameLower.includes('ensayos') || tNameLower.includes('practica') || tNameLower.includes('práctica');
        const isOuting = !isRehearsal && (lowerType.includes('salida') || lowerType.includes('salidas') || lowerProgram.includes('salida') || lowerProgram.includes('salidas') || tNameLower.includes('salida') || tNameLower.includes('salidas'));

        const serviceKey = `srv_${service.id || Math.random()}`;

        let title = '';
        let body = '';

        if (isUserAssigned) {
          title = `📋 Tu Servicio: ${serviceType}`;
          body = `Tienes servicio asignado en "${templateName}". Tarea: ${program || 'Servicio General'}.`;
        } else if (isCampaign) {
          title = `🔥 ¡Campaña de la Iglesia!`;
          body = `Campaña "${serviceType}" programada. Detalles: ${program || 'No te lo pierdas.'}`;
        } else if (isRehearsal) {
          title = `📢 Ensayo General`;
          body = `Ensayo programado. Detalles: ${program || 'Participa con nosotros.'}`;
        } else if (isOuting) {
          title = `📢 Salida General`;
          body = `Salida programada. Detalles: ${program || 'Participa con nosotros.'}`;
        } else {
          title = `📅 Servicio de la Iglesia`;
          body = `Servicio de "${templateName}" programado. Tarea: ${program || serviceType}`;
        }

        // Schedule 1 day before at 9:00 AM
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

        // Schedule same day at 9:00 AM
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

  scheduleBirthdayNotifications(users = [], members = []) {
    console.log('ℹ️ scheduleBirthdayNotifications called: redirected automatically to syncAllLocalNotifications');
  }

  async notifyRehearsalOrOutingCreated(title, details, isOuting = false) {
    let notifTitle = '';
    let notifBody = '';
    let notifType = '';

    if (isOuting) {
      notifTitle = `🚌 ¡Nueva Salida Anunciada!`;
      notifBody = `📍 ${title ? `${title}. ` : ''}${details}`;
      notifType = 'outing_announced';
    } else {
      notifTitle = `🎼 ¡Nuevo Ensayo Anunciado!`;
      notifBody = `🎵 ${title ? `${title}. ` : ''}${details}`;
      notifType = 'rehearsal_announced';
    }

    await this.sendLocalNotification(
      `announcement_${Date.now()}_${Math.random()}`,
      notifTitle,
      notifBody,
      null,
      { type: notifType }
    );
  }

  async notifyCampaignOrAssignment({ serviceDate, assignedMembers = [], serviceType = '', program = '', isUserAssigned = false, isCampaign = false }) {
    const title = isCampaign
      ? `🔥 ¡Nueva Campaña Programada!`
      : isUserAssigned
        ? `📋 Día Asignado en el Servicio`
        : `📅 Nuevo Servicio Programado`;

    const membersText = assignedMembers.length > 0
      ? assignedMembers.map(m => m.name).join(', ')
      : 'Todos los miembros';

    const notifBody = isCampaign
      ? `Se ha anunciado la campaña "${serviceType}" para la fecha: ${serviceDate}. ${program ? `Detalles: ${program}` : ''}`
      : isUserAssigned
        ? `Tienes servicio asignado para el ${serviceDate}. Tarea / Programa: ${program || serviceType || 'Servicio Congregacional'}.`
        : `Servicio programado para el ${serviceDate}. Asignados: ${membersText}.`;

    await this.sendLocalNotification(
      `campaign_${Date.now()}_${Math.random()}`,
      title,
      notifBody,
      null,
      { type: 'service_campaign_assigned' }
    );
  }

  async notifyPoetryCreated(serviceType, serviceDate, programRaw) {
    let notes = '';
    try {
      const parsed = JSON.parse(programRaw);
      if (parsed && typeof parsed === 'object') {
        notes = parsed.notes || '';
      }
    } catch (e) {
      notes = programRaw;
    }

    await this.sendLocalNotification(
      `poetry_${Date.now()}_${Math.random()}`,
      `📖 Nuevo Programa de Poesía`,
      `Se ha programado "${serviceType}" para el ${serviceDate}. Detalles: ${notes || 'Sin detalles.'}`,
      null,
      { type: 'poetry_created' }
    );
  }

  async notifyProgramCreated(title, content) {
    await this.sendLocalNotification(
      `prog_${Date.now()}_${Math.random()}`,
      `📝 Nuevo Programa Anunciado`,
      `Título: ${title}. Contenido: ${content || 'Ver detalles en la app.'}`,
      null,
      { type: 'program_created' }
    );
  }

  async notifyKickedFromChurch(churchId) {
    await this.sendLocalNotification(
      `kicked_church_${Date.now()}`,
      `⚠️ Acceso Revocado`,
      `Has sido removido de la congregación con código: ${churchId}.`,
      null,
      { type: 'kicked_church', churchId }
    );
  }

  async notifyRoleChanged(churchId, newRole) {
    const roleNames = {
      admin: 'Administrador',
      editor: 'Editor',
      viewer: 'Lector'
    };
    const roleName = roleNames[newRole] || newRole;
    await this.sendLocalNotification(
      `role_${Date.now()}`,
      `🔑 Actualización de Rol`,
      `Tu rol en la congregación "${churchId}" ha sido cambiado a: ${roleName}.`,
      null,
      { type: 'role_changed', churchId, newRole }
    );
  }

  async notifyJoinedChurch(churchId, role) {
    const roleNames = {
      admin: 'Administrador',
      editor: 'Editor',
      viewer: 'Lector'
    };
    const roleName = roleNames[role] || role;
    await this.sendLocalNotification(
      `joined_${Date.now()}`,
      `⛪ Nueva Iglesia Vinculada`,
      `Te has unido exitosamente a la iglesia "${churchId}" con el rol de ${roleName}.`,
      null,
      { type: 'joined_church', churchId, role }
    );
  }

  async notifyKickedFromTemplate(templateName) {
    await this.sendLocalNotification(
      `kicked_tpl_${Date.now()}`,
      `⚠️ Salida de Plantilla`,
      `Has sido removido de la lista de miembros de la plantilla "${templateName}".`,
      null,
      { type: 'kicked_template', templateName }
    );
  }
}

export const notificationService = new NotificationService();
export default notificationService;
