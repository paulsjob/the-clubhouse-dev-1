
export interface DeployRequestV1 {
  outputId: string;
  route: string;
}

export interface DeployResponseV1 {
  deploymentId: string;
  outputId: string;
  route: string;
  status: 'registered' | 'active' | 'failed';
  createdAt: number;
}
