import { useState } from "react";
import { Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import type { BrandTheme, PublicService } from "./types";

type BookingAuthDialogProps = {
  open: boolean;
  companyName: string;
  service: PublicService;
  theme: BrandTheme;
  onClose: () => void;
};

export function BookingAuthDialog({ open, companyName, service, theme, onClose }: BookingAuthDialogProps) {
  const [loading, setLoading] = useState(false);

  async function signInGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.href,
    });
    if (result.error) {
      toast.error("Não foi possível entrar com o Google");
      setLoading(false);
    }
  }

  async function signIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(fd.get("email") || "").trim(),
      password: String(fd.get("password") || ""),
    });
    setLoading(false);
    if (error) toast.error(error.message);
  }

  async function signUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: String(fd.get("email") || "").trim(),
      password: String(fd.get("password") || ""),
      options: {
        emailRedirectTo: window.location.href,
        data: {
          full_name: String(fd.get("full_name") || "").trim(),
          phone: String(fd.get("phone") || "").trim(),
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Conta criada! Pronto para agendar.");
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:rounded-3xl">
        <div className="p-6 text-white" style={{ background: theme.gradient }}>
          <DialogHeader className="text-left space-y-2">
            <div className="size-11 rounded-2xl bg-white/20 flex items-center justify-center mb-1">
              <Calendar className="size-5" />
            </div>
            <DialogTitle className="text-white text-lg">Entre para continuar</DialogTitle>
            <DialogDescription className="text-white/85 text-sm">
              Confirme <strong className="text-white">{service.name}</strong> em {companyName}.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-5">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={signInGoogle}
            className="w-full h-11 font-medium"
          >
            <GoogleIcon />
            Continuar com Google
          </Button>

          <div className="flex items-center gap-3 my-4 text-xs text-muted-foreground">
            <span className="flex-1 h-px bg-border" />
            ou com e-mail
            <span className="flex-1 h-px bg-border" />
          </div>

          <Tabs defaultValue="signup">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
              <TabsTrigger value="signin">Entrar</TabsTrigger>
            </TabsList>

            <TabsContent value="signup" className="mt-4">
              <form onSubmit={signUp} className="grid gap-3">
                <AuthField name="full_name" label="Nome completo" required />
                <AuthField name="phone" label="Telefone (WhatsApp)" />
                <AuthField name="email" label="E-mail" type="email" required />
                <AuthField name="password" label="Senha" type="password" required />
                <Button
                  type="submit"
                  disabled={loading}
                  className="mt-1 text-white"
                  style={{ background: theme.gradient }}
                >
                  {loading && <Loader2 className="animate-spin" />}
                  Criar conta e continuar
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signin" className="mt-4">
              <form onSubmit={signIn} className="grid gap-3">
                <AuthField name="email" label="E-mail" type="email" required />
                <AuthField name="password" label="Senha" type="password" required />
                <Button
                  type="submit"
                  disabled={loading}
                  className="mt-1 text-white"
                  style={{ background: theme.gradient }}
                >
                  {loading && <Loader2 className="animate-spin" />}
                  Entrar
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AuthField({
  name,
  label,
  type = "text",
  required,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name} className="text-xs font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Input id={name} name={name} type={type} required={required} className="h-11" />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
