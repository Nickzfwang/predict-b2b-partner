'use client';

import { useState, useRef } from 'react';
import type { PredictMarketTheme } from '@/types/sdk';
import { EmbedWidget } from './EmbedWidget';
import { getDictionary } from '@/lib/i18n';

// ─── 型別 ─────────────────────────────────────────────────────────────────────

interface BrandingSettingsProps {
  embedBaseUrl: string;
  initialToken: string;
  userId: string;
  locale?: string;
  walletMode: string;
}

interface ThemeFormState {
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  border_radius: string;
  font_family: string;
}

const DEFAULT_THEME: ThemeFormState = {
  primary_color: '#10B981',
  secondary_color: '#3B82F6',
  background_color: '#FFFFFF',
  text_color: '#1E293B',
  border_radius: '0.5rem',
  font_family: 'Inter, sans-serif',
};

// ─── 元件 ─────────────────────────────────────────────────────────────────────

export function BrandingSettings({
  embedBaseUrl,
  initialToken,
  userId,
  locale,
  walletMode,
}: BrandingSettingsProps) {
  const d = getDictionary(locale);
  const [themeForm, setThemeForm] = useState<ThemeFormState>(DEFAULT_THEME);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 將表單 state 轉為 SDK theme 格式
  const sdkTheme: Partial<PredictMarketTheme> = {
    primaryColor: themeForm.primary_color,
    secondaryColor: themeForm.secondary_color,
    backgroundColor: themeForm.background_color,
    textColor: themeForm.text_color,
    borderRadius: themeForm.border_radius,
    fontFamily: themeForm.font_family,
  };

  // ── Logo 上傳 ─────────────────────────────────────────────────────────────
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 前端預覽
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('logo', file);

      const res = await fetch(`/api/branding/logo?mode=${walletMode}`, {
        method: 'POST',
        body: formData,
      });

      const json = (await res.json()) as { success?: boolean; data?: { logo_url: string }; error?: string; code?: string };

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? json.code ?? d.branding.uploadFailedFallback);
      }

      setMessage({ type: 'success', text: d.branding.logoSuccess });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : d.branding.logoFailed;
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setUploading(false);
    }
  };

  // ── Theme 儲存 ────────────────────────────────────────────────────────────
  const handleThemeSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/branding/theme?mode=${walletMode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(themeForm),
      });

      const json = (await res.json()) as { success?: boolean; error?: string; code?: string };

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? json.code ?? d.branding.saveFailedFallback);
      }

      setMessage({ type: 'success', text: d.branding.themeSaved });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : d.branding.themeFailed;
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setSaving(false);
    }
  };

  // ── 表單欄位更新 ──────────────────────────────────────────────────────────
  const updateField = (field: keyof ThemeFormState, value: string) => {
    setThemeForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* 左欄：設定表單 */}
      <div className="space-y-6">
        {/* Logo 上傳 */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">{d.branding.logoTitle}</h3>
          <p className="mt-1 text-sm text-slate-500">{d.branding.logoDesc}</p>

          <div className="mt-4 flex items-center gap-4">
            {logoPreview && (
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoPreview} alt={d.branding.logoPreviewAlt} className="h-full w-full object-contain" />
              </div>
            )}

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {uploading ? d.branding.uploading : d.branding.chooseFile}
              </button>
            </div>
          </div>
        </div>

        {/* Theme 設定 */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">{d.branding.themeTitle}</h3>
          <p className="mt-1 text-sm text-slate-500">{d.branding.themeDesc}</p>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <ColorField
              label={d.branding.primaryColor}
              value={themeForm.primary_color}
              onChange={(v) => updateField('primary_color', v)}
            />
            <ColorField
              label={d.branding.secondaryColor}
              value={themeForm.secondary_color}
              onChange={(v) => updateField('secondary_color', v)}
            />
            <ColorField
              label={d.branding.backgroundColor}
              value={themeForm.background_color}
              onChange={(v) => updateField('background_color', v)}
            />
            <ColorField
              label={d.branding.textColor}
              value={themeForm.text_color}
              onChange={(v) => updateField('text_color', v)}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">{d.branding.borderRadius}</label>
              <input
                type="text"
                value={themeForm.border_radius}
                onChange={(e) => updateField('border_radius', e.target.value)}
                placeholder="0.5rem"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">{d.branding.fontFamily}</label>
              <input
                type="text"
                value={themeForm.font_family}
                onChange={(e) => updateField('font_family', e.target.value)}
                placeholder="Inter, sans-serif"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={handleThemeSave}
              disabled={saving}
              className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? d.common.saving : d.branding.saveTheme}
            </button>
            <button
              onClick={() => setThemeForm(DEFAULT_THEME)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              {d.common.reset}
            </button>
          </div>
        </div>

        {/* 訊息 */}
        {message && (
          <div
            className={`rounded-lg px-4 py-3 text-sm ${
              message.type === 'success'
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}
      </div>

      {/* 右欄：即時預覽 */}
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">{d.branding.livePreview}</h3>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
              {d.branding.livePreviewBadge}
            </span>
          </div>

          <EmbedWidget
            embedBaseUrl={embedBaseUrl}
            initialToken={initialToken}
            userId={userId}
            route="/markets"
            height="500px"
            compact
            theme={sdkTheme}
            locale={locale}
            walletMode={walletMode}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Color Field 子元件 ─────────────────────────────────────────────────────

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorField({ label, value, onChange }: ColorFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 cursor-pointer rounded-md border border-slate-300"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>
    </div>
  );
}
