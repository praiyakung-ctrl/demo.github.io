import apiConnectionsData from '../data/apiConnections.json';

export type ApiType = 'camera' | 'oauth' | 'ldap' | 'rest';
export type ApiStatus = 'connected' | 'disconnected' | 'error';

export interface ApiConnection {
  id: string;
  name: string;
  type: ApiType;
  endpoint: string;
  config: Record<string, string>;
  enabled: boolean;
  status: ApiStatus;
  lastChecked: string;
}

export const API_TYPE_LABELS: Record<ApiType, string> = {
  camera: 'Live Camera',
  oauth: 'Google OAuth 2.0',
  ldap: 'LDAP',
  rest: 'REST API',
};

/* Per-type config fields rendered in the add/edit modal */
export const API_TYPE_FIELDS: Record<ApiType, { key: string; label: string; secret?: boolean; placeholder: string }[]> = {
  camera: [
    { key: 'streamUrl', label: 'Stream URL (RTSP)', placeholder: 'rtsp://server:554' },
    { key: 'hlsUrl', label: 'HLS URL', placeholder: 'https://server/hls' },
  ],
  oauth: [
    { key: 'clientId', label: 'Client ID', placeholder: 'xxx.apps.googleusercontent.com' },
    { key: 'clientSecret', label: 'Client Secret', secret: true, placeholder: 'GOCSPX-...' },
    { key: 'redirectUri', label: 'Redirect URI', placeholder: 'https://your-app/auth/callback' },
  ],
  ldap: [
    { key: 'serverUrl', label: 'Server URL', placeholder: 'ldap://server:389' },
    { key: 'baseDn', label: 'Base DN', placeholder: 'dc=example,dc=go,dc=th' },
    { key: 'bindDn', label: 'Bind DN', placeholder: 'cn=service,ou=services,dc=example' },
  ],
  rest: [
    { key: 'baseUrl', label: 'Base URL', placeholder: 'https://api.example.com/v1' },
    { key: 'apiKey', label: 'API Key', secret: true, placeholder: 'api-key' },
  ],
};

const CONNECTIONS_KEY = 'api_connections';
const SEED = apiConnectionsData as unknown as ApiConnection[];

export function savedConnections(): ApiConnection[] {
  try {
    const raw = localStorage.getItem(CONNECTIONS_KEY);
    if (!raw) return SEED;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED;
  } catch {
    return SEED;
  }
}

export function saveConnections(connections: ApiConnection[]): void {
  localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(connections));
}
