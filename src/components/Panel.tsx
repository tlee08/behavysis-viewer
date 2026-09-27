import { Paper, type PaperProps } from "@mantine/core";
import type { ReactNode } from "react";

interface PanelProps extends PaperProps {
  children?: ReactNode;
}

export function Panel({ style, ...props }: PanelProps) {
  return (
    <Paper
      withBorder
      bg="dark.7"
      h="100%"
      radius={0}
      style={{ overflow: "auto", ...style }}
      {...props}
    />
  );
}
