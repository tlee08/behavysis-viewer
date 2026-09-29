import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { useEffect, useRef } from "react";

interface Props {
  opened: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmModal({
  opened,
  title,
  message,
  onCancel,
  onConfirm,
}: Props): React.ReactElement {
  const confirmRef = useRef(onConfirm);
  const cancelRef = useRef(onCancel);
  confirmRef.current = onConfirm;
  cancelRef.current = onCancel;

  useEffect(() => {
    if (!opened) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        confirmRef.current();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelRef.current();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [opened]);

  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      title={title}
      centered
      closeOnEscape={false}
    >
      <Stack gap="md">
        <Text size="sm">{message}</Text>
        <Group justify="flex-end" gap="xs">
          <Button variant="default" size="xs" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="xs" onClick={onConfirm}>
            Continue
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
