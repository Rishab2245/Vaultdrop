'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SecretCategory } from '@/types';
import { fetchGraphQL } from '@/lib/api';
import { SUBMIT_SECRET } from '@/lib/mutations';
import { useSession } from '@/lib/hooks/useSession';
import { getCategoryEmoji } from '@/lib/utils/formatters';

const CATEGORIES: SecretCategory[] = [
  'CORPORATE', 'POLITICAL', 'CELEBRITY', 'PERSONAL', 'INDUSTRY', 'PARANORMAL', 'ZERO_DAY',
];

const CATEGORY_DESCRIPTIONS: Record<SecretCategory, string> = {
  CORPORATE: 'Company scandals, insider info, corporate misconduct',
  POLITICAL: 'Political secrets, government info, official misconduct',
  CELEBRITY: 'Famous people, entertainment industry secrets',
  PERSONAL: 'Personal confessions, relationship secrets',
  INDUSTRY: 'Industry-specific insider knowledge',
  PARANORMAL: 'Unexplained phenomena, conspiracy theories',
  ZERO_DAY: 'Security vulnerabilities, tech exploits (responsible disclosure)',
};

type ContentTab = 'text' | 'media' | 'link' | 'document';
type Step = 1 | 2 | 3 | 4 | 5;

interface UploadedFile {
  url: string;
  mediaType: string;
  filename: string;
  size: number;
  mimeType: string;
  localPreview?: string; // blob URL for preview
}

interface FormData {
  category: SecretCategory | null;
  content: string;
  contentTab: ContentTab;
  uploadedFile: UploadedFile | null;
  linkUrl: string;
  linkTitle: string;
  isGhost: boolean;
  hintText: string;
  peekPrice: string;
  unlockPrice: string;
  bowlSlug: string;
}

const BACKEND = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/graphql').replace(/\/graphql$/, '');

