import { useEffect, useState } from 'react';
import { KeyRound, Pencil, Plus, Power, ShieldCheck } from 'lucide-react';
import { useUserStore } from '@/store/userStore';
import { useAuthStore } from '@/store/authStore';
import { logAudit } from '@/services/auditService';
import { toast, useUiStore } from '@/store/uiStore';
import { generateId } from '@/utils/id';
import { formatFriendlyDateTime } from '@/utils/format';
import { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, PERMISSION_LABELS, ROLE_LABELS } from '@/constants/permissions';
import type { Permission, Role, User } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Modal } from '@/components/ui/Modal';
import { DataTable, type Column } from '@/components/ui/DataTable';

const AVATAR_COLORS = ['#7c3aed', '#0891b2', '#ea580c', '#059669', '#db2777', '#2563eb'];

export function UsersPage() {
  const users = useUserStore((s) => s.users);
  const addUser = useUserStore((s) => s.addUser);
  const updateUser = useUserStore((s) => s.updateUser);
  const currentUser = useAuthStore((s) => s.user)!;
  const askConfirm = useUiStore((s) => s.askConfirm);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('seller');
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!modalOpen) return;
    setName(editing?.name ?? '');
    setEmail(editing?.email ?? '');
    setRole(editing?.role ?? 'seller');
    setPermissions(editing?.permissions ?? DEFAULT_ROLE_PERMISSIONS.seller);
    setError('');
  }, [modalOpen, editing]);

  const onRoleChange = (nextRole: Role) => {
    setRole(nextRole);
    setPermissions(DEFAULT_ROLE_PERMISSIONS[nextRole]);
  };

  const togglePermission = (permission: Permission) => {
    setPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission],
    );
  };

  const submit = () => {
    if (!name.trim()) return setError('El nombre es obligatorio.');
    if (!email.trim()) return setError('El email es obligatorio.');
    if (editing) {
      updateUser(editing.id, { name: name.trim(), email: email.trim(), role, permissions });
      logAudit({ action: 'user_updated', module: 'users', description: `Modificó el usuario "${name.trim()}"` });
      toast.success('Usuario actualizado');
    } else {
      addUser({
        id: generateId(),
        name: name.trim(),
        email: email.trim(),
        role,
        permissions,
        status: 'active',
        avatarColor: AVATAR_COLORS[users.length % AVATAR_COLORS.length]!,
        lastLoginAt: null,
        createdAt: new Date().toISOString(),
      });
      logAudit({ action: 'user_created', module: 'users', description: `Creó el usuario "${name.trim()}" (${ROLE_LABELS[role]})`, severity: 'success' });
      toast.success('Usuario creado', 'Ya puede iniciar sesión desde la pantalla de login.');
    }
    setModalOpen(false);
  };

  const toggleStatus = (user: User) => {
    if (user.id === currentUser.id) {
      toast.error('No podés desactivar tu propio usuario.');
      return;
    }
    askConfirm({
      title: user.status === 'active' ? 'Desactivar usuario' : 'Reactivar usuario',
      message: user.status === 'active' ? `${user.name} no podrá iniciar sesión.` : `${user.name} podrá volver a iniciar sesión.`,
      danger: user.status === 'active',
      confirmLabel: user.status === 'active' ? 'Desactivar' : 'Reactivar',
      onConfirm: () => {
        updateUser(user.id, { status: user.status === 'active' ? 'inactive' : 'active' });
        logAudit({ action: 'user_updated', module: 'users', description: `${user.status === 'active' ? 'Desactivó' : 'Reactivó'} al usuario "${user.name}"`, severity: 'warning' });
        toast.success('Estado actualizado');
      },
    });
  };

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'Usuario',
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.name} color={u.avatarColor} size="sm" />
          <div>
            <p className="flex items-center gap-2 font-medium">
              {u.name}
              {u.id === currentUser.id && <Badge variant="primary">Vos</Badge>}
            </p>
            <p className="text-xs text-slate-400">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Rol',
      render: (u) => (
        <Badge variant={u.role === 'admin' ? 'primary' : u.role === 'manager' ? 'info' : 'default'}>
          {ROLE_LABELS[u.role]}
        </Badge>
      ),
    },
    { key: 'permissions', header: 'Permisos', align: 'center', hideOnMobile: true, render: (u) => `${u.permissions.length}/${ALL_PERMISSIONS.length}` },
    {
      key: 'last',
      header: 'Último acceso',
      hideOnMobile: true,
      render: (u) => (u.lastLoginAt ? <span className="text-xs text-slate-500">{formatFriendlyDateTime(u.lastLoginAt)}</span> : <span className="text-slate-300">Nunca</span>),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (u) => <Badge variant={u.status === 'active' ? 'success' : 'default'}>{u.status === 'active' ? 'Activo' : 'Inactivo'}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (u) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => {
              toast.success('Contraseña reseteada (simulado)', `Se envió un email a ${u.email}.`);
              logAudit({ action: 'password_reset', module: 'users', description: `Reseteó la contraseña de "${u.name}" (simulado)` });
            }}
            aria-label="Resetear contraseña"
            title="Resetear contraseña (simulado)"
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <KeyRound className="size-4" />
          </button>
          <button
            onClick={() => {
              setEditing(u);
              setModalOpen(true);
            }}
            aria-label="Editar"
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <Pencil className="size-4" />
          </button>
          <button onClick={() => toggleStatus(u)} aria-label="Cambiar estado" className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-800">
            <Power className="size-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Usuarios y permisos"
        subtitle={`${users.length} usuarios · los permisos parten del rol y se pueden personalizar`}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus className="size-4" aria-hidden />
            Nuevo usuario
          </Button>
        }
      />
      <Card>
        <DataTable columns={columns} rows={users} rowKey={(u) => u.id} />
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Editar usuario: ${editing.name}` : 'Nuevo usuario'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={submit}>
              <ShieldCheck className="size-4" aria-hidden />
              {editing ? 'Guardar cambios' : 'Crear usuario'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Nombre" required value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <Input label="Email" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Select
              label="Rol"
              value={role}
              onChange={(e) => onRoleChange(e.target.value as Role)}
              options={(Object.keys(ROLE_LABELS) as Role[]).map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
              containerClassName="sm:col-span-2"
            />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">Permisos</p>
            <p className="mb-3 text-xs text-slate-400">Se precargan según el rol; podés ajustarlos individualmente.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {ALL_PERMISSIONS.map((permission) => (
                <Switch
                  key={permission}
                  checked={permissions.includes(permission)}
                  onChange={() => togglePermission(permission)}
                  label={PERMISSION_LABELS[permission]}
                />
              ))}
            </div>
          </div>
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        </div>
      </Modal>
    </div>
  );
}
