'use client';

import { useState, useMemo, useCallback, type FormEvent } from 'react';
import { Pencil, Power, Trash2, Search, Package, Truck, CheckCircle2, X } from 'lucide-react';
import { useAdminApi, adminPost, adminPut, adminDelete, adminPatch } from '@/lib/admin-api';
import { useAdminAuth } from '@/lib/admin-auth';
import { useBrandStore } from '@/lib/brand-store';
import { PageHeader } from '@/components/admin/page-header';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { TableSkeleton } from '@/components/admin/admin-skeletons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { useT } from '@/i18n';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────

interface Courier {
  id: string;
  brandId: string;
  name: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { deliveryAssignments: number };
  activeOrders: number;
  totalDeliveries: number;
}

interface DeliveryAssignment {
  id: string;
  orderId: string;
  courierId: string;
  status: 'assigned' | 'picked_up' | 'delivered';
  assignedAt: string;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  order: { orderNumber: string; status: string };
}

interface CourierDetail {
  id: string;
  name: string;
  deliveryAssignments: DeliveryAssignment[];
}

// ─── Status badge ────────────────────────────────────────────────

function DeliveryStatusBadge({ status }: { status: string }) {
  const t = useT();
  const config: Record<string, { label: string; className: string }> = {
    assigned: {
      label: t('courier.assigned'),
      className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    },
    picked_up: {
      label: t('courier.pickedUp'),
      className: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
    },
    delivered: {
      label: t('courier.delivered'),
      className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    },
  };

  const c = config[status] ?? config.assigned;
  return (
    <Badge variant="outline" className={`font-medium border-0 ${c.className}`}>
      {c.label}
    </Badge>
  );
}

function ActiveToggleBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
      ✓
    </Badge>
  ) : (
    <Badge variant="outline" className="border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-300">
      ✕
    </Badge>
  );
}

// ─── Create / Edit Dialog ────────────────────────────────────────

