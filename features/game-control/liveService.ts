
import { Template, Layer } from '../../schema/template';

/**
 * VERTICAL SLICE: Game Control Service
 * Prepares the "Flat JSON" payload for the WebSocket output.
 */
export class LiveInstanceService {
  private socket: WebSocket | null = null;

  constructor(wsUrl: string) {
    // Conceptual WebSocket init
    // this.socket = new WebSocket(wsUrl);
  }

  /**
   * Clones a template and merges it with a live data dictionary snapshot.
   */
  public async prepareLivePayload(template: Template, dataDictionary: Record<string, any>) {
    const liveLayers = template.layers.map(layer => {
      const resolvedContent: Record<string, any> = { ...layer.content };

      // Flatten bindings into the content
      Object.entries(layer.bindings).forEach(([prop, binding]) => {
        const liveValue = this.resolveDataPath(binding.path, dataDictionary);
        resolvedContent[prop] = liveValue ?? binding.fallback;
      });

      return {
        ...layer,
        content: resolvedContent,
        // Strip metadata for the lightweight runtime
        isLive: true,
        timestamp: Date.now()
      };
    });

    return {
      templateId: template.id,
      layers: liveLayers,
      context: {
        gameId: dataDictionary.gameId,
        league: dataDictionary.league
      }
    };
  }

  public take(payload: any) {
    console.log("TAKE: Sending flattened JSON to output channel", payload);
    // this.socket?.send(JSON.stringify({ type: 'TAKE', payload }));
  }

  private resolveDataPath(path: string, obj: any) {
    return path.split('.').reduce((prev, curr) => prev?.[curr], obj);
  }
}
