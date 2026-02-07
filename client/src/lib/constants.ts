export const GHANA_LOCATIONS = [
  'Accra', 'Tema', 'Kumasi', 'Obuasi', 'Tamale', 
  'Sekondi-Takoradi', 'Sunyani', 'Cape Coast', 'Koforidua', 'Techiman'
] as const;

export const BUSINESS_TYPES = {
  machinery: { label: 'Machinery', icon: 'Truck', color: 'hsl(217, 91%, 60%)' },
  gold_agent: { label: 'Gold (Agents)', icon: 'Gem', color: 'hsl(45, 93%, 47%)' },
  gold_owner: { label: 'Gold (Owner)', icon: 'Crown', color: 'hsl(45, 93%, 55%)' },
  spare_parts: { label: 'Spare Parts', icon: 'Wrench', color: 'hsl(280, 67%, 55%)' },
  fuel: { label: 'Fuel Station', icon: 'Fuel', color: 'hsl(12, 76%, 55%)' },
} as const;

export const CURRENCIES = [
  { code: 'GHS', symbol: 'GH₵', name: 'Ghana Cedi' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'CDF', symbol: 'FC', name: 'Congolese Franc' },
] as const;

export const MACHINERY_STATUSES = [
  { value: 'ordered', label: 'Ordered', color: 'bg-blue-500' },
  { value: 'shipping', label: 'Shipping', color: 'bg-cyan-500' },
  { value: 'clearing', label: 'Clearing', color: 'bg-yellow-500' },
  { value: 'transport', label: 'Transport', color: 'bg-orange-500' },
  { value: 'storage', label: 'Storage', color: 'bg-purple-500' },
  { value: 'sold', label: 'Sold', color: 'bg-green-500' },
  { value: 'on_lease', label: 'On Lease', color: 'bg-emerald-500' },
] as const;

export const COST_CATEGORIES = [
  'Purchase',
  'Shipping',
  'Clearing',
  'Transport',
  'Storage',
] as const;

export const formatCurrency = (amount: number | string, currency = 'GHS'): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  const symbols: Record<string, string> = { GHS: 'GH₵', USD: '$', CNY: '¥', GBP: '£', NGN: '₦', CDF: 'FC' };
  return `${symbols[currency] || 'GH₵'}${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export const formatCompactNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
