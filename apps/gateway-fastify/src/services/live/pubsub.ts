
import { FastifyReply } from 'fastify';

interface SSEConnection {
  orgId: string;
  topic: string;
  reply: FastifyReply;
}

class PubSubService {
  private connections: Set<SSEConnection> = new Set();
  private sequences: Map<string, number> = new Map();
  private pausedTopics: Set<string> = new Set();

  constructor() {
    // Keep connections alive
    setInterval(() => this.heartbeat(), 15000);
  }

  addConnection(orgId: string, topic: string, reply: FastifyReply) {
    const conn = { orgId, topic, reply };
    this.connections.add(conn);
    
    reply.raw.on('close', () => {
      this.connections.delete(conn);
    });

    // Initial SSE headers handled in route
  }

  pause(orgId: string, topic: string) {
    this.pausedTopics.add(`${orgId}:${topic}`);
  }

  resume(orgId: string, topic: string) {
    this.pausedTopics.delete(`${orgId}:${topic}`);
  }

  isPaused(orgId: string, topic: string): boolean {
    return this.pausedTopics.has(`${orgId}:${topic}`);
  }

  getSubscriberCount(orgId: string, topic: string): number {
    let count = 0;
    for (const conn of this.connections) {
      if (conn.orgId === orgId && (conn.topic === topic || conn.topic === '*')) {
        count++;
      }
    }
    return count;
  }

  publish(orgId: string, topic: string, data: any) {
    const seqKey = `${orgId}:${topic}`;
    
    // Always advance sequence even if paused so state is consistent when resumed
    const seq = (this.sequences.get(seqKey) || 0) + 1;
    this.sequences.set(seqKey, seq);

    // Flow control: If topic is paused, don't broadcast to clients
    if (this.isPaused(orgId, topic)) {
      return;
    }

    const payload = JSON.stringify({
      ts: Date.now(),
      topic,
      seq,
      data
    });

    const message = `event: message\ndata: ${payload}\n\n`;

    for (const conn of this.connections) {
      if (conn.orgId === orgId && (conn.topic === topic || conn.topic === '*')) {
        conn.reply.raw.write(message);
      }
    }
  }

  private heartbeat() {
    const message = `event: heartbeat\ndata: {"ts":${Date.now()}}\n\n`;
    for (const conn of this.connections) {
      conn.reply.raw.write(message);
    }
  }
}

export const pubSubService = new PubSubService();
