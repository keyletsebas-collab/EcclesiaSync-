import { LocalNotifications } from '@capacitor/local-notifications';

/**
 * Service for managing local push notifications in VerbumSync.
 * Supports Android via @capacitor/local-notifications with Web fallback.
 */

class NotificationService {
  constructor() {
    this.isCapacitor = typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform();
    this.init();
  }

  async init() {
    try {
      if (this.isCapacitor) {
        const status = await LocalNotifications.checkPermissions();
        if (status.display !== 'granted') {
          await LocalNotifications.requestPermissions();
        }
        // Register channels for Android
        await LocalNotifications.createChannel({
          id: 'verbumsync_channel',
          name: 'Notificaciones VerbumSync',
          description: 'Notificaciones de cumpleaños, ensayos, salidas y campañas',
          importance: 5,
          visibility: 1,
          vibration: true
        });
      } else if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          await Notification.requestPermission();
        }
      }
    } catch (e) {
      console.warn('NotificationService init error:', e);
    }
  }

  async sendLocalNotification(id, title, body, scheduleDate = null, extraData = {}) {
    try {
      if (this.isCapacitor) {
        const scheduleOptions = scheduleDate
          ? { at: scheduleDate }
          : undefined;

        await LocalNotifications.schedule({
          notifications: [
            {
              id: Math.abs(id) % 2147483647,
              title: title,
              body: body,
              schedule: scheduleOptions,
              channelId: 'verbumsync_channel',
              smallIcon: 'ic_launcher',
              extra: extraData
            }
          ]
        });
      } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        if (!scheduleDate || scheduleDate <= new Date()) {
          new Notification(title, { body, icon: '/logo.png', data: extraData });
        }
      }
    } catch (err) {
      console.error('Error sending local notification:', err);
    }
  }

  /**
   * 1. BIRTHDAY NOTIFICATIONS:
   * - 1 week before birthday (for everyone in church)
   * - On the birthday day itself
   */
  async scheduleBirthdayNotifications(users = [], members = []) {
    const today = new Date();
    const currentYear = today.getFullYear();

    const people = [
      ...users.map(u => ({ name: u.username || u.name, birthday: u.birthday, id: u.uid })),
      ...members.map(m => ({ name: m.name, birthday: m.birthday, id: m.id }))
    ].filter(p => p.birthday && p.name);

    // Filter duplicates
    const uniquePeople = Array.from(new Map(people.map(p => [p.name.toLowerCase(), p])).values());

    for (let i = 0; i < uniquePeople.length; i++) {
      const person = uniquePeople[i];
      const birthDate = new Date(person.birthday);
      if (isNaN(birthDate.getTime())) continue;

      let bdayThisYear = new Date(currentYear, birthDate.getMonth(), birthDate.getDate(), 9, 0, 0);
      if (bdayThisYear < today) {
        bdayThisYear = new Date(currentYear + 1, birthDate.getMonth(), birthDate.getDate(), 9, 0, 0);
      }

      // Date 7 days prior
      const bdayMinus7 = new Date(bdayThisYear.getTime() - 7 * 24 * 60 * 60 * 1000);

      const baseId = Math.abs(this.hashCode(person.name));

      // Schedule 1 week notice if in future
      if (bdayMinus7 > today) {
        const formattedDate = bdayThisYear.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
        await this.sendLocalNotification(
          baseId + 1,
          `🎉 Próximo Cumpleaños en la Iglesia`,
          `¡En 1 semana es el cumpleaños de ${person.name}! (${formattedDate}). ¡Preparen las felicitaciones!`,
          bdayMinus7,
          { type: 'birthday_week_notice', personName: person.name }
        );
      }

      // Schedule exact day notice if in future
      if (bdayThisYear > today) {
        await this.sendLocalNotification(
          baseId + 2,
          `🎂 ¡Hoy es el Cumpleaños de ${person.name}!`,
          `Demos gracias a Dios por la vida de ${person.name} en su día especial. ¡Dios le bendiga!`,
          bdayThisYear,
          { type: 'birthday_today', personName: person.name }
        );
      }
    }
  }

  /**
   * 2. REHEARSAL / OUTING ANNOUNCEMENT NOTIFICATION:
   * Triggers immediately when a new rehearsal or outing schedule is created/announced.
   */
  async notifyRehearsalOrOutingCreated(title, details, isOuting = false) {
    const eventType = isOuting ? 'Salida' : 'Ensayo';
    const notifTitle = `📢 Nuevo ${eventType} Anunciado`;
    const notifBody = `${title ? `${title}: ` : ''}${details}`;

    await this.sendLocalNotification(
      Date.now() + Math.floor(Math.random() * 1000),
      notifTitle,
      notifBody,
      null,
      { type: 'rehearsal_outing_announced' }
    );
  }

  /**
   * 3. CAMPAIGN AND ASSIGNED DAYS NOTIFICATION:
   * Triggers when a campaign or service assignment is added/updated.
   */
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
      ? `Se ha anunciado la campaña "${serviceType}" para el fecha: ${serviceDate}. ${program ? `Detalles: ${program}` : ''}`
      : isUserAssigned
        ? `Tienes servicio asignado para el ${serviceDate}. Tarea / Programa: ${program || serviceType || 'Servicio Congregacional'}.`
        : `Servicio programado para el ${serviceDate}. Asignados: ${membersText}.`;

    await this.sendLocalNotification(
      Date.now() + Math.floor(Math.random() * 1000),
      title,
      notifBody,
      null,
      { type: 'service_campaign_assigned' }
    );
  }

  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}

export const notificationService = new NotificationService();
export default notificationService;
