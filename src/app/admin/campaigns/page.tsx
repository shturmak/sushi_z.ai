'use client';

import { useState } from 'react';
import { Pencil, Trash2, Send } from 'lucide-react';
import { toast } from 'sonner';

import { useAdminPaginatedApi, adminPost, adminPut, adminDelete } from '@/lib/admin-api';
import type { Campaign, CampaignFormData, CampaignType, CampaignStatus } from '@/lib/admin-types';
import { PageHeader } from '@/components/admin/page-header';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { TableSkeleton } from '@/components/admin/admin-skeletons';
import { Badge } from '@/components/ui/badge';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────

interface CampaignRow extends Campaign {
  _count?: { messages: number };
}

// ── Badge Configs ──────────────────────────────────────────

const campaignTypeClasses: Record<CampaignType, string> = {
  win_back: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  promo: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  notification: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
};

const campaignStatusClasses: Record<CampaignStatus, string> = {
  draft: 'bg-secondary text-secondary-foreground',
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  paused: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  completed: 'bg-muted text-muted-foreground',
};

function CampaignTypeBadge({ type }: { type: CampaignType }) {
  return (
    <Badge variant="outline" className={cn('font-medium border-0', campaignTypeClasses[type])}>
      {type}
    </Badge>
  );
}

function CampaignStatusBadge({ status, t }: { status: CampaignStatus; t: (key: string) => string }) {
  const label = t(`admin.campaigns.statuses.${status}`);
  return (
    <Badge variant="outline" className={cn('font-medium border-0', campaignStatusClasses[status])}>
      {label}
    </Badge>
  );
}

// ── Helpers ──────────────────────────────────────────────

const EMPTY_FORM: CampaignFormData = {
  name: '',
  type: 'win_back',
  subject: '',
  body: '',
  targetSegment: 'all',
  channel: 'telegram',
};

function campaignToForm(c: Campaign): CampaignFormData {
  return {
    name: c.name,
    type: c.type,
    subject: c.subject,
    body: c.body,
    targetSegment: c.targetSegment ?? 'all',
    channel: c.channel,
  };
}

const SEGMENT_KEYS = ['all', 'new', 'inactive_7d', 'inactive_14d', 'inactive_30d', 'high_value'] as const;
const CHANNEL_KEYS = ['telegram', 'email', 'sms', 'push'] as const;
const TYPE_KEYS = ['win_back', 'promo', 'notification'] as const;

// ── Page Component ───────────────────────────────────────

