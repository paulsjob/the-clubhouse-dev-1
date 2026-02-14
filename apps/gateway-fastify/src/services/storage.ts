
import fs from 'node:fs/promises';
import path from 'node:path';
import { Credential, Resource, LiveSession, Graph, Output, SchemaSnapshotV1, SnapshotV1, Organization, SchemaSourceV1, BindingSetV1 } from '@renderless/contracts';
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
  protected items: Map<string, T> = new Map();

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

  async getAllGlobal(): Promise<T[]> {
    return Array.from(this.items.values());
  }

  async getById(id: string): Promise<T | null> {
    return this.items.get(id) || null;
  }
}

// Specialization for Schemas to handle indexing
class SchemaStore extends InMemoryStore<SchemaSnapshotV1> {
  // ITEM 15: Map of source handle -> latest schema ID
  // handle format: "output:{id}" or "topic:{name}"
  private latestSourceMap = new Map<string, string>();

  private getSourceHandle(source?: SchemaSourceV1): string | null {
    if (!source) return null;
    if (source.kind === 'output') return `output:${source.outputId}`;
    if (source.kind === 'topic') return `topic:${source.topic}`;
    if (source.kind === 'graph') return `graph:${source.graphId}`;
    return null;
  }

  async create(orgId: string, data: SchemaSnapshotV1): Promise<SchemaSnapshotV1> {
    const result = await super.create(orgId, data);
    const handle = this.getSourceHandle(data.source);
    if (handle) {
      const currentLatestId = this.latestSourceMap.get(handle);
      const currentLatest = currentLatestId ? this.items.get(currentLatestId) : null;
      
      // If none exists or new one is newer, update index
      if (!currentLatest || data.createdAt >= currentLatest.createdAt) {
        this.latestSourceMap.set(handle, data.id);
      }
    }
    return result;
  }

  getLatestBySource(orgId: string, source: SchemaSourceV1): SchemaSnapshotV1 | null {
    const handle = this.getSourceHandle(source);
    if (!handle) return null;
    const id = this.latestSourceMap.get(handle);
    if (!id) return null;
    const item = this.items.get(id);
    return item && item.orgId === orgId ? item : null;
  }

  async listBySource(orgId: string, source: SchemaSourceV1): Promise<SchemaSnapshotV1[]> {
    const all = await this.list(orgId);
    return all.filter(s => {
      if (!s.source || s.source.kind !== source.kind) return false;
      if (s.source.kind === 'output' && source.kind === 'output') return s.source.outputId === source.outputId;
      if (s.source.kind === 'topic' && source.kind === 'topic') return s.source.topic === source.topic;
      if (s.source.kind === 'graph' && source.kind === 'graph') return s.source.graphId === source.graphId;
      return false;
    }).sort((a, b) => b.createdAt - a.createdAt);
  }
}

export const credentialStore = new InMemoryStore<Credential>();
export const resourceStore = new InMemoryStore<Resource>();
export const liveSessionStore = new InMemoryStore<LiveSession>();
export const graphStore = new InMemoryStore<Graph>();
export const outputStore = new InMemoryStore<Output>();
export const schemaStore = new SchemaStore();
export const bindingSetStore = new InMemoryStore<BindingSetV1>(); // Added in Item 20

// ITEM 12: Organization Store
export const orgStore = new InMemoryStore<Organization & { orgId: string }>();

// Last-known-value store for topics
export const ephemeralStateStore = new Map<string, any>();

// Quick lookup for latest schema snapshots (ITEM 15: Migration to schemaStore indexing)
export const latestOutputSchemaMap = new Map<string, string>(); 
export const latestTopicSchemaMap = new Map<string, string>();

