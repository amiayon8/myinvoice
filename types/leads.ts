export interface WeddingLead {
  id: number | string;
  name: string | null;
  category: string | null;
  rating: number | null;
  user_rating_count: number | null;
  location: string | null;
  instagram: string | null;
  google_listing_url: string | null;
  google_maps_uri: string | null;
  bio: string | null;
  dp_url: string | null;
  followers_count: number | null;
  website: string | null;
  is_featured: boolean | null;
  has_multiple_cities: boolean | null;
  vendor_url: string | null;
  status?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface RestaurantLead {
  place_id: string;
  name: string | null;
  description: string | null;
  is_spending_on_ads: boolean | null;
  link: string | null;
  reviews: number | null;
  rating: number | null;
  competitors?: unknown;
  website: string | null;
  phone: string | null;
  phone_international: string | null;
  can_claim: boolean | null;
  owner?: unknown;
  owner_posts?: unknown;
  featured_image: string | null;
  main_category: string | null;
  categories?: unknown;
  workday_timing: string | null;
  status: string | null;
  is_temporarily_closed: boolean | null;
  is_permanently_closed: boolean | null;
  closed_on?: unknown;
  address: string | null;
  price_range: string | null;
  reviews_per_rating?: unknown;
  reviews_link: string | null;
  coordinates?: unknown;
  plus_code: string | null;
  detailed_address?: unknown;
  time_zone: string | null;
  is_rental: boolean | null;
  cid: string | null;
  data_id: string | null;
  kgmid: string | null;
  about?: unknown;
  hours?: unknown;
  most_popular_times?: unknown;
  popular_times?: unknown;
  menu?: unknown;
  menu_items?: unknown;
  reservations?: unknown;
  order_online_links?: unknown;
  gas_prices?: unknown;
  image_count: number | null;
  images?: unknown;
  featured_images?: unknown;
  menu_photos?: unknown;
  on_site_places?: unknown;
  customer_updates?: unknown;
  featured_question: string | null;
  review_keywords?: unknown;
  featured_reviews?: unknown;
  query: string | null;
  price: string | null;
  hotel_stars: number | null;
  sleeps?: string | null;
  bedrooms?: string | null;
  beds?: string | null;
  bathrooms?: string | null;
  min_nights?: string | null;
  checkin_date?: string | null;
  checkout_date?: string | null;
  checkin_time?: string | null;
  checkout_time?: string | null;
  amenities?: unknown;
  booking_platforms?: unknown;
  additional_results_from_web?: unknown;
  location_summary?: unknown;
  nearby_rentals?: unknown;
  nearby_hotels?: unknown;
  featured_partner_reviews?: unknown;
  notes?: string | null;
  updated_at?: string | null;
}

export type LeadType = 'wedding' | 'places';

export type OutreachStatus =
  | 'new'
  | 'contacted'
  | 'replied'
  | 'in_discussion'
  | 'not_interested'
  | 'converted';

export interface LeadUserMeta {
  status: OutreachStatus;
  notes: string;
  updatedAt: string;
}

export interface WeddingFilterOptions {
  search: string;
  category: string;
  location: string;
  websiteStatus: 'all' | 'no_website' | 'has_website' | 'missing_url';
  minRating: number;
  minFollowers: number;
  featuredOnly: boolean;
  multipleCitiesOnly: boolean;
  outreachStatus: string;
  sortBy: 'rating' | 'user_rating_count' | 'followers_count' | 'name' | 'id' | 'updated_at';
  sortOrder: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export interface PlacesFilterOptions {
  search: string;
  mainCategory: string;
  websiteStatus: 'all' | 'no_website' | 'has_website' | 'missing_url';
  minRating: number;
  minReviews: number;
  spendingAdsOnly: boolean;
  canClaimOnly: boolean;
  openOnly: boolean;
  outreachStatus: string;
  sortBy: 'reviews' | 'rating' | 'name' | 'is_spending_on_ads' | 'updated_at';
  sortOrder: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export type OutreachAngle =
  | 'natural_intro'
  | 'short_dm'
  | 'direct_booking'
  | 'video_audit'
  | 'website_redesign';

export interface MessageGeneratorSettings {
  portfolioUrl: string;
  conceptUrl: string;
  senderName: string;
  selectedAngle: OutreachAngle;
}
