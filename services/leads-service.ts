import { createClient } from '@/lib/supabase/client';
import {
  WeddingLead,
  RestaurantLead,
  WeddingFilterOptions,
  PlacesFilterOptions,
  LeadUserMeta,
  OutreachStatus,
} from '@/types/leads';

const USER_META_STORAGE_PREFIX = 'lead_meta_';

export function getLeadUserMeta(type: string, id: string | number, lead?: WeddingLead | RestaurantLead | null): LeadUserMeta {
  if (lead) {
    const rawStatus = (lead.status as OutreachStatus) || 'new';
    const rawNotes = lead.notes || '';
    const rawUpdated =
      lead.updated_at ||
      ('created_at' in lead && typeof lead.created_at === 'string'
        ? lead.created_at
        : '');
    return {
      status: rawStatus,
      notes: rawNotes,
      updatedAt: rawUpdated,
    };
  }
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(`${USER_META_STORAGE_PREFIX}${type}_${id}`);
      if (raw) return JSON.parse(raw);
    } catch (err) {
      console.error(err);
    }
  }
  return {
    status: 'new',
    notes: '',
    updatedAt: '',
  };
}

export async function persistLeadMeta(
  type: string,
  id: string | number,
  meta: Partial<LeadUserMeta>
): Promise<void> {
  const supabase = createClient();
  const table = type === 'wedding' ? 'places_wedding' : 'places';
  const idColumn = type === 'wedding' ? 'id' : 'place_id';
  const nowIso = new Date().toISOString();

  const updatePayload: Record<string, unknown> = {
    updated_at: nowIso,
  };
  if (meta.status !== undefined) {
    updatePayload.status = meta.status;
  }
  if (meta.notes !== undefined) {
    updatePayload.notes = meta.notes;
  }

  const { error } = await supabase
    .from(table)
    .update(updatePayload)
    .eq(idColumn, id);

  if (error) {
    throw error;
  }
}

export async function saveLeadUserMeta(
  type: string,
  id: string | number,
  meta: Partial<LeadUserMeta>
): Promise<LeadUserMeta> {
  const nowIso = new Date().toISOString();
  const updated: LeadUserMeta = {
    status: meta.status || 'new',
    notes: meta.notes || '',
    updatedAt: nowIso,
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(
        `${USER_META_STORAGE_PREFIX}${type}_${id}`,
        JSON.stringify(updated)
      );
    } catch (err) {
      console.error(err);
    }
  }

  await persistLeadMeta(type, id, meta);
  return updated;
}

export function getAllSavedLeadMetas(): Record<string, LeadUserMeta> {
  if (typeof window === 'undefined') return {};
  const metas: Record<string, LeadUserMeta> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(USER_META_STORAGE_PREFIX)) {
        const itemKey = key.replace(USER_META_STORAGE_PREFIX, '');
        const val = localStorage.getItem(key);
        if (val) {
          metas[itemKey] = JSON.parse(val);
        }
      }
    }
  } catch (err) {
    console.error(err);
  }
  return metas;
}

const SOCIAL_AND_GOOGLE_PATTERNS = [
  '%g.co%',
  '%goo.gl%',
  '%google.%',
  '%instagram.com%',
  '%instagr.am%',
  '%facebook.com%',
  '%fb.com%',
  '%fb.me%',
  '%whatsapp.com%',
  '%wa.me%',
  '%wa.link%',
  '%youtube.com%',
  '%youtu.be%',
  '%tiktok.com%',
  '%twitter.com%',
  '%x.com%',
  '%linkedin.com%',
  '%pinterest.com%',
  '%threads.net%',
  '%linktr.ee%',
  '%linktree.com%',
  '%bio.link%',
  '%oia.bio%',
  '%beacons.ai%',
  '%taplink.cc%',
  '%opener.one%',
  '%bit.ly%',
  '%tinyurl.com%',
];

