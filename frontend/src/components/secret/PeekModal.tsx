'use client';

import { useState } from 'react';
import PixelModal from '@/components/ui/PixelModal';
import CoinAmount from '@/components/ui/CoinAmount';
import { fetchGraphQL } from '@/lib/api';
import { CONFIRM_PEEK } from '@/lib/mutations';
import { useSessionStore } from '@/lib/hooks/useSession';

interface PeekModalProps {
  isOpen: boolean;
  onClose: () => void;
  secretId: string;
  peekPrice: number;
  onSuccess: (hintText: string) => void;
}

export default function PeekModal({
  isOpen,
  onClose,
  secretId,
  peekPrice,
  onSuccess,
}: PeekModalProps) {
  const [step, setStep] = useState<'confirm' | 'processing' | 'done'>('confirm');
  const [error, setError] = useState('');
  const { session } = useSessionStore();

  const handlePeek = async () => {
    setStep('processing');
    setError('');

    try {
      const data = await fetchGraphQL<{
        confirmPeek: { hintText: string | null };
      }>(
        CONFIRM_PEEK,
        { secretId, txId: 'dev-skip', type: 'PEEK' },
        session?.id
      );

      onSuccess(data.confirmPeek.hintText ?? '');
      setStep('done');
      setTimeout(() => onClose(), 1500);
    } catch {
      setError('PEEK FAILED. TRY AGAIN.');
      setStep('confirm');
    }
  };

  return (
    <PixelModal isOpen={isOpen} onClose={onClose} title="👁️ PEEK AT SECRET" variant="cyan">
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
            PEEK AT THE FULL HINT TEXT.
            <br />
            THIS IS A ONE-TIME PAYMENT.
            <br />
            YOU CANNOT UNDO THIS ACTION.
          </div>

          <div
            style={{
              background: '#0d1525',
              padding: '20px',
              marginBottom: '24px',
              boxShadow: '0 -2px 0 0 #00ffff, 0 2px 0 0 #00ffff, -2px 0 0 0 #00ffff, 2px 0 0 0 #00ffff',
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
              PEEK PRICE
            </div>
            <CoinAmount amount={peekPrice} size="lg" glow />
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
            <button onClick={handlePeek} className="pixel-btn pixel-btn-cyan">
              👁️ PEEK FOR <CoinAmount amount={peekPrice} size="sm" showIcon={false} />
            </button>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <div
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '10px',
              color: '#00ffff',
              textShadow: '0 0 8px #00ffff',
              animation: 'blink 1s step-end infinite',
            }}
          >
            PROCESSING...
          </div>
        </div>
      )}

      {step === 'done' && (
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <div
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '20px',
              color: '#44ff44',
              textShadow: '0 0 12px #44ff44',
              marginBottom: '12px',
            }}
          >
            ✓
          </div>
          <div
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '10px',
              color: '#44ff44',
            }}
          >
            PEEKED!
          </div>
        </div>
      )}
    </PixelModal>
  );
}
