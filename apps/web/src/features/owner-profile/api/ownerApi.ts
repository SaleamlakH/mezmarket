import type { SupabaseClient } from '@supabase/supabase-js';
import type { OwnerResponse, UpdateOwnerInput } from '@mez/types';

export type OwnerApi = {
  getOwnerProfile(): Promise<OwnerResponse>;
  updateOwnerProfile(data: UpdateOwnerInput): Promise<OwnerResponse>;
};

export function createOwnerApi(client: SupabaseClient): OwnerApi {
  async function authHeaders() {
    const {
      data: { session },
    } = await client.auth.getSession();

    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    return {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    };
  }

  return {
    async getOwnerProfile() {
      const headers = await authHeaders();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/owner`, { headers });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? 'Failed to load profile');
      }

      return res.json();
    },

    async updateOwnerProfile(data: UpdateOwnerInput) {
      const headers = await authHeaders();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/owner`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? 'Failed to update profile');
      }

      return res.json();
    },
  };
}
