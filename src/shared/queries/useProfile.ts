import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../api/supabase';
import { DBProfile } from '../types';

export const PROFILE_QUERY_KEYS = {
  detail: (userId: string) => ['profile', userId] as const,
};

export function useProfile(userId: string, isDemoMode = false) {
  return useQuery({
    queryKey: PROFILE_QUERY_KEYS.detail(userId),
    queryFn: async (): Promise<DBProfile> => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Demo fallback
      if (isDemoMode || !isSupabaseConfigured) {
        const cachedName = await AsyncStorage.getItem('@profile_name');
        const cachedBio = await AsyncStorage.getItem('@profile_bio');
        const cachedAge = await AsyncStorage.getItem('@profile_age');
        const cachedOccupation = await AsyncStorage.getItem('@profile_occupation');
        const cachedGender = await AsyncStorage.getItem('@profile_gender');
        const cachedPreference = await AsyncStorage.getItem('@profile_preference');
        const cachedPhotos = await AsyncStorage.getItem('@profile_photos');

        const photos = cachedPhotos ? JSON.parse(cachedPhotos) : [];

        return {
          id: userId,
          full_name: cachedName || '',
          bio: cachedBio || '',
          age: cachedAge ? Number(cachedAge) : undefined,
          occupation: cachedOccupation || '',
          gender: (cachedGender as any) || undefined,
          preference: (cachedPreference as any) || undefined,
          photos: photos.filter(Boolean),
        };
      }

      // Live Supabase query
      const { data, error } = await supabase
        .from('profiles')
        .select('id, location, full_name, bio, age, gender, preference, photos')
        .eq('id', userId)
        .single();

      if (error || !data) {
        return {
          id: userId,
          full_name: '',
          bio: '',
          photos: [],
        };
      }

      return {
        id: data.id,
        full_name: data.full_name || '',
        bio: data.bio || '',
        age: data.age || undefined,
        gender: data.gender || undefined,
        preference: data.preference || undefined,
        photos: data.photos || [],
        location: data.location,
      };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes cache TTL
  });
}

interface UpdateProfileParams {
  userId: string;
  name: string;
  bio: string;
  age: string;
  occupation?: string;
  gender: 'man' | 'woman' | 'non_binary' | null;
  preference: 'men' | 'women' | 'everyone' | null;
  photos: (string | null)[];
  latitude: number | null;
  longitude: number | null;
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateProfileParams) => {
      const {
        userId,
        name,
        bio,
        age,
        occupation,
        gender,
        preference,
        photos,
        latitude,
        longitude,
      } = params;

      // Always save to AsyncStorage for quick offline access
      await AsyncStorage.setItem('@profile_name', name);
      await AsyncStorage.setItem('@profile_bio', bio);
      await AsyncStorage.setItem('@profile_age', age);
      if (occupation) await AsyncStorage.setItem('@profile_occupation', occupation);
      if (gender) await AsyncStorage.setItem('@profile_gender', gender);
      if (preference) await AsyncStorage.setItem('@profile_preference', preference);
      await AsyncStorage.setItem('@profile_photos', JSON.stringify(photos));
      if (latitude !== null) await AsyncStorage.setItem('@profile_latitude', String(latitude));
      if (longitude !== null) await AsyncStorage.setItem('@profile_longitude', String(longitude));

      // Live Supabase sync
      if (userId && isSupabaseConfigured) {
        const updateData: any = {
          full_name: name,
          bio,
          age: Number(age) || 18,
          gender,
          preference,
          photos: photos.filter(Boolean),
          updated_at: new Date().toISOString(),
        };

        if (latitude !== null && longitude !== null) {
          updateData.location = `POINT(${longitude} ${latitude})`;
        }

        const { error } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            ...updateData,
          }, { onConflict: 'id' });

        if (error) {
          throw error;
        }
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate active profile cache to refresh views
      queryClient.invalidateQueries({
        queryKey: PROFILE_QUERY_KEYS.detail(variables.userId),
      });
    },
  });
}