export default function CampaignsPage() {
  const t = useT();

  const { data: campaigns, loading, refetch } = useAdminPaginatedApi<CampaignRow>('/api/admin/campaigns');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CampaignFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<CampaignRow | null>(null);

  // Send confirmation dialog state
  const [sendTarget, setSendTarget] = useState<CampaignRow | null>(null);
  const [sending, setSending] = useState(false);

  // ── CRUD Handlers ──────────────────────────────────────

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(campaign: CampaignRow) {
    setEditingId(campaign.id);
    setForm(campaignToForm(campaign));
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error(`${t('admin.campaigns.name')} *`);
      return;
    }
    if (!form.subject.trim()) {
      toast.error(`${t('admin.campaigns.subject')} *`);
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await adminPut(`/api/admin/campaigns/${editingId}`, form);
      } else {
        await adminPost('/api/admin/campaigns', form);
      }
      setDialogOpen(false);
      refetch();
    } catch {
      // toast is shown inside adminPost/adminPut
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await adminDelete(`/api/admin/campaigns/${deleteTarget.id}`);
      setDeleteTarget(null);
      refetch();
    } catch {
      // toast shown inside adminDelete
    }
  }

  async function handleSend() {
    if (!sendTarget) return;
    setSending(true);
    try {
      const result = await adminPost<{ sent: number; message: string }, { sent: number; message: string }>(
        `/api/admin/campaigns/${sendTarget.id}/send`,
        {},
      );
      toast.success(t('admin.campaigns.sent'));
      setSendTarget(null);
      refetch();
      // Suppress the default adminPost success toast since we show our own
    } catch {
      // toast shown inside adminPost
    } finally {
      setSending(false);
    }
  }

  // ── Render ─────────────────────────────────────────────

  return (
    <>
      <PageHeader
        title={t('admin.campaigns.title')}
        description=""
        action={{ label: t('admin.campaigns.create'), onClick: openCreate }}
      />

      {loading ? (
        <TableSkeleton rows={6} cols={9} />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.campaigns.name')}</TableHead>
                <TableHead>{t('admin.campaigns.type')}</TableHead>
                <TableHead>{t('admin.campaigns.status')}</TableHead>
                <TableHead>{t('admin.campaigns.channel')}</TableHead>
                <TableHead>{t('admin.campaigns.sentCount')}</TableHead>
                <TableHead>{t('admin.campaigns.openedCount')}</TableHead>
                <TableHead>{t('admin.campaigns.clickedCount')}</TableHead>
                <TableHead>{t('admin.campaigns.recipients')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    {t('admin.campaigns.noCampaigns')}
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">{c.name}</TableCell>
                    <TableCell>
                      <CampaignTypeBadge type={c.type} />
                    </TableCell>
                    <TableCell>
                      <CampaignStatusBadge status={c.status} t={t} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.channel}</TableCell>
                    <TableCell>{c.sentCount}</TableCell>
                    <TableCell>{c.openedCount}</TableCell>
                    <TableCell>{c.clickedCount}</TableCell>
                    <TableCell>
                      {c.targetSegment
                        ? t(`admin.campaigns.segments.${c.targetSegment}`)
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {c.status === 'draft' && (
                          <Button variant="ghost" size="icon" onClick={() => setSendTarget(c)} title={t('admin.campaigns.send')}>
                            <Send className="h-4 w-4" />
                            <span className="sr-only">{t('admin.campaigns.send')}</span>
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">{t('common.edit')}</span>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(c)}>
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">{t('common.delete')}</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Create / Edit Dialog ─────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? t('admin.campaigns.edit') : t('admin.campaigns.create')}</DialogTitle>
            <DialogDescription>
              {editingId ? t('admin.campaigns.edit') : t('admin.campaigns.create')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="campaign-name">
                {t('admin.campaigns.name')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="campaign-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            {/* Type */}
            <div className="grid gap-2">
              <Label htmlFor="campaign-type">{t('admin.campaigns.type')}</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v as CampaignType }))}
              >
                <SelectTrigger id="campaign-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_KEYS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {t(`admin.campaigns.types.${key}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subject */}
            <div className="grid gap-2">
              <Label htmlFor="campaign-subject">
                {t('admin.campaigns.subject')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="campaign-subject"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              />
            </div>

            {/* Body */}
            <div className="grid gap-2">
              <Label htmlFor="campaign-body">{t('admin.campaigns.body')}</Label>
              <Textarea
                id="campaign-body"
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                rows={4}
                placeholder={t('admin.campaigns.bodyPlaceholder')}
              />
            </div>

            {/* Target Segment */}
            <div className="grid gap-2">
              <Label htmlFor="campaign-segment">{t('admin.campaigns.targetSegment')}</Label>
              <Select
                value={form.targetSegment}
                onValueChange={(v) => setForm((f) => ({ ...f, targetSegment: v }))}
              >
                <SelectTrigger id="campaign-segment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEGMENT_KEYS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {t(`admin.campaigns.segments.${key}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Channel */}
            <div className="grid gap-2">
              <Label htmlFor="campaign-channel">{t('admin.campaigns.channel')}</Label>
              <Select
                value={form.channel}
                onValueChange={(v) => setForm((f) => ({ ...f, channel: v }))}
              >
                <SelectTrigger id="campaign-channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNEL_KEYS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {t(`admin.campaigns.channels.${key}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? t('common.loading') : editingId ? t('common.save') : t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('admin.campaigns.deleteConfirm')}
        description={`«${deleteTarget?.name}»`}
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
        variant="destructive"
      />

      {/* ── Send Confirm Dialog ──────────────────────────── */}
      <ConfirmDialog
        open={!!sendTarget}
        onOpenChange={(open) => !open && setSendTarget(null)}
        title={t('admin.campaigns.send')}
        description={sendTarget?.name ?? ''}
        confirmLabel={t('admin.campaigns.send')}
        onConfirm={handleSend}
        variant="default"
      />
    </>
  );
}

// ── Exported hook for future badge ────────────────────────

export function usePendingCampaignCount(): number {
  // This is a placeholder that can be connected to real data when needed.
  // Returns count of campaigns with status='active' for sidebar badges.
  return 0;
}