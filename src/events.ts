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
  topic: string;
  destination: string;
  actions: string[];
  triggers: string[];
  query: string | undefined;
  filter: string | undefined;
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
    const topic = readString(item, 'topic', label);
    const actions = readStringSet(item, 'actions', label);
    if (actions.some((action) => !['create', 'update', 'delete'].includes(action))) {
      throw new Error('events.subscription.actions must contain only create, update, or delete');
    }
    const destination = readString(item, 'uri', label);
    if (actions.includes('update')) {
      readStringSet(item, 'triggers', label);
    } else if (item.triggers !== undefined) {
      readStringSet(item, 'triggers', label);
    }
    const query = item.query === undefined ? undefined : readString(item, 'query', label);
    const filter = item.query_filter === undefined ? undefined : normalizeFilter(readString(item, 'query_filter', label));
    if (subscriptions.has(handle)) throw new Error('Events subscription handles must be unique');

    const normalizedQuery = query === undefined ? undefined : normalizeGraphQL(query);
    const triggers = item.triggers === undefined ? [] : [...new Set((item.triggers as string[]).map((value) => value.trim()))].sort();
    const values = { actions, query: normalizedQuery, filter, topic, triggers, destination };
    subscriptions.set(handle, { handle, fingerprint: JSON.stringify(values), ...values });
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

  let created = 0, removed = 0, modified = 0;
  const changes = { topic: 0, destination: 0, actions: 0, triggers: 0, query: 0, filter: 0 };
  for (const handle of new Set([...oldEvents.subscriptions.keys(), ...newEvents.subscriptions.keys()])) {
    const previous = oldEvents.subscriptions.get(handle);
    const next = newEvents.subscriptions.get(handle);
    if (!previous) created++;
    else if (!next) removed++;
    else if (previous.fingerprint !== next.fingerprint) {
      modified++;
      for (const field of Object.keys(changes) as Array<keyof typeof changes>) if (JSON.stringify(previous[field]) !== JSON.stringify(next[field])) changes[field]++;
    }
  }
  if (created || removed || modified) {
    const detail = modified ? `; modified fields: ${Object.entries(changes).filter(([, count]) => count > 0).map(([field, count]) => `${field === 'destination' ? 'destination' : field === 'filter' ? 'query filter' : field} ${count}`).join(', ')}` : '';
    findings.push({
      ruleId: 'EVENTS_SUBSCRIPTIONS_CHANGED',
      severity: 'review',
      field: 'events.subscription',
      summary: `Events subscriptions changed (created: ${created}; removed: ${removed}; modified: ${modified}${detail}); review the affected subscription configuration`,
    });
  }
  return findings;
}

function normalizeGraphQL(query: string): string {
  const tokens: string[] = [];
  const tokenPattern = /#[^\r\n]*|"""[\s\S]*?"""|"(?:\\.|[^"\\])*"|[A-Za-z_][A-Za-z0-9_]*|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|\.\.\.|[^\s,]/g;
  for (const match of query.matchAll(tokenPattern)) {
    if (match[0].startsWith('#')) continue;
    tokens.push(match[0]);
  }
  return tokens.length ? tokens.join(' ') : query;
}

function normalizeFilter(value: string): string {
  let result = '', quote = '', escaped = false, pendingSpace = false;
  for (const character of value.trim()) {
    if (quote) {
      result += character;
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
    } else if (character === '"' || character === "'") {
      if (pendingSpace && result) result += ' ';
      pendingSpace = false; quote = character; result += character;
    } else if (/\s/.test(character)) pendingSpace = true;
    else { if (pendingSpace && result) result += ' '; pendingSpace = false; result += character; }
  }
  return result;
}
