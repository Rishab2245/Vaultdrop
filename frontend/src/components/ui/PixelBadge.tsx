import { getCategoryEmoji } from '@/lib/utils/formatters';
import { SecretCategory } from '@/types';

interface PixelBadgeProps {
  category: SecretCategory;
  size?: 'sm' | 'md';
}

export default function PixelBadge({ category, size = 'md' }: PixelBadgeProps) {
  const emoji = getCategoryEmoji(category);

  return (
    <span
      className={`badge-${category}`}
      style={{
        fontFamily: "'Press Start 2P', monospace",
        fontSize: size === 'sm' ? '6px' : '7px',
        padding: size === 'sm' ? '3px 6px' : '4px 7px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        letterSpacing: '0.5px',
        fontWeight: 'normal',
      }}
    >
      {emoji} {category.replace('_', ' ')}
    </span>
  );
}