export async function fetchWeddingLeads(
  filters: WeddingFilterOptions
): Promise<{ data: WeddingLead[]; count: number }> {
  const supabase = createClient();
  let query = supabase.from('places_wedding').select('*', { count: 'exact' });

  if (filters.search.trim()) {
    const term = `%${filters.search.trim()}%`;
    query = query.or(
      `name.ilike.${term},location.ilike.${term},instagram.ilike.${term},bio.ilike.${term}`
    );
  }

  if (filters.category && filters.category !== 'all') {
    query = query.eq('category', filters.category);
  }

  if (filters.location && filters.location !== 'all') {
    query = query.eq('location', filters.location);
  }

  if (filters.websiteStatus === 'no_website') {
    const conditions = [
      'website.is.null',
      ...SOCIAL_AND_GOOGLE_PATTERNS.map((p) => `website.ilike.${p}`),
    ];
    query = query.or(conditions.join(','));
  } else if (filters.websiteStatus === 'has_website') {
    query = query.not('website', 'is', null);
    for (const pattern of SOCIAL_AND_GOOGLE_PATTERNS) {
      query = query.not('website', 'ilike', pattern);
    }
  }

  if (filters.minRating > 0) {
    query = query.gte('rating', filters.minRating);
  }

  if (filters.minFollowers > 0) {
    query = query.gte('followers_count', filters.minFollowers);
  }

  if (filters.featuredOnly) {
    query = query.eq('is_featured', true);
  }

  if (filters.multipleCitiesOnly) {
    query = query.eq('has_multiple_cities', true);
  }

  if (filters.outreachStatus && filters.outreachStatus !== 'all') {
    if (filters.outreachStatus === 'new') {
      query = query.or('status.eq.new,status.is.null');
    } else {
      query = query.eq('status', filters.outreachStatus);
    }
  }

  const ascending = filters.sortOrder === 'asc';
  query = query.order(filters.sortBy, { ascending, nullsFirst: false });

  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) {
    throw error;
  }

  return {
    data: data || [],
    count: count || 0,
  };
}

export async function fetchRestaurantLeads(
  filters: PlacesFilterOptions
): Promise<{ data: RestaurantLead[]; count: number }> {
  const supabase = createClient();
  let query = supabase.from('places').select('*', { count: 'exact' });

  if (filters.search.trim()) {
    const term = `%${filters.search.trim()}%`;
    query = query.or(
      `name.ilike.${term},address.ilike.${term},main_category.ilike.${term},phone.ilike.${term},query.ilike.${term}`
    );
  }

  if (filters.mainCategory && filters.mainCategory !== 'all') {
    query = query.eq('main_category', filters.mainCategory);
  }

  if (filters.websiteStatus === 'no_website') {
    const conditions = [
      'website.is.null',
      ...SOCIAL_AND_GOOGLE_PATTERNS.map((p) => `website.ilike.${p}`),
    ];
    query = query.or(conditions.join(','));
  } else if (filters.websiteStatus === 'has_website') {
    query = query.not('website', 'is', null);
    for (const pattern of SOCIAL_AND_GOOGLE_PATTERNS) {
      query = query.not('website', 'ilike', pattern);
    }
  }

  if (filters.minRating > 0) {
    query = query.gte('rating', filters.minRating);
  }

  if (filters.minReviews > 0) {
    query = query.gte('reviews', filters.minReviews);
  }

  if (filters.spendingAdsOnly) {
    query = query.eq('is_spending_on_ads', true);
  }

  if (filters.canClaimOnly) {
    query = query.eq('can_claim', true);
  }

  if (filters.openOnly) {
    query = query.is('is_permanently_closed', false).is('is_temporarily_closed', false);
  }

  if (filters.outreachStatus && filters.outreachStatus !== 'all') {
    if (filters.outreachStatus === 'new') {
      query = query.or('status.eq.new,status.is.null');
    } else {
      query = query.eq('status', filters.outreachStatus);
    }
  }

  const ascending = filters.sortOrder === 'asc';
  query = query.order(filters.sortBy, { ascending, nullsFirst: false });

  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) {
    throw error;
  }

  return {
    data: data || [],
    count: count || 0,
  };
}

export async function fetchWeddingLocations(): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('places_wedding')
    .select('location')
    .not('location', 'is', null)
    .limit(1000);

  if (!data) return [];
  const set = new Set<string>();
  data.forEach((row) => {
    if (row.location && row.location.trim()) {
      set.add(row.location.trim());
    }
  });
  return Array.from(set).sort();
}

export async function fetchRestaurantCategories(): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('places')
    .select('main_category')
    .not('main_category', 'is', null)
    .limit(1000);

  if (!data) return [];
  const set = new Set<string>();
  data.forEach((row) => {
    if (row.main_category && row.main_category.trim()) {
      set.add(row.main_category.trim());
    }
  });
  return Array.from(set).sort();
}
