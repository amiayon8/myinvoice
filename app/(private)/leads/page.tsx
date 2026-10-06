'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import {
  WeddingLead,
  RestaurantLead,
  LeadType,
  WeddingFilterOptions,
  PlacesFilterOptions,
  OutreachStatus,
} from '@/types/leads';
import {
  fetchWeddingLeads,
  fetchRestaurantLeads,
  fetchWeddingLocations,
  fetchRestaurantCategories,
  getLeadUserMeta,
  saveLeadUserMeta,
} from '@/services/leads-service';
import {
  cleanLeadName,
  hasIndependentWebsite,
} from '@/lib/lead-message-generator';
import { LeadMessageModal } from '@/components/leads/lead-message-modal';
import { LeadDetailsModal } from '@/components/leads/lead-details-modal';
import { useToast } from '@/components/ui/toast';
import {
  Search,
  Filter,
  ArrowUpDown,
  Download,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Phone,
  MapPin,
  Star,
  Users,
  Eye,
  CheckCircle2,
  AlertCircle,
  Building,
  HeartHandshake,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

const INITIAL_WEDDING_FILTERS: WeddingFilterOptions = {
  search: '',
  category: 'all',
  location: 'all',
  websiteStatus: 'all',
  minRating: 0,
  minFollowers: 0,
  featuredOnly: false,
  multipleCitiesOnly: false,
  outreachStatus: 'all',
  sortBy: 'rating',
  sortOrder: 'desc',
  page: 1,
  pageSize: 25,
};

const INITIAL_RESTAURANT_FILTERS: PlacesFilterOptions = {
  search: '',
  mainCategory: 'all',
  websiteStatus: 'all',
  minRating: 0,
  minReviews: 0,
  spendingAdsOnly: false,
  canClaimOnly: false,
  openOnly: false,
  outreachStatus: 'all',
  sortBy: 'reviews',
  sortOrder: 'desc',
  page: 1,
  pageSize: 25,
};

const OUTREACH_STATUS_OPTIONS: { id: OutreachStatus; label: string }[] = [
  { id: 'new', label: 'New Lead' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'replied', label: 'Replied' },
  { id: 'in_discussion', label: 'In Discussion' },
  { id: 'converted', label: 'Converted' },
  { id: 'not_interested', label: 'Not Interested' },
];

export default function LeadsPage() {
  const toast = useToast();
  const [, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<LeadType>('wedding');

  const [weddingFilters, setWeddingFilters] = useState<WeddingFilterOptions>(INITIAL_WEDDING_FILTERS);
  const [restaurantFilters, setRestaurantFilters] = useState<PlacesFilterOptions>(INITIAL_RESTAURANT_FILTERS);

  const [weddingLeads, setWeddingLeads] = useState<WeddingLead[]>([]);
  const [weddingTotalCount, setWeddingTotalCount] = useState<number>(0);

  const [restaurantLeads, setRestaurantLeads] = useState<RestaurantLead[]>([]);
  const [restaurantTotalCount, setRestaurantTotalCount] = useState<number>(0);

  const [weddingLocations, setWeddingLocations] = useState<string[]>([]);
  const [restaurantCategories, setRestaurantCategories] = useState<string[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [leadMetaUpdates, setLeadMetaUpdates] = useState<number>(0);

  const [selectedLeadForMessage, setSelectedLeadForMessage] = useState<WeddingLead | RestaurantLead | null>(null);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState<boolean>(false);

  const [selectedLeadForDetails, setSelectedLeadForDetails] = useState<WeddingLead | RestaurantLead | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    async function loadMetaFilters() {
      try {
        const [locs, cats] = await Promise.all([
          fetchWeddingLocations(),
          fetchRestaurantCategories(),
        ]);
        setWeddingLocations(locs);
        setRestaurantCategories(cats);
      } catch (err) {
        console.error(err);
      }
    }
    loadMetaFilters();
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'wedding') {
        const res = await fetchWeddingLeads(weddingFilters);
        setWeddingLeads(res.data);
        setWeddingTotalCount(res.count);
      } else {
        const res = await fetchRestaurantLeads(restaurantFilters);
        setRestaurantLeads(res.data);
        setRestaurantTotalCount(res.count);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch leads';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [activeTab, weddingFilters, restaurantFilters, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenMessage = (lead: WeddingLead | RestaurantLead) => {
    setSelectedLeadForMessage(lead);
    setIsMessageModalOpen(true);
  };

  const handleOpenDetails = (lead: WeddingLead | RestaurantLead) => {
    setSelectedLeadForDetails(lead);
    setIsDetailsModalOpen(true);
  };

  const handleStatusChange = async (
    type: LeadType,
    id: string | number,
    newStatus: OutreachStatus
  ) => {
    try {
      if (type === 'wedding') {
        setWeddingLeads((prev) =>
          prev.map((item) =>
            item.id === id
              ? { ...item, status: newStatus, updated_at: new Date().toISOString() }
              : item
          )
        );
      } else {
        setRestaurantLeads((prev) =>
          prev.map((item) =>
            item.place_id === id
              ? { ...item, status: newStatus, updated_at: new Date().toISOString() }
              : item
          )
        );
      }
      await saveLeadUserMeta(type, id, { status: newStatus });
      setLeadMetaUpdates((prev) => prev + 1);
      toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
    } catch {
      toast.error('Failed to update status in database');
    }
  };

  const handleExportCSV = () => {
    try {
      let csvContent = 'data:text/csv;charset=utf-8,';
      if (activeTab === 'wedding') {
        csvContent += 'ID,Name,Category,Location,Rating,Reviews,Followers,Website,Instagram,HasWebsite,Status,Notes\n';
        weddingLeads.forEach((w) => {
          const meta = getLeadUserMeta('wedding', w.id, w);
          const hasWeb = hasIndependentWebsite(w.website);
          const row = [
            w.id,
            `"${cleanLeadName(w.name).replace(/"/g, '""')}"`,
            `"${(w.category || '').replace(/"/g, '""')}"`,
            `"${(w.location || '').replace(/"/g, '""')}"`,
            w.rating ?? '',
            w.user_rating_count ?? '',
            w.followers_count ?? '',
            `"${(w.website || '').replace(/"/g, '""')}"`,
            `"${(w.instagram || '').replace(/"/g, '""')}"`,
            hasWeb ? 'Yes' : 'No',
            meta.status,
            `"${(meta.notes || '').replace(/"/g, '""')}"`,
          ].join(',');
          csvContent += row + '\n';
        });
      } else {
        csvContent += 'PlaceID,Name,Category,Address,Rating,Reviews,Phone,Website,SpendingOnAds,CanClaim,Status,Notes\n';
        restaurantLeads.forEach((r) => {
          const meta = getLeadUserMeta('places', r.place_id, r);
          const row = [
            `"${r.place_id}"`,
            `"${cleanLeadName(r.name).replace(/"/g, '""')}"`,
            `"${(r.main_category || '').replace(/"/g, '""')}"`,
            `"${(r.address || '').replace(/"/g, '""')}"`,
            r.rating ?? '',
            r.reviews ?? '',
            `"${(r.phone || '').replace(/"/g, '""')}"`,
            `"${(r.website || '').replace(/"/g, '""')}"`,
            r.is_spending_on_ads ? 'Yes' : 'No',
            r.can_claim ? 'Yes' : 'No',
            meta.status,
            `"${(meta.notes || '').replace(/"/g, '""')}"`,
          ].join(',');
          csvContent += row + '\n';
        });
      }
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute(
        'download',
        `${activeTab}_leads_export_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Leads exported to CSV');
    } catch {
      toast.error('Failed to export leads');
    }
  };

  const currentCount = activeTab === 'wedding' ? weddingTotalCount : restaurantTotalCount;
  const currentPage = activeTab === 'wedding' ? weddingFilters.page : restaurantFilters.page;
  const currentPageSize = activeTab === 'wedding' ? weddingFilters.pageSize : restaurantFilters.pageSize;
  const totalPages = Math.ceil(currentCount / currentPageSize) || 1;

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    if (activeTab === 'wedding') {
      setWeddingFilters({ ...weddingFilters, page: newPage });
    } else {
      setRestaurantFilters({ ...restaurantFilters, page: newPage });
    }
  };

  return (
    <div className="space-y-6 mx-auto p-4 lg:p-8 max-w-7xl h-full font-sans animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Supabase Lead Intelligence
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
              Zero AI Trace Outreach
            </span>
          </div>
          <h1 className="text-xl lg:text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
            Lead Discovery & Outreach Engine
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl">
            Filter high-intent wedding vendors and restaurants, identify missing websites or ad spenders, and generate tailored cold messages that read 100% human.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-zinc-500" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => loadData()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Refresh database"
          >
            <RotateCcw className="w-3.5 h-3.5 text-zinc-500" />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => {
            setActiveTab('wedding');
          }}
          className={`flex items-center gap-2.5 pb-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'wedding'
              ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100'
              : 'border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          <HeartHandshake className="w-4 h-4" />
          <span>Wedding & Event Vendors</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-mono">
            {weddingTotalCount.toLocaleString()}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('places');
          }}
          className={`flex items-center gap-2.5 pb-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'places'
              ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100'
              : 'border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Restaurants & Places</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-mono">
            {restaurantTotalCount.toLocaleString()}
          </span>
        </button>
      </div>

      <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-xs space-y-4">
        {activeTab === 'wedding' ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'all', label: 'All Categories' },
                { id: 'Photographer', label: 'Photographers' },
                { id: 'Makeup Artist', label: 'Makeup Artists' },
                { id: 'Event Decorator', label: 'Event Decorators' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() =>
                    setWeddingFilters({
                      ...weddingFilters,
                      category: cat.id,
                      page: 1,
                    })
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    weddingFilters.category === cat.id
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search name, city, bio..."
                  value={weddingFilters.search}
                  onChange={(e) =>
                    setWeddingFilters({
                      ...weddingFilters,
                      search: e.target.value,
                      page: 1,
                    })
                  }
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-zinc-400"
                />
              </div>

              <div>
                <select
                  value={weddingFilters.outreachStatus}
                  onChange={(e) =>
                    setWeddingFilters({
                      ...weddingFilters,
                      outreachStatus: e.target.value,
                      page: 1,
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-zinc-400 cursor-pointer"
                >
                  <option value="all">Status: All</option>
                  <option value="new">New Leads</option>
                  <option value="contacted">Contacted</option>
                  <option value="replied">Replied</option>
                  <option value="in_discussion">In Discussion</option>
                  <option value="converted">Converted</option>
                  <option value="not_interested">Not Interested</option>
                </select>
              </div>

              <div>
                <select
                  value={weddingFilters.location}
                  onChange={(e) =>
                    setWeddingFilters({
                      ...weddingFilters,
                      location: e.target.value,
                      page: 1,
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-zinc-400 cursor-pointer"
                >
                  <option value="all">All Locations</option>
                  {weddingLocations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={weddingFilters.websiteStatus}
                  onChange={(e) =>
                    setWeddingFilters({
                      ...weddingFilters,
                      websiteStatus: e.target.value as 'all' | 'no_website' | 'has_website',
                      page: 1,
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-zinc-400 cursor-pointer"
                >
                  <option value="all">Website: All</option>
                  <option value="no_website">No Official Website (Prime)</option>
                  <option value="has_website">Has Website</option>
                </select>
              </div>

              <div>
                <select
                  value={weddingFilters.minRating}
                  onChange={(e) =>
                    setWeddingFilters({
                      ...weddingFilters,
                      minRating: Number(e.target.value),
                      page: 1,
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-zinc-400 cursor-pointer"
                >
                  <option value="0">Rating: Any</option>
                  <option value="4.5">Rating: 4.5+</option>
                  <option value="4.8">Rating: 4.8+</option>
                  <option value="5.0">Rating: 5.0</option>
                </select>
              </div>

              <div>
                <select
                  value={weddingFilters.minFollowers}
                  onChange={(e) =>
                    setWeddingFilters({
                      ...weddingFilters,
                      minFollowers: Number(e.target.value),
                      page: 1,
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-zinc-400 cursor-pointer"
                >
                  <option value="0">Followers: Any</option>
                  <option value="1000">1,000+ Followers</option>
                  <option value="5000">5,000+ Followers</option>
                  <option value="10000">10,000+ Followers</option>
                  <option value="50000">50,000+ Followers</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-zinc-600 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800/60">
              <div className="flex flex-wrap items-center gap-4">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={weddingFilters.featuredOnly}
                    onChange={(e) =>
                      setWeddingFilters({
                        ...weddingFilters,
                        featuredOnly: e.target.checked,
                        page: 1,
                      })
                    }
                    className="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-zinc-500"
                  />
                  <span>Featured Only</span>
                </label>

                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={weddingFilters.multipleCitiesOnly}
                    onChange={(e) =>
                      setWeddingFilters({
                        ...weddingFilters,
                        multipleCitiesOnly: e.target.checked,
                        page: 1,
                      })
                    }
                    className="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-zinc-500"
                  />
                  <span>Multi-City Presence</span>
                </label>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-400">Sort:</span>
                  <select
                    value={`${weddingFilters.sortBy}_${weddingFilters.sortOrder}`}
                    onChange={(e) => {
                      const [by, order] = e.target.value.split('_') as [
                        WeddingFilterOptions['sortBy'],
                        'asc' | 'desc'
                      ];
                      setWeddingFilters({
                        ...weddingFilters,
                        sortBy: by,
                        sortOrder: order,
                        page: 1,
                      });
                    }}
                    className="px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs cursor-pointer"
                  >
                    <option value="rating_desc">Highest Rating</option>
                    <option value="user_rating_count_desc">Most Reviews</option>
                    <option value="followers_count_desc">Most Followers</option>
                    <option value="name_asc">Name A-Z</option>
                    <option value="id_desc">Recently Added</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setWeddingFilters(INITIAL_WEDDING_FILTERS)}
                  className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search restaurant, cuisine, address..."
                  value={restaurantFilters.search}
                  onChange={(e) =>
                    setRestaurantFilters({
                      ...restaurantFilters,
                      search: e.target.value,
                      page: 1,
                    })
                  }
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-zinc-400"
                />
              </div>

              <div>
                <select
                  value={restaurantFilters.outreachStatus}
                  onChange={(e) =>
                    setRestaurantFilters({
                      ...restaurantFilters,
                      outreachStatus: e.target.value,
                      page: 1,
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-zinc-400 cursor-pointer"
                >
                  <option value="all">Status: All</option>
                  <option value="new">New Leads</option>
                  <option value="contacted">Contacted</option>
                  <option value="replied">Replied</option>
                  <option value="in_discussion">In Discussion</option>
                  <option value="converted">Converted</option>
                  <option value="not_interested">Not Interested</option>
                </select>
              </div>

              <div>
                <select
                  value={restaurantFilters.mainCategory}
                  onChange={(e) =>
                    setRestaurantFilters({
                      ...restaurantFilters,
                      mainCategory: e.target.value,
                      page: 1,
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-zinc-400 cursor-pointer"
                >
                  <option value="all">All Cuisines & Types</option>
                  {restaurantCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={restaurantFilters.websiteStatus}
                  onChange={(e) =>
                    setRestaurantFilters({
                      ...restaurantFilters,
                      websiteStatus: e.target.value as 'all' | 'no_website' | 'has_website',
                      page: 1,
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-zinc-400 cursor-pointer"
                >
                  <option value="all">Website: All</option>
                  <option value="no_website">Missing Official Site (Hot)</option>
                  <option value="has_website">Has Website</option>
                </select>
              </div>

              <div>
                <select
                  value={restaurantFilters.minRating}
                  onChange={(e) =>
                    setRestaurantFilters({
                      ...restaurantFilters,
                      minRating: Number(e.target.value),
                      page: 1,
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-zinc-400 cursor-pointer"
                >
                  <option value="0">Rating: Any</option>
                  <option value="4.0">Rating: 4.0+</option>
                  <option value="4.5">Rating: 4.5+</option>
                  <option value="4.8">Rating: 4.8+</option>
                </select>
              </div>

              <div>
                <select
                  value={restaurantFilters.minReviews}
                  onChange={(e) =>
                    setRestaurantFilters({
                      ...restaurantFilters,
                      minReviews: Number(e.target.value),
                      page: 1,
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-zinc-400 cursor-pointer"
                >
                  <option value="0">Reviews: Any</option>
                  <option value="100">100+ Reviews</option>
                  <option value="500">500+ Reviews</option>
                  <option value="1000">1,000+ Reviews</option>
                  <option value="5000">5,000+ Reviews</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-zinc-600 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800/60">
              <div className="flex flex-wrap items-center gap-4">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restaurantFilters.spendingAdsOnly}
                    onChange={(e) =>
                      setRestaurantFilters({
                        ...restaurantFilters,
                        spendingAdsOnly: e.target.checked,
                        page: 1,
                      })
                    }
                    className="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-zinc-500"
                  />
                  <span>Spending on Ads (High Budget)</span>
                </label>

                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restaurantFilters.canClaimOnly}
                    onChange={(e) =>
                      setRestaurantFilters({
                        ...restaurantFilters,
                        canClaimOnly: e.target.checked,
                        page: 1,
                      })
                    }
                    className="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-zinc-500"
                  />
                  <span>Unclaimed GMB Listing</span>
                </label>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-400">Sort:</span>
                  <select
                    value={`${restaurantFilters.sortBy}_${restaurantFilters.sortOrder}`}
                    onChange={(e) => {
                      const [by, order] = e.target.value.split('_') as [
                        PlacesFilterOptions['sortBy'],
                        'asc' | 'desc'
                      ];
                      setRestaurantFilters({
                        ...restaurantFilters,
                        sortBy: by,
                        sortOrder: order,
                        page: 1,
                      });
                    }}
                    className="px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs cursor-pointer"
                  >
                    <option value="reviews_desc">Most Reviews</option>
                    <option value="rating_desc">Highest Rating</option>
                    <option value="name_asc">Name A-Z</option>
                    <option value="is_spending_on_ads_desc">Ad Spenders First</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setRestaurantFilters(INITIAL_RESTAURANT_FILTERS)}
                  className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/70 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                <th className="py-3 px-4">Lead</th>
                <th className="py-3 px-4">Location / Area</th>
                <th className="py-3 px-4">Reputation & Reach</th>
                <th className="py-3 px-4">Online Presence</th>
                <th className="py-3 px-4">Outreach Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
              {loading ? (
                Array.from({ length: 8 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 px-4">
                      <div className="h-4 w-40 bg-zinc-200 dark:bg-zinc-800 rounded mb-1"></div>
                      <div className="h-3 w-24 bg-zinc-100 dark:bg-zinc-900 rounded"></div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-3 w-28 bg-zinc-100 dark:bg-zinc-900 rounded"></div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-3 w-20 bg-zinc-100 dark:bg-zinc-900 rounded"></div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-3 w-32 bg-zinc-100 dark:bg-zinc-900 rounded"></div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 w-20 bg-zinc-100 dark:bg-zinc-900 rounded"></div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="h-7 w-20 bg-zinc-100 dark:bg-zinc-900 rounded ml-auto"></div>
                    </td>
                  </tr>
                ))
              ) : activeTab === 'wedding' ? (
                weddingLeads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-400">
                      No wedding leads found matching the current filters.
                    </td>
                  </tr>
                ) : (
                  weddingLeads.map((w) => {
                    const cleanName = cleanLeadName(w.name);
                    const meta = getLeadUserMeta('wedding', w.id, w);
                    const hasWeb = hasIndependentWebsite(w.website);
                    const instaClean = w.instagram?.replace('@', '').trim();

                    return (
                      <tr
                        key={w.id}
                        className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                            <span className="truncate max-w-[220px]" title={w.name || ''}>
                              {cleanName || 'Unnamed Vendor'}
                            </span>
                            {w.is_featured && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold">
                                Featured
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-zinc-500">
                            {w.category || 'Wedding Vendor'}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 text-zinc-700 dark:text-zinc-300">
                            <MapPin className="w-3 h-3 text-zinc-400 shrink-0" />
                            {w.location || 'Unknown'}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                            <span className="inline-flex items-center gap-1 font-medium">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              {w.rating ?? 'N/A'}
                            </span>
                            <span className="text-zinc-400">
                              ({w.user_rating_count ?? 0})
                            </span>
                          </div>
                          {w.followers_count != null && (
                            <span className="text-[11px] text-zinc-500">
                              {w.followers_count.toLocaleString()} followers
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                                hasWeb
                                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                              }`}
                            >
                              {hasWeb ? 'Has Website' : 'Instagram Only'}
                            </span>

                            {instaClean && (
                              <a
                                href={`https://instagram.com/${instaClean}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-zinc-500 hover:text-pink-600 transition-colors"
                                title={`@${instaClean}`}
                              >
                                <Users className="w-3.5 h-3.5" />
                              </a>
                            )}

                            {w.website && (
                              <a
                                href={w.website}
                                target="_blank"
                                rel="noreferrer"
                                className="text-zinc-500 hover:text-blue-600 transition-colors"
                                title="Website"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <select
                            value={meta.status}
                            onChange={(e) =>
                              handleStatusChange(
                                'wedding',
                                w.id,
                                e.target.value as OutreachStatus
                              )
                            }
                            className="px-2 py-1 rounded text-[11px] font-medium border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 focus:outline-hidden cursor-pointer"
                          >
                            {OUTREACH_STATUS_OPTIONS.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenMessage(w)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                              title="Generate human outreach pitch"
                            >
                              <Sparkles className="w-3 h-3" />
                              Pitch
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenDetails(w)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                              title="Inspect lead"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )
              ) : restaurantLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400">
                    No restaurant leads found matching the current filters.
                  </td>
                </tr>
              ) : (
                restaurantLeads.map((r) => {
                  const cleanName = cleanLeadName(r.name);
                  const meta = getLeadUserMeta('places', r.place_id, r);
                  const hasWeb = hasIndependentWebsite(r.website);

                  return (
                    <tr
                      key={r.place_id}
                      className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                          <span className="truncate max-w-[220px]" title={r.name || ''}>
                            {cleanName || 'Unnamed Venue'}
                          </span>
                          {r.is_spending_on_ads && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold">
                              Ads
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-zinc-500">
                          {r.main_category || 'Restaurant'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-zinc-700 dark:text-zinc-300 truncate max-w-[200px]" title={r.address || ''}>
                          <MapPin className="w-3 h-3 text-zinc-400 shrink-0" />
                          {r.address || 'Address not listed'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                          <span className="inline-flex items-center gap-1 font-medium">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {r.rating ?? 'N/A'}
                          </span>
                          <span className="text-zinc-400">
                            ({r.reviews?.toLocaleString() ?? 0} reviews)
                          </span>
                        </div>
                        {r.phone && (
                          <span className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-zinc-400" />
                            {r.phone}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                              hasWeb
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                            }`}
                          >
                            {hasWeb ? 'Has Website' : 'No Official Site'}
                          </span>

                          {r.website && (
                            <a
                              href={r.website}
                              target="_blank"
                              rel="noreferrer"
                              className="text-zinc-500 hover:text-blue-600 transition-colors"
                              title="Website"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}

                          {r.link && (
                            <a
                              href={r.link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-zinc-500 hover:text-amber-600 transition-colors"
                              title="Google Maps Profile"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <select
                          value={meta.status}
                          onChange={(e) =>
                            handleStatusChange(
                              'places',
                              r.place_id,
                              e.target.value as OutreachStatus
                            )
                          }
                          className="px-2 py-1 rounded text-[11px] font-medium border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 focus:outline-hidden cursor-pointer"
                        >
                          {OUTREACH_STATUS_OPTIONS.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenMessage(r)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                            title="Generate human outreach pitch"
                          >
                            <Sparkles className="w-3 h-3" />
                            Pitch
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(r)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="Inspect lead"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 text-xs text-zinc-500">
          <div>
            Showing {(currentPage - 1) * currentPageSize + 1} to{' '}
            {Math.min(currentPage * currentPageSize, currentCount)} of{' '}
            {currentCount.toLocaleString()} leads
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span>Per page:</span>
              <select
                value={currentPageSize}
                onChange={(e) => {
                  const size = Number(e.target.value);
                  if (activeTab === 'wedding') {
                    setWeddingFilters({ ...weddingFilters, pageSize: size, page: 1 });
                  } else {
                    setRestaurantFilters({ ...restaurantFilters, pageSize: size, page: 1 });
                  }
                }}
                className="px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-xs cursor-pointer"
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="p-1.5 rounded border border-zinc-200 dark:border-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <span className="px-2 font-medium text-zinc-700 dark:text-zinc-300">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded border border-zinc-200 dark:border-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <LeadMessageModal
        isOpen={isMessageModalOpen}
        onClose={() => {
          setIsMessageModalOpen(false);
          setSelectedLeadForMessage(null);
        }}
        lead={selectedLeadForMessage}
        leadType={activeTab}
        onStatusUpdated={() => setLeadMetaUpdates((prev) => prev + 1)}
      />

      <LeadDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedLeadForDetails(null);
        }}
        lead={selectedLeadForDetails}
        leadType={activeTab}
        onGenerateMessage={(lead) => {
          setIsDetailsModalOpen(false);
          setSelectedLeadForMessage(lead);
          setIsMessageModalOpen(true);
        }}
        onMetaSaved={() => setLeadMetaUpdates((prev) => prev + 1)}
      />
    </div>
  );
}
