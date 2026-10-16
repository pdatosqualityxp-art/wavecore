import { supabase } from './supabase';

export class MissingSessionError extends Error {
  constructor() {
    super('No active Supabase session');
    this.name = 'MissingSessionError';
  }
}

export async function getAuthorizationHeader(): Promise<{ Authorization: string }> {
  try {
    const { data, error } = await supabase.auth.getSession();
    const session = data.session;
    if (
      error
      || !session?.access_token
      || (session.expires_at !== undefined && session.expires_at <= Date.now() / 1000)
    ) {
      throw new MissingSessionError();
    }
    return { Authorization: `Bearer ${session.access_token}` };
  } catch {
    throw new MissingSessionError();
  }
}
