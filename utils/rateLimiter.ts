interface RateLimitConfig {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  }
  
  export class RateLimiter {
    private requests: Map<string, number[]> = new Map();
    private config: RateLimitConfig;
  
    constructor(config?: Partial<RateLimitConfig>) {
      this.config = {
        requestsPerMinute: config?.requestsPerMinute ?? 60,  
        requestsPerHour: config?.requestsPerHour ?? 1000,   
        requestsPerDay: config?.requestsPerDay ?? 5000,      
      };
    }
  
    async checkLimit(clientId: string): Promise<boolean> {
      const now = Date.now();
      const minute = 60 * 1000;
      const hour = 60 * minute;
      const day = 24 * hour;
  
      let timestamps = this.requests.get(clientId) || [];
  
      timestamps = timestamps.filter(ts => now - ts < day);
  
      const lastMinute = timestamps.filter(ts => now - ts < minute).length;
      const lastHour = timestamps.filter(ts => now - ts < hour).length;
      const lastDay = timestamps.length; // after filtering, all are within 24 hours
  
      if (lastMinute >= this.config.requestsPerMinute) {
        console.warn(
          `Rate limit exceeded (minute) for client ${clientId}: ` +
          `${lastMinute} requests in the last minute (limit: ${this.config.requestsPerMinute})`
        );
        return false;
      }
  
      if (lastHour >= this.config.requestsPerHour) {
        console.warn(
          `Rate limit exceeded (hour) for client ${clientId}: ` +
          `${lastHour} requests in the last hour (limit: ${this.config.requestsPerHour})`
        );
        return false;
      }
  
      if (lastDay >= this.config.requestsPerDay) {
        console.warn(
          `Rate limit exceeded (day) for client ${clientId}: ` +
          `${lastDay} requests in the last day (limit: ${this.config.requestsPerDay})`
        );
        return false;
      }
  
      // If we haven't exceeded any limits, record this request and allow it
      timestamps.push(now);
      this.requests.set(clientId, timestamps);
      return true;
    }
  }
  