'use client';

import React, { useState, useEffect } from 'react';
import {
  WeddingLead,
  RestaurantLead,
  LeadType,
  OutreachStatus,
  LeadUserMeta,
} from '@/types/leads';
import {
  getLeadUserMeta,
  saveLeadUserMeta,
} from '@/services/leads-service';
import { cleanLeadName, hasIndependentWebsite } from '@/lib/lead-message-generator';
import {
  X,
  ExternalLink,
  Phone,
  MapPin,
  Star,
  Users,
  Globe,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  Building,
  Clock,
  DollarSign,
  ShieldAlert,
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface LeadDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: WeddingLead | RestaurantLead | null;
  leadType: LeadType;
  onGenerateMessage: (lead: WeddingLead | RestaurantLead) => void;
  onMetaSaved?: (id: string | number, newStatus: OutreachStatus, notes: string) => void;
}

const OUTREACH_STATUSES: { id: OutreachStatus; label: string; color: string }[] = [
  { id: 'new', label: 'New Lead', color: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300' },
  { id: 'contacted', label: 'Contacted', color: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' },
  { id: 'replied', label: 'Replied', color: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300' },
  { id: 'in_discussion', label: 'In Discussion', color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' },
  { id: 'converted', label: 'Converted Client', color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' },
  { id: 'not_interested', label: 'Not Interested', color: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300' },
];

export const LeadDetailsModal: React.FC<LeadDetailsModalProps> = ({
  isOpen,
  onClose,
  lead,
  leadType,
  onGenerateMessage,
  onMetaSaved,
}) => {
  const toast = useToast();
  const [meta, setMeta] = useState<LeadUserMeta>({
    status: 'new',
    notes: '',
    updatedAt: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!lead) return;
    const id = leadType === 'wedding' ? (lead as WeddingLead).id : (lead as RestaurantLead).place_id;
    const currentMeta = getLeadUserMeta(leadType, id, lead);
    setMeta(currentMeta);
  }, [lead, leadType]);

  if (!isOpen || !lead) return null;

  const wedding = leadType === 'wedding' ? (lead as WeddingLead) : null;
  const restaurant = leadType === 'places' ? (lead as RestaurantLead) : null;
  const cleanName = cleanLeadName(lead.name);
  const hasWeb = hasIndependentWebsite(lead.website);

  const handleSaveMeta = async () => {
    setIsSaving(true);
    try {
      const id = leadType === 'wedding' ? wedding!.id : restaurant!.place_id;
      const updated = await saveLeadUserMeta(leadType, id, meta);
      setMeta(updated);
      toast.success('Lead status and notes saved');
      if (onMetaSaved) onMetaSaved(id, updated.status, updated.notes);
    } catch {
      toast.error('Failed to save lead updates');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/70 backdrop-blur-xs animate-fade-in">
      <div className="relative flex flex-col w-full max-w-2xl max-h-[92vh] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            {wedding?.dp_url ? (
              <img
                src={wedding.dp_url}
                alt={cleanName || 'Lead avatar'}
                className="w-10 h-10 rounded-full object-cover border border-zinc-200 dark:border-zinc-800 shrink-0"
              />
            ) : restaurant?.featured_image ? (
              <img
                src={restaurant.featured_image}
                alt={cleanName || 'Place image'}
                className="w-10 h-10 rounded-lg object-cover border border-zinc-200 dark:border-zinc-800 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-zinc-600 dark:text-zinc-300 shrink-0">
                {(cleanName || 'L').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {leadType === 'wedding' ? (wedding?.category || 'Wedding Vendor') : (restaurant?.main_category || 'Place')}
              </span>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 truncate mt-0.5">
                {cleanName || lead.name || 'Lead Details'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-5 overflow-y-auto custom-scrollbar space-y-5 text-xs">
          {/* Featured Image Banner for Restaurant */}
          {restaurant?.featured_image && (
            <div className="relative rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 max-h-48">
              <img
                src={restaurant.featured_image}
                alt={cleanName || 'Place photo'}
                className="w-full h-44 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                <span className="text-white text-xs font-medium">
                  {restaurant.main_category || 'Venue'} • {restaurant.rating ? `${restaurant.rating} ★` : ''} ({restaurant.reviews || 0} reviews)
                </span>
              </div>
            </div>
          )}

          {/* Outreach Status & Notes */}
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                Outreach Tracking
              </span>
              {meta.updatedAt && (
                <span className="text-[10px] text-zinc-400">
                  Last updated: {new Date(meta.updatedAt).toLocaleDateString()}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {OUTREACH_STATUSES.map((status) => (
                <button
                  key={status.id}
                  type="button"
                  onClick={() => setMeta({ ...meta, status: status.id })}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all cursor-pointer ${
                    meta.status === status.id
                      ? `${status.color} ring-1 ring-zinc-400 dark:ring-zinc-600 font-semibold shadow-xs`
                      : 'bg-zinc-100/60 dark:bg-zinc-800/40 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  {meta.status === status.id && (
                    <CheckCircle2 className="w-3 h-3 inline mr-1 -mt-0.5" />
                  )}
                  {status.label}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Outreach Notes & Activity Log
              </label>
              <textarea
                value={meta.notes}
                onChange={(e) => setMeta({ ...meta, notes: e.target.value })}
                placeholder="Add notes (e.g. Sent DM on Instagram, sent quote, waiting for callback...)"
                rows={3}
                className="w-full p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-zinc-400 resize-none text-xs"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveMeta}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition-opacity cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                {isSaving ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {wedding && (
              <>
                <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1">
                  <span className="text-[11px] text-zinc-400">Category & Location</span>
                  <p className="font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    {wedding.category || 'Wedding Vendor'} in {wedding.location || 'Unknown'}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    {wedding.is_featured && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold">
                        Featured Vendor
                      </span>
                    )}
                    {wedding.has_multiple_cities && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-semibold">
                        Multi-City Presence
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1">
                  <span className="text-[11px] text-zinc-400">Rating & Followers</span>
                  <p className="font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      {wedding.rating ?? 'N/A'} ({wedding.user_rating_count ?? 0} reviews)
                    </span>
                    {wedding.followers_count != null && (
                      <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                        <Users className="w-3.5 h-3.5 text-zinc-400" />
                        {wedding.followers_count.toLocaleString()} followers
                      </span>
                    )}
                  </p>
                  <div className="pt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                      hasWeb ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                    }`}>
                      {hasWeb ? 'Has Independent Website' : 'Instagram / Social Only (Prime Target)'}
                    </span>
                  </div>
                </div>
              </>
            )}

            {restaurant && (
              <>
                <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1">
                  <span className="text-[11px] text-zinc-400">Address & Timing</span>
                  <p className="font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    {restaurant.address || 'Address not listed'}
                  </p>
                  {restaurant.workday_timing && (
                    <p className="text-[11px] text-zinc-500 flex items-center gap-1 pt-1">
                      <Clock className="w-3 h-3 text-zinc-400" />
                      {restaurant.workday_timing}
                    </p>
                  )}
                </div>

                <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1">
                  <span className="text-[11px] text-zinc-400">Reviews & Pitch Signals</span>
                  <p className="font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      {restaurant.rating ?? 'N/A'} ({restaurant.reviews?.toLocaleString() ?? 0} reviews)
                    </span>
                    {restaurant.price_range && (
                      <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[10px]">
                        {restaurant.price_range}
                      </span>
                    )}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {restaurant.can_claim && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-semibold text-[10px] flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        Unclaimed Listing
                      </span>
                    )}
                    {restaurant.is_spending_on_ads && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 font-semibold text-[10px]">
                        Spends on Ads
                      </span>
                    )}
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      hasWeb ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                    }`}>
                      {hasWeb ? 'Has Website' : 'Missing Official Site'}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Description / Bio */}
          {wedding?.bio && (
            <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1.5">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Instagram Bio
              </span>
              <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
                {wedding.bio}
              </p>
            </div>
          )}

          {restaurant?.description && (
            <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1.5">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Description
              </span>
              <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {restaurant.description}
              </p>
            </div>
          )}

          {/* External Links & Actions */}
          <div className="flex flex-wrap gap-2 pt-2">
            {wedding?.instagram && (
              <a
                href={`https://instagram.com/${wedding.instagram.replace('@', '')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <Users className="w-3.5 h-3.5 text-pink-500" />
                @{wedding.instagram.replace('@', '')}
                <ExternalLink className="w-3 h-3 text-zinc-400" />
              </a>
            )}

            {lead.website && (
              <a
                href={lead.website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <Globe className="w-3.5 h-3.5 text-blue-500" />
                {hasWeb ? 'Visit Website' : 'Link / Social'}
                <ExternalLink className="w-3 h-3 text-zinc-400" />
              </a>
            )}

            {wedding?.vendor_url && (
              <a
                href={wedding.vendor_url.startsWith('http') ? wedding.vendor_url : `https://www.wedmegood.com${wedding.vendor_url}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <Building className="w-3.5 h-3.5 text-purple-500" />
                Vendor Directory
                <ExternalLink className="w-3 h-3 text-zinc-400" />
              </a>
            )}

            {restaurant?.phone && (
              <a
                href={`tel:${restaurant.phone}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-500" />
                {restaurant.phone}
              </a>
            )}

            {wedding?.google_maps_uri && (
              <a
                href={wedding.google_maps_uri}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                Google Maps
                <ExternalLink className="w-3 h-3 text-zinc-400" />
              </a>
            )}

            {restaurant?.link && (
              <a
                href={restaurant.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                Google Profile
                <ExternalLink className="w-3 h-3 text-zinc-400" />
              </a>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60">
          <span className="text-[11px] text-zinc-500">
            {leadType === 'wedding' ? 'ID: ' + wedding?.id : 'Place ID: ' + restaurant?.place_id}
          </span>
          <button
            type="button"
            onClick={() => {
              onClose();
              onGenerateMessage(lead);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Generate Outreach Pitch
          </button>
        </div>
      </div>
    </div>
  );
};
