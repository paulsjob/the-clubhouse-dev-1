
import { FastifyReply } from 'fastify';

interface SSEConnection {
  orgId: string;
  topic: string;
  reply: FastifyReply;
}

class PubSubService {
  private connections: Set<SSEConnection> = new Set();
  private sequences: Map<string, number> = new Map();

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

  publish(orgId: string, topic: string, data: any) {
    const seqKey = `${orgId}:${topic}`;
    const seq = (this.sequences.get(seqKey) || 0) + 1;
    this.sequences.set(seqKey, seq);

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
