import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";

export function DataAgentContextLink({
  agent = "general",
  contextType,
  contextId,
  intent,
  label = "交给 Data Agent",
  className,
}: {
  agent?: "general" | "discovery" | "qa" | "development" | "governance" | "operations";
  contextType: string;
  contextId: string;
  intent: string;
  label?: string;
  className?: string;
}) {
  const params = new URLSearchParams({ contextType, contextId, intent });
  return (
    <Link
      to={`/data-agent/${agent}?${params.toString()}`}
      className={cn("inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 text-[11px] font-medium text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-100", className)}
    >
      <Sparkles className="h-3.5 w-3.5" />{label}
    </Link>
  );
}