function CourierFormDialog({
  open,
  onOpenChange,
  editingCourier,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCourier: Courier | null;
  onSaved: () => void;
}) {
  const t = useT();
  const isEdit = editingCourier !== null;
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setName(editingCourier?.name ?? '');
      setPhone(editingCourier?.phone ?? '');
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      if (isEdit && editingCourier) {
        await adminPut(`/api/admin/couriers/${editingCourier.id}`, {
          name: name.trim(),
          phone: phone.trim() || null,
        });
      } else {
        await adminPost('/api/admin/couriers', {
          name: name.trim(),
          phone: phone.trim() || null,
        });
      }
      onSaved();
      onOpenChange(false);
    } catch {
      // toast handled by adminPut/adminPost
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('courier.edit') : t('courier.create')}</DialogTitle>
          <DialogDescription>
            {isEdit ? t('courier.edit') : t('courier.create')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="courier-name">
              {t('courier.name')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="courier-name"
              placeholder={t('courier.name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="courier-phone">{t('courier.phone')}</Label>
            <Input
              id="courier-phone"
              placeholder="+380 50 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? t('common.loading') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Assign Courier Dialog ───────────────────────────────────────

function AssignCourierDialog({
  open,
  onOpenChange,
  couriers,
  onAssigned,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  couriers: Courier[];
  onAssigned: () => void;
}) {
  const t = useT();
  const [orderId, setOrderId] = useState('');
  const [selectedCourierId, setSelectedCourierId] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!orderId.trim() || !selectedCourierId) return;

    setSaving(true);
    try {
      await adminPost('/api/admin/couriers/assign', {
        orderId: orderId.trim(),
        courierId: selectedCourierId,
      });
      onAssigned();
      onOpenChange(false);
      setOrderId('');
      setSelectedCourierId('');
    } catch {
      // handled
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('courier.assignOrder')}</DialogTitle>
          <DialogDescription>{t('courier.selectCourier')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="assign-order-id">Order ID</Label>
            <Input
              id="assign-order-id"
              placeholder="Enter order ID"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>{t('courier.selectCourier')}</Label>
            <Select value={selectedCourierId} onValueChange={setSelectedCourierId}>
              <SelectTrigger>
                <SelectValue placeholder={t('courier.selectCourier')} />
              </SelectTrigger>
              <SelectContent>
                {couriers
                  .filter((c) => c.isActive)
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving || !orderId.trim() || !selectedCourierId}>
              {saving ? t('common.loading') : t('courier.assignOrder')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delivery Action Buttons ─────────────────────────────────────

function DeliveryActions({
  courierId,
  assignment,
  onStatusUpdate,
  onUnassign,
  compact = false,
}: {
  courierId: string;
  assignment: DeliveryAssignment;
  onStatusUpdate: (courierId: string, assignmentId: string, status: 'picked_up' | 'delivered') => void;
  onUnassign: (orderId: string) => void;
  compact?: boolean;
}) {
  const t = useT();
  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {assignment.status === 'assigned' && (
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onStatusUpdate(courierId, assignment.id, 'picked_up')} aria-label={t('courier.pickedUp')}>
            <Truck className="h-3.5 w-3.5" />
          </Button>
        )}
        {(assignment.status === 'assigned' || assignment.status === 'picked_up') && (
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onStatusUpdate(courierId, assignment.id, 'delivered')} aria-label={t('courier.delivered')}>
            <CheckCircle2 className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onUnassign(assignment.orderId)} aria-label={t('courier.unassignOrder')}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      {assignment.status === 'assigned' && (
        <Button size="sm" variant="outline" onClick={() => onStatusUpdate(courierId, assignment.id, 'picked_up')}>
          <Truck className="h-3.5 w-3.5 mr-1" />
          {t('courier.pickedUp')}
        </Button>
      )}
      {(assignment.status === 'assigned' || assignment.status === 'picked_up') && (
        <Button size="sm" variant="outline" onClick={() => onStatusUpdate(courierId, assignment.id, 'delivered')}>
          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
          {t('courier.delivered')}
        </Button>
      )}
      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onUnassign(assignment.orderId)}>
        {t('courier.unassignOrder')}
      </Button>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────

export default function CouriersPage() {
  const t = useT();
  const { data: couriers, loading, refetch } = useAdminApi<Courier[]>('/api/admin/couriers', []);
  const token = useAdminAuth((s) => s.token);
  const brandId = useBrandStore((s) => s.currentBrandId);

  // Search
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    if (!search.trim()) return couriers;
    const q = search.toLowerCase();
    return couriers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q)),
    );
  }, [couriers, search]);

  // Expanded courier deliveries
  const [expandedCourierId, setExpandedCourierId] = useState<string | null>(null);
  const [courierDetail, setCourierDetail] = useState<CourierDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchCourierDetail = useCallback(async (courierId: string) => {
    setLoadingDetail(true);
    try {
      const url = new URL(`/api/admin/couriers/${courierId}`, 'http://localhost');
      if (brandId) url.searchParams.set('brandId', brandId);
      const res = await fetch(url.pathname + url.search, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const json = await res.json();
      if (json.success) {
        setCourierDetail(json.data);
      }
    } catch {
      // handled silently
    } finally {
      setLoadingDetail(false);
    }
  }, [token, brandId]);

  const handleToggleExpand = async (courierId: string) => {
    if (expandedCourierId === courierId) {
      setExpandedCourierId(null);
      setCourierDetail(null);
      return;
    }
    setExpandedCourierId(courierId);
    await fetchCourierDetail(courierId);
  };

  const refreshDetail = useCallback(async () => {
    if (expandedCourierId) {
      await fetchCourierDetail(expandedCourierId);
    }
  }, [expandedCourierId, fetchCourierDetail]);

  // Create / Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourier, setEditingCourier] = useState<Courier | null>(null);

  const handleOpenCreate = () => {
    setEditingCourier(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (courier: Courier) => {
    setEditingCourier(courier);
    setDialogOpen(true);
  };

  const handleSaved = () => {
    refetch();
  };

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Courier | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminDelete(`/api/admin/couriers/${deleteTarget.id}`);
      refetch();
    } catch {
      // handled
    } finally {
      setDeleteTarget(null);
    }
  };

  // Toggle active
  const handleToggleActive = async (courier: Courier) => {
    try {
      await adminPut(`/api/admin/couriers/${courier.id}`, { isActive: !courier.isActive });
      refetch();
    } catch {
      // handled
    }
  };

  // Assign dialog
  const [assignOpen, setAssignOpen] = useState(false);

  // Delivery status update
  const handleStatusUpdate = async (courierId: string, assignmentId: string, status: 'picked_up' | 'delivered') => {
    try {
      await adminPatch(`/api/admin/couriers/${courierId}/deliveries`, { assignmentId, status });
      toast.success(status === 'picked_up' ? t('courier.pickedUp') : t('courier.delivered'));
      refetch();
      refreshDetail();
    } catch {
      // handled
    }
  };

  // Unassign
  const handleUnassign = async (orderId: string) => {
    try {
      const url = new URL('/api/admin/couriers/assign', 'http://localhost');
      if (brandId) url.searchParams.set('brandId', brandId);
      const res = await fetch(url.pathname + url.search, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(t('courier.unassignOrder'));
        refetch();
        refreshDetail();
      } else {
        toast.error(json.error?.message || 'Error');
      }
    } catch {
      // handled
    }
  };

  // Active deliveries for the panel
  const activeDeliveries = useMemo(() => {
    if (!courierDetail) return [];
    return courierDetail.deliveryAssignments.filter(
      (a) => a.status === 'assigned' || a.status === 'picked_up',
    );
  }, [courierDetail]);

  return (
    <main className="flex-1 p-4 md:p-6 space-y-6">
      <PageHeader
        title={t('courier.title')}
        description=""
        action={{ label: t('courier.create'), onClick: handleOpenCreate }}
      />

      {/* Top actions */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => setAssignOpen(true)}>
          <Package className="h-4 w-4 mr-2" />
          {t('courier.assignOrder')}
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('common.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Mobile card view */}
      {!loading && (
        <div className="md:hidden space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">{t('courier.noCouriers')}</div>
          ) : (
            filtered.map((courier) => (
              <Card key={courier.id} className="p-4 gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{courier.name}</div>
                    <div className="text-sm text-muted-foreground">{courier.phone || '—'}</div>
                  </div>
                  <ActiveToggleBadge active={courier.isActive} />
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{t('courier.activeOrders')}: {courier.activeOrders}</span>
                  <span>{t('courier.totalDeliveries')}: {courier.totalDeliveries}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleExpand(courier.id)}
                  >
                    <Truck className="h-4 w-4 mr-1" />
                    {expandedCourierId === courier.id ? '▲' : '▼'}
                  </Button>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(courier)} aria-label={t('common.edit')}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleActive(courier)} aria-label={t('courier.isActive')}>
                      <Power className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(courier)} aria-label={t('common.delete')}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Expanded deliveries (mobile) */}
                {expandedCourierId === courier.id && (
                  <div className="border-t pt-3 mt-1 space-y-2 max-h-64 overflow-y-auto">
                    {loadingDetail ? (
                      <div className="text-sm text-muted-foreground py-2">...</div>
                    ) : activeDeliveries.length === 0 ? (
                      <div className="text-sm text-muted-foreground py-2">—</div>
                    ) : (
                      activeDeliveries.map((assignment) => (
                        <div key={assignment.id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50">
                          <div className="min-w-0">
                            <div className="text-sm font-medium">#{assignment.order.orderNumber}</div>
                            <DeliveryStatusBadge status={assignment.status} />
                          </div>
                          <DeliveryActions
                            courierId={courier.id}
                            assignment={assignment}
                            onStatusUpdate={handleStatusUpdate}
                            onUnassign={handleUnassign}
                            compact
                          />
                        </div>
                      ))
                    )}
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      )}

      {/* Table — desktop only */}
      {loading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : (
        <div className="hidden md:block rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('courier.name')}</TableHead>
                <TableHead>{t('courier.phone')}</TableHead>
                <TableHead className="text-center">{t('courier.activeOrders')}</TableHead>
                <TableHead className="text-center">{t('courier.totalDeliveries')}</TableHead>
                <TableHead>{t('courier.isActive')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {t('courier.noCouriers')}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((courier) => (
                  <>
                    <TableRow key={courier.id}>
                      <TableCell className="font-semibold">{courier.name}</TableCell>
                      <TableCell className="text-muted-foreground">{courier.phone || '—'}</TableCell>
                      <TableCell className="text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleExpand(courier.id)}
                          className={`inline-flex items-center gap-1 text-sm font-medium hover:underline ${courier.activeOrders > 0 ? 'text-amber-600' : ''}`}
                        >
                          {courier.activeOrders}
                          {expandedCourierId === courier.id && <span className="text-xs">▲</span>}
                        </button>
                      </TableCell>
                      <TableCell className="text-center">{courier.totalDeliveries}</TableCell>
                      <TableCell>
                        <Switch
                          checked={courier.isActive}
                          onCheckedChange={() => handleToggleActive(courier)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(courier)} aria-label={t('common.edit')}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(courier)} aria-label={t('common.delete')}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expanded deliveries row (desktop) */}
                    {expandedCourierId === courier.id && (
                      <TableRow key={`${courier.id}-expanded`}>
                        <TableCell colSpan={6} className="bg-muted/30 p-4">
                          {loadingDetail ? (
                            <div className="text-sm text-muted-foreground py-2">...</div>
                          ) : activeDeliveries.length === 0 ? (
                            <div className="text-sm text-muted-foreground py-2">—</div>
                          ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {activeDeliveries.map((assignment) => (
                                <div key={assignment.id} className="flex items-center justify-between gap-4 p-2 rounded-md bg-background border">
                                  <div className="flex items-center gap-3">
                                    <span className="font-mono text-sm font-medium">#{assignment.order.orderNumber}</span>
                                    <DeliveryStatusBadge status={assignment.status} />
                                  </div>
                                  <DeliveryActions
                                    courierId={courier.id}
                                    assignment={assignment}
                                    onStatusUpdate={handleStatusUpdate}
                                    onUnassign={handleUnassign}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Active Deliveries Panel */}
      {expandedCourierId && courierDetail && !loadingDetail && (
        <Card className="p-4 md:p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Truck className="h-5 w-5" />
            {t('courier.activeOrders')} — {courierDetail.name}
          </h3>
          {activeDeliveries.length === 0 ? (
            <div className="text-muted-foreground text-sm py-4 text-center">—</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {activeDeliveries.map((assignment) => (
                <div key={assignment.id} className="hidden md:flex items-center justify-between gap-4 p-3 rounded-md border">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-medium">#{assignment.order.orderNumber}</span>
                    <DeliveryStatusBadge status={assignment.status} />
                  </div>
                  <DeliveryActions
                    courierId={courierDetail.id}
                    assignment={assignment}
                    onStatusUpdate={handleStatusUpdate}
                    onUnassign={handleUnassign}
                  />
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Create / Edit dialog */}
      <CourierFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingCourier={editingCourier}
        onSaved={handleSaved}
      />

      {/* Assign courier dialog */}
      <AssignCourierDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        couriers={couriers}
        onAssigned={() => { refetch(); refreshDetail(); }}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={t('courier.deleteConfirm')}
        description={`«${deleteTarget?.name ?? ''}»`}
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
      />
    </main>
  );
}