// ITEM 09 / 13: Snapshot Helpers
export async function exportOrgSnapshot(orgId: string, includeSecrets: boolean): Promise<SnapshotV1> {
  const [credentials, resources, graphs, outputs, liveSessions, schemas] = await Promise.all([
    credentialStore.list(orgId),
    resourceStore.list(orgId),
    graphStore.list(orgId),
    outputStore.list(orgId),
    liveSessionStore.list(orgId),
    schemaStore.list(orgId),
  ]);

  const organizations = await orgStore.getAllGlobal();
  const relevantOrgs = organizations.filter(o => o.id === orgId);

  return {
    credentials: includeSecrets ? credentials : credentials.map(c => ({ ...c, secrets: {} })),
    resources,
    graphs,
    outputs,
    liveSessions,
    schemas,
    organizations: relevantOrgs.length > 0 ? relevantOrgs : undefined
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

  const tasks: Promise<any>[] = [
    ...snapshot.credentials.map(item => credentialStore.create(orgId, { ...item, orgId })),
    ...snapshot.resources.map(item => resourceStore.create(orgId, { ...item, orgId })),
    ...snapshot.graphs.map(item => graphStore.create(orgId, { ...item, orgId })),
    ...snapshot.outputs.map(item => outputStore.create(orgId, { ...item, orgId })),
    ...snapshot.liveSessions.map(item => liveSessionStore.create(orgId, { ...item, orgId })),
    ...snapshot.schemas.map(item => schemaStore.create(orgId, { ...item, orgId })),
  ];

  if (snapshot.organizations) {
    tasks.push(...snapshot.organizations.map(item => orgStore.create(item.id, { ...item, orgId: item.id })));
  }

  await Promise.all(tasks);
}

// ITEM 10 / 13: Persistence Manager
export class PersistenceManager {
  private static saveTimers: Map<string, NodeJS.Timeout> = new Map();
  private static SYSTEM_ID = '_system'; // Special ID for global metadata like orgs

  static markDirty(orgId: string) {
    if (!config.persistEnabled) return;
    
    // If it's an org record, we also mark the system dirty
    const targetId = orgId === PersistenceManager.SYSTEM_ID ? orgId : orgId;
    
    if (this.saveTimers.has(targetId)) {
      clearTimeout(this.saveTimers.get(targetId)!);
    }

    const timer = setTimeout(() => {
      this.saveOrg(targetId);
    }, 500);

    this.saveTimers.set(targetId, timer);
  }

  private static async saveOrg(targetId: string) {
    this.saveTimers.delete(targetId);
    
    try {
      let data: SnapshotV1;
      
      if (targetId === PersistenceManager.SYSTEM_ID) {
        // Special case: save all organizations globally
        const organizations = await orgStore.getAllGlobal();
        data = {
          credentials: [],
          resources: [],
          graphs: [],
          outputs: [],
          liveSessions: [],
          schemas: [],
          organizations
        };
      } else {
        data = await exportOrgSnapshot(targetId, config.persistIncludeSecrets);
      }

      const filePath = path.join(config.persistDir, `${targetId}.json`);
      const tmpPath = `${filePath}.tmp`;

      await fs.mkdir(config.persistDir, { recursive: true });
      await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf8');
      await fs.rename(tmpPath, filePath);
    } catch (err) {
      console.error(`❌ Persistence: Failed to save ${targetId}`, err);
    }
  }

  static async init() {
    if (!config.persistEnabled) return;

    try {
      await fs.mkdir(config.persistDir, { recursive: true });
      const files = await fs.readdir(config.persistDir);
      const orgFiles = files.filter(f => f.endsWith('.json'));

      console.info(`💾 Persistence: Found ${orgFiles.length} persistence files. Loading...`);

      for (const file of orgFiles) {
        const targetId = path.basename(file, '.json');
        const filePath = path.join(config.persistDir, file);
        
        try {
          const content = await fs.readFile(filePath, 'utf8');
          const snapshot = JSON.parse(content) as SnapshotV1;
          
          const originalPersist = config.persistEnabled;
          (config as any).persistEnabled = false;

          if (targetId === PersistenceManager.SYSTEM_ID && snapshot.organizations) {
             for (const org of snapshot.organizations) {
               await orgStore.create(org.id, { ...org, orgId: org.id });
             }
          } else {
            await importOrgSnapshot(targetId, snapshot, 'merge');
          }

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
