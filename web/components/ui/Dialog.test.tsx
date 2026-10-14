import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Dialog } from './Dialog';

describe('Dialog', () => {
  it('tertutup: tidak muncul di pohon aksesibilitas', () => {
    render(<Dialog open={false} onOpenChange={() => {}} title="Cabut izin?" />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('terbuka: role dialog dengan nama dari judul dan deskripsi dari description', () => {
    render(
      <Dialog
        open
        onOpenChange={() => {}}
        title="Cabut izin?"
        description="Tindakan ini berlaku saat itu juga."
      />,
    );
    const dialog = screen.getByRole('dialog', { name: 'Cabut izin?' });
    expect(dialog).toHaveAccessibleDescription('Tindakan ini berlaku saat itu juga.');
  });

  it('menampilkan isi dan footer', () => {
    render(
      <Dialog open onOpenChange={() => {}} title="T" footer={<button>Ya</button>}>
        <p>Isi dialog</p>
      </Dialog>,
    );
    expect(screen.getByText('Isi dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ya' })).toBeInTheDocument();
  });

  it('tombol Tutup memanggil onOpenChange(false)', async () => {
    const onOpenChange = vi.fn();
    render(<Dialog open onOpenChange={onOpenChange} title="T" />);
    await userEvent.click(screen.getByRole('button', { name: 'Tutup' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('terbuka dan tertutup mengikuti prop open', () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Buka</button>
          <Dialog open={open} onOpenChange={setOpen} title="Judul" />
        </>
      );
    }
    render(<Harness />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Buka' }));
    expect(screen.getByRole('dialog', { name: 'Judul' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tutup' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('ESC (event cancel) bisa menutup bila dismissible', () => {
    render(<Dialog open onOpenChange={() => {}} title="T" />);
    const dialog = screen.getByRole('dialog');
    const notPrevented = fireEvent(dialog, new Event('cancel', { cancelable: true }));
    expect(notPrevented).toBe(true);
  });

  it('dismissible={false}: ESC dicegah', () => {
    render(<Dialog open onOpenChange={() => {}} title="T" dismissible={false} />);
    const dialog = screen.getByRole('dialog');
    const notPrevented = fireEvent(dialog, new Event('cancel', { cancelable: true }));
    expect(notPrevented).toBe(false);
  });

  it('klik pada latar (elemen dialog itu sendiri) menutup, klik di dalam isi tidak', () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange} title="T">
        <p>Isi</p>
      </Dialog>,
    );
    fireEvent.click(screen.getByText('Isi'));
    expect(onOpenChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('dialog'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('dismissible={false}: klik latar tidak menutup', () => {
    const onOpenChange = vi.fn();
    render(<Dialog open onOpenChange={onOpenChange} title="T" dismissible={false} />);
    fireEvent.click(screen.getByRole('dialog'));
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('hideCloseButton menyembunyikan tombol Tutup', () => {
    render(<Dialog open onOpenChange={() => {}} title="T" hideCloseButton />);
    expect(screen.queryByRole('button', { name: 'Tutup' })).not.toBeInTheDocument();
  });
});
