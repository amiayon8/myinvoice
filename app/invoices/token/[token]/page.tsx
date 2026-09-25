import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { InvoicePreview } from "@/components/invoice-preview";
import { ResponsiveInvoiceWrapper } from "@/components/responsive-invoice-wrapper";
import { PublicHeader } from "@/components/public-header";
import { DynamicPaymentCards } from "@/components/dynamic-payment-cards";
import { getPaymentMethodsForClient } from "@/lib/payment-methods-service";
import { CompanyProfile } from "@/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import Link from "next/link";
import { Clock, CheckCircle2, AlertCircle } from "lucide-react";

interface PublicInvoicePageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ bill?: string }>;
}

function parseUserAgent(ua: string) {
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

  return { browser, os, device };
}

export default async function PublicInvoicePage({
  params,
  searchParams,
}: PublicInvoicePageProps) {
  const { token } = await params;
  const { bill: selectedBillId } = await searchParams;

  const reqHeaders = await headers();
  const supabase = createServiceRoleClient();

  const { data: tokenRecord, error: tokenError } = await supabase
    .from("invoice_access_tokens")
    .select("id, invoice_id, expires_at, never_expires, is_public, revoked_at")
    .eq("token", token)
    .single();

  if (tokenError || !tokenRecord) return notFound();

  if (tokenRecord.revoked_at) {
    return <InvalidPage reason="revoked" />;
  }

  if (!tokenRecord.is_public) {
    return <InvalidPage reason="expired" />;
  }

  if (!tokenRecord.never_expires && tokenRecord.expires_at) {
    if (new Date(tokenRecord.expires_at).getTime() < Date.now()) {
      return <InvalidPage reason="expired" />;
    }
  }

  const userAgent = reqHeaders.get("user-agent") || "";
  const ip =
    reqHeaders.get("x-forwarded-for")?.split(",")[0].trim() ||
    reqHeaders.get("x-real-ip") ||
    reqHeaders.get("cf-connecting-ip") ||
    "unknown";
  const referrer = reqHeaders.get("referer") || null;
  const { browser, os, device } = parseUserAgent(userAgent);

  supabase
    .from("invoice_view_logs")
    .insert({
      token_id: tokenRecord.id,
      invoice_id: tokenRecord.invoice_id,
      ip_address: ip,
      user_agent: userAgent,
      browser,
      os,
      device,
      referrer,
    })
    .then(() => {});

  const { data: parentInvoice, error: invError } = await supabase
    .from("invoices")
    .select(
      "*, items:invoice_items(*), client:clients(*), company:companies(*)",
    )
    .eq("id", tokenRecord.invoice_id)
    .single();

  if (invError || !parentInvoice) return notFound();

  let childBills: any[] = [];
  if (parentInvoice.is_recurring) {
    const { data: mappingLogs } = await supabase
      .from("recurring_invoices")
      .select("child_invoice_id")
      .eq("parent_invoice_id", parentInvoice.id);

    if (mappingLogs && mappingLogs.length > 0) {
      const childIds = mappingLogs.map((m: any) => m.child_invoice_id);
      const { data: childInvoices } = await supabase
        .from("invoices")
        .select("*, items:invoice_items(*)")
        .in("id", childIds)
        .order("date", { ascending: false });

      childBills = childInvoices || [];
    }
  }

  let activeInvoice = parentInvoice;
  if (selectedBillId && parentInvoice.is_recurring) {
    const matchedBill = childBills.find((b: any) => b.id === selectedBillId);
    if (matchedBill) {
      activeInvoice = {
        ...matchedBill,
        client: parentInvoice.client,
        company: parentInvoice.company,
      };
    }
  }

  const { data: payments } = await supabase
    .from("invoice_payments")
    .select("id, amount, payment_date, payment_method, notes")
    .eq("invoice_id", activeInvoice.id)
    .order("payment_date", { ascending: false });

  const totalPaid = (payments || []).reduce(
    (sum: number, p: any) => sum + p.amount,
    0,
  );
  const subtotal =
    activeInvoice.items?.reduce(
      (sum: number, item: any) => sum + item.quantity * item.rate,
      0,
    ) || 0;
  const taxAmount = subtotal * ((activeInvoice.tax_rate || 0) / 100);
  const totalAmount = subtotal + taxAmount;

  const previewData = {
    invoiceNumber: activeInvoice.invoice_number,
    date: activeInvoice.date,
    companyId: activeInvoice.company_id,
    client: activeInvoice.client || {
      name: "Recipient",
      email: "",
      address: "",
    },
    items: activeInvoice.items || [],
    notes: activeInvoice.notes,
    currency: activeInvoice.currency,
    taxRate: activeInvoice.tax_rate,
    isRecurring: activeInvoice.is_recurring,
    recurringFrequency: activeInvoice.recurring_frequency,
    paid_amount: totalPaid,
    status:
      totalPaid >= totalAmount
        ? "paid"
        : totalPaid > 0
          ? "partially_paid"
          : activeInvoice.status,
  };

  const isPaid = previewData.status === "paid";
  const dueAmount = Math.max(0, totalAmount - totalPaid);
  const paymentMethods = await getPaymentMethodsForClient(
    parentInvoice.client_id,
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center pt-8 p-4 pb-16 print:p-0 print:bg-white text-zinc-900 dark:text-zinc-100 font-sans">
      <PublicHeader
        token={token}
        invoiceNumber={activeInvoice.invoice_number}
      />

      {activeInvoice.id !== parentInvoice.id && (
        <div className="mb-6 w-full max-w-[210mm] border border-zinc-200 dark:border-zinc-800 p-3.5 flex items-center justify-between text-xs no-print bg-white dark:bg-zinc-900">
          <span className="text-zinc-600 dark:text-zinc-400">
            Viewing recurring bill #{activeInvoice.invoice_number}
          </span>
          <Link
            href={`/invoices/token/${token}`}
            className="text-xs font-medium underline text-zinc-900 dark:text-zinc-100 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            Back to main invoice
          </Link>
        </div>
      )}
      <ResponsiveInvoiceWrapper>
        <div className="border border-zinc-200 dark:border-zinc-800 overflow-hidden print:border-none">
          <InvoicePreview
            data={previewData}
            company={parentInvoice.company as CompanyProfile}
          />
        </div>
      </ResponsiveInvoiceWrapper>

      {parentInvoice.is_recurring && childBills.length > 0 && (
        <div className="mb-6 w-full max-w-[210mm] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 no-print">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="text-xs font-semibold tracking-tight uppercase text-zinc-500">
              Recurring Billing History
            </h3>
            <span className=" text-xs text-zinc-400">
              {childBills.length} records
            </span>
          </div>

          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800 text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                  <th className="py-2.5 pr-4 font-normal">Invoice</th>
                  <th className="py-2.5 px-4 font-normal">Billing Date</th>
                  <th className="py-2.5 pl-4 text-right font-normal">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {childBills.map((bill) => {
                  const billSubtotal =
                    bill.items?.reduce(
                      (sum: number, item: any) =>
                        sum + item.quantity * item.rate,
                      0,
                    ) || 0;
                  const billTax = billSubtotal * ((bill.tax_rate || 0) / 100);
                  const billTotal = billSubtotal + billTax;
                  const isCurrent = activeInvoice.id === bill.id;

                  return (
                    <tr
                      key={bill.id}
                      className={
                        isCurrent
                          ? "bg-zinc-100/70 dark:bg-zinc-800/40"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-800/20"
                      }
                    >
                      <td className="py-2.5 pr-4">
                        <Link
                          href={`/invoices/token/${token}?bill=${bill.id}`}
                          className=" font-medium hover:underline text-zinc-900 dark:text-zinc-100"
                        >
                          #{bill.invoice_number}
                        </Link>
                      </td>
                      <td className="py-2.5 px-4  text-zinc-500 dark:text-zinc-400">
                        {new Date(bill.date).toISOString().split("T")[0]}
                      </td>
                      <td className="py-2.5 pl-4 text-right  text-zinc-900 dark:text-zinc-100">
                        {bill.currency}
                        {billTotal.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="w-full max-w-[210mm] mb-6 no-print">
        <DynamicPaymentCards
          clientId={activeInvoice.client_id}
          clientName={activeInvoice.client?.name}
          invoiceId={activeInvoice.id}
          invoiceNumber={activeInvoice.invoice_number}
          isPaid={isPaid}
          currency={activeInvoice.currency || "৳"}
          totalDue={dueAmount}
          initialMethods={paymentMethods}
        />
      </div>
      {payments && payments.length > 0 && (
        <div className="mb-6 w-full max-w-[210mm] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 no-print">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="text-xs font-semibold tracking-tight uppercase text-zinc-500">
              Payment Record
            </h3>
            <span className=" text-xs text-zinc-400">
              Total Paid: {activeInvoice.currency}
              {totalPaid.toFixed(2)}
            </span>
          </div>

          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800 text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                  <th className="py-2.5 pr-4 font-normal">Date</th>
                  <th className="py-2.5 px-4 font-normal">Method</th>
                  <th className="py-2.5 px-4 font-normal">Reference</th>
                  <th className="py-2.5 pl-4 text-right font-normal">
                    Amount Paid
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {payments.map((pay: any) => (
                  <tr
                    key={pay.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20"
                  >
                    <td className="py-2.5 pr-4  text-zinc-600 dark:text-zinc-400">
                      {new Date(pay.payment_date).toISOString().split("T")[0]}
                    </td>
                    <td className="py-2.5 px-4 text-zinc-700 dark:text-zinc-300">
                      {pay.payment_method
                        ? pay.payment_method.replace("_", " ")
                        : "Direct"}
                    </td>
                    <td className="py-2.5 px-4  text-zinc-500 dark:text-zinc-400">
                      {pay.notes || "Recorded"}
                    </td>
                    <td className="py-2.5 pl-4 text-right  font-medium text-zinc-900 dark:text-zinc-100">
                      {activeInvoice.currency}
                      {Number(pay.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <footer className="text-center py-8 w-full mt-12 text-xs text-zinc-400 dark:text-zinc-500 border-t border-zinc-200 dark:border-zinc-800 no-print">
        <p className="mb-2">Invoice #{activeInvoice.invoice_number}</p>
        <p>
          Developed by{" "}
          <a
            className="text-black dark:text-white hover:underline"
            href="https://www.thenicedev.xyz"
          >
            The Nice Developer
          </a>
        </p>
      </footer>
    </div>
  );
}

function InvalidPage({ reason }: { reason: "revoked" | "expired" }) {
  const isRevoked = reason === "revoked";
  return (
    <div className="flex flex-col justify-center items-center bg-zinc-50 dark:bg-zinc-950 min-h-screen text-center p-6 font-sans text-zinc-900 dark:text-zinc-100">
      <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 max-w-sm w-full space-y-3">
        <div className="flex justify-center text-zinc-400 dark:text-zinc-500">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-sm font-semibold tracking-tight uppercase">
          {isRevoked ? "Link Revoked" : "Link Expired"}
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed">
          {isRevoked
            ? "This invoice link has been revoked by the issuer."
            : "This invoice link has expired. Request an updated link from the issuer."}
        </p>
      </div>
    </div>
  );
}
