import { AlertCircle, Check, LoaderCircle } from "lucide-react";
import type { TextSyncStatus } from "../hooks/useBlockTextSync";

type SaveStatusIndicatorProps = {
  status: TextSyncStatus;
};

export function SaveStatusIndicator({ status }: SaveStatusIndicatorProps) {
  if (status === "idle") {
    return null;
  }

  const content = getStatusContent(status);

  return (
    <div className="pointer-events-none flex h-7 items-center gap-1.5 rounded-md bg-background/90 px-2 text-xs font-medium text-muted-foreground">
      {content.icon}
      <span>{content.label}</span>
    </div>
  );
}

function getStatusContent(status: TextSyncStatus) {
  if (status === "error") {
    return {
      icon: <AlertCircle className="size-3.5 text-destructive" />,
      label: "저장 실패"
    };
  }

  if (status === "saved") {
    return {
      icon: <Check className="size-3.5" />,
      label: "저장됨"
    };
  }

  return {
    icon: <LoaderCircle className="size-3.5 animate-spin" />,
    label: status === "pending" ? "저장 대기" : "저장 중"
  };
}
