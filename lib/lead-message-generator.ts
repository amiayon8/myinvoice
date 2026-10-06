import {
  WeddingLead,
  RestaurantLead,
  OutreachAngle,
  MessageGeneratorSettings,
} from "@/types/leads";

export function cleanLeadName(rawName: string | null): string {
  if (!rawName) return "";
  const trimmed = rawName.trim();
  const withoutPipe = trimmed.split("|")[0].trim();
  const withoutDash = withoutPipe.split(" - ")[0].trim();
  const withoutBy = withoutDash.split(" by ")[0].trim();
  return withoutBy.replace(/\s+/g, " ");
}

export function extractFirstName(cleanName: string): string {
  if (!cleanName) return "";
  const parts = cleanName.split(" ");
  const first = parts[0];
  const corporateKeywords = [
    "hotel",
    "restaurant",
    "cafe",
    "salon",
    "studio",
    "villa",
    "grill",
    "bistro",
    "kitchen",
    "bar",
    "resort",
    "palace",
    "events",
    "creations",
    "photography",
    "films",
    "makeover",
  ];
  const isCorporate = parts.some((word) =>
    corporateKeywords.includes(word.toLowerCase()),
  );
  if (isCorporate) {
    return cleanName;
  }
  return first;
}

export function cleanLocation(
  rawLocation: string | null,
  rawAddress: string | null,
): string {
  if (rawLocation && rawLocation.trim().length > 0) {
    const loc = rawLocation.trim();
    if (loc.toLowerCase() === "delhi-ncr") return "Delhi";
    return loc;
  }
  if (rawAddress && rawAddress.trim().length > 0) {
    const parts = rawAddress.split(",").map((p) => p.trim());
    if (parts.length >= 2) {
      const cityCandidate = parts[parts.length - 2];
      return cityCandidate.replace(/[0-9]/g, "").trim();
    }
    return parts[0];
  }
  return "your area";
}

const NON_WEBSITE_DOMAINS = [
  "g.co",
  "goo.gl",
  "instagram.com",
  "instagr.am",
  "facebook.com",
  "fb.com",
  "fb.me",
  "whatsapp.com",
  "wa.me",
  "wa.link",
  "youtube.com",
  "youtu.be",
  "tiktok.com",
  "twitter.com",
  "x.com",
  "linkedin.com",
  "pinterest.com",
  "pin.it",
  "threads.net",
  "snapchat.com",
  "t.me",
  "telegram.me",
  "linktr.ee",
  "linktree.com",
  "bio.link",
  "oia.bio",
  "beacons.ai",
  "beacons.page",
  "taplink.cc",
  "campsite.bio",
  "solo.to",
  "snipfeed.co",
  "lnk.bio",
  "bento.me",
  "stan.store",
  "flowcode.com",
  "direct.me",
  "heylink.me",
  "linkin.bio",
  "bit.ly",
  "tinyurl.com",
  "opener.one",
  "t.co",
  "cutt.ly",
  "is.gd",
  "ow.ly",
];

export function extractCleanHostname(rawUrl: string | null): string {
  if (!rawUrl) return "";
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";
  try {
    const withProtocol =
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    return parsed.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    const clean = trimmed
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "");
    return clean.split("/")[0].split("?")[0].split("#")[0];
  }
}

export function isSocialOrGoogleDomain(hostname: string): boolean {
  if (!hostname) return true;
  if (
    hostname === "g.co" ||
    hostname.endsWith(".g.co") ||
    hostname === "goo.gl" ||
    hostname.endsWith(".goo.gl") ||
    hostname.includes("google.") ||
    hostname.includes(".google") ||
    hostname.includes("instagram") ||
    hostname.includes("youtube")
  ) {
    return true;
  }
  return NON_WEBSITE_DOMAINS.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
  );
}

export function hasIndependentWebsite(rawUrl: string | null): boolean {
  if (!rawUrl) return false;
  const hostname = extractCleanHostname(rawUrl);
  if (!hostname || hostname.length < 3 || !hostname.includes(".")) {
    return false;
  }
  return !isSocialOrGoogleDomain(hostname);
}

export function isSocialOrRedirectUrl(url: string | null): boolean {
  return !hasIndependentWebsite(url);
}

