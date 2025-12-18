import { CompanyProfile, InvoiceData } from './types';

export const COMPANIES: CompanyProfile[] = [
  {
    id: 'c1',
    name: 'PixelForge Studios',
    // Fix: Changed logoUrl to logo_url to match CompanyProfile definition
    logo_url: 'https://picsum.photos/id/42/100/100',
    email: 'billing@pixelforge.dev',
    website: 'www.pixelforge.dev',
    address: '123 Creative Blvd, Design City, DC 90210',
    phone: '+1 (555) 019-2834',
    color: '#4f46e5', // Indigo
  },
  {
    id: 'c2',
    name: 'CodeStream Solutions',
    // Fix: Changed logoUrl to logo_url to match CompanyProfile definition
    logo_url: 'https://picsum.photos/id/2/100/100',
    email: 'accounts@codestream.io',
    website: 'www.codestream.io',
    address: '404 Server Not Found Rd, Tech Valley, CA 94043',
    phone: '+1 (555) 867-5309',
    color: '#0ea5e9', // Sky Blue
  },
  {
    id: 'c3',
    name: 'Freelance Dave',
    // Fix: Changed logoUrl to logo_url to match CompanyProfile definition
    logo_url: 'https://picsum.photos/id/1005/100/100',
    email: 'dave@freelance.me',
    website: 'dave.dev',
    address: 'PO Box 777, Remote Work St',
    phone: '+1 (555) 123-4567',
    color: '#10b981', // Emerald
  }
];

export const INITIAL_INVOICE: InvoiceData = {
  invoiceNumber: `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
  date: new Date().toISOString().split('T')[0],
  companyId: COMPANIES[0].id,
  isRecurring: false,
  client: {
    name: '',
    email: '',
    address: '',
  },
  items: [
    { id: '1', description: 'Web Development Services', quantity: 1, rate: 100 },
  ],
  notes: 'Thank you for your business! Payment is due within 14 days.',
  currency: '৳ ',
  taxRate: 0,
};