async function uploadFile(file: File, sessionId?: string): Promise<UploadedFile> {
  const formData = new window.FormData();
  formData.append('file', file);

  const res = await fetch(`${BACKEND}/api/upload`, {
    method: 'POST',
    headers: sessionId ? { 'x-session-id': sessionId } : {},
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error ?? 'Upload failed');
  }

  return res.json();
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

export default function SubmitForm() {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>({
    category: null,
    content: '',
    contentTab: 'text',
    uploadedFile: null,
    linkUrl: '',
    linkTitle: '',
    isGhost: false,
    hintText: '',
    peekPrice: '0.50',
    unlockPrice: '25.00',
    bowlSlug: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const router = useRouter();
  const { session, initSession, isLoading } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { initSession(); }, [initSession]);

  const validate = (currentStep: Step): boolean => {
    const e: Record<string, string> = {};
    if (currentStep === 1 && !form.category) e.category = 'SELECT A CATEGORY';
    if (currentStep === 2) {
      const hasText = form.content.trim().length >= 10;
      const hasMedia = !!form.uploadedFile;
      const hasLink = form.contentTab === 'link' && form.linkUrl.trim().length > 0;
      if (!hasText && !hasMedia && !hasLink) e.content = 'ADD SOME CONTENT';
      if (form.contentTab === 'text' && form.content.trim().length > 0 && form.content.trim().length < 10) e.content = 'TOO SHORT (MIN 10 CHARS)';
      if (form.content.length > 2000) e.content = 'TOO LONG (MAX 2000)';
      if (form.contentTab === 'link') {
        if (!form.linkUrl.trim()) e.linkUrl = 'ENTER A URL';
        else {
          try { new URL(form.linkUrl); } catch { e.linkUrl = 'INVALID URL'; }
        }
      }
    }
    if (currentStep === 3 && form.isGhost) {
      if (!form.hintText.trim()) e.hintText = 'HINT TEXT REQUIRED';
      const peek = parseFloat(form.peekPrice);
      const unlock = parseFloat(form.unlockPrice);
      if (isNaN(peek) || peek < 0.5 || peek > 50) e.peekPrice = '$0.50 – $50.00';
      if (isNaN(unlock) || unlock < 5 || unlock > 500) e.unlockPrice = '$5.00 – $500.00';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const nextStep = () => {
    if (validate(step)) {
      if (step === 2 && !form.isGhost) setStep(4);
      else setStep((prev) => Math.min(5, prev + 1) as Step);
    }
  };
  const prevStep = () => {
    if (step === 4 && !form.isGhost) setStep(2);
    else setStep((prev) => Math.max(1, prev - 1) as Step);
  };

  const handleFileSelect = async (file: File) => {
    setUploadError('');
    setIsUploading(true);
    const localPreview = URL.createObjectURL(file);
    try {
      const result = await uploadFile(file, session?.id);
      setForm((f) => ({ ...f, uploadedFile: { ...result, localPreview } }));
    } catch (err: any) {
      setUploadError(err.message ?? 'UPLOAD FAILED');
      URL.revokeObjectURL(localPreview);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const removeFile = () => {
    if (form.uploadedFile?.localPreview) URL.revokeObjectURL(form.uploadedFile.localPreview);
    setForm((f) => ({ ...f, uploadedFile: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!validate(step)) return;
    setIsSubmitting(true);
    try {
      const linkDomain = form.linkUrl ? extractDomain(form.linkUrl) : undefined;
      const input: Record<string, unknown> = {
        category: form.category,
        content: form.content || (form.contentTab === 'link' ? form.linkUrl : form.uploadedFile?.filename ?? ''),
        isGhost: form.isGhost,
        hintText: form.isGhost ? form.hintText : undefined,
        peekPrice: form.isGhost ? parseFloat(form.peekPrice) : undefined,
        unlockPrice: form.isGhost ? parseFloat(form.unlockPrice) : undefined,
        bowlSlug: form.bowlSlug || undefined,
        paymentIntentId: 'dev-skip',
        mediaUrl: form.uploadedFile?.url,
        mediaType: form.uploadedFile?.mediaType,
        linkUrl: form.contentTab === 'link' ? form.linkUrl : undefined,
        linkTitle: form.contentTab === 'link' ? (form.linkTitle || form.linkUrl) : undefined,
        linkDomain: form.contentTab === 'link' ? linkDomain : undefined,
      };
      await fetchGraphQL(SUBMIT_SECRET, { input }, session?.id);
      router.push('/submit/success');
    } catch {
      setErrors({ general: 'SUBMISSION FAILED. TRY AGAIN.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const STEP_LABELS = ['CATEGORY', 'CONTENT', 'GHOST', 'BOWL', 'SUBMIT'];

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', fontFamily: "'Press Start 2P', monospace", fontSize: '8px', color: 'var(--text-secondary)', animation: 'blink 1s step-end infinite' }}>
        INITIALIZING...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      {/* Step indicators */}
      <div style={{ display: 'flex', gap: '3px', marginBottom: '28px', flexWrap: 'wrap' }}>
        {([1, 2, 3, 4, 5] as Step[]).map((s) => {
          if (!form.isGhost && s === 3) return null;
          const isActive = step === s;
          const isDone = step > s;
          return (
            <div key={s} style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '6px', padding: '5px 9px', background: isActive ? '#c9a227' : isDone ? '#0e2010' : 'var(--bg-card)', color: isActive ? '#0b0d12' : isDone ? '#3d7a54' : 'var(--text-dim)', letterSpacing: '1px' }}>
              {isDone ? '✓ ' : ''}{STEP_LABELS[s - 1]}
            </div>
          );
        })}
      </div>

      {/* Card */}
      <div style={{ background: 'var(--bg-card)', boxShadow: '0 -1px 0 0 var(--border-mid), 0 1px 0 0 var(--border-mid), -1px 0 0 0 var(--border-mid), 1px 0 0 0 var(--border-mid)', padding: '28px', marginBottom: '20px' }}>

        {/* ── Step 1: Category ── */}
        {step === 1 && (
          <div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '10px', color: 'var(--amber)', marginBottom: '16px', letterSpacing: '1px' }}>CATEGORY</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setForm((f) => ({ ...f, category: cat })); setErrors((e) => ({ ...e, category: '' })); }}
                  className={`badge-${cat}`}
                  style={{
                    fontFamily: "'Press Start 2P', monospace", fontSize: '7px', padding: '14px', cursor: 'pointer', border: 'none', textAlign: 'left',
                    outline: form.category === cat ? '2px solid currentColor' : '2px solid transparent',
                    outlineOffset: '2px', opacity: form.category && form.category !== cat ? 0.45 : 1,
                    display: 'flex', flexDirection: 'column', gap: '6px', transition: 'opacity 0.15s',
                  }}
                >
                  <span style={{ fontSize: '18px' }}>{getCategoryEmoji(cat)}</span>
                  <span>{cat.replace('_', ' ')}</span>
                  <span style={{ fontSize: '5px', opacity: 0.75, lineHeight: '1.8' }}>{CATEGORY_DESCRIPTIONS[cat]}</span>
                </button>
              ))}
            </div>
            {errors.category && <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: 'var(--rust-bright)', marginTop: '12px' }}>⚠ {errors.category}</div>}
          </div>
        )}

        {/* ── Step 2: Content ── */}
        {step === 2 && (
          <div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '10px', color: 'var(--amber)', marginBottom: '16px', letterSpacing: '1px' }}>CONTENT</div>

            {/* Content type tabs */}
            <div style={{ display: 'flex', gap: '3px', marginBottom: '20px' }}>
              {(['text', 'media', 'link', 'document'] as ContentTab[]).map((tab) => {
                const icons: Record<ContentTab, string> = { text: 'TEXT', media: 'MEDIA', link: 'LINK', document: 'DOC' };
                const active = form.contentTab === tab;
                return (
                  <button key={tab} onClick={() => setForm((f) => ({ ...f, contentTab: tab }))} style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', padding: '6px 11px', border: 'none', cursor: 'pointer', background: active ? '#c9a227' : 'transparent', color: active ? '#0b0d12' : 'var(--text-secondary)', boxShadow: active ? '0 3px 0 0 #8a6c14' : '0 0 0 1px var(--border)', letterSpacing: '1px', transition: 'all 0.1s' }}>
                    {icons[tab]}
                  </button>
                );
              })}
            </div>

            {/* Warning */}
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: 'var(--rust-bright)', background: 'rgba(192,68,68,0.07)', padding: '10px', marginBottom: '16px', lineHeight: '2', boxShadow: '0 0 0 1px rgba(192,68,68,0.2)' }}>
              ⚠ ONCE SUBMITTED, CANNOT BE EDITED OR DELETED.
            </div>

            {/* TEXT tab */}
            {form.contentTab === 'text' && (
              <div>
                <textarea
                  className="pixel-input"
                  value={form.content}
                  onChange={(e) => { setForm((f) => ({ ...f, content: e.target.value })); setErrors((e2) => ({ ...e2, content: '' })); }}
                  placeholder="THE TRUTH ABOUT..."
                  rows={8}
                  maxLength={2000}
                  style={errors.content ? { boxShadow: '0 0 0 1px var(--rust-bright)' } : {}}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                  <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: 'var(--rust-bright)' }}>{errors.content ? `⚠ ${errors.content}` : ''}</span>
                  <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '6px', color: form.content.length > 1800 ? 'var(--rust-bright)' : 'var(--text-dim)' }}>{form.content.length}/2000</span>
                </div>
              </div>
            )}

            {/* MEDIA tab */}
            {form.contentTab === 'media' && (
              <div>
                {!form.uploadedFile ? (
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                    style={{ border: '1px dashed var(--border-mid)', padding: '40px 20px', textAlign: 'center', cursor: 'pointer', background: 'var(--bg-dark)', transition: 'border-color 0.15s' }}
                  >
                    <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}>🖼</div>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      {isUploading ? 'UPLOADING...' : 'DROP IMAGE OR VIDEO HERE'}
                    </div>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '6px', color: 'var(--text-dim)' }}>
                      JPG · PNG · GIF · WEBP · MP4 · WEBM — MAX 100MB
                    </div>
                    {uploadError && <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: 'var(--rust-bright)', marginTop: '10px' }}>⚠ {uploadError}</div>}
                  </div>
                ) : (
                  <div>
                    {/* Preview */}
                    <div style={{ position: 'relative', marginBottom: '12px', background: 'var(--bg-dark)', overflow: 'hidden' }}>
                      {form.uploadedFile.mediaType === 'image' && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={form.uploadedFile.localPreview ?? form.uploadedFile.url} alt="Preview" style={{ width: '100%', maxHeight: '320px', objectFit: 'contain', display: 'block' }} />
                      )}
                      {form.uploadedFile.mediaType === 'video' && (
                        <video src={form.uploadedFile.localPreview ?? form.uploadedFile.url} controls style={{ width: '100%', maxHeight: '320px', display: 'block' }} />
                      )}
                      <button onClick={removeFile} style={{ position: 'absolute', top: '8px', right: '8px', background: '#0b0d12cc', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: "'Press Start 2P', monospace", fontSize: '8px', padding: '5px 8px' }}>✕</button>
                    </div>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '6px', color: 'var(--text-secondary)', display: 'flex', gap: '12px' }}>
                      <span>{form.uploadedFile.filename}</span>
                      <span style={{ color: 'var(--text-dim)' }}>{formatBytes(form.uploadedFile.size)}</span>
                    </div>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*,video/mp4,video/webm,video/quicktime" style={{ display: 'none' }} onChange={handleFileInputChange} />
                {/* Optional caption */}
                <div style={{ marginTop: '14px' }}>
                  <textarea
                    className="pixel-input"
                    value={form.content}
                    onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                    placeholder="OPTIONAL CAPTION..."
                    rows={2}
                    maxLength={500}
                    style={{ minHeight: 'unset' }}
                  />
                </div>
              </div>
            )}

            {/* LINK tab */}
            {form.contentTab === 'link' && (
              <div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>URL *</label>
                  <input
                    type="url"
                    className="pixel-input"
                    value={form.linkUrl}
                    onChange={(e) => { setForm((f) => ({ ...f, linkUrl: e.target.value })); setErrors((e2) => ({ ...e2, linkUrl: '' })); }}
                    placeholder="https://example.com/article"
                    style={errors.linkUrl ? { boxShadow: '0 0 0 1px var(--rust-bright)' } : {}}
                  />
                  {errors.linkUrl && <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: 'var(--rust-bright)', marginTop: '4px' }}>⚠ {errors.linkUrl}</div>}
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>TITLE (optional)</label>
                  <input type="text" className="pixel-input" value={form.linkTitle} onChange={(e) => setForm((f) => ({ ...f, linkTitle: e.target.value }))} placeholder="ARTICLE OR PAGE TITLE..." maxLength={200} />
                </div>
                {/* Link preview */}
                {form.linkUrl && (() => { try { new URL(form.linkUrl); return true; } catch { return false; } })() && (
                  <div style={{ background: 'var(--bg-dark)', boxShadow: '0 0 0 1px var(--border)', padding: '14px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: '24px', flexShrink: 0, opacity: 0.6 }}>🔗</div>
                    <div>
                      <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px', color: 'var(--text-primary)', marginBottom: '4px' }}>{form.linkTitle || extractDomain(form.linkUrl)}</div>
                      <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '6px', color: 'var(--text-secondary)' }}>{extractDomain(form.linkUrl)}</div>
                    </div>
                  </div>
                )}
                {/* Caption */}
                <div style={{ marginTop: '14px' }}>
                  <textarea className="pixel-input" value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} placeholder="WHY THIS LINK MATTERS..." rows={3} maxLength={500} />
                </div>
              </div>
            )}

            {/* DOCUMENT tab */}
            {form.contentTab === 'document' && (
              <div>
                {!form.uploadedFile ? (
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                    style={{ border: '1px dashed var(--border-mid)', padding: '40px 20px', textAlign: 'center', cursor: 'pointer', background: 'var(--bg-dark)' }}
                  >
                    <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}>📄</div>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      {isUploading ? 'UPLOADING...' : 'DROP DOCUMENT HERE'}
                    </div>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '6px', color: 'var(--text-dim)' }}>PDF · TXT · DOCX — MAX 100MB</div>
                    {uploadError && <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: 'var(--rust-bright)', marginTop: '10px' }}>⚠ {uploadError}</div>}
                  </div>
                ) : (
                  <div style={{ background: 'var(--bg-dark)', boxShadow: '0 0 0 1px var(--border)', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ fontSize: '28px', flexShrink: 0 }}>📄</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px', color: 'var(--text-primary)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.uploadedFile.filename}</div>
                      <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '6px', color: 'var(--text-secondary)' }}>{formatBytes(form.uploadedFile.size)}</div>
                    </div>
                    <button onClick={removeFile} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: "'Press Start 2P', monospace", fontSize: '8px', padding: '4px' }}>✕</button>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept=".pdf,.txt,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document" style={{ display: 'none' }} onChange={handleFileInputChange} />
                <div style={{ marginTop: '14px' }}>
                  <textarea className="pixel-input" value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} placeholder="CONTEXT FOR THIS DOCUMENT..." rows={3} maxLength={500} />
                </div>
              </div>
            )}

            {errors.content && <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: 'var(--rust-bright)', marginTop: '10px' }}>⚠ {errors.content}</div>}

            {/* Ghost toggle */}
            <div style={{ marginTop: '20px', padding: '14px', background: form.isGhost ? '#0e1c28' : 'var(--bg-dark)', boxShadow: form.isGhost ? '0 0 0 1px #2d4a5a' : '0 0 0 1px var(--border)', cursor: 'pointer' }} onClick={() => setForm((f) => ({ ...f, isGhost: !f.isGhost }))}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ width: '18px', height: '18px', background: form.isGhost ? '#4a7fa5' : 'transparent', flexShrink: 0, boxShadow: '0 0 0 1px var(--slate)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Press Start 2P', monospace", fontSize: '10px', color: '#0b0d12', marginTop: '2px' }}>
                  {form.isGhost ? '✓' : ''}
                </div>
                <div>
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px', color: form.isGhost ? '#4a7fa5' : 'var(--text-primary)', marginBottom: '5px' }}>GHOST SECRET</div>
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '6px', color: 'var(--text-secondary)', lineHeight: '2' }}>Hide behind a paywall. Earn every time someone unlocks it.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Ghost Options ── */}
        {step === 3 && form.isGhost && (
          <div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '10px', color: '#4a7fa5', marginBottom: '16px', letterSpacing: '1px' }}>GHOST OPTIONS</div>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>TEASER / HINT TEXT *</label>
              <textarea className="pixel-input" value={form.hintText} onChange={(e) => { setForm((f) => ({ ...f, hintText: e.target.value })); setErrors((e2) => ({ ...e2, hintText: '' })); }} placeholder="A HINT THAT MAKES PEOPLE WANT TO PAY..." rows={3} maxLength={300} style={errors.hintText ? { boxShadow: '0 0 0 1px var(--rust-bright)' } : {}} />
              {errors.hintText && <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: 'var(--rust-bright)', marginTop: '4px' }}>⚠ {errors.hintText}</div>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
              <div>
                <label style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>PEEK PRICE ($)</label>
                <input type="number" className="pixel-input" value={form.peekPrice} onChange={(e) => { setForm((f) => ({ ...f, peekPrice: e.target.value })); setErrors((e2) => ({ ...e2, peekPrice: '' })); }} min="0.50" max="50" step="0.50" placeholder="0.50" />
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '6px', color: 'var(--text-dim)', marginTop: '3px' }}>$0.50 – $50</div>
                {errors.peekPrice && <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '6px', color: 'var(--rust-bright)', marginTop: '3px' }}>⚠ {errors.peekPrice}</div>}
              </div>
              <div>
                <label style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>UNLOCK PRICE ($)</label>
                <input type="number" className="pixel-input" value={form.unlockPrice} onChange={(e) => { setForm((f) => ({ ...f, unlockPrice: e.target.value })); setErrors((e2) => ({ ...e2, unlockPrice: '' })); }} min="5" max="500" step="5" placeholder="25.00" />
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '6px', color: 'var(--text-dim)', marginTop: '3px' }}>$5 – $500</div>
                {errors.unlockPrice && <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '6px', color: 'var(--rust-bright)', marginTop: '3px' }}>⚠ {errors.unlockPrice}</div>}
              </div>
            </div>
            <div style={{ background: 'var(--bg-dark)', boxShadow: '0 0 0 1px var(--border)', padding: '12px' }}>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: 'var(--text-secondary)', marginBottom: '6px' }}>REVENUE SPLIT</div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '6px', color: 'var(--text-dim)', lineHeight: '2.2' }}>
                PEEK: 70% to you, 30% to platform<br />
                UNLOCK: 50% to you, 50% to platform
              </div>
            </div>
          </div>
        )}

        {/* ── Step 4: Bowl ── */}
        {step === 4 && (
          <div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '10px', color: 'var(--amber)', marginBottom: '16px', letterSpacing: '1px' }}>BOWL (OPTIONAL)</div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '2' }}>Post to a specific topic bowl or leave blank for the main feed.</div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <button onClick={() => setForm((f) => ({ ...f, bowlSlug: '' }))} style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', padding: '8px 14px', cursor: 'pointer', border: 'none', background: !form.bowlSlug ? '#c9a227' : 'transparent', color: !form.bowlSlug ? '#0b0d12' : 'var(--text-secondary)', boxShadow: !form.bowlSlug ? '0 3px 0 0 #8a6c14' : '0 0 0 1px var(--border)' }}>
                MAIN FEED
              </button>
            </div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: 'var(--text-secondary)', marginBottom: '8px' }}>OR ENTER BOWL SLUG:</div>
            <input type="text" className="pixel-input" value={form.bowlSlug} onChange={(e) => setForm((f) => ({ ...f, bowlSlug: e.target.value.toLowerCase() }))} placeholder="e.g. tech-insiders" />
          </div>
        )}

        {/* ── Step 5: Review ── */}
        {step === 5 && (
          <div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '10px', color: 'var(--amber)', marginBottom: '16px', letterSpacing: '1px' }}>REVIEW & SUBMIT</div>

            {/* Preview card */}
            <div style={{ background: 'var(--bg-dark)', boxShadow: '0 0 0 1px var(--border)', padding: '18px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <span className={`badge-${form.category}`} style={{ padding: '3px 7px', fontFamily: "'Press Start 2P', monospace", fontSize: '7px' }}>
                  {getCategoryEmoji(form.category!)} {form.category}
                </span>
                {form.isGhost && (
                  <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#4a7fa5', background: '#1e3040', padding: '3px 7px' }}>GHOST</span>
                )}
                {form.uploadedFile && (
                  <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: 'var(--text-secondary)', background: 'var(--bg-card)', padding: '3px 7px' }}>{form.uploadedFile.mediaType.toUpperCase()}</span>
                )}
                {form.contentTab === 'link' && form.linkUrl && (
                  <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: 'var(--text-secondary)', background: 'var(--bg-card)', padding: '3px 7px' }}>LINK</span>
                )}
              </div>

              {/* Media preview in summary */}
              {form.uploadedFile && form.uploadedFile.mediaType === 'image' && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.uploadedFile.localPreview ?? form.uploadedFile.url} alt="" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', marginBottom: '10px', display: 'block', filter: form.isGhost ? 'blur(8px)' : 'none' }} />
              )}
              {form.uploadedFile && form.uploadedFile.mediaType === 'video' && (
                <div style={{ position: 'relative', marginBottom: '10px' }}>
                  <video src={form.uploadedFile.localPreview} style={{ width: '100%', maxHeight: '160px', display: 'block', filter: form.isGhost ? 'blur(8px)' : 'none' }} />
                  {form.isGhost && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Press Start 2P', monospace", fontSize: '8px', color: 'var(--text-secondary)' }}>LOCKED</div>}
                </div>
              )}
              {form.contentTab === 'link' && form.linkUrl && (
                <div style={{ background: 'var(--bg-card)', padding: '10px 12px', display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '18px', opacity: 0.6 }}>🔗</span>
                  <div>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: 'var(--text-primary)', marginBottom: '3px' }}>{form.linkTitle || extractDomain(form.linkUrl)}</div>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '6px', color: 'var(--text-secondary)' }}>{extractDomain(form.linkUrl)}</div>
                  </div>
                </div>
              )}

              <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px', color: 'var(--text-primary)', lineHeight: '2', marginBottom: '8px' }}>
                {form.content.slice(0, 150)}{form.content.length > 150 ? '...' : ''}
              </p>
              {form.isGhost && (
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: 'var(--text-secondary)', lineHeight: '2' }}>
                  Hint: &ldquo;{form.hintText}&rdquo;<br />
                  Peek ${form.peekPrice} · Unlock ${form.unlockPrice}
                </div>
              )}
            </div>

            {/* Entry fee */}
            <div style={{ padding: '14px', background: 'var(--amber-faint)', boxShadow: '0 0 0 1px var(--amber-dim)', marginBottom: '18px' }}>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: 'var(--text-secondary)', marginBottom: '6px' }}>ENTRY FEE</div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '14px', color: 'var(--amber)' }}>$1.00</div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '6px', color: 'var(--text-dim)', marginTop: '4px', lineHeight: '2' }}>GOES TO TODAY'S PRIZE POOL. TOP RANKED SECRET WINS.</div>
            </div>

            {session && (
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                POSTING AS: <span style={{ color: '#4a7fa5' }}>{session.codename}</span>
              </div>
            )}

            {errors.general && (
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: 'var(--rust-bright)', marginBottom: '14px' }}>⚠ {errors.general}</div>
            )}

            <button onClick={handleSubmit} disabled={isSubmitting} className="pixel-btn pixel-btn-gold pixel-btn-lg" style={{ width: '100%', justifyContent: 'center' }}>
              {isSubmitting ? 'SUBMITTING...' : 'PAY $1.00 & SUBMIT'}
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {step > 1 && <button onClick={prevStep} className="pixel-btn pixel-btn-ghost">← BACK</button>}
        {step < 5 && (
          <button onClick={nextStep} className="pixel-btn pixel-btn-gold" style={{ marginLeft: 'auto' }}>
            NEXT →
          </button>
        )}
      </div>
    </div>
  );
}
