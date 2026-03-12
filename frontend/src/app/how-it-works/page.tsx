import Link from 'next/link';

export const metadata = {
  title: 'HOW IT WORKS | VAULTDROP',
};

export default function HowItWorksPage() {
  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '48px 16px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '64px' }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>⚡</div>
        <h1
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '22px',
            color: '#ffd700',
            textShadow: '0 0 12px #ffd700, 0 0 24px #ffd700',
            marginBottom: '16px',
            letterSpacing: '2px',
          }}
        >
          HOW IT WORKS
        </h1>
        <p
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '9px',
            color: '#8899aa',
            lineHeight: '2.4',
          }}
        >
          VAULTDROP IS AN ANONYMOUS SECRET ECONOMY.
          <br />
          POST SECRETS. EARN MONEY. STAY ANONYMOUS.
        </p>
      </div>

      {/* Main flow: 3 steps */}
      <div style={{ marginBottom: '80px' }}>
        <h2
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '12px',
            color: '#00ffff',
            textShadow: '0 0 8px #00ffff',
            marginBottom: '32px',
            textAlign: 'center',
          }}
        >
          THE MAIN LOOP
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '8px',
          }}
        >
          {[
            {
              step: '01',
              icon: '🔐',
              title: 'POST',
              color: '#ffd700',
              desc: [
                'CHOOSE A CATEGORY FOR YOUR SECRET.',
                'WRITE YOUR SECRET (20-2000 CHARS).',
                'OPTIONALLY MAKE IT A GHOST SECRET.',
                'PAY $1 ENTRY FEE — 100% GOES TO TODAY\'S PRIZE POOL.',
                'RECEIVE YOUR ANONYMOUS CODENAME.',
              ],
            },
            {
              step: '02',
              icon: '⚡',
              title: 'COMPETE',
              color: '#00ffff',
              desc: [
                'YOUR SECRET ENTERS THE DAILY FEED.',
                'THE COMMUNITY VOTES, REACTS & COMMENTS.',
                'AN AI GRADES YOUR SECRET\'S EXPLOSIVE SCORE.',
                'RANK SCORE = VOTES + REACTIONS + COMMENTS + AI.',
                'LEADERBOARD UPDATES IN REAL-TIME.',
              ],
            },
            {
              step: '03',
              icon: '🏆',
              title: 'EARN',
              color: '#44ff44',
              desc: [
                'AT MIDNIGHT UTC, THE POOL IS DISTRIBUTED.',
                '#1 RANKED SECRET WINS 60% OF THE POOL.',
                '#2 WINS 25%. #3 WINS 15%.',
                'WINNER IS ANNOUNCED ON THE LEADERBOARD.',
                'EARNINGS ARE CREDITED TO YOUR CODENAME.',
              ],
            },
          ].map((item) => (
            <div
              key={item.step}
              style={{
                background: 'var(--bg-card)',
                boxShadow: `0 -4px 0 0 ${item.color}, 0 4px 0 0 ${item.color}, -4px 0 0 0 ${item.color}, 4px 0 0 0 ${item.color}`,
                padding: '28px',
                position: 'relative',
              }}
            >
              {/* Step number */}
              <div
                style={{
                  position: 'absolute',
                  top: '-1px',
                  left: '16px',
                  background: item.color,
                  color: '#000',
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '9px',
                  padding: '4px 8px',
                }}
              >
                STEP {item.step}
              </div>

              <div style={{ fontSize: '40px', marginBottom: '16px', marginTop: '16px' }}>{item.icon}</div>

              <h3
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '14px',
                  color: item.color,
                  textShadow: `0 0 8px ${item.color}`,
                  marginBottom: '20px',
                  letterSpacing: '2px',
                }}
              >
                {item.title}
              </h3>

              <ul style={{ listStyle: 'none', padding: 0 }}>
                {item.desc.map((line, i) => (
                  <li
                    key={i}
                    style={{
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: '8px',
                      color: '#8899aa',
                      lineHeight: '2',
                      marginBottom: '8px',
                      display: 'flex',
                      gap: '8px',
                    }}
                  >
                    <span style={{ color: item.color, flexShrink: 0 }}>»</span>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Ghost Secrets section */}
      <div style={{ marginBottom: '80px' }}>
        <div
          style={{
            background: 'var(--bg-card)',
            boxShadow: '0 -4px 0 0 #00ffff, 0 4px 0 0 #00ffff, -4px 0 0 0 #00ffff, 4px 0 0 0 #00ffff',
            padding: '40px',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👻</div>
            <h2
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '16px',
                color: '#00ffff',
                textShadow: '0 0 10px #00ffff',
                letterSpacing: '2px',
              }}
            >
              GHOST SECRETS
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '40px',
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '9px',
                  color: '#00ffff',
                  marginBottom: '16px',
                }}
              >
                WHAT IS A GHOST SECRET?
              </div>
              <p
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '8px',
                  color: '#8899aa',
                  lineHeight: '2.4',
                }}
              >
                A Ghost Secret is locked behind a paywall.
                Only the HINT is visible. The full content
                is hidden until Hunters pay to unlock it.
                <br /><br />
                YOU set the peek price and unlock price.
                Every time someone pays, YOU earn.
              </p>
            </div>

            <div>
              <div
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '9px',
                  color: '#00ffff',
                  marginBottom: '16px',
                }}
              >
                REVENUE SPLIT
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { action: '👁️ PEEK', you: '70%', platform: '30%', color: '#00ffff' },
                  { action: '🔓 UNLOCK', you: '50%', platform: '50%', color: '#ffd700' },
                ].map((item) => (
                  <div
                    key={item.action}
                    style={{
                      background: '#0d1525',
                      padding: '14px',
                      boxShadow: `0 -2px 0 0 ${item.color}44, 0 2px 0 0 ${item.color}44, -2px 0 0 0 ${item.color}44, 2px 0 0 0 ${item.color}44`,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'Press Start 2P', monospace",
                        fontSize: '8px',
                        color: item.color,
                        marginBottom: '8px',
                      }}
                    >
                      {item.action}
                    </div>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div>
                        <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '12px', color: '#44ff44', textShadow: '0 0 6px #44ff44' }}>
                          {item.you}
                        </div>
                        <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#8899aa' }}>TO YOU</div>
                      </div>
                      <div>
                        <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '12px', color: '#8899aa' }}>
                          {item.platform}
                        </div>
                        <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#8899aa' }}>PLATFORM</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Secret Hunters section */}
      <div style={{ marginBottom: '80px' }}>
        <div
          style={{
            background: 'var(--bg-card)',
            boxShadow: '0 -4px 0 0 #ff4444, 0 4px 0 0 #ff4444, -4px 0 0 0 #ff4444, 4px 0 0 0 #ff4444',
            padding: '40px',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <h2
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '14px',
                color: '#ff4444',
                textShadow: '0 0 10px #ff4444',
                letterSpacing: '2px',
              }}
            >
              SECRET HUNTERS
            </h2>
            <p
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '9px',
                color: '#8899aa',
                marginTop: '12px',
                lineHeight: '2',
              }}
            >
              HUNTERS BROWSE THE FEED, VOTE ON SECRETS, AND PAY TO UNLOCK GHOST SECRETS.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {[
              { icon: '▲', title: 'VOTE', desc: 'VOTE ON SECRETS YOU THINK DESERVE TO WIN. VOTING IS FREE.', color: '#ffd700' },
              { icon: '👁️', title: 'PEEK', desc: 'PAY A SMALL FEE TO SEE THE FULL HINT TEXT OF A GHOST SECRET.', color: '#00ffff' },
              { icon: '🔓', title: 'UNLOCK', desc: 'PAY TO READ THE FULL SECRET. 50% GOES TO THE SECRET HOLDER.', color: '#ff4444' },
              { icon: '💬', title: 'DISCUSS', desc: 'COMMENT, REACT, AND DEBATE. YOUR ENGAGEMENT BOOSTS RANK SCORES.', color: '#b44fff' },
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  background: '#0d1525',
                  padding: '20px',
                  boxShadow: `0 -2px 0 0 ${item.color}44, 0 2px 0 0 ${item.color}44, -2px 0 0 0 ${item.color}44, 2px 0 0 0 ${item.color}44`,
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '12px' }}>{item.icon}</div>
                <div
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: '10px',
                    color: item.color,
                    marginBottom: '10px',
                  }}
                >
                  {item.title}
                </div>
                <p
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: '8px',
                    color: '#8899aa',
                    lineHeight: '2',
                  }}
                >
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Anonymity section */}
      <div style={{ marginBottom: '80px' }}>
        <div
          style={{
            background: 'var(--bg-card)',
            boxShadow: '0 -4px 0 0 #b44fff, 0 4px 0 0 #b44fff, -4px 0 0 0 #b44fff, 4px 0 0 0 #b44fff',
            padding: '40px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <h2
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '14px',
              color: '#b44fff',
              textShadow: '0 0 10px #b44fff',
              marginBottom: '20px',
            }}
          >
            100% ANONYMOUS
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {[
              { icon: '🚫', text: 'NO EMAIL REQUIRED', color: '#ff4444' },
              { icon: '🚫', text: 'NO ACCOUNT NEEDED', color: '#ff4444' },
              { icon: '✓', text: 'ZERO-KNOWLEDGE SESSIONS', color: '#44ff44' },
              { icon: '✓', text: 'NO IP LOGGING', color: '#44ff44' },
              { icon: '✓', text: 'CODENAMES ONLY', color: '#44ff44' },
              { icon: '✓', text: 'END-TO-END ENCRYPTED', color: '#44ff44' },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '8px',
                  color: item.color,
                  padding: '12px',
                  background: `${item.color}0a`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                {item.text}
              </div>
            ))}
          </div>
          <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px', color: '#8899aa', lineHeight: '2.4', maxWidth: '600px', margin: '0 auto' }}>
            VAULTDROP NEVER LOGS YOUR IP, EMAIL, OR ANY IDENTIFYING INFORMATION.
            YOUR CODENAME IS YOUR IDENTITY. YOUR SESSION IS STORED LOCALLY.
            THE VAULT HAS NO KEYS TO YOUR SECRETS.
          </p>
        </div>
      </div>

      {/* FAQ */}
      <div style={{ marginBottom: '64px' }}>
        <h2
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '14px',
            color: '#ffd700',
            marginBottom: '32px',
            textAlign: 'center',
          }}
        >
          ❓ FAQ
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            {
              q: 'HOW IS THE DAILY POOL FUNDED?',
              a: '$1 FROM EVERY SECRET SUBMISSION ENTERS THE POOL. 10% IS KEPT BY THE PLATFORM. THE REST IS DISTRIBUTED NIGHTLY.',
            },
            {
              q: 'HOW DO I RECEIVE MY WINNINGS?',
              a: 'WINNINGS ARE CREDITED TO YOUR CODENAME. WITHDRAW VIA STRIPE AT ANY TIME. MINIMUM WITHDRAWAL IS $10.',
            },
            {
              q: 'CAN ANYONE FIND OUT WHO I AM?',
              a: 'NO. WE DO NOT COLLECT ANY IDENTIFYING DATA. YOUR CODENAME IS NOT LINKED TO ANY PERSONAL INFORMATION ON OUR END.',
            },
            {
              q: 'WHAT IF MY SECRET IS FALSE OR HARMFUL?',
              a: 'FALSE OR HARMFUL SECRETS ARE REMOVED BY MODERATORS. VIOLATORS ARE PERMANENTLY BANNED AND FORFEIT EARNINGS.',
            },
            {
              q: 'HOW IS THE RANK SCORE CALCULATED?',
              a: 'RANK SCORE = (VOTES × 0.4) + (REACTIONS × 0.2) + (COMMENTS × 0.2) + (AI EXPLOSIVE SCORE × 0.15) + (SHARES × 0.05). HIGHER IS BETTER.',
            },
            {
              q: 'WHAT IS THE AI EXPLOSIVE SCORE?',
              a: 'AN AUTOMATED SYSTEM RATES EACH SECRET\'S NEWSWORTHINESS, SPECIFICITY, AND VERIFIABILITY ON A SCALE OF 1-100.',
            },
          ].map((faq, i) => (
            <div
              key={i}
              style={{
                background: 'var(--bg-card)',
                boxShadow: '0 -2px 0 0 #2a3555, 0 2px 0 0 #2a3555, -2px 0 0 0 #2a3555, 2px 0 0 0 #2a3555',
                padding: '20px',
              }}
            >
              <div
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '9px',
                  color: '#ffd700',
                  marginBottom: '10px',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'flex-start',
                }}
              >
                <span style={{ flexShrink: 0 }}>Q:</span>
                <span>{faq.q}</span>
              </div>
              <div
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '8px',
                  color: '#8899aa',
                  lineHeight: '2.2',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'flex-start',
                }}
              >
                <span style={{ flexShrink: 0, color: '#44ff44' }}>A:</span>
                <span>{faq.a}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '14px',
            color: '#ffd700',
            textShadow: '0 0 10px #ffd700',
            marginBottom: '24px',
          }}
        >
          READY TO DROP A SECRET?
        </div>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/submit"
            className="pixel-btn pixel-btn-gold pixel-btn-lg"
            style={{ textDecoration: 'none' }}
          >
            🔐 POST YOUR SECRET
          </Link>
          <Link
            href="/feed"
            className="pixel-btn pixel-btn-ghost"
            style={{ textDecoration: 'none' }}
          >
            📡 BROWSE THE FEED
          </Link>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .how-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
