export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(d: string | Date | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function relativeTime(d: string | Date | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  const diff = Date.now() - date.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return formatDate(date);
}

export function daysUntil(d: string | Date | null | undefined): number | null {
  if (!d) return null;
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function fileExtension(name: string): string {
  const parts = name.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export function initials(name: string | null | undefined): string {
  if (!name) return '';
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
}

export function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function isImage(type: string): boolean {
  return type.startsWith('image/');
}

export function isPdf(type: string): boolean {
  return type === 'application/pdf';
}

const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function validateFile(file: File): string | null {
  if (!ALLOWED.includes(file.type)) {
    return 'Only PDF, JPG and PNG files are supported.';
  }
  if (file.size > MAX_SIZE) {
    return 'File is larger than 10MB.';
  }
  return null;
}
