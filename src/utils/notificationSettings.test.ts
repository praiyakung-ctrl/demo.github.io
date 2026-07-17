import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  savedNotificationSettings,
  saveNotificationSettings,
  savedRecipients,
  saveRecipients,
} from './notificationSettings';
import type { NotificationRecipient } from './notificationSettings';

describe('notificationSettings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns defaults when storage is empty or invalid', () => {
    expect(savedNotificationSettings()).toEqual(DEFAULT_NOTIFICATION_SETTINGS);
    localStorage.setItem('notification_settings', '{broken');
    expect(savedNotificationSettings()).toEqual(DEFAULT_NOTIFICATION_SETTINGS);
  });

  it('round-trips saved settings', () => {
    const settings = structuredClone(DEFAULT_NOTIFICATION_SETTINGS);
    settings.events.traffic.enabled = false;
    settings.events.crowd.severity = 'high';
    saveNotificationSettings(settings);
    expect(savedNotificationSettings()).toEqual(settings);
  });

  it("drops channel keys removed in later versions (e.g. 'sms') from stored event rules", () => {
    const stored = structuredClone(DEFAULT_NOTIFICATION_SETTINGS);
    stored.events.gunshot.channels = ['push', 'line', 'sms'] as never;
    localStorage.setItem('notification_settings', JSON.stringify(stored));
    expect(savedNotificationSettings().events.gunshot.channels).toEqual(['push', 'line']);
  });

  it('keeps push always enabled even if a stored value disabled it', () => {
    const stored = structuredClone(DEFAULT_NOTIFICATION_SETTINGS) as unknown as {
      channels: { push: { enabled: boolean } };
    };
    stored.channels.push.enabled = false;
    localStorage.setItem('notification_settings', JSON.stringify(stored));
    expect(savedNotificationSettings().channels.push.enabled).toBe(true);
  });

  it('merges event types added in later versions from defaults', () => {
    const stored = structuredClone(DEFAULT_NOTIFICATION_SETTINGS) as unknown as {
      events: Record<string, unknown>;
    };
    delete stored.events.flood; // simulate an older stored shape
    localStorage.setItem('notification_settings', JSON.stringify(stored));
    expect(savedNotificationSettings().events.flood).toEqual(DEFAULT_NOTIFICATION_SETTINGS.events.flood);
  });

  it('seeds recipients when storage is empty and round-trips saves', () => {
    expect(savedRecipients().length).toBeGreaterThan(0);
    const recipient: NotificationRecipient = {
      id: 'nr-test',
      enabled: true,
      targetType: 'user',
      targetId: '1',
      channels: ['push'],
      eventTypes: ['gunshot'],
    };
    saveRecipients([recipient]);
    expect(savedRecipients()).toEqual([recipient]);
  });

  it("filters removed channel keys (e.g. 'sms') from stored recipients", () => {
    const recipient = {
      id: 'nr-old',
      enabled: true,
      targetType: 'group',
      targetId: 'grp-admin',
      channels: ['sms', 'line'],
      eventTypes: ['flood'],
    };
    localStorage.setItem('notification_recipients', JSON.stringify([recipient]));
    expect(savedRecipients()[0].channels).toEqual(['line']);
  });
});
