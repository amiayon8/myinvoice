'use client';

import React, { useState, useEffect } from 'react';
import {
  WeddingLead,
  RestaurantLead,
  LeadType,
  OutreachAngle,
  MessageGeneratorSettings,
} from '@/types/leads';
import {
  generateWeddingMessage,
  generateRestaurantMessage,
  cleanLeadName,
  hasIndependentWebsite,
} from '@/lib/lead-message-generator';
import { useToast } from '@/components/ui/toast';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  Mail,
  Send,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react';
import { saveLeadUserMeta } from '@/services/leads-service';

interface LeadMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: WeddingLead | RestaurantLead | null;
  leadType: LeadType;
  onStatusUpdated?: () => void;
}

const DEFAULT_SETTINGS: MessageGeneratorSettings = {
  portfolioUrl: 'https://www.thenicedev.xyz',
  conceptUrl: 'https://wedding-verse-mu.vercel.app',
  senderName: '',
  selectedAngle: 'natural_intro',
};

export const LeadMessageModal: React.FC<LeadMessageModalProps> = ({
  isOpen,
  onClose,
  lead,
  leadType,
  onStatusUpdated,
}) => {
  const toast = useToast();
  const [settings, setSettings] = useState<MessageGeneratorSettings>(DEFAULT_SETTINGS);
  const [editedText, setEditedText] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState<boolean>(false);

  useEffect(() => {
    if (!lead) return;
    const initialText =
      leadType === 'wedding'
        ? generateWeddingMessage(lead as WeddingLead, settings)
        : generateRestaurantMessage(lead as RestaurantLead, settings);
    setEditedText(initialText);
    setCopied(false);
  }, [lead, leadType, settings]);

  if (!isOpen || !lead) return null;

  const weddingLead = leadType === 'wedding' ? (lead as WeddingLead) : null;
  const restaurantLead = leadType === 'places' ? (lead as RestaurantLead) : null;

  const leadName = cleanLeadName(lead.name);
  const hasWebsite =
    leadType === 'wedding'
      ? hasIndependentWebsite(weddingLead?.website || null)
      : hasIndependentWebsite(restaurantLead?.website || null);

  const instagramHandle = weddingLead?.instagram
    ? weddingLead.instagram.replace('@', '').trim()
    : null;

  const phone = restaurantLead?.phone || null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedText);
      setCopied(true);
      toast.success('Outreach message copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy message');
    }
  };

  const handleCopyAndMark = async () => {
    await handleCopy();
    const id = leadType === 'wedding' ? weddingLead!.id : restaurantLead!.place_id;
    try {
      await saveLeadUserMeta(leadType, id, { status: 'contacted' });
    } catch (err) {
      console.error(err);
    }
    if (onStatusUpdated) onStatusUpdated();
  };

  const handleOpenInstagram = () => {
    if (!instagramHandle) return;
    handleCopyAndMark();
    window.open(`https://instagram.com/${instagramHandle}`, '_blank');
  };

  const handleOpenWhatsApp = () => {
    if (phone) {
      handleCopyAndMark();
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const encodedMsg = encodeURIComponent(editedText);
      window.open(`https://wa.me/${cleanPhone}?text=${encodedMsg}`, '_blank');
      return;
    }
    if (weddingLead?.website && weddingLead.website.includes('wa.')) {
      handleCopyAndMark();
      window.open(weddingLead.website, '_blank');
    }
  };

  const handleOpenEmail = () => {
    handleCopyAndMark();
    const subject = encodeURIComponent(
      leadType === 'wedding'
        ? `Quick question regarding your photography & website`
        : `Quick idea for ${leadName || 'your restaurant'}`
    );
    const body = encodeURIComponent(editedText);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const handleReset = () => {
    const fresh =
      leadType === 'wedding'
        ? generateWeddingMessage(lead as WeddingLead, settings)
        : generateRestaurantMessage(lead as RestaurantLead, settings);
    setEditedText(fresh);
    toast.info('Message reset to template');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/70 backdrop-blur-xs animate-fade-in">
      <div className="relative flex flex-col w-full max-w-3xl max-h-[92vh] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60">
          <div className="min-w-0 pr-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {leadType === 'wedding' ? 'Wedding Lead' : 'Restaurant Lead'}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                  hasWebsite
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                }`}
              >
                {hasWebsite ? 'Has Website' : 'No Official Site'}
              </span>
            </div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 truncate mt-0.5">
              {leadName || 'Outreach Generator'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Outreach links & settings"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showSettingsDrawer && (
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/60 dark:bg-zinc-950/50 space-y-3 animate-fade-in text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                Portfolio & Outreach Links
              </span>
              <span className="text-[11px] text-zinc-500">
                Included naturally in generated pitches
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Your Portfolio Link
                </label>
                <input
                  type="text"
                  value={settings.portfolioUrl}
                  onChange={(e) =>
                    setSettings({ ...settings, portfolioUrl: e.target.value })
                  }
                  className="w-full px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-zinc-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Wedding Concept Demo Link
                </label>
                <input
                  type="text"
                  value={settings.conceptUrl}
                  onChange={(e) =>
                    setSettings({ ...settings, conceptUrl: e.target.value })
                  }
                  className="w-full px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-zinc-500"
                />
              </div>
            </div>
          </div>
        )}

        <div className="px-5 pt-3 border-b border-zinc-100 dark:border-zinc-800/60 flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
          {[
            { id: 'natural_intro', label: 'Human Intro (Demo)' },
            { id: 'short_dm', label: 'Short DM / WhatsApp' },
            { id: 'direct_booking', label: 'Direct Booking Flow' },
            { id: 'video_audit', label: '2-Minute Video Audit' },
            { id: 'website_redesign', label: 'Website Refresh' },
          ].map((angle) => (
            <button
              key={angle.id}
              type="button"
              onClick={() =>
                setSettings({
                  ...settings,
                  selectedAngle: angle.id as OutreachAngle,
                })
              }
              className={`px-3 py-1.5 text-xs font-medium rounded-t-md whitespace-nowrap transition-colors border-b-2 cursor-pointer ${
                settings.selectedAngle === angle.id
                  ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 bg-zinc-100/80 dark:bg-zinc-800/60'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              {angle.label}
            </button>
          ))}
        </div>

        <div className="flex-1 p-5 overflow-y-auto custom-scrollbar space-y-4">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>
              Real-time personalized message (zero AI patterns, completely human)
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset text
            </button>
          </div>

          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            rows={12}
            className="w-full p-4 rounded-lg font-sans text-xs leading-relaxed border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/60 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 resize-y"
          />

          <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200/80 dark:border-zinc-800 text-xs flex flex-wrap items-center gap-x-6 gap-y-2">
            {weddingLead?.location && (
              <div>
                <span className="text-zinc-400">Location: </span>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {weddingLead.location}
                </span>
              </div>
            )}
            {weddingLead?.category && (
              <div>
                <span className="text-zinc-400">Category: </span>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {weddingLead.category}
                </span>
              </div>
            )}
            {weddingLead?.followers_count != null && (
              <div>
                <span className="text-zinc-400">Followers: </span>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {weddingLead.followers_count.toLocaleString()}
                </span>
              </div>
            )}
            {restaurantLead?.reviews != null && (
              <div>
                <span className="text-zinc-400">Google Reviews: </span>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {restaurantLead.reviews.toLocaleString()} ({restaurantLead.rating} stars)
                </span>
              </div>
            )}
            {instagramHandle && (
              <a
                href={`https://instagram.com/${instagramHandle}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 underline underline-offset-2"
              >
                @{instagramHandle}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60">
          <div className="flex flex-wrap items-center gap-2">
            {instagramHandle && (
              <button
                type="button"
                onClick={handleOpenInstagram}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Copies message & marks lead as contacted"
              >
                <Send className="w-3.5 h-3.5 text-pink-500" />
                Copy & Open Instagram
              </button>
            )}

            {(phone || (weddingLead?.website && weddingLead.website.includes('wa.'))) && (
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Copies message & opens WhatsApp chat"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                Copy & WhatsApp
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenEmail}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-blue-500" />
              Email
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Copied to Clipboard
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Message
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
