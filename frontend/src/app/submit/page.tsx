import SubmitForm from '@/components/submit/SubmitForm';

export const metadata = {
  title: 'POST A SECRET | VAULTDROP',
};

export default function SubmitPage() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 16px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '18px',
            color: 'var(--amber)',
            marginBottom: '12px',
            letterSpacing: '2px',
          }}
        >
          POST A SECRET
        </h1>
        <p
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '9px',
            color: '#8899aa',
            lineHeight: '2.2',
          }}
        >
          YOUR IDENTITY IS 100% ANONYMOUS.
          <br />
          THE BEST SECRETS WIN THE DAILY POOL.
        </p>
      </div>

      {/* Rules banner */}
      <div
        style={{
          background: 'rgba(255,68,68,0.06)',
          boxShadow: '0 0 0 1px rgba(160,53,53,0.4)',
          padding: '20px',
          marginBottom: '32px',
        }}
      >
        <div
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '9px',
            color: '#ff4444',
            marginBottom: '12px',
          }}
        >
          ⚠ COMMUNITY RULES
        </div>
        <ul
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '8px',
            color: '#8899aa',
            lineHeight: '2.4',
            listStyle: 'none',
            padding: 0,
          }}
        >
          {[
            'NO DOXXING — DO NOT INCLUDE NAMES, ADDRESSES, OR PERSONAL IDENTIFIERS',
            'NO FABRICATED SECRETS — MUST BE GENUINE INSIDER KNOWLEDGE',
            'NO ILLEGAL CONTENT — RESPONSIBLE DISCLOSURE ONLY FOR ZERO_DAY',
            'NO HATE SPEECH — SECRETS MUST NOT TARGET INDIVIDUALS BASED ON PROTECTED ATTRIBUTES',
            'VIOLATING RULES = PERMANENT BAN + FORFEITED EARNINGS',
          ].map((rule, i) => (
            <li key={i} style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
              <span style={{ color: '#ff4444', flexShrink: 0 }}>»</span>
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </div>

      <SubmitForm />
    </div>
  );
}
