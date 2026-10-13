import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Settings } from "@/types";
import { isSafeAnnouncementLink } from "@/lib/booking/validators";
import { todayDateStr } from "@/lib/utils/date-format";

/**
 * Recado de temporada editado em /admin/configuracoes. Fica fora do header sticky:
 * aparece no topo e sai de cena com a rolagem, sem roubar altura do menu.
 */
export function AnnouncementBar({ settings }: { settings: Settings }) {
  const text = settings.announcementText.trim();
  if (!text) return null;
  if (settings.announcementUntil && settings.announcementUntil < todayDateStr()) return null;

  const link = isSafeAnnouncementLink(settings.announcementLink) ? settings.announcementLink : "";
  const external = link.startsWith("https://");
  const content = (
    <>
      <span>{text}</span>
      {link ? <ArrowRight size={15} aria-hidden="true" className="shrink-0 transition-transform group-hover:translate-x-1" /> : null}
    </>
  );
  const className =
    "container-herbert group flex items-center justify-center gap-2 py-2 text-center text-sm font-medium text-brand-graphite";

  return (
    <div className="relative z-50 bg-brand-forest">
      {link ? (
        <Link
          href={link}
          className={className}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {content}
        </Link>
      ) : (
        <p className={className}>{content}</p>
      )}
    </div>
  );
}
