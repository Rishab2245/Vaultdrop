import { formatDistanceToNow, format } from 'date-fns';

export function formatTimeAgo(dateString: string): string {
  try {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true }).toUpperCase();
  } catch {
    return 'UNKNOWN';
  }
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return format(date, 'MM/dd/yyyy').toUpperCase();
  } catch {
    return 'UNKNOWN';
  }
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatLargeNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function formatCountdown(ms: number): { hours: string; minutes: string; seconds: string } {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    hours: hours.toString().padStart(2, '0'),
    minutes: minutes.toString().padStart(2, '0'),
    seconds: seconds.toString().padStart(2, '0'),
  };
}

export function getMsUntilMidnightUTC(): number {
  const now = new Date();
  const midnight = new Date();
  midnight.setUTCHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function getCategoryEmoji(category: string): string {
  const emojis: Record<string, string> = {
    CORPORATE: '🏢',
    POLITICAL: '🏛️',
    CELEBRITY: '⭐',
    PERSONAL: '👤',
    INDUSTRY: '🏭',
    PARANORMAL: '👻',
    ZERO_DAY: '💣',
  };
  return emojis[category] || '🔐';
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'PENDING',
    ACTIVE: 'ACTIVE',
    GHOST_LOCKED: 'GHOST',
    REJECTED: 'REJECTED',
    WINNER: 'WINNER 🏆',
    ARCHIVED: 'ARCHIVED',
  };
  return labels[status] || status;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: 'var(--text-muted)',
    ACTIVE: 'var(--green)',
    GHOST_LOCKED: 'var(--cyan)',
    REJECTED: 'var(--red)',
    WINNER: 'var(--gold)',
    ARCHIVED: 'var(--text-muted)',
  };
  return colors[status] || 'var(--text-primary)';
}

export function generateBlurText(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
