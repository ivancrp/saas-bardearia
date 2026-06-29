import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

type ImagePreviewProps = {
  src: string;
  alt: string;
  className?: string;
  fallbackChar?: string;
};

type Status = "empty" | "loading" | "ok" | "error";

export function ImagePreview({ src, alt, className, fallbackChar }: ImagePreviewProps) {
  const [status, setStatus] = useState<Status>(src ? "loading" : "empty");

  useEffect(() => {
    setStatus(src ? "loading" : "empty");
  }, [src]);

  const base = cn(
    "relative overflow-hidden border border-border bg-muted/40 flex items-center justify-center text-muted-foreground",
    className,
  );

  if (status === "empty") {
    return (
      <div className={base}>
        {fallbackChar ? (
          <span className="text-2xl font-black text-muted-foreground/60">{fallbackChar}</span>
        ) : (
          <span className="text-xs">Sem imagem</span>
        )}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={cn(base, "border-destructive/40 bg-destructive/5 text-destructive")}>
        <div className="flex flex-col items-center gap-1 px-2 text-center">
          <ImageOff className="size-5" />
          <span className="text-[10px] leading-tight">URL inválida</span>
        </div>
      </div>
    );
  }

  return (
    <div className={base}>
      {status === "loading" && <span className="absolute text-[10px]">Carregando…</span>}
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover"
        onLoad={() => setStatus("ok")}
        onError={() => setStatus("error")}
      />
    </div>
  );
}
