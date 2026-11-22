import { supabase } from '../supabaseClient';

export const ensureUserProfile = async (user) => {
  if (!user?.id) {
    throw new Error('A valid authenticated user is required to initialize a profile.');
  }

  const metadata = user.user_metadata || {};
  const profileFields = {
    full_name: metadata.full_name || metadata.name || user.email?.split('@')[0] || null,
    username: metadata.username || null,
    email: user.email || null,
  };

  const { error: upsertError } = await supabase
    .from('profiles')
    .upsert(
      { id: user.id, ...profileFields },
      { onConflict: 'id', ignoreDuplicates: true }
    );

  if (upsertError) throw upsertError;

  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('full_name, username, email')
    .eq('id', user.id)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!profile) throw new Error(`Profile record was not created for user ${user.id}.`);

  const missingFields = Object.fromEntries(
    Object.entries(profileFields).filter(([field, value]) => value && !profile[field])
  );

  if (Object.keys(missingFields).length > 0) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update(missingFields)
      .eq('id', user.id);

    if (updateError) throw updateError;
  }
};
