// Runtime configuration - używa window.env jeśli dostępne (z Easypanel)
declare const window: {
  env?: { apiUrl?: string; production?: boolean };
};

function getEnvValue(key: 'apiUrl', defaultValue: string): string {
  if (typeof window !== 'undefined' && window.env?.[key]) {
    return window.env[key] as string;
  }
  return defaultValue;
}

export const environment = {
  production: false,
  get apiUrl() {
    return getEnvValue('apiUrl', 'http://localhost:3000').replace(/\/$/, '');
  },
};
