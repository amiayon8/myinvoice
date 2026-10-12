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
  const dbNotes = lead?.notes || '';
  const dbUpdated =
    lead?.updated_at ||
    (lead && 'created_at' in lead && typeof lead.created_at === 'string'
      ? lead.created_at
      : '');

  const isValidOutreachStatus = (s: string): s is OutreachStatus =>
    ['new', 'contacted', 'replied', 'in_discussion', 'converted', 'not_interested'].includes(s);

  if (lead?.status) {
    const normalized = lead.status.trim().toLowerCase().replace(/[\s-]/g, '_');
    if (isValidOutreachStatus(normalized)) {
      return {
        status: normalized,
        notes: dbNotes,
        updatedAt: dbUpdated || '',
      };
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(`${USER_META_STORAGE_PREFIX}${type}_${id}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.status) {
          const normalized = (parsed.status as string).trim().toLowerCase().replace(/[\s-]/g, '_');
          if (isValidOutreachStatus(normalized)) {
            return {
              status: normalized,
              notes: parsed.notes || dbNotes,
              updatedAt: parsed.updatedAt || dbUpdated || '',
            };
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  return {
    status: 'new',
    notes: dbNotes,
    updatedAt: dbUpdated || '',
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

  let existingNotes = '';
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(`${USER_META_STORAGE_PREFIX}${type}_${id}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        existingNotes = parsed.notes || '';
      }
    } catch (err) {
      console.error(err);
    }
  }

  const updated: LeadUserMeta = {
    status: meta.status || 'new',
    notes: meta.notes !== undefined ? meta.notes : existingNotes,
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

const SOCIAL_AND_REDIRECT_PATTERNS = [
  '%facebook.com%',
  '%instagram.com%',
  '%instagr.am%',
  '%wa.me/%',
  '%//wa.me%',
  '%wa.link%',
  '%whatsapp.com%',
  '%linktr.ee%',
  '%linktree.com%',
  '%bio.link%',
  '%oia.bio%',
  '%beacons.ai%',
  '%taplink.cc%',
  '%bit.ly%',
  '%tinyurl.com%',
  '%tiktok.com%',
  '%youtube.com%',
  '%youtu.be%',
  '%business.site%',
  '%g.co/%',
  '%goo.gl/%',
  '%google.com/maps%',
  '%google.com/search%',
  '%fb.me%',
  '%fb.com/%',
  '%//x.com%',
  '%twitter.com%',
];

function sanitizeSearchTerm(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/["'(),;\\%]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function fetchWeddingLeads(
  filters: WeddingFilterOptions
): Promise<{ data: WeddingLead[]; count: number }> {
  const supabase = createClient();
  let query = supabase.from('places_wedding').select('*', { count: 'exact' });

  const cleanSearch = sanitizeSearchTerm(filters.search);
  if (cleanSearch) {
    const term = `%${cleanSearch}%`;
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

  if (filters.websiteStatus === 'missing_url') {
    query = query.or('website.is.null,website.eq.');
  } else if (filters.websiteStatus === 'no_website') {
    const conditions = [
      'website.is.null',
      ...SOCIAL_AND_REDIRECT_PATTERNS.map((p) => `website.ilike.${p}`),
    ];
    query = query.or(conditions.join(','));
  } else if (filters.websiteStatus === 'has_website') {
    query = query.not('website', 'is', null).neq('website', '');
    for (const pattern of SOCIAL_AND_REDIRECT_PATTERNS) {
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
      query = query.or('status.eq.new,status.is.null,status.eq.');
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

  const cleanSearch = sanitizeSearchTerm(filters.search);
  if (cleanSearch) {
    const term = `%${cleanSearch}%`;
    query = query.or(
      `name.ilike.${term},address.ilike.${term},main_category.ilike.${term},phone.ilike.${term},query.ilike.${term}`
    );
  }

  if (filters.mainCategory && filters.mainCategory !== 'all') {
    query = query.eq('main_category', filters.mainCategory);
  }

  if (filters.websiteStatus === 'missing_url') {
    query = query.or('website.is.null,website.eq.');
  } else if (filters.websiteStatus === 'no_website') {
    const conditions = [
      'website.is.null',
      ...SOCIAL_AND_REDIRECT_PATTERNS.map((p) => `website.ilike.${p}`),
    ];
    query = query.or(conditions.join(','));
  } else if (filters.websiteStatus === 'has_website') {
    query = query.not('website', 'is', null).neq('website', '');
    for (const pattern of SOCIAL_AND_REDIRECT_PATTERNS) {
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
      query = query.or('status.eq.new,status.is.null,status.eq.');
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

export async function fetchWeddingCategories(): Promise<string[]> {
  const supabase = createClient();
  const set = new Set<string>();
  let from = 0;
  const step = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('places_wedding')
      .select('category')
      .not('category', 'is', null)
      .range(from, from + step - 1);

    if (error || !data || data.length === 0) break;
    data.forEach((row) => {
      if (row.category && row.category.trim()) {
        set.add(row.category.trim());
      }
    });
    if (data.length < step) break;
    from += step;
  }
  return Array.from(set).sort();
}

export async function fetchWeddingLocations(): Promise<string[]> {
  const supabase = createClient();
  const set = new Set<string>();
  let from = 0;
  const step = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('places_wedding')
      .select('location')
      .not('location', 'is', null)
      .range(from, from + step - 1);

    if (error || !data || data.length === 0) break;
    data.forEach((row) => {
      if (row.location && row.location.trim()) {
        set.add(row.location.trim());
      }
    });
    if (data.length < step) break;
    from += step;
  }
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
