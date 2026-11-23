import { beforeEach, describe, expect, it, vi } from 'vitest';
import { projectService } from '../projectService';
import { ensureUserProfile } from '../profileService';
import { supabase } from '../../supabaseClient';

const mocks = vi.hoisted(() => ({
  ensureUserProfile: vi.fn(),
  from: vi.fn(),
}));

vi.mock('../../supabaseClient', () => ({
  supabase: { from: mocks.from },
}));

vi.mock('../profileService', () => ({
  ensureUserProfile: mocks.ensureUserProfile,
}));

describe('projectService.create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ensureUserProfile.mockResolvedValue(undefined);
  });

  it('ensures the author profile exists before inserting a project', async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: 'project-1' },
      error: null,
    });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    mocks.from.mockReturnValue({ insert });
    const user = { id: 'user-1' };
    const project = { author_id: user.id, title: 'A project' };

    await projectService.create(project, user);

    expect(ensureUserProfile).toHaveBeenCalledWith(user);
    expect(supabase.from).toHaveBeenCalledWith('projects');
    expect(ensureUserProfile.mock.invocationCallOrder[0]).toBeLessThan(
      supabase.from.mock.invocationCallOrder[0]
    );
    expect(insert).toHaveBeenCalledWith([project]);
  });

  it('does not insert when the author profile cannot be ensured', async () => {
    mocks.ensureUserProfile.mockRejectedValue(new Error('Profile initialization failed'));

    await expect(
      projectService.create({ author_id: 'user-1' }, { id: 'user-1' })
    ).rejects.toThrow('Profile initialization failed');

    expect(supabase.from).not.toHaveBeenCalled();
  });
});
