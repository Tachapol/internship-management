import Image from "next/image";
import { cn } from "../lib/utils";

/** The standalone DevPlus symbol, shared by authentication and navigation. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <Image
      src="/branding/devplus-logo.png"
      alt="DevPlus"
      width={64}
      height={64}
      priority
      className={cn("h-8 w-8 shrink-0 object-contain", className)}
    />
  );
}
