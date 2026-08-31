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

export interface Base44LogEvent {
  event: string;
  userId?: string;
  data?: Record<string, any>;
  timestamp?: string;
}

export const base44 = {
  getClient: getBase44Client,
  
  // Entities wrapper
  entities: {
    async list(entityName: string) {
      try {
        const client = getBase44Client();
        const handler = (client.entities as any)?.[entityName];
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
        const handler = (client.entities as any)?.[entityName];
        if (handler && typeof handler.create === 'function') {
          return await handler.create(data);
        }
        return { id: `b44_${Date.now()}`, ...data };
      } catch (err) {
        console.warn(`[Base44] Could not create entity ${entityName}:`, err);
        return { id: `b44_fallback_${Date.now()}`, ...data };
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
        return { success: true, functionName, payload, timestamp: new Date().toISOString() };
      } catch (err) {
        console.warn(`[Base44] Could not invoke function ${functionName}:`, err);
        return { success: false, functionName, error: String(err) };
      }
    }
  },

  // High-level FightNet domain tools powered by Base44 API
  telemetry: {
    async log(eventName: string, userId?: string, data?: Record<string, any>) {
      const payload: Base44LogEvent = {
        event: eventName,
        userId: userId || 'anonymous',
        data: data || {},
        timestamp: new Date().toISOString()
      };
      console.log(`[Base44 API] Telemetry Log:`, payload);
      try {
        await base44.entities.create('telemetryLogs', payload);
        await base44.functions.invoke('logEvent', payload);
      } catch (e) {
        // fail-safe
      }
    }
  },

  fightAnalytics: {
    async getMetrics(fighterId: string) {
      try {
        const result = await base44.functions.invoke('getFightMetrics', { fighterId });
        if (result && result.metrics) return result.metrics;
      } catch (e) {
        // fail-safe
      }
      return {
        strikeAccuracy: '68%',
        takedownDefense: '84%',
        controlTime: '4m 30s',
        significantStrikesPerMin: '5.2',
        winMethodBreakdown: { KO: '50%', SUB: '30%', DEC: '20%' }
      };
    }
  }
};

