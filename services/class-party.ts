import { createServiceRoleClient } from "@/lib/supabase/service-role";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export const COORDINATOR_NAMES = [
  "Ayon",
  "Apurbo",
  "Zunairah",
  "Zahira",
  "Punnota",
  "Ishmam",
  "Raheeb",
  "Rajoshi",
  "Niaz",
  "Zaima",
  "Shehab",
];

import {
  ClassPartyRegistrationRecord,
  getClassPartySubtotal,
  getClassPartyFinancials,
} from "@/lib/class-party-calc";

export {
  type ClassPartyRegistrationRecord,
  getClassPartySubtotal,
  getClassPartyFinancials,
};

export interface ClassPartyShareLink {
  id: string;
  token: string;
  label: string | null;
  type: string;
  params: {
    showFinancials?: boolean;
    showContactInfo?: boolean;
    showHistory?: boolean;
    allowRegistration?: boolean;
    coordinatorFilter?: string;
    organizer?: string | null;
    canApprovePayments?: boolean;
  };
  expires_at: string | null;
  never_expires: boolean;
  revoked_at: string | null;
  created_at: string;
  viewCount?: number;
  lastViewedAt?: string | null;
}

export interface ClassPartyViewLog {
  id: string;
  token_id: string;
  ip_address?: string;
  user_agent?: string;
  browser?: string;
  os?: string;
  device?: string;
  referrer?: string;
  viewed_at: string;
  token_label?: string | null;
}

export interface ClassPartyActivityLog {
  id: string;
  category: "registration" | "payment" | "status" | "edit" | "delete" | "view";
  actor: string;
  action: string;
  details?: string;
  record_id?: string;
  participant_name?: string;
  created_at: string;
}

const storageDir = path.join(process.cwd(), "appData");
const linksFilePath = path.join(storageDir, "class-party-26-share-links.json");
const viewLogsFilePath = path.join(storageDir, "class-party-26-view-logs.json");
const activityLogsFilePath = path.join(storageDir, "class-party-26-activity-logs.json");
const submissionsFilePath = path.join(storageDir, "class-party-26-submissions.json");

function ensureStorageDirectory() {
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }
}

function readJsonFile<T>(filePath: string): T[] {
  try {
    ensureStorageDirectory();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf8");
      return JSON.parse(raw);
    }
  } catch (error) {
    console.error("Storage read error:", error);
  }
  return [];
}

function writeJsonFile<T>(filePath: string, data: T[]): void {
  try {
    ensureStorageDirectory();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("Storage write error:", error);
  }
}

export function parseUserAgentDetails(ua: string) {
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua) && !/Chromium\//.test(ua)
        ? "Chrome"
        : /Chromium\//.test(ua)
          ? "Chromium"
          : /Firefox\//.test(ua)
            ? "Firefox"
            : /Safari\//.test(ua) && !/Chrome\//.test(ua)
              ? "Safari"
              : /MSIE |Trident\//.test(ua)
                ? "IE"
                : "Unknown";

  const os = /Windows NT 10/.test(ua)
    ? "Windows 10/11"
    : /Windows NT 6\.3/.test(ua)
      ? "Windows 8.1"
      : /Windows NT 6\.1/.test(ua)
        ? "Windows 7"
        : /Windows/.test(ua)
          ? "Windows"
          : /Mac OS X/.test(ua)
            ? "macOS"
            : /Android/.test(ua)
              ? "Android"
              : /iPhone|iPad/.test(ua)
                ? "iOS"
                : /Linux/.test(ua)
                  ? "Linux"
                  : "Unknown";

  const device = /Mobile|Android|iPhone/.test(ua)
    ? "Mobile"
    : /iPad|Tablet/.test(ua)
      ? "Tablet"
      : "Desktop";

  const isBot =
    /bot|crawler|spider|facebookexternalhit|whatsapp|telegrambot|preview/i.test(ua);

  return { browser, os, device, isBot };
}