export function generateWeddingMessage(
  lead: WeddingLead,
  settings: MessageGeneratorSettings,
): string {
  const cleanName = cleanLeadName(lead.name);
  const firstName = extractFirstName(cleanName);
  const location = cleanLocation(lead.location, null);
  const hasExternalSite = !isSocialOrRedirectUrl(lead.website);
  const category = (lead.category || "").toLowerCase();
  const portfolioUrl =
    settings.portfolioUrl.trim() || "https://www.thenicedev.xyz";
  const conceptUrl =
    settings.conceptUrl.trim() || "https://wedding-verse-mu.vercel.app";
  const greeting = firstName ? `Hi ${firstName},` : "Hi,";

  let roleLabel = "wedding vendors";
  let workCompliment =
    "Really liked your work, especially the quality and overall presentation.";
  let sitePitchTarget = "best weddings, get a feel for your style";
  let specialization = "wedding professionals";

  if (category.includes("photo")) {
    roleLabel = `wedding photographers in ${location}`;
    workCompliment =
      "Really liked your photography, especially the way you capture the details and overall feel of the weddings.";
    sitePitchTarget = "best weddings, get a feel for your style";
    specialization = "wedding photographers";
  } else if (category.includes("makeup")) {
    roleLabel = `bridal makeup artists in ${location}`;
    workCompliment =
      "Really liked your bridal transformations, especially the clean base work and subtle detailing.";
    sitePitchTarget =
      "bridal portfolios, service packages, and available wedding dates";
    specialization = "bridal makeup artists and studios";
  } else if (category.includes("decorator") || category.includes("decor")) {
    roleLabel = `event decorators and planners in ${location}`;
    workCompliment =
      "Really liked your stage setups and floral concepts from your recent events.";
    sitePitchTarget =
      "past decor themes by venue type and request custom proposals";
    specialization = "wedding decorators and event designers";
  } else {
    roleLabel = `wedding vendors in ${location}`;
    workCompliment = "Really liked your recent work and client showcase.";
    sitePitchTarget = "best work, get a feel for your style";
    specialization = "wedding businesses";
  }

  if (settings.selectedAngle === "short_dm") {
    if (!hasExternalSite) {
      return `${greeting} came across your work while looking through ${roleLabel}. ${workCompliment}

I noticed you are mainly sharing your portfolio through Instagram right now. I build custom websites for ${specialization} so couples can browse your best projects in one clean place and contact you directly.

Already have a couple of ideas that would suit your style. Happy to share a quick 2-minute idea if you are curious:
${portfolioUrl}
Concept: ${conceptUrl}`;
    }
    return `${greeting} came across your work while looking through ${roleLabel}. ${workCompliment}

Took a quick look at your website and noticed a few quick mobile improvements that could help showcase your weddings even better and increase direct inquiries.

I build websites specifically for ${specialization}. Happy to send over a 2-minute walkthrough with a couple of quick ideas if you are open to it:
${portfolioUrl}
Concept: ${conceptUrl}`;
  }

  if (settings.selectedAngle === "direct_booking") {
    if (!hasExternalSite) {
      return `${greeting} I came across your profile while researching ${roleLabel}. ${workCompliment}

I noticed most of your inquiries probably come through Instagram DMs and WhatsApp. Having a dedicated website makes it much easier for brides and families to check packages, explore your portfolio by category, and send detailed date inquiries without the back-and-forth in messages.

I build websites specifically for ${specialization}, designed to filter high-intent inquiries and save you time.

If you are open to it, I would be happy to put together a quick 2-minute concept for your brand. No obligation at all.

You can see some of my work here:
${portfolioUrl}

Here is a wedding-focused concept I built:
${conceptUrl}`;
    }
    return `${greeting} I came across your profile while researching ${roleLabel}. ${workCompliment}

I had a look at your website and noticed the client booking and inquiry flow could be streamlined to capture more high-value inquiries directly on mobile.

I build websites specifically for ${specialization}, focused on clean portfolio presentation and inquiry conversion.

If you are open to it, I would be glad to share a quick 2-minute walkthrough of a few things you could tweak. No obligation at all.

You can see some of my work here:
${portfolioUrl}

Wedding concept:
${conceptUrl}`;
  }

  if (settings.selectedAngle === "video_audit") {
    return `${greeting} I came across your work while looking through ${roleLabel}. ${workCompliment}

${
  !hasExternalSite
    ? "I noticed you do not have a dedicated portfolio website yet and rely mostly on Instagram."
    : "I had a quick look through your website and current mobile setup."
}

I specialize in building websites for ${specialization}. I put together a quick 2-minute concept/audit for your brand showing how you could present your best work and book more wedding clients directly.

Would you be open to me sending over the quick 2-minute video link? No obligation at all.

You can review my past work here:
${portfolioUrl}

Wedding demo:
${conceptUrl}`;
  }

  if (settings.selectedAngle === "website_redesign" && hasExternalSite) {
    return `${greeting} I came across your work while looking through ${roleLabel}. ${workCompliment}

I was looking at your current website and noticed a few opportunities to refresh the layout, optimize the mobile loading speed, and give your portfolio a much cleaner, premium feel.

I build websites specifically for ${specialization}, helping them showcase their work with modern design and fast performance.

If you are interested, I would be happy to put together a quick 2-minute audit with a couple of specific suggestions for your site. No obligation at all.

Some of my recent work:
${portfolioUrl}

Wedding concept:
${conceptUrl}`;
  }

  return `${greeting} I came across your work while looking through ${roleLabel}. ${workCompliment}

${
  !hasExternalSite
    ? `I noticed you’re mainly showcasing your work through Instagram. I actually think your work would look really good on a proper website, where people can see your ${sitePitchTarget} and contact you directly.`
    : `I checked out your website and really liked your portfolio, though I noticed a few quick layout and mobile tweaks that could help present your work even better.`
}

I build websites specifically for ${specialization}, and I already have a few ideas for how I’d approach one for your work.

If you’re interested, I’d be happy to put together a quick 2-minute idea/audit for you. No obligation at all.

You can have a look at some of my work here:
${portfolioUrl}

I’ve also built this wedding-focused concept:
${conceptUrl}`;
}

