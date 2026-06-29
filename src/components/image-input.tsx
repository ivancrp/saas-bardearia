import { useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImagePreview } from "@/components/image-preview";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const BUCKET = "company-assets";
const MAX_SIZE_MB = 5;
// Bucket privado: usamos URL assinada de longa duração (~10 anos).
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10;

type ImageInputProps = {
  label: string;
  value: string;
  onChange: (url: string) => void;
  companyId?: string;
  kind: "logo" | "cover" | "avatar";
  previewClassName?: string;
  fallbackChar?: string;
};

export function ImageInput({
  label,
  value,
  onChange,
  companyId,
  kind,
  previewClassName,
  fallbackChar,
}: ImageInputProps) {
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!companyId) {
      toast.error("Selecione uma empresa antes de enviar imagens.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("O arquivo precisa ser uma imagem.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`A imagem deve ter no máximo ${MAX_SIZE_MB}MB.`);
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${companyId}/${kind}-${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });

    if (error) {
      setUploading(false);
      toast.error(`Falha no upload: ${error.message}`);
      return;
    }

    const { data, error: signError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL);

    setUploading(false);

    if (signError || !data?.signedUrl) {
      toast.error(`Falha ao gerar a URL da imagem: ${signError?.message ?? "tente novamente"}`);
      return;
    }

    onChange(data.signedUrl);
    toast.success("Imagem enviada");
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <div className="flex rounded-lg border border-border p-0.5 text-xs">
          <ModeButton active={mode === "upload"} onClick={() => setMode("upload")}>
            Enviar
          </ModeButton>
          <ModeButton active={mode === "url"} onClick={() => setMode("url")}>
            URL
          </ModeButton>
        </div>
      </div>

      {mode === "url" ? (
        <Input
          placeholder="https://..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="flex-1"
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {uploading ? "Enviando…" : "Escolher arquivo"}
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="icon" onClick={() => onChange("")} title="Remover">
              <X className="size-4" />
            </Button>
          )}
        </div>
      )}

      <ImagePreview src={value} alt={label} fallbackChar={fallbackChar} className={previewClassName} />
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-2.5 py-1 rounded-md font-medium transition-colors",
        active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