export async function getClassPartyShareLinks(): Promise<ClassPartyShareLink[]> {
  const supabase = createServiceRoleClient();
  let links: ClassPartyShareLink[] = [];

  try {
    const { data, error } = await supabase
      .from("class_party_26_share_links")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      links = data;
      writeJsonFile(linksFilePath, data);
    } else {
      links = readJsonFile<ClassPartyShareLink>(linksFilePath);
    }
  } catch {
    links = readJsonFile<ClassPartyShareLink>(linksFilePath);
  }

  if (links.length === 0) {
    links = readJsonFile<ClassPartyShareLink>(linksFilePath);
  }

  const viewLogs = await getClassPartyViewLogs();
  const countMap: Record<string, number> = {};
  const lastViewMap: Record<string, string> = {};

  viewLogs.forEach((log) => {
    countMap[log.token_id] = (countMap[log.token_id] || 0) + 1;
    if (
      !lastViewMap[log.token_id] ||
      new Date(log.viewed_at) > new Date(lastViewMap[log.token_id])
    ) {
      lastViewMap[log.token_id] = log.viewed_at;
    }
  });

  return links.map((l) => ({
    ...l,
    viewCount: countMap[l.id] || 0,
    lastViewedAt: lastViewMap[l.id] || null,
  }));
}

export async function createClassPartyShareLink(input: {
  label?: string;
  type?: string;
  params?: ClassPartyShareLink["params"];
  neverExpires: boolean;
  daysExpiry?: number;
}): Promise<ClassPartyShareLink> {
  const supabase = createServiceRoleClient();
  const id = crypto.randomUUID();
  const token = crypto.randomBytes(16).toString("hex");
  const now = new Date().toISOString();

  const expiresAt = input.neverExpires
    ? null
    : (() => {
        const d = new Date();
        d.setDate(d.getDate() + (Number(input.daysExpiry) || 30));
        return d.toISOString();
      })();

  const newLink: ClassPartyShareLink = {
    id,
    token,
    label: input.label ? input.label.trim() : null,
    type: input.type || "all",
    params: input.params || {
      showFinancials: true,
      showContactInfo: true,
      showHistory: true,
      allowRegistration: true,
    },
    never_expires: Boolean(input.neverExpires),
    expires_at: expiresAt,
    revoked_at: null,
    created_at: now,
  };

  const localLinks = readJsonFile<ClassPartyShareLink>(linksFilePath);
  localLinks.unshift(newLink);
  writeJsonFile(linksFilePath, localLinks);

  try {
    await supabase.from("class_party_26_share_links").insert(newLink);
  } catch (err) {
    console.warn("Supabase share link insert exception:", err);
  }

  await logClassPartyActivity({
    category: "view",
    actor: "Admin",
    action: `Created new share link: "${newLink.label || "Class Party Share"}"`,
    details: `Token: ${newLink.token.slice(0, 8)}... | Type: ${newLink.type}`,
  });

  return {
    ...newLink,
    viewCount: 0,
    lastViewedAt: null,
  };
}

function isValidUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    id,
  );
}

export async function updateClassPartyShareLink(
  id: string,
  updates: {
    label?: string | null;
    type?: string;
    expires_at?: string | null;
    never_expires?: boolean;
    params?: ClassPartyShareLink["params"];
    revoked_at?: string | null;
  },
): Promise<ClassPartyShareLink | null> {
  const supabase = createServiceRoleClient();
  const localLinks = readJsonFile<ClassPartyShareLink>(linksFilePath);
  const localIndex = localLinks.findIndex((l) => l.id === id || l.token === id);

  let existingLink: ClassPartyShareLink | null =
    localIndex !== -1 ? localLinks[localIndex] : null;

  try {
    const isUuid = isValidUuid(id);
    const query = supabase.from("class_party_26_share_links").select("*");
    const { data, error } = isUuid
      ? await query.eq("id", id).maybeSingle()
      : await query.eq("token", id).maybeSingle();

    if (!error && data) {
      existingLink = data as ClassPartyShareLink;
    }
  } catch (err) {
    console.warn("Supabase fetch share link exception:", err);
  }

  if (!existingLink) {
    return null;
  }

  const mergedParams = {
    ...existingLink.params,
    ...(updates.params || {}),
  };

  const updatedRecord: ClassPartyShareLink = {
    ...existingLink,
    ...updates,
    params: mergedParams,
  };

  if (localIndex !== -1) {
    localLinks[localIndex] = updatedRecord;
  } else {
    localLinks.unshift(updatedRecord);
  }
  writeJsonFile(linksFilePath, localLinks);

  try {
    const isUuid = isValidUuid(existingLink.id);
    const updatePayload = {
      ...updates,
      params: mergedParams,
    };
    if (isUuid) {
      await supabase
        .from("class_party_26_share_links")
        .update(updatePayload)
        .eq("id", existingLink.id);
    } else {
      await supabase
        .from("class_party_26_share_links")
        .update(updatePayload)
        .eq("token", existingLink.token);
    }
  } catch (err) {
    console.warn("Supabase share link update exception:", err);
  }

  return updatedRecord;
}

