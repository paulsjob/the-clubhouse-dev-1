
export interface CredentialMetadata {
  id: string;
  orgId: string;
  name: string;
  provider: string;
  type: string;
  createdAt: number;
  isActive: boolean;
}

export interface CredentialSecrets {
  apiKey?: string;
  bearerToken?: string;
  headerName?: string;
  headerValue?: string;
  queryParamName?: string;
  queryParamValue?: string;
}

export interface Credential extends CredentialMetadata {
  secrets: CredentialSecrets;
}
