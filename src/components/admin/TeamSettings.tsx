"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Pencil, Plus, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FieldError, FieldLabel, Input } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";
import { cn } from "@/lib/utils/cn";
import { ROLE_LABELS, type PanelRole } from "@/lib/auth/permissions";
import {
  createPanelUserAction,
  deletePanelUserAction,
  saveProfessionalAction,
  setPanelUserPasswordAction,
  updatePanelUserAction,
} from "@/lib/actions/admin/team";
import type { PanelUser } from "@/lib/data/team";
import type { Professional } from "@/types";

const ROLE_HINTS: Record<PanelRole, string> = {
  admin: "Vê e mexe em tudo: financeiro, vendas, estoque, relatórios e configurações.",
  staff: "Agenda, agendamentos, clientes, lista de espera e bloqueios. Não vê saldo, vendas, valores recebidos nem relatórios.",
};

type Result = { ok: true } | { ok: false; error: string };

function RolePicker({ value, onChange, disabled }: { value: PanelRole; onChange: (r: PanelRole) => void; disabled?: boolean }) {
  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="mb-1.5 text-sm font-medium text-brand-graphite">Nível de acesso</legend>
      {(["staff", "admin"] as const).map((role) => (
        <label
          key={role}
          className={cn(
            "flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors",
            value === role ? "border-brand-forest bg-brand-forest/10" : "border-brand-beige hover:border-brand-sage",
            disabled && "cursor-not-allowed opacity-60"
          )}
        >
          <input type="radio" name="panel-role" className="mt-1 h-4 w-4" checked={value === role} onChange={() => onChange(role)} />
          <span>
            <span className="block text-sm font-medium text-brand-graphite">{ROLE_LABELS[role]}</span>
            <span className="block text-xs text-brand-graphite/60">{ROLE_HINTS[role]}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(task: () => Promise<Result>) {
    setBusy(true);
    setError(null);
    const result = await task();
    setBusy(false);
    if (!result.ok) setError(result.error);
    return result.ok;
  }
  return { busy, error, setError, run };
}

export function PanelAccessManager({ users, currentUserId }: { users: PanelUser[]; currentUserId: string }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PanelUser | null>(null);
  const [removing, setRemoving] = useState<PanelUser | null>(null);
  const remove = useAction();

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-xl text-brand-forest">Acessos ao painel</h2>
        <Button className="!px-3 !py-2 text-xs" onClick={() => setCreating(true)}>
          <Plus size={14} /> Novo acesso
        </Button>
      </div>
      <p className="mb-5 text-sm text-brand-graphite/60">
        Cada pessoa entra com o próprio e-mail e senha. A secretária marca e organiza a agenda, mas não vê a situação financeira.
        Mudar o nível ou remover vale na hora, mesmo com o painel aberto.
      </p>

      <ul className="space-y-2">
        {users.map((u) => {
          const isMe = u.id === currentUserId;
          return (
            <li key={u.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-brand-beige p-3">
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                  u.role === "admin" ? "bg-brand-forest text-brand-ink" : "bg-brand-cream text-brand-moss"
                )}
              >
                {u.role === "admin" ? <ShieldCheck size={17} aria-hidden="true" /> : <UserRound size={17} aria-hidden="true" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-brand-graphite">
                  {u.name}
                  {isMe ? <span className="ml-1.5 text-xs font-normal text-brand-graphite/50">(você)</span> : null}
                </p>
                <p className="truncate text-xs text-brand-graphite/60">
                  {u.email || "sem e-mail"} · {ROLE_LABELS[u.role]}
                </p>
              </div>
              <div className="flex gap-1.5">
                <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => setEditing(u)}>
                  <Pencil size={14} /> Editar
                </Button>
                {!isMe ? (
                  <Button
                    variant="ghost"
                    className="!px-3 !py-1.5 text-xs"
                    onClick={() => {
                      remove.setError(null);
                      setRemoving(u);
                    }}
                  >
                    <Trash2 size={14} /> Remover
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <NewAccessModal
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={() => {
          setCreating(false);
          router.refresh();
        }}
      />
      <EditAccessModal
        user={editing}
        isMe={editing?.id === currentUserId}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          router.refresh();
        }}
      />
      <Modal open={!!removing} onClose={() => setRemoving(null)} title="Remover acesso">
        {removing ? (
          <div className="space-y-4">
            <p className="text-sm text-brand-graphite">
              <strong className="font-medium">{removing.name}</strong> deixa de entrar no painel na hora, mesmo se estiver com ele aberto.
              Os agendamentos e vendas que já foram lançados continuam.
            </p>
            <FieldError>{remove.error}</FieldError>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRemoving(null)} disabled={remove.busy}>
                Voltar
              </Button>
              <Button
                disabled={remove.busy}
                onClick={async () => {
                  if (await remove.run(() => deletePanelUserAction(removing.id))) {
                    setRemoving(null);
                    router.refresh();
                  }
                }}
              >
                {remove.busy ? "Removendo..." : "Remover acesso"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </Card>
  );
}

function NewAccessModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<PanelRole>("staff");
  const action = useAction();

  useEffect(() => {
    if (!open) return;
    setName("");
    setEmail("");
    setPassword("");
    setRole("staff");
    action.setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Novo acesso ao painel">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await action.run(() => createPanelUserAction({ name, email, password, role }))) onSaved();
        }}
      >
        <div>
          <FieldLabel htmlFor="access-name">Nome</FieldLabel>
          <Input id="access-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" required />
        </div>
        <div>
          <FieldLabel htmlFor="access-email">E-mail de login</FieldLabel>
          <Input id="access-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" required />
        </div>
        <div>
          <FieldLabel htmlFor="access-password">Senha inicial</FieldLabel>
          <Input
            id="access-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
          <p className="mt-1 text-xs text-brand-graphite/50">Pelo menos 8 caracteres. Passe para a pessoa e troque aqui quando ela pedir.</p>
        </div>
        <RolePicker value={role} onChange={setRole} />
        <FieldError>{action.error}</FieldError>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={action.busy}>
            Cancelar
          </Button>
          <Button type="submit" disabled={action.busy}>
            {action.busy ? "Criando..." : "Criar acesso"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EditAccessModal({
  user,
  isMe,
  onClose,
  onSaved,
}: {
  user: PanelUser | null;
  isMe: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<PanelRole>("staff");
  const [password, setPassword] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);
  const action = useAction();
  const passwordAction = useAction();

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setRole(user.role);
    setPassword("");
    setPasswordSaved(false);
    action.setError(null);
    passwordAction.setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <Modal open={!!user} onClose={onClose} title="Editar acesso">
      {user ? (
        <div className="space-y-5">
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await action.run(() => updatePanelUserAction(user.id, { name, role }))) onSaved();
            }}
          >
            <p className="text-sm text-brand-graphite/60">{user.email}</p>
            <div>
              <FieldLabel htmlFor="edit-access-name">Nome</FieldLabel>
              <Input id="edit-access-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <RolePicker value={role} onChange={setRole} disabled={isMe} />
            {isMe ? <p className="text-xs text-brand-graphite/50">O seu próprio nível não muda por aqui.</p> : null}
            <FieldError>{action.error}</FieldError>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={action.busy}>
                Cancelar
              </Button>
              <Button type="submit" disabled={action.busy || (name.trim() === user.name && role === user.role)}>
                {action.busy ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>

          <form
            className="space-y-2 border-t border-brand-beige pt-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await passwordAction.run(() => setPanelUserPasswordAction(user.id, password))) {
                setPassword("");
                setPasswordSaved(true);
              }
            }}
          >
            <FieldLabel htmlFor="edit-access-password">Trocar a senha</FieldLabel>
            <div className="flex flex-wrap gap-2">
              <Input
                id="edit-access-password"
                type="password"
                className="!w-auto min-w-0 flex-1"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordSaved(false);
                }}
                autoComplete="new-password"
                minLength={8}
                placeholder="Nova senha"
              />
              <Button type="submit" variant="secondary" disabled={passwordAction.busy || password.length < 8}>
                <KeyRound size={14} /> {passwordAction.busy ? "Trocando..." : "Trocar"}
              </Button>
            </div>
            <FieldError>{passwordAction.error}</FieldError>
            {passwordSaved ? (
              <p role="status" className="text-sm text-brand-moss">
                Senha trocada.
              </p>
            ) : null}
          </form>
        </div>
      ) : null}
    </Modal>
  );
}