export async function deleteClassPartyShareLink(id: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const localLinks = readJsonFile<ClassPartyShareLink>(linksFilePath);
  const target = localLinks.find((l) => l.id === id || l.token === id);
  const filtered = localLinks.filter((l) => l.id !== id && l.token !== id);
  let wasDeleted = false;

  if (filtered.length !== localLinks.length) {
    writeJsonFile(linksFilePath, filtered);
    wasDeleted = true;
  }

  try {
    const isUuid = isValidUuid(id);
    const { error } = isUuid
      ? await supabase.from("class_party_26_share_links").delete().eq("id", id)
      : await supabase
          .from("class_party_26_share_links")
          .delete()
          .eq("token", id);

    if (!error) {
      wasDeleted = true;
    }
  } catch (err) {
    console.warn("Supabase share link delete exception:", err);
  }

  if (target) {
    await logClassPartyActivity({
      category: "delete",
      actor: "Admin",
      action: `Deleted share link: "${target.label || target.token.slice(0, 8)}"`,
    });
  }

  return wasDeleted || Boolean(target);
}

export async function logClassPartyView(input: {
  token_id: string;
  ip_address?: string;
  user_agent?: string;
  referrer?: string;
}): Promise<void> {
  const supabase = createServiceRoleClient();
  const parsed = input.user_agent ? parseUserAgentDetails(input.user_agent) : null;

  const viewRecord: ClassPartyViewLog = {
    id: crypto.randomUUID(),
    token_id: input.token_id,
    ip_address: input.ip_address || "unknown",
    user_agent: input.user_agent || "unknown",
    browser: parsed ? parsed.browser : "Unknown",
    os: parsed ? parsed.os : "Unknown",
    device: parsed ? parsed.device : "Desktop",
    referrer: input.referrer || undefined,
    viewed_at: new Date().toISOString(),
  };

  const localLogs = readJsonFile<ClassPartyViewLog>(viewLogsFilePath);
  localLogs.unshift(viewRecord);
  if (localLogs.length > 500) {
    localLogs.length = 500;
  }
  writeJsonFile(viewLogsFilePath, localLogs);

  try {
    await supabase.from("class_party_26_view_logs").insert(viewRecord);
  } catch (err) {
    console.warn("Supabase view log insert exception:", err);
  }
}

export async function getClassPartyViewLogs(): Promise<ClassPartyViewLog[]> {
  const supabase = createServiceRoleClient();
  let logs: ClassPartyViewLog[] = [];

  try {
    const { data, error } = await supabase
      .from("class_party_26_view_logs")
      .select("*, token:class_party_26_share_links(label)")
      .order("viewed_at", { ascending: false })
      .limit(500);

    if (!error && data && data.length > 0) {
      logs = data.map((d: any) => ({
        id: d.id,
        token_id: d.token_id,
        ip_address: d.ip_address,
        user_agent: d.user_agent,
        browser: d.browser,
        os: d.os,
        device: d.device,
        referrer: d.referrer,
        viewed_at: d.viewed_at,
        token_label: d.token?.label || null,
      }));
    } else {
      logs = readJsonFile<ClassPartyViewLog>(viewLogsFilePath);
    }
  } catch {
    logs = readJsonFile<ClassPartyViewLog>(viewLogsFilePath);
  }

  if (logs.length === 0) {
    logs = readJsonFile<ClassPartyViewLog>(viewLogsFilePath);
  }

  return logs;
}

