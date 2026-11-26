"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Trash2, User } from "lucide-react";
import { useApp } from "@/components/Providers";

export function initials(name: string | undefined | null) {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase();
}

/** Round profile avatar: photo when available, otherwise initials, otherwise a neutral person glyph. */
export function Avatar({ name, src, size = 44, className = "", muted = false }: { name?: string | null; src?: string | null; size?: number; className?: string; muted?: boolean }) {
  // remember which URL failed so a new photo URL is tried again automatically
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);
  const text = initials(name);
  const showImg = !!src && src !== brokenSrc;
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-display font-semibold ${muted ? "bg-white text-ink/55" : "bg-gradient-to-br from-brand-300 via-brand-500 to-brand-700 text-white"} ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src!} alt={name ? `${name}'s profile photo` : "Profile photo"} className="h-full w-full object-cover" onError={() => setBrokenSrc(src!)} />
      ) : text ? (
        <span aria-hidden className="leading-none tracking-tight">{text}</span>
      ) : (
        <User aria-hidden size={Math.round(size * 0.5)} />
      )}
    </span>
  );
}

/** Reads an image file, centre-crops it to a square and re-encodes it small enough to store. */
async function toSquareDataUrl(file: File, edge = 320): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("We couldn't read that image"));
      i.src = url;
    });
    const s = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = edge;
    canvas.height = edge;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser can't process images");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, edge, edge);
    return canvas.toDataURL("image/jpeg", 0.86);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Profile-page control to upload, change or remove the profile photo. Persists via /api/profile/avatar. */
export function AvatarEditor({ name, email, avatar, badge }: { name: string; email: string; avatar: string; badge?: React.ReactNode }) {
  const { toast } = useApp();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  // optimistic local value; falls back to the server value once it catches up
  const [local, setSrc] = useState<string | null>(null);
  const src = local ?? avatar;
  const [busy, setBusy] = useState<"" | "upload" | "remove">("");

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) return toast("Please choose an image file", "err");
    if (file.size > 15 * 1024 * 1024) return toast("That photo is over 15 MB", "err");
    setBusy("upload");
    try {
      const image = await toSquareDataUrl(file);
      const r = await fetch("/api/profile/avatar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setSrc(j.avatar);
      toast("Profile photo updated");
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not upload photo", "err");
    } finally {
      setBusy("");
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setBusy("remove");
    try {
      const r = await fetch("/api/profile/avatar", { method: "DELETE" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setSrc("");
      toast("Profile photo removed");
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not remove photo", "err");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="glass-strong anim-up rounded-[32px] p-5">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={!!busy}
          aria-label={src ? "Change profile photo" : "Upload profile photo"}
          className="group relative shrink-0 rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <Avatar name={name} src={src} size={76} className="ring-4 ring-white" />
          <span className="absolute -bottom-0.5 -right-0.5 grid h-8 w-8 place-items-center rounded-full bg-ink text-white ring-[3px] ring-white transition group-hover:scale-105">
            {busy === "upload" ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="font-display truncate text-2xl font-semibold">{name}</h2>
          <p className="truncate text-sm text-ink/55">{email}</p>
          {badge}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => input.current?.click()} disabled={!!busy} className="btn btn-light btn-sm min-w-0 flex-1">
          {busy === "upload" ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
          {src ? "Change photo" : "Upload photo"}
        </button>
        {src && (
          <button type="button" onClick={remove} disabled={!!busy} className="btn btn-light btn-sm min-w-0 flex-1 text-rose-600">
            {busy === "remove" ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            Remove
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
        }}
      />
    </div>
  );
}
