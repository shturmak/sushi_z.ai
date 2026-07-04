'use client';

import { useState, useEffect, useCallback } from 'react';
import { Save, Eye, Pencil, FileText, Scale, Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '@/i18n';
import { useAdminAuth } from '@/lib/admin-auth';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

// ─── Types ──────────────────────────────────────────────────
type LegalType = 'privacy' | 'terms' | 'restaurant';

const LEGAL_TABS: { value: LegalType; labelKey: string; icon: typeof FileText }[] = [
  { value: 'privacy', labelKey: 'legal.privacyPolicy', icon: FileText },
  { value: 'terms', labelKey: 'legal.termsOfService', icon: Scale },
  { value: 'restaurant', labelKey: 'legal.restaurantTerms', icon: Building2 },
];

// ─── Helpers ────────────────────────────────────────────────
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('uk-UA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ─── Document Editor ────────────────────────────────────────
function DocumentEditor({ type }: { type: LegalType }) {
  const t = useT();
  const token = useAdminAuth((s) => s.token);
  const [content, setContent] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState(true);

  const fetchDocument = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/legal?type=${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setContent(json.data.content);
        setLastUpdated(json.data.lastUpdated);
      } else {
        toast.error(json.error?.message || 'Failed to load');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  }, [type, token]);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/legal?type=${type}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });
      const json = await res.json();
      if (json.success) {
        setLastUpdated(json.data.lastUpdated);
        setViewMode(true);
        toast.success(t('common.save'));
      } else {
        toast.error(json.error?.message || 'Failed to save');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  const tabInfo = LEGAL_TABS.find((item) => item.value === type);
  const title = tabInfo ? t(tabInfo.labelKey) : type;
  const Icon = tabInfo?.icon ?? FileText;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>
          {t('legal.lastUpdated')}: {formatDate(lastUpdated)}
        </CardDescription>
        <CardAction>
          <div className="flex items-center gap-1">
            {viewMode ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(false)}
              >
                <Pencil className="h-4 w-4 mr-1.5" />
                {t('common.edit')}
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setViewMode(true);
                    fetchDocument();
                  }}
                >
                  <Eye className="h-4 w-4 mr-1.5" />
                  {t('common.cancel')}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-1.5" />
                  )}
                  {t('common.save')}
                </Button>
              </>
            )}
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        {viewMode ? (
          <pre className="whitespace-pre-wrap text-sm leading-relaxed">
            {content}
          </pre>
        ) : (
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={25}
            className="font-mono text-sm"
            placeholder="Введіть текст документа у форматі Markdown..."
          />
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ──────────────────────────────────────────────
export default function LegalPage() {
  const t = useT();
  const [activeTab, setActiveTab] = useState<LegalType>('privacy');

  return (
    <main className="flex-1 p-4 md:p-6 space-y-6">
      <PageHeader title={t('admin.sidebar.legal')} description="" />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as LegalType)}>
        <TabsList>
          {LEGAL_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.value} value={tab.value}>
                <Icon className="h-4 w-4 mr-1.5" />
                {t(tab.labelKey)}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {LEGAL_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <DocumentEditor type={tab.value} />
          </TabsContent>
        ))}
      </Tabs>
    </main>
  );
}