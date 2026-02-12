
import { FastifyPluginAsync } from 'fastify';
import { resourceStore, credentialStore } from '../../services/storage';
import { wrapSuccess, wrapError } from '../../utils/responses';

interface FetchRequest {
  resourceId: string;
  credentialId?: string;
  method?: string;
  path?: string;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  body?: any;
}

const isSafeUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    
    // Simple SSRF block
    const restricted = ['localhost', '127.0.0.1', '169.254.169.254', '0.0.0.0'];
    if (restricted.includes(hostname)) return false;
    
    // Internal ranges (basic)
    if (hostname.startsWith('10.') || hostname.startsWith('192.168.') || hostname.startsWith('172.')) return false;
    
    return true;
  } catch {
    return false;
  }
};

export const fetchRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/v1/fetch', async (request, reply) => {
    const { resourceId, credentialId, method = 'GET', path = '', query, headers = {}, body } = request.body as FetchRequest;

    const resource = await resourceStore.get(request.rl.orgId, resourceId);
    if (!resource) return reply.code(404).send(wrapError('NOT_FOUND', 'Resource not found', request.id));

    const fullUrl = new URL(path, resource.baseUrl);
    if (query) {
      Object.entries(query).forEach(([k, v]) => fullUrl.searchParams.append(k, v));
    }

    if (!isSafeUrl(fullUrl.toString())) {
      return reply.code(403).send(wrapError('FORBIDDEN', 'SSRF Guard: Restricted URL', request.id));
    }

    const finalHeaders = {
      ...resource.defaultHeaders,
      ...headers,
      'User-Agent': 'Renderless-Gateway/1.0',
    };

    if (credentialId) {
      const cred = await credentialStore.get(request.rl.orgId, credentialId);
      if (!cred) return reply.code(404).send(wrapError('NOT_FOUND', 'Credential not found', request.id));

      const { secrets, type } = cred;
      if (type === 'apiKeyHeader' && secrets.headerName && secrets.headerValue) {
        finalHeaders[secrets.headerName] = secrets.headerValue;
      } else if (type === 'bearer' && secrets.bearerToken) {
        finalHeaders['Authorization'] = `Bearer ${secrets.bearerToken}`;
      } else if (type === 'queryParam' && secrets.queryParamName && secrets.queryParamValue) {
        fullUrl.searchParams.append(secrets.queryParamName, secrets.queryParamValue);
      }
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(fullUrl.toString(), {
        method,
        headers: finalHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();
      let responseBody;
      try {
        responseBody = JSON.parse(responseText);
      } catch {
        responseBody = responseText;
      }

      return wrapSuccess({
        status: response.status,
        headers: {
          'content-type': response.headers.get('content-type')
        },
        body: responseBody
      }, request.id);
    } catch (e: any) {
      return reply.code(502).send(wrapError('UPSTREAM_ERROR', e.message, request.id));
    }
  });
};
