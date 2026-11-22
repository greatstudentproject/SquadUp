import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureUserProfile } from '../profileService';
import { supabase } from '../../supabaseClient';

const mockQuery = {
  upsert: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
  update: vi.fn(),
};

vi.mock('../../supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => mockQuery),
  },
}));

describe('ensureUserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.upsert.mockResolvedValue({ error: null });
    mockQuery.select.mockReturnThis();
    mockQuery.eq.mockReturnThis();
    mockQuery.update.mockReturnThis();
  });

  it('creates a profile from the authenticated user metadata', async () => {
    mockQuery.maybeSingle.mockResolvedValue({
      data: { full_name: 'Jan Kowalski', username: 'janek', email: 'jan@example.com' },
      error: null,
    });

    await ensureUserProfile({
      id: 'user-1',
      email: 'jan@example.com',
      user_metadata: { full_name: 'Jan Kowalski', username: 'janek' },
    });

    expect(supabase.from).toHaveBeenCalledWith('profiles');
    expect(mockQuery.upsert).toHaveBeenCalledWith(
      {
        id: 'user-1',
        full_name: 'Jan Kowalski',
        username: 'janek',
        email: 'jan@example.com',
      },
      { onConflict: 'id', ignoreDuplicates: true }
    );
    expect(mockQuery.update).not.toHaveBeenCalled();
  });

  it('fills only missing profile fields without overwriting existing values', async () => {
    mockQuery.maybeSingle.mockResolvedValue({
      data: { full_name: 'Updated Name', username: null, email: 'jan@example.com' },
      error: null,
    });
    mockQuery.update.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    await ensureUserProfile({
      id: 'user-1',
      email: 'jan@example.com',
      user_metadata: { full_name: 'Old Name', username: 'janek' },
    });

    expect(mockQuery.update).toHaveBeenCalledWith({ username: 'janek' });
    expect(mockQuery.eq).toHaveBeenLastCalledWith('id', 'user-1');
  });
});
