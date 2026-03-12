'use client';

import { useState } from 'react';
import PixelModal from '@/components/ui/PixelModal';
import CoinAmount from '@/components/ui/CoinAmount';
import { fetchGraphQL } from '@/lib/api';
import { CONFIRM_PEEK } from '@/lib/mutations';
import { useSessionStore } from '@/lib/hooks/useSession';

interface UnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  secretId: string;
  unlockPrice: number;
  onSuccess: (content: string) => void;
}

export default function UnlockModal({
  isOpen,
  onClose,
  secretId,
  unlockPrice,
  onSuccess,
}: UnlockModalProps) {
  const [step, setStep] = useState<'confirm' | 'processing' | 'done'>('confirm');
  const [error, setError] = useState('');
  const { session } = useSessionStore();

  const handleUnlock = async () => {
    setStep('processing');
    setError('');

    try {
      const data = await fetchGraphQL<{
        confirmPeek: { content: string | null };
      }>(
        CONFIRM_PEEK,
        { secretId, txId: 'dev-skip', type: 'UNLOCK' },
        session?.id
      );

      onSuccess(data.confirmPeek.content ?? '');
      setStep('done');
      setTimeout(() => onClose(), 2000);
    } catch {
      setError('UNLOCK FAILED. TRY AGAIN.');
      setStep('confirm');
    }
  };

  return (
    <PixelModal isOpen={isOpen} onClose={onClose} title="🔓 UNLOCK FULL SECRET" variant="gold">
      {step === 'confirm' && (
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '9px',
              color: '#8899aa',
              lineHeight: '2.2',
              marginBottom: '24px',
            }}
          >
            UNLOCK THE COMPLETE SECRET.
            <br />
            PERMANENT ACCESS GRANTED.
            <br />
            50% OF PAYMENT GOES TO
            <br />
            THE SECRET HOLDER.
          </div>

          <div
            style={{
              background: '#0d1525',
              padding: '20px',
              marginBottom: '24px',
              boxShadow: '0 -2px 0 0 #ffd700, 0 2px 0 0 #ffd700, -2px 0 0 0 #ffd700, 2px 0 0 0 #ffd700',
            }}
          >
            <div
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '8px',
                color: '#8899aa',
                marginBottom: '8px',
              }}
            >
              UNLOCK PRICE
            </div>
            <CoinAmount amount={unlockPrice} size="lg" glow />
            <div
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '7px',
                color: '#44ff44',
                marginTop: '8px',
              }}
            >
              🪙 {(unlockPrice * 0.5).toFixed(2)} TO SECRET HOLDER
            </div>
          </div>

          {error && (
            <div
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '8px',
                color: '#ff4444',
                marginBottom: '16px',
              }}
            >
              ⚠ {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button onClick={onClose} className="pixel-btn pixel-btn-ghost pixel-btn-sm">
              CANCEL
            </button>
            <button onClick={handleUnlock} className="pixel-btn pixel-btn-gold">
              🔓 UNLOCK FOR <CoinAmount amount={unlockPrice} size="sm" showIcon={false} />
            </button>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <div style={{ textAlign: 'center', padding: '32px' }}>
          <div
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '10px',
              color: '#ffd700',
              textShadow: '0 0 8px #ffd700',
              animation: 'blink 0.8s step-end infinite',
            }}
          >
            ⚡ UNLOCKING...
          </div>
        </div>
      )}

      {step === 'done' && (
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <div
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '24px',
              color: '#ffd700',
              textShadow: '0 0 16px #ffd700',
              marginBottom: '12px',
              animation: 'pixelIn 0.4s ease-out',
            }}
          >
            🔓
          </div>
          <div
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '11px',
              color: '#ffd700',
              textShadow: '0 0 8px #ffd700',
            }}
          >
            UNLOCKED!
          </div>
        </div>
      )}
    </PixelModal>
  );
}