export async function logClassPartyActivity(input: {
  category: ClassPartyActivityLog["category"];
  actor: string;
  action: string;
  details?: string;
  record_id?: string;
  participant_name?: string;
}): Promise<void> {
  const supabase = createServiceRoleClient();
  const entry: ClassPartyActivityLog = {
    id: crypto.randomUUID(),
    category: input.category,
    actor: input.actor,
    action: input.action,
    details: input.details,
    record_id: input.record_id,
    participant_name: input.participant_name,
    created_at: new Date().toISOString(),
  };

  const localLogs = readJsonFile<ClassPartyActivityLog>(activityLogsFilePath);
  localLogs.unshift(entry);
  if (localLogs.length > 500) {
    localLogs.length = 500;
  }
  writeJsonFile(activityLogsFilePath, localLogs);

  try {
    await supabase.from("class_party_26_activity_logs").insert(entry);
  } catch (err) {
    console.warn("Supabase activity log insert exception:", err);
  }
}

export async function getClassPartyActivityLogs(): Promise<ClassPartyActivityLog[]> {
  const supabase = createServiceRoleClient();
  let logs: ClassPartyActivityLog[] = [];

  try {
    const { data, error } = await supabase
      .from("class_party_26_activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (!error && data && data.length > 0) {
      logs = data;
    } else {
      logs = readJsonFile<ClassPartyActivityLog>(activityLogsFilePath);
    }
  } catch {
    logs = readJsonFile<ClassPartyActivityLog>(activityLogsFilePath);
  }

  if (logs.length === 0) {
    logs = readJsonFile<ClassPartyActivityLog>(activityLogsFilePath);
  }

  return logs;
}

export async function getSharedClassPartyData(token: string) {
  const supabase = createServiceRoleClient();
  const allLinks = await getClassPartyShareLinks();
  let linkRecord = allLinks.find((l) => l.token === token || l.id === token);

  if (!linkRecord) {
    try {
      const isUuid = isValidUuid(token);
      const query = supabase.from("class_party_26_share_links").select("*");
      const { data, error } = isUuid
        ? await query.eq("id", token).maybeSingle()
        : await query.eq("token", token).maybeSingle();

      if (!error && data) {
        linkRecord = data as ClassPartyShareLink;
      }
    } catch (err) {
      console.warn("Supabase fetch share link by token exception:", err);
    }
  }

  if (!linkRecord) {
    return { success: false, error: "Share link not found" };
  }

  if (linkRecord.revoked_at) {
    return { success: false, error: "This share link has been revoked" };
  }

  if (!linkRecord.never_expires && linkRecord.expires_at) {
    if (new Date(linkRecord.expires_at) < new Date()) {
      return { success: false, error: "This share link has expired" };
    }
  }

  let registrations: ClassPartyRegistrationRecord[] = [];
  try {
    const { data, error } = await supabase
      .from("class_party_26_registrations")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      registrations = data as ClassPartyRegistrationRecord[];
    } else {
      registrations = readJsonFile<ClassPartyRegistrationRecord>(submissionsFilePath);
    }
  } catch {
    registrations = readJsonFile<ClassPartyRegistrationRecord>(submissionsFilePath);
  }

  if (registrations.length === 0) {
    registrations = readJsonFile<ClassPartyRegistrationRecord>(submissionsFilePath);
  }

  const activities = await getClassPartyActivityLogs();

  return {
    success: true,
    link: linkRecord,
    registrations,
    activities,
  };
}

export async function updateClassPartyRegistration(
  id: string,
  updates: Partial<ClassPartyRegistrationRecord>
): Promise<ClassPartyRegistrationRecord | null> {
  const supabase = createServiceRoleClient();
  const list = readJsonFile<ClassPartyRegistrationRecord>(submissionsFilePath);
  const index = list.findIndex((item) => item.id === id);
  let updatedRecord: ClassPartyRegistrationRecord | null = null;

  if (index !== -1) {
    list[index] = { ...list[index], ...updates };
    updatedRecord = list[index];
    writeJsonFile(submissionsFilePath, list);
  }

  try {
    const { data, error } = await supabase
      .from("class_party_26_registrations")
      .update(updates)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (!error && data) {
      updatedRecord = data as ClassPartyRegistrationRecord;
    }
  } catch (err) {
    console.warn("Supabase registration update error:", err);
  }

  return updatedRecord;
}
