
import fs from 'node:fs/promises';
import path from 'node:path';
import { Credential, Resource, LiveSession, Graph, Output, SchemaSnapshotV1, SnapshotV1 } from '@renderless/contracts';
import { config } from '../config';

export interface IStore<T> {
  list(orgId: string): Promise<T[]>;
  get(orgId: string, id: string): Promise<T | null>;
  create(orgId: string, data: T): Promise<T>;
  update(orgId: string, id: string, data: Partial<T>): Promise<T | null>;
  delete(orgId: string, id: string): Promise<boolean>;
  clearOrg(orgId: string): Promise<void>;
}

class InMemoryStore<T extends { id: string; orgId: string }> implements IStore<T> {
  private items: Map<string, T> = new Map();

  async list(orgId: string): Promise<T[]> {
    return Array.from(this.items.values()).filter(i => i.orgId === orgId);
  }

  async get(orgId: string, id: string): Promise<T | null> {
    const item = this.items.get(id);
    return item && item.orgId === orgId ? item : null;
  }

  async create(orgId: string, data: T): Promise<T> {
    this.items.set(data.id, data);
    PersistenceManager.markDirty(orgId);
    return data;
  }

  async update(orgId: string, id: string, data: Partial<T>): Promise<T | null> {
    const existing = await this.get(orgId, id);
    if (!existing) return null;
    const updated = { ...existing, ...data };
    this.items.set(id, updated);
    PersistenceManager.markDirty(orgId);
    return updated;
  }

  async delete(orgId: string, id: string): Promise<boolean> {
    const existing = await this.get(orgId, id);
    if (!existing) return false;
    const deleted = this.items.delete(id);
    if (deleted) PersistenceManager.markDirty(existing.orgId);
    return deleted;
  }

  async clearOrg(orgId: string): Promise<void> {
    for (const [id, item] of this.items.entries()) {
      if (item.orgId === orgId) {
        this.items.delete(id);
      }
    }
    PersistenceManager.markDirty(orgId);
  }
}

export const credentialStore = new InMemoryStore<Credential>();
export const resourceStore = new InMemoryStore<Resource>();
export const liveSessionStore = new InMemoryStore<LiveSession>();
export const graphStore = new InMemoryStore<Graph>();
export const outputStore = new InMemoryStore<Output>();
export const schemaStore = new InMemoryStore<SchemaSnapshotV1>();

// Last-known-value store for topics
export const ephemeralStateStore = new Map<string, any>();

// Quick lookup for latest schema snapshots
export const latestOutputSchemaMap = new Map<string, string>(); // outputId -> snapshotId
export const latestTopicSchemaMap = new Map<string, string>(); // topic -> snapshotId

// ITEM 09: Snapshot Helpers
export async function exportOrgSnapshot(orgId: string, includeSecrets: boolean): Promise<SnapshotV1> {
  const [credentials, resources, graphs, outputs, liveSessions, schemas] = await Promise.all([
    credentialStore.list(orgId),
    resourceStore.list(orgId),
    graphStore.list(orgId),
    outputStore.list(orgId),
    liveSessionStore.list(orgId),
    schemaStore.list(orgId),
  ]);

  return {
    credentials: includeSecrets ? credentials : credentials.map(c => ({ ...c, secrets: {} })),
    resources,
    graphs,
    outputs,
    liveSessions,
    schemas
  };
}

export async function importOrgSnapshot(orgId: string, snapshot: SnapshotV1, mode: "merge" | "replace"): Promise<void> {
  if (mode === "replace") {
    await Promise.all([
      credentialStore.clearOrg(orgId),
      resourceStore.clearOrg(orgId),
      graphStore.clearOrg(orgId),
      outputStore.clearOrg(orgId),
      liveSessionStore.clearOrg(orgId),
      schemaStore.clearOrg(orgId),
    ]);
  }

  const tasks = [
    ...snapshot.credentials.map(item => credentialStore.create(orgId, { ...item, orgId })),
    ...snapshot.resources.map(item => resourceStore.create(orgId, { ...item, orgId })),
    ...snapshot.graphs.map(item => graphStore.create(orgId, { ...item, orgId })),
    ...snapshot.outputs.map(item => outputStore.create(orgId, { ...item, orgId })),
    ...snapshot.liveSessions.map(item => liveSessionStore.create(orgId, { ...item, orgId })),
    ...snapshot.schemas.map(item => schemaStore.create(orgId, { ...item, orgId })),
  ];

  await Promise.all(tasks);
}

// ITEM 10: Persistence Manager
export class PersistenceManager {
  private static dirtyOrgs: Set<string> = new Set();
  private static saveTimers: Map<string, NodeJS.Timeout> = new Map();

  static markDirty(orgId: string) {
    if (!config.persistEnabled) return;
    
    // Clear existing timer if any to reset debounce
    if (this.saveTimers.has(orgId)) {
      clearTimeout(this.saveTimers.get(orgId)!);
    }

    const timer = setTimeout(() => {
      this.saveOrg(orgId);
    }, 500); // 500ms debounce

    this.saveTimers.set(orgId, timer);
  }

  private static async saveOrg(orgId: string) {
    this.saveTimers.delete(orgId);
    
    try {
      const snapshot = await exportOrgSnapshot(orgId, config.persistIncludeSecrets);
      const filePath = path.join(config.persistDir, `${orgId}.json`);
      const tmpPath = `${filePath}.tmp`;

      // Ensure directory exists
      await fs.mkdir(config.persistDir, { recursive: true });

      // Atomic write: Write to tmp then rename
      await fs.writeFile(tmpPath, JSON.stringify(snapshot, null, 2), 'utf8');
      await fs.rename(tmpPath, filePath);
    } catch (err) {
      console.error(`❌ Persistence: Failed to save org ${orgId}`, err);
    }
  }

  static async init() {
    if (!config.persistEnabled) return;

    try {
      await fs.mkdir(config.persistDir, { recursive: true });
      const files = await fs.readdir(config.persistDir);
      const orgFiles = files.filter(f => f.endsWith('.json'));

      console.info(`💾 Persistence: Found ${orgFiles.length} org snapshots. Loading...`);

      for (const file of orgFiles) {
        const orgId = path.basename(file, '.json');
        const filePath = path.join(config.persistDir, file);
        
        try {
          const content = await fs.readFile(filePath, 'utf8');
          const snapshot = JSON.parse(content) as SnapshotV1;
          
          // Use import helper with 'merge' to restore state
          // Temporarily disable persist during load to avoid echo loop
          const originalPersist = config.persistEnabled;
          (config as any).persistEnabled = false;
          await importOrgSnapshot(orgId, snapshot, 'merge');
          (config as any).persistEnabled = originalPersist;
        } catch (loadErr) {
          console.error(`❌ Persistence: Failed to load ${file}`, loadErr);
        }
      }
    } catch (err) {
      console.error('❌ Persistence: Initialization failed', err);
    }
  }
}
