// Runtime configuration - używa window.env jeśli dostępne (z Easypanel)
declare const window: {
  env?: { apiUrl?: string; production?: boolean };
};

function getEnvValue(key: 'apiUrl', defaultValue: string): string {
  if (typeof window !== 'undefined' && window.env && key in window.env) {
    return String(window.env[key] ?? '');
  }
  return defaultValue;
}

export const environment = {
  production: false,
  get apiUrl() {
    return getEnvValue('apiUrl', 'http://localhost:3000').replace(/\/$/, '');
  },
};
