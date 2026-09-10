import mongoose from 'mongoose';

/**
 * Jak w harvest-moon: MONGO_URL / MONGODB_URI, auto-encode hasła ($ → %24),
 * authSource=admin dla Easypanel.
 */
export function normalizeMongoUri(rawUri) {
  let uri =
    rawUri ||
    process.env.MONGO_URL ||
    process.env.MONGODB_URI ||
    'mongodb://127.0.0.1:27017/jazdy-konne';

  const uriMatch = uri.match(/^(mongodb(\+srv)?:\/\/)([^:]+):([^@]+)@(.+)$/);
  if (uriMatch) {
    const [, protocol, , user, password, rest] = uriMatch;
    const encodedPassword = password.includes('%') ? password : encodeURIComponent(password);
    uri = `${protocol}${user}:${encodedPassword}@${rest}`;
  }

  if (uri.includes('@') && !uri.includes('authSource=')) {
    const separator = uri.includes('?') ? '&' : '?';
    uri = `${uri}${separator}authSource=admin`;
    console.log('Dodano authSource=admin do URI (automatyczna korekta)');
  }

  return uri;
}

export function mongoDbName(uri) {
  if (process.env.MONGODB_DB) return process.env.MONGODB_DB;
  const withoutProtocol = uri.replace(/^mongodb(\+srv)?:\/\//, '');
  const pathPart = withoutProtocol.split('/').slice(1).join('/');
  const name = (pathPart || '').split('?')[0];
  return name || 'jazdy-konne';
}

export function safeMongoUri(uri) {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
}

export async function connectDb() {
  mongoose.set('strictQuery', true);
  const uri = normalizeMongoUri();

  if (uri.includes('localhost') && process.env.NODE_ENV === 'production') {
    console.warn('Używasz localhost w produkcji. W Easypanel użyj wewnętrznego hosta (np. home-stack_mongo-db)');
  }

  console.log('Próba połączenia z MongoDB...');
  console.log('URI (bez hasła):', safeMongoUri(uri));

  await mongoose.connect(uri, {
    dbName: mongoDbName(uri),
    serverSelectionTimeoutMS: 10000,
  });

  console.log('Połączono z MongoDB');
  console.log('Baza danych:', mongoDbName(uri));
}

export async function pingDb() {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) return false;
  await mongoose.connection.db.admin().command({ ping: 1 });
  return true;
}
