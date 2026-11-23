import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../AuthContext';
import { ensureUserProfile } from '../../services/profileService';
import { supabase } from '../../supabaseClient';

const mocks = vi.hoisted(() => ({
  authStateChange: vi.fn(),
  ensureUserProfile: vi.fn(),
}));

vi.mock('../../supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: mocks.authStateChange,
    },
    from: vi.fn(() => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { role_id: 1 }, error: null }),
        }),
      }),
    })),
  },
}));

vi.mock('../../services/profileService', () => ({
  ensureUserProfile: mocks.ensureUserProfile,
}));

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ensureUserProfile.mockResolvedValue(undefined);
  });

  it('defers database requests until the auth state callback returns', async () => {
    let authCallback;
    mocks.authStateChange.mockImplementation((callback) => {
      authCallback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    render(
      <AuthProvider>
        <div>App</div>
      </AuthProvider>
    );

    const user = { id: 'user-1', email: 'user@example.com' };
    act(() => authCallback('SIGNED_IN', { user }));

    expect(ensureUserProfile).not.toHaveBeenCalled();

    await waitFor(() => expect(ensureUserProfile).toHaveBeenCalledWith(user));
    expect(supabase.from).toHaveBeenCalledWith('profiles');
  });
});
