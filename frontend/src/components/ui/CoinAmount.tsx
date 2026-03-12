import { formatCurrency } from '@/lib/utils/formatters';

interface CoinAmountProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showIcon?: boolean;
  glow?: boolean;
}

export default function CoinAmount({
  amount,
  size = 'md',
  showIcon = true,
  glow = false,
}: CoinAmountProps) {
  const fontSizes = {
    sm: '9px',
    md: '13px',
    lg: '20px',
    xl: '32px',
  };

  return (
    <span
      style={{
        fontFamily: "'Press Start 2P', monospace",
        fontSize: fontSizes[size],
        color: '#c9a227',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        letterSpacing: '1px',
      }}
    >
      {showIcon && <span>🪙</span>}
      {formatCurrency(amount)}
    </span>
  );
}
