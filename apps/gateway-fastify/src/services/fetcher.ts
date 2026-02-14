
import { resourceStore, credentialStore } from './storage';

export interface FetcherParams {
  orgId: string;
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
    // Allow mock protocol for internal testing
    if (parsed.protocol === 'mock:') return true;

    const hostname = parsed.hostname.toLowerCase();
    const restricted = ['localhost', '127.0.0.1', '169.254.169.254', '0.0.0.0'];
    if (restricted.includes(hostname)) return false;
    if (hostname.startsWith('10.') || hostname.startsWith('192.168.') || hostname.startsWith('172.')) return false;
    return true;
  } catch {
    return false;
  }
};

/**
 * ITEM 17: Mock data for MLB demo
 */
const MOCK_MLB_PAYLOAD = {
  gameId: "mlb_demo_7721",
  status: "live",
  home: { id: "SEA", abbr: "SEA", name: "Seattle Seahawks", runs: 5, hits: 9, errors: 0 },
  away: { id: "NYY", abbr: "NYY", name: "New York Yankees", runs: 3, hits: 6, errors: 1 },
  inning: { number: 8, half: "top" },
  count: { balls: 2, strikes: 1, outs: 2 },
  bases: { first: true, second: false, third: false },
  lastEvent: { type: "strikeout", summary: "Geno Smith strikes out swinging.", ts: Date.now() }
};

export async function internalFetch(params: FetcherParams) {
  const { orgId, resourceId, credentialId, method = 'GET', path = '', query, headers = {}, body } = params;

  const resource = await resourceStore.get(orgId, resourceId);
  if (!resource) throw new Error('Resource not found');

  // ITEM 17: Mock Protocol Interception
  if (resource.baseUrl.startsWith('mock://')) {
    const mockType = resource.baseUrl.replace('mock://', '');
    if (mockType === 'mlb') {
      return {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: MOCK_MLB_PAYLOAD
      };
    }
    throw new Error(`Unknown mock provider: ${mockType}`);
  }

  const fullUrl = new URL(path, resource.baseUrl);
  if (query) {
    Object.entries(query).forEach(([k, v]) => fullUrl.searchParams.append(k, v));
  }

  if (!isSafeUrl(fullUrl.toString())) {
    throw new Error('SSRF Guard: Restricted URL');
  }

  const finalHeaders: Record<string, string> = {
    ...resource.defaultHeaders,
    ...headers,
    'User-Agent': 'Renderless-Gateway/1.0',
  };

  if (credentialId) {
    const cred = await credentialStore.get(orgId, credentialId);
    if (!cred) throw new Error('Credential not found');

    const { secrets, type } = cred;
    if (type === 'apiKeyHeader' && secrets.headerName && secrets.headerValue) {
      finalHeaders[secrets.headerName] = secrets.headerValue;
    } else if (type === 'bearer' && secrets.bearerToken) {
      finalHeaders['Authorization'] = `Bearer ${secrets.bearerToken}`;
    } else if (type === 'queryParam' && secrets.queryParamName && secrets.queryParamValue) {
      fullUrl.searchParams.append(secrets.queryParamName, secrets.queryParamValue);
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
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

    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseBody
    };
  } catch (e: any) {
    clearTimeout(timeoutId);
    throw e;
  }
}
