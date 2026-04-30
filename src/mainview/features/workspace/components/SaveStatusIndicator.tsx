import { AlertCircle, Check, LoaderCircle } from "lucide-react";
import type { TextSyncStatus } from "@/mainview/features/workspace/hooks/useBlockTextSync";

type SaveStatusIndicatorProps = {
  showIdle?: boolean;
  status: TextSyncStatus;
};

export function SaveStatusIndicator({
  showIdle = false,
  status
}: SaveStatusIndicatorProps) {
  if (status === "idle" && !showIdle) {
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
  if (status === "idle") {
    return {
      icon: <Check className="size-3.5" />,
      label: "변경사항 없음"
    };
  }

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
