import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

// The supabase client is built from VITE_ env vars at module load, which CI
// does not have. Mock it once here so no test pulls in the real client just
// because it imports apiClient (which imports it for auth headers).
vi.mock('@/lib/supabase', () => ({
  supabaseClient: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    },
  },
}));

// jsdom does not implement the object url api, so a picked image preview would
// throw. Each call returns a distinct url to mirror the browser, which lets a
// test assert that a superseded url was revoked rather than recreated.
let objectUrlCount = 0;

URL.createObjectURL = vi.fn(() => `blob:preview/${(objectUrlCount += 1)}`);
URL.revokeObjectURL = vi.fn();

afterEach(() => {
  cleanup();
  objectUrlCount = 0;
  vi.mocked(URL.createObjectURL).mockClear();
  vi.mocked(URL.revokeObjectURL).mockClear();
});
