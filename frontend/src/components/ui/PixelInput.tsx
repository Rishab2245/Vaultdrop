'use client';

interface PixelInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  label?: string;
  maxLength?: number;
  type?: 'text' | 'email' | 'number' | 'password';
  disabled?: boolean;
  error?: string;
}

export default function PixelInput({
  value,
  onChange,
  placeholder,
  multiline = false,
  rows = 4,
  label,
  maxLength,
  type = 'text',
  disabled = false,
  error,
}: PixelInputProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {label && (
        <label
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '8px',
            color: '#8899aa',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </label>
      )}

      {multiline ? (
        <textarea
          className="pixel-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
          disabled={disabled}
          style={{
            ...(error ? {
              boxShadow: '0 -2px 0 0 #ff4444, 0 2px 0 0 #ff4444, -2px 0 0 0 #ff4444, 2px 0 0 0 #ff4444'
            } : {}),
          }}
        />
      ) : (
        <input
          type={type}
          className="pixel-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          style={{
            ...(error ? {
              boxShadow: '0 -2px 0 0 #ff4444, 0 2px 0 0 #ff4444, -2px 0 0 0 #ff4444, 2px 0 0 0 #ff4444'
            } : {}),
          }}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {error && (
          <span
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '8px',
              color: '#ff4444',
            }}
          >
            ⚠ {error}
          </span>
        )}
        {maxLength && (
          <span
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '7px',
              color: value.length > maxLength * 0.9 ? '#ff4444' : '#8899aa',
              marginLeft: 'auto',
            }}
          >
            {value.length}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
}
