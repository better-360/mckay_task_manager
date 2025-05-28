import {OpenAIAdapter, copilotRuntimeNextJSAppRouterEndpoint} from '@copilotkit/runtime';

import { NextRequest } from 'next/server';
import { runtime } from '../../../lib/agent/runtime';

const serviceAdapter = new OpenAIAdapter({
  model: 'gpt-4o-mini',
});


export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: '/api/copilotkit',
  });

  return handleRequest(req);
};
