import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, isToday as dfIsToday, isThisWeek as dfIsThisWeek, isThisMonth as dfIsThisMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { v4 as uuidv4 } from 'uuid';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount).replace('MAD', 'DH');
}

export function formatDate(date: string | Date): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'dd/MM/yyyy', { locale: fr });
}

export function formatDateTime(date: string | Date): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'dd/MM/yyyy HH:mm', { locale: fr });
}

export function formatNumber(n: number, decimals: number = 2): string {
  return new Intl.NumberFormat('fr-MA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export function formatPercent(n: number): string {
  return `${formatNumber(n, 2)} %`;
}

export function generateId(): string {
  return uuidv4();
}

export function generateLotNumber(date: Date = new Date()): string {
  const year = date.getFullYear();
  const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `LOT-${year}-${randomStr}`;
}

export function generateBatchNumber(date: Date = new Date()): string {
  const year = date.getFullYear();
  const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `INC-${year}-${randomStr}`;
}

export function generateSaleNumber(prefix: string, date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${year}${month}-${randomStr}`;
}

export function generatePurchaseNumber(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ACH-${year}${month}-${randomStr}`;
}

export function calculatePercentage(part: number, total: number): number {
  if (!total || total === 0) return 0;
  return (part / total) * 100;
}

export function isToday(date: string | Date): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return dfIsToday(d);
}

export function isThisWeek(date: string | Date): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return dfIsThisWeek(d, { locale: fr });
}

export function isThisMonth(date: string | Date): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return dfIsThisMonth(d);
}

export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
