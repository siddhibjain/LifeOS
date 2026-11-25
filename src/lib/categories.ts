import { Category, ReminderType } from './types';

export const CATEGORY_META: Record<Category, { label: string; color: string; bg: string; text: string }> = {
  Identity:   { label: 'Identity',   color: '#C6A875', bg: 'bg-champagne/15', text: 'text-champagne-dark' },
  Education:  { label: 'Education',  color: '#87947D', bg: 'bg-sage/15',      text: 'text-sage' },
  Finance:    { label: 'Finance',    color: '#39332E', bg: 'bg-espresso/10',   text: 'text-espresso' },
  Insurance:  { label: 'Insurance',  color: '#C58F87', bg: 'bg-rose/15',       text: 'text-rose' },
  Medical:    { label: 'Medical',    color: '#C58F87', bg: 'bg-rose/10',       text: 'text-rose' },
  Travel:     { label: 'Travel',     color: '#87947D', bg: 'bg-sage/10',       text: 'text-sage' },
  Property:   { label: 'Property',   color: '#A99C8B', bg: 'bg-taupe/15',      text: 'text-espresso' },
  Other:      { label: 'Other',      color: '#A99C8B', bg: 'bg-taupe/15',      text: 'text-espresso' },
};

export const REMINDER_TYPE_META: Record<ReminderType, { label: string; bg: string; text: string }> = {
  Expiry:      { label: 'Expiry',      bg: 'bg-rose/15',      text: 'text-rose' },
  Renewal:     { label: 'Renewal',     bg: 'bg-champagne/15', text: 'text-champagne-dark' },
  Payment:     { label: 'Payment',     bg: 'bg-espresso/10',  text: 'text-espresso' },
  Application: { label: 'Application', bg: 'bg-sage/15',      text: 'text-sage' },
  Personal:    { label: 'Personal',    bg: 'bg-taupe/15',     text: 'text-espresso' },
  Other:       { label: 'Other',       bg: 'bg-taupe/15',     text: 'text-espresso' },
};

export const PRIORITY_META = {
  low:    { label: 'Low',    bg: 'bg-sage/15',      text: 'text-sage' },
  medium: { label: 'Medium', bg: 'bg-champagne/15', text: 'text-champagne-dark' },
  high:   { label: 'High',   bg: 'bg-rose/15',      text: 'text-rose' },
} as const;
