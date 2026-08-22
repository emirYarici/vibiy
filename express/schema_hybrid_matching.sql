-- ==============================================================================
-- 🎬 VIBIY HYBRID MATCHING ENGINE (70% Mood + 30% Core Persona)
-- ==============================================================================
-- Computes compatibility by weighting:
--   1. 70% Weight: Spontaneous Daily Mood (User's last 3 videos from yesterday / recent)
--   2. 30% Weight: Rolling Core Persona (User's last 20 videos all-time history)
-- Capped to Top 3 Matches per User per Day to ensure high intent and zero ghosting.
-- ==============================================================================

-- ==============================================================================
-- 1. REAL-TIME CANDIDATE MATCH SEARCH (For an active logged-in user)
-- ==============================================================================
create or replace function public.find_vibe_matches_for_user(
  p_user_id uuid,
  p_max_distance_meters double precision default 50000, -- 50 km default radius
  p_similarity_threshold double precision default 0.50, -- 50% minimum similarity threshold
  p_match_limit int default 3,                          -- Top 3 curated drops
  p_max_active_matches int default 3                   -- Maximum active matches cap
)
returns table (
  candidate_id uuid,
  full_name text,
  age int,
  bio text,
  photos text[],
  gender text,
  distance_meters double precision,
  distance_km double precision,
  similarity_score double precision,
  similarity_percentage int,
  candidate_video_count int
)
language plpgsql
security definer
as $$
declare
  v_user_location geography;
  v_user_gender text;
  v_user_preference text;
  v_active_match_count int;
  v_yesterday_start timestamptz := date_trunc('day', now() - interval '1 day');
  v_yesterday_end   timestamptz := date_trunc('day', now());
begin
  -- 1. Fetch current user's profile
  select location, gender, preference
  into v_user_location, v_user_gender, v_user_preference
  from public.profiles
  where id = p_user_id;

  if v_user_location is null then
    raise exception 'User location is not set for user %', p_user_id;
  end if;

  -- 2. Check if current user already has reached the active match limit
  select count(*)
  into v_active_match_count
  from public.matches m
  where (m.user_a = p_user_id or m.user_b = p_user_id)
    and m.status = 'active';

  if v_active_match_count >= p_max_active_matches then
    -- User already has max active matches, return no new candidates
    return;
  end if;

  return query
  with
  -- 3a. Fetch Current User's MOOD videos (3 videos from yesterday, fallback to latest 3)
  user_mood_yesterday as (
    select uv.video_id, v.embedding
    from public.userid_videos uv
    join public.videos v on v.id = uv.video_id
    where uv.user_id = p_user_id
      and uv.created_at >= v_yesterday_start
      and uv.created_at < v_yesterday_end
      and v.embedding is not null
    order by uv.created_at desc
    limit 3
  ),
  user_mood_resolved as (
    select * from user_mood_yesterday
    union all
    select uv.video_id, v.embedding
    from public.userid_videos uv
    join public.videos v on v.id = uv.video_id
    where uv.user_id = p_user_id
      and v.embedding is not null
      and not exists (select 1 from user_mood_yesterday)
    order by uv.created_at desc
    limit 3
  ),

  -- 3b. Fetch Current User's CORE PERSONA videos (Rolling last 20 videos)
  user_core_resolved as (
    select uv.video_id, v.embedding
    from public.userid_videos uv
    join public.videos v on v.id = uv.video_id
    where uv.user_id = p_user_id
      and v.embedding is not null
    order by uv.created_at desc
    limit 20
  ),

  -- 4. Filter candidate users using GiST Geo-Index, Mutual Preferences, Matches & Block Lists
  nearby_candidates as (
    select 
      p.id as candidate_id,
      p.full_name,
      p.age,
      p.bio,
      p.photos,
      p.gender,
      st_distance(p.location, v_user_location) as distance_meters
    from public.profiles p
    where p.id != p_user_id
      and p.location is not null
      -- Geo-index acceleration (uses profiles_location_idx)
      and st_dwithin(p.location, v_user_location, p_max_distance_meters)
      
      -- Mutual preference filtering
      and (
        v_user_preference = 'everyone' 
        or (v_user_preference = 'men' and p.gender = 'man')
        or (v_user_preference = 'women' and p.gender = 'woman')
      )
      and (
        p.preference = 'everyone'
        or (p.preference = 'men' and v_user_gender = 'man')
        or (p.preference = 'women' and v_user_gender = 'woman')
      )
      
      -- Exclude users already matched in public.matches (active or unmatched)
      and not exists (
        select 1 from public.matches m
        where (m.user_a = least(p_user_id, p.id) and m.user_b = greatest(p_user_id, p.id))
      )

      -- Exclude blocked users (either direction)
      and not exists (
        select 1 from public.blocked_users b
        where (b.blocker_id = p_user_id and b.blocked_user_id = p.id)
           or (b.blocker_id = p.id and b.blocked_user_id = p_user_id)
      )

      -- Candidate must also not have exceeded active match limit
      and (
        select count(*)
        from public.matches m
        where (m.user_a = p.id or m.user_b = p.id)
          and m.status = 'active'
      ) < p_max_active_matches
  ),

  -- 5. Candidate Videos Partitioning (Mood: top 3 yesterday/latest, Core: rolling top 20)
  candidate_videos_indexed as (
    select 
      nc.candidate_id,
      uv.video_id,
      v.embedding,
      row_number() over (
        partition by nc.candidate_id 
        order by (uv.created_at >= v_yesterday_start and uv.created_at < v_yesterday_end) desc, uv.created_at desc
      ) as rn_mood,
      row_number() over (
        partition by nc.candidate_id 
        order by uv.created_at desc
      ) as rn_core
    from nearby_candidates nc
    join public.userid_videos uv on uv.user_id = nc.candidate_id
    join public.videos v on v.id = uv.video_id
    where v.embedding is not null
  ),
  candidate_mood_videos as (
    select candidate_id, video_id, embedding
    from candidate_videos_indexed
    where rn_mood <= 3
  ),
  candidate_core_videos as (
    select candidate_id, video_id, embedding
    from candidate_videos_indexed
    where rn_core <= 20
  ),

  -- 6a. Daily Mood Cosine Similarity (Last 3 Videos vs Last 3 Videos)
  mood_similarity_scores as (
    select 
      cmv.candidate_id,
      count(distinct cmv.video_id) as candidate_video_count,
      avg(1.0 - (umr.embedding <=> cmv.embedding)) as mood_sim
    from user_mood_resolved umr
    join candidate_mood_videos cmv on true
    group by cmv.candidate_id
  ),

  -- 6b. Core Persona Cosine Similarity (Rolling 20 Videos vs Rolling 20 Videos)
  core_similarity_scores as (
    select 
      ccv.candidate_id,
      avg(1.0 - (ucr.embedding <=> ccv.embedding)) as core_sim
    from user_core_resolved ucr
    join candidate_core_videos ccv on true
    group by ccv.candidate_id
  ),

  -- 6c. Combine: 70% Mood + 30% Core Persona
  hybrid_scores as (
    select 
      ms.candidate_id,
      ms.candidate_video_count,
      (0.70 * ms.mood_sim + 0.30 * coalesce(cs.core_sim, ms.mood_sim)) as overall_similarity
    from mood_similarity_scores ms
    left join core_similarity_scores cs on cs.candidate_id = ms.candidate_id
    where (0.70 * ms.mood_sim + 0.30 * coalesce(cs.core_sim, ms.mood_sim)) >= p_similarity_threshold
  )

  -- 7. Return Top 3 Candidate Records ordered by highest hybrid similarity
  select 
    nc.candidate_id,
    nc.full_name,
    nc.age,
    nc.bio,
    nc.photos,
    nc.gender,
    round(nc.distance_meters::numeric, 0)::double precision as distance_meters,
    round((nc.distance_meters / 1000.0)::numeric, 1)::double precision as distance_km,
    round(hs.overall_similarity::numeric, 4)::double precision as similarity_score,
    round(hs.overall_similarity * 100)::int as similarity_percentage,
    hs.candidate_video_count::int
  from hybrid_scores hs
  join nearby_candidates nc on nc.candidate_id = hs.candidate_id
  order by hs.overall_similarity desc, nc.distance_meters asc
  limit least(p_match_limit, p_max_active_matches - v_active_match_count);

end;
$$;


-- ==============================================================================
-- 2. AUTOMATED DAILY BATCH MATCHING (Inserts into public.matches, capped at 3)
-- ==============================================================================
create or replace function public.generate_daily_matches(
  p_max_distance_meters double precision default 50000,
  p_min_similarity double precision default 0.60,
  p_max_matches_per_user int default 3
)
returns int
language plpgsql
security definer
as $$
declare
  v_inserted_count int := 0;
  v_yesterday_start timestamptz := date_trunc('day', now() - interval '1 day');
  v_yesterday_end   timestamptz := date_trunc('day', now());
begin
  with 
  -- 1a. User Mood Videos (Latest 3 from yesterday)
  user_mood_videos as (
    select 
      uv.user_id,
      uv.video_id,
      v.embedding,
      row_number() over (partition by uv.user_id order by uv.created_at desc) as rn
    from public.userid_videos uv
    join public.videos v on v.id = uv.video_id
    where uv.created_at >= v_yesterday_start
      and uv.created_at < v_yesterday_end
      and v.embedding is not null
  ),
  eligible_mood_videos as (
    select user_id, video_id, embedding
    from user_mood_videos
    where rn <= 3
  ),

  -- 1b. User Core Persona Videos (Rolling last 20 videos)
  user_core_videos as (
    select 
      uv.user_id,
      uv.video_id,
      v.embedding,
      row_number() over (partition by uv.user_id order by uv.created_at desc) as rn
    from public.userid_videos uv
    join public.videos v on v.id = uv.video_id
    where v.embedding is not null
  ),
  eligible_core_videos as (
    select user_id, video_id, embedding
    from user_core_videos
    where rn <= 20
  ),

  -- 2. Spatial & Mutual Preference User Pair Filtering
  valid_pairs as (
    select 
      p1.id as user_a,
      p2.id as user_b
    from public.profiles p1
    join public.profiles p2 on p1.id < p2.id  -- Guarantees user_a < user_b constraint
    where p1.location is not null 
      and p2.location is not null
      and st_dwithin(p1.location, p2.location, p_max_distance_meters)
      
      -- Preference matching
      and (
        p1.preference = 'everyone' 
        or (p1.preference = 'men' and p2.gender = 'man')
        or (p1.preference = 'women' and p2.gender = 'woman')
      )
      and (
        p2.preference = 'everyone'
        or (p2.preference = 'men' and p1.gender = 'man')
        or (p2.preference = 'women' and p1.gender = 'woman')
      )
      
      -- Both users must have shared videos yesterday (Mood eligibility)
      and exists (select 1 from eligible_mood_videos where user_id = p1.id)
      and exists (select 1 from eligible_mood_videos where user_id = p2.id)
      
      -- Exclude existing matches
      and not exists (
        select 1 from public.matches m
        where m.user_a = p1.id and m.user_b = p2.id
      )

      -- Exclude blocked users (either direction)
      and not exists (
        select 1 from public.blocked_users b
        where (b.blocker_id = p1.id and b.blocked_user_id = p2.id)
           or (b.blocker_id = p2.id and b.blocked_user_id = p1.id)
      )

      -- Exclude users who already have >= p_max_matches_per_user active matches
      and (
        select count(*) from public.matches m 
        where (m.user_a = p1.id or m.user_b = p1.id) and m.status = 'active'
      ) < p_max_matches_per_user
      and (
        select count(*) from public.matches m 
        where (m.user_a = p2.id or m.user_b = p2.id) and m.status = 'active'
      ) < p_max_matches_per_user
  ),

  -- 3a. Daily Mood Pairwise Cosine Similarity (3x3 videos)
  mood_scored_pairs as (
    select 
      vp.user_a,
      vp.user_b,
      avg(1.0 - (uva.embedding <=> uvb.embedding)) as mood_sim
    from valid_pairs vp
    join eligible_mood_videos uva on uva.user_id = vp.user_a
    join eligible_mood_videos uvb on uvb.user_id = vp.user_b
    group by vp.user_a, vp.user_b
  ),

  -- 3b. Core Persona Pairwise Cosine Similarity (Rolling 20x20 videos)
  core_scored_pairs as (
    select 
      vp.user_a,
      vp.user_b,
      avg(1.0 - (uva.embedding <=> uvb.embedding)) as core_sim
    from valid_pairs vp
    join eligible_core_videos uva on uva.user_id = vp.user_a
    join eligible_core_videos uvb on uvb.user_id = vp.user_b
    group by vp.user_a, vp.user_b
  ),

  -- 3c. Hybrid Combination: 70% Mood + 30% Core Persona
  hybrid_scored_pairs as (
    select 
      msp.user_a,
      msp.user_b,
      (0.70 * msp.mood_sim + 0.30 * coalesce(csp.core_sim, msp.mood_sim)) as similarity_score
    from mood_scored_pairs msp
    left join core_scored_pairs csp on csp.user_a = msp.user_a and csp.user_b = msp.user_b
    where (0.70 * msp.mood_sim + 0.30 * coalesce(csp.core_sim, msp.mood_sim)) >= p_min_similarity
  ),

  -- 4. Rank Pairs and Cap to Top 3 Matches per User
  ranked_pairs as (
    select 
      user_a,
      user_b,
      similarity_score,
      row_number() over (partition by user_a order by similarity_score desc) as rn_a,
      row_number() over (partition by user_b order by similarity_score desc) as rn_b
    from hybrid_scored_pairs
  ),

  -- 5. Bulk Insert into matches (Filtered by top 3 cap)
  inserted as (
    insert into public.matches (user_a, user_b, similarity_score, status)
    select 
      user_a, 
      user_b, 
      round(similarity_score::numeric, 4)::double precision, 
      'active'
    from ranked_pairs
    where rn_a <= p_max_matches_per_user 
      and rn_b <= p_max_matches_per_user
    on conflict (user_a, user_b) do nothing
    returning id
  )
  select count(*) into v_inserted_count from inserted;

  return v_inserted_count;
end;
$$;
