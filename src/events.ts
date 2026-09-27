import type { Finding } from './core.js';

type Config = Record<string, unknown>;

function isTable(value: unknown): value is Config {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(table: Config, field: string, label: string): string {
  const value = table[field];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label}.${field} must be a non-empty string`);
  }
  return value.trim();
}

function readStringSet(table: Config, field: string, label: string): string[] {
  const value = table[field];
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string' && item.trim())) {
    throw new Error(`${label}.${field} must be an array of non-empty strings`);
  }
  return [...new Set((value as string[]).map((item) => item.trim()))].sort();
}

type EventSubscription = {
  handle: string;
  fingerprint: string;
};

type Events = { version?: string; subscriptions: Map<string, EventSubscription> };

function readEvents(config: Config): Events {
  const raw = config.events;
  if (raw === undefined) return { subscriptions: new Map() };
  if (!isTable(raw)) throw new Error('[events] must be a table');

  const version = raw.api_version;
  if (version === undefined) {
    throw new Error('[events].api_version is required');
  }
  if (typeof version !== 'string' || !version.trim()) {
    throw new Error('[events].api_version must be a non-empty string');
  }
  const rawSubscriptions = raw.subscription ?? [];
  if (!Array.isArray(rawSubscriptions)) {
    throw new Error('events.subscription must be an array of tables');
  }

  const subscriptions = new Map<string, EventSubscription>();
  for (const item of rawSubscriptions) {
    if (!isTable(item)) throw new Error('Each Events subscription must be a table');
    const label = 'events.subscription';
    const handle = readString(item, 'handle', label);
    if (!/^[A-Za-z0-9_-]{1,50}$/.test(handle)) {
      throw new Error('events.subscription.handle must be alphanumeric, _, or - and at most 50 characters');
    }
    readString(item, 'topic', label);
    const actions = readStringSet(item, 'actions', label);
    if (actions.some((action) => !['create', 'update', 'delete'].includes(action))) {
      throw new Error('events.subscription.actions must contain only create, update, or delete');
    }
    readString(item, 'uri', label);
    if (actions.includes('update')) {
      readStringSet(item, 'triggers', label);
    } else if (item.triggers !== undefined) {
      readStringSet(item, 'triggers', label);
    }
    if (item.query !== undefined) readString(item, 'query', label);
    if (item.query_filter !== undefined) readString(item, 'query_filter', label);
    if (subscriptions.has(handle)) throw new Error('Events subscription handles must be unique');

    const fingerprint = JSON.stringify({
      actions,
      query: item.query,
      query_filter: item.query_filter,
      topic: item.topic,
      triggers: item.triggers === undefined ? undefined : [...new Set((item.triggers as string[]).map((value) => value.trim()))].sort(),
      uri: item.uri,
    });
    subscriptions.set(handle, { handle, fingerprint });
  }
  return { version: version as string | undefined, subscriptions };
}

export function compareEvents(before: Config, after: Config): Finding[] {
  const oldEvents = readEvents(before);
  const newEvents = readEvents(after);
  const findings: Finding[] = [];

  if (oldEvents.version !== newEvents.version) {
    findings.push({
      ruleId: 'EVENTS_API_VERSION_CHANGED',
      severity: 'review',
      field: 'events.api_version',
      summary: 'Events API version changed; review preview/runtime compatibility',
    });
  }

  let added = 0;
  let removed = 0;
  let modified = 0;
  for (const handle of new Set([...oldEvents.subscriptions.keys(), ...newEvents.subscriptions.keys()])) {
    const previous = oldEvents.subscriptions.get(handle);
    const next = newEvents.subscriptions.get(handle);
    if (!previous) added++;
    else if (!next) removed++;
    else if (previous.fingerprint !== next.fingerprint) modified++;
  }
  if (added || removed || modified) {
    findings.push({
      ruleId: 'EVENTS_SUBSCRIPTIONS_CHANGED',
      severity: 'review',
      field: 'events.subscription',
      summary: `Events subscriptions changed (added: ${added}; removed: ${removed}; modified: ${modified}); review topic, actions, triggers, destination and delivery query settings`,
    });
  }
  return findings;
}