export function ProfessionalsForm({ professionals }: { professionals: Professional[] }) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const add = useAction();

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="mb-1 font-serif text-xl text-brand-forest">Profissionais</h2>
      <p className="mb-5 text-sm text-brand-graphite/60">
        Quem atende e vende. Aparecem ao marcar um horário, na venda e nas comissões. Quem saiu é desativado, não apagado: o
        histórico continua com o nome.
      </p>
      <ul className="space-y-2">
        {professionals.map((p) => (
          <ProfessionalRow key={`${p.id}-${p.name}-${p.isActive}`} professional={p} onSaved={() => router.refresh()} />
        ))}
      </ul>
      <form
        className="mt-4 flex flex-wrap gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await add.run(() => saveProfessionalAction(null, { name: newName, isActive: true }))) {
            setNewName("");
            router.refresh();
          }
        }}
      >
        <Input
          aria-label="Nome do novo profissional"
          placeholder="Nome do novo profissional"
          className="!w-auto min-w-0 flex-1"
          value={newName}
          maxLength={80}
          onChange={(e) => setNewName(e.target.value)}
        />
        <Button type="submit" variant="secondary" disabled={add.busy || newName.trim().length < 2}>
          <Plus size={14} /> Adicionar
        </Button>
      </form>
      <FieldError>{add.error}</FieldError>
    </Card>
  );
}

function ProfessionalRow({ professional, onSaved }: { professional: Professional; onSaved: () => void }) {
  const [name, setName] = useState(professional.name);
  const [active, setActive] = useState(professional.isActive);
  const save = useAction();
  const dirty = name.trim() !== professional.name || active !== professional.isActive;

  return (
    <li className={cn("rounded-xl border border-brand-beige p-2", !active && "bg-brand-cream/60")}>
      <div className="grid items-center gap-2 sm:grid-cols-[1fr_auto_auto]">
        <Input aria-label={`Nome (${professional.name})`} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        <div className="sm:w-36">
          <Switch label={active ? "Ativo" : "Desativado"} checked={active} onChange={setActive} />
        </div>
        <Button
          variant="secondary"
          className="!px-4 !py-2 text-xs"
          disabled={!dirty || save.busy}
          onClick={async () => {
            if (await save.run(() => saveProfessionalAction(professional.id, { name, isActive: active }))) onSaved();
          }}
        >
          {save.busy ? "Salvando..." : "Salvar"}
        </Button>
      </div>
      <FieldError>{save.error}</FieldError>
    </li>
  );
}
