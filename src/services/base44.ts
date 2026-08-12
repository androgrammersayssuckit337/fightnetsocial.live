import { createClient, type Base44Client } from '@base44/sdk';

let base44ClientInstance: Base44Client | null = null;

export function getBase44Client(): Base44Client {
  if (!base44ClientInstance) {
    const metaEnv = (import.meta as any)?.env || {};
    const appId = process.env.BASE44_APP_ID || metaEnv.VITE_BASE44_APP_ID || 'fightnet-base44-app';
    const apiKey = process.env.BASE44_API_KEY || metaEnv.VITE_BASE44_API_KEY || '';

    base44ClientInstance = createClient({
      appId,
      ...(apiKey ? { token: apiKey } : {}),
    });
  }
  return base44ClientInstance;
}

export const base44 = {
  getClient: getBase44Client,
  
  // Entities wrapper
  entities: {
    async list(entityName: string) {
      try {
        const client = getBase44Client();
        const handler = (client.entities as any)[entityName];
        if (handler && typeof handler.list === 'function') {
          return await handler.list();
        }
        return [];
      } catch (err) {
        console.warn(`[Base44] Could not list entity ${entityName}:`, err);
        return [];
      }
    },
    async create(entityName: string, data: Record<string, any>) {
      try {
        const client = getBase44Client();
        const handler = (client.entities as any)[entityName];
        if (handler && typeof handler.create === 'function') {
          return await handler.create(data);
        }
        return null;
      } catch (err) {
        console.error(`[Base44] Could not create entity ${entityName}:`, err);
        throw err;
      }
    }
  },

  // Functions wrapper
  functions: {
    async invoke(functionName: string, payload: Record<string, any> = {}) {
      try {
        const client = getBase44Client();
        if (client.functions && typeof (client.functions as any).invoke === 'function') {
          return await (client.functions as any).invoke(functionName, payload);
        }
        return null;
      } catch (err) {
        console.error(`[Base44] Could not invoke function ${functionName}:`, err);
        throw err;
      }
    }
  }
};
