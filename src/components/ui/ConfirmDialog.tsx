import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  destructive, onConfirm, onClose,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>{cancelLabel}</button>
          <button
            className={destructive ? 'btn bg-rose text-white hover:bg-rose/90' : 'btn-primary'}
            onClick={() => { onConfirm(); onClose(); }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-espresso/80 leading-relaxed">{message}</p>
    </Modal>
  );
}