export function generateRestaurantMessage(
  lead: RestaurantLead,
  settings: MessageGeneratorSettings,
): string {
  const cleanName = cleanLeadName(lead.name);
  const location = cleanLocation(null, lead.address);
  const hasExternalSite = !isSocialOrRedirectUrl(lead.website);
  const portfolioUrl =
    settings.portfolioUrl.trim() || "https://www.thenicedev.xyz";
  const ratingText = lead.rating ? `${lead.rating} stars` : "great ratings";
  const reviewCountText = lead.reviews
    ? `${lead.reviews.toLocaleString()} reviews`
    : "strong customer reviews";

  const greeting = cleanName ? `Hi ${cleanName} team,` : "Hi,";

  if (settings.selectedAngle === "short_dm") {
    if (!hasExternalSite) {
      return `${greeting} was looking through dining spots in ${location} and saw your place with ${ratingText} on Google. Food looks great.

Noticed you don’t have an official website linked on your Google profile yet. I build clean, fast restaurant websites with direct digital menus and WhatsApp/reservation buttons so customers do not have to search around.

Put together a quick 2-minute idea for how an online menu and booking page could look for you:
${portfolioUrl}

Happy to send over a preview if you are interested.`;
    }
    return `${greeting} came across your restaurant in ${location}—impressive reviews on Google (${reviewCountText}).

Took a quick look at your website and noticed a few mobile tweaks to the menu view and reservation button that could help convert more local diners directly.

I build websites for food and hospitality businesses. Happy to share a quick 2-minute walkthrough if you would like to see it:
${portfolioUrl}`;
  }

  if (settings.selectedAngle === "direct_booking") {
    return `${greeting} I was checking out places to eat in ${location} and noticed your Google profile has ${ratingText} across ${reviewCountText}.

${
  !hasExternalSite
    ? "A lot of customers searching for you on Google want to quickly view your food menu, confirm timings, and book a table or place a direct pickup order without paying hefty commission to third-party delivery apps."
    : "Your current website has good information, but the reservation and direct menu flow could be much more prominent on mobile screens where most diners search."
}

I build modern websites for restaurants with commission-free ordering, instant WhatsApp ordering, and table booking.

If you would like to see how this could look for ${cleanName || "your restaurant"}, I would be happy to share a quick 2-minute concept. No obligation at all.

Here is some of my work:
${portfolioUrl}`;
  }

  if (settings.selectedAngle === "video_audit") {
    return `${greeting} came across your listing while researching dining spots in ${location}. Great feedback from guests on Google.

I put together a quick 2-minute video audit looking at your Google profile presence and online menu accessibility, along with 2 or 3 quick suggestions that can bring in more direct table bookings.

Would you be open to me sharing the link with you? No sales pitch or obligation.

My portfolio is here:
${portfolioUrl}`;
  }

  return `${greeting} I was looking through dining spots in ${location} and came across ${cleanName || "your restaurant"} with ${ratingText} and ${reviewCountText} on Google. The food and reviews look great.

${
  !hasExternalSite
    ? "I noticed you don’t have an official website linked on your Google profile yet. Many customers searching for you on Google want to quickly view your menu, check opening hours, and reserve a table directly without going through third-party platforms."
    : "I took a look at your website and noticed a few small adjustments to the mobile menu speed and reservation layout that could help convert more visitors into direct diners."
}

I build fast, modern websites for restaurants, and I already have a few specific ideas for ${cleanName || "your venue"}.

If you’re interested, I’d be happy to put together a quick 2-minute concept/audit for you. No obligation at all.

You can take a look at some of my work here:
${portfolioUrl}`;
}
