"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Input, FieldLabel, FieldError } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { adminLoginAction, type AdminLoginState } from "@/lib/actions/admin/auth";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Entrando..." : "Entrar"}
    </Button>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useFormState<AdminLoginState, FormData>(adminLoginAction, {});

  return (
    <form action={formAction} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <div>
        <FieldLabel htmlFor="email">E-mail</FieldLabel>
        <Input id="email" name="email" type="email" autoComplete="username" required />
      </div>
      <div>
        <FieldLabel htmlFor="password">Senha</FieldLabel>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <FieldError>{state?.error}</FieldError>
      <SubmitButton />
    </form>
  );
}
