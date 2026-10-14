import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { GROUNDING_STEPS } from '@/lib/domain/support/grounding';
import { GroundingExercise } from './GroundingExercise';

const status = () => screen.getByRole('status');

describe('GroundingExercise', () => {
  it('awal: penjelasan dan tombol mulai; belum ada langkah; status kosong', () => {
    render(<GroundingExercise />);
    expect(screen.getByText(/lewat lima indra/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mulai grounding 5-4-3-2-1' })).toBeEnabled();
    expect(screen.queryByText(/Langkah 1 dari 5/)).not.toBeInTheDocument();
    expect(status()).toHaveTextContent('');
  });

  it('mulai: langkah 1 tampil dan diumumkan lengkap dengan ajakannya; Kembali nonaktif', async () => {
    const user = userEvent.setup();
    render(<GroundingExercise />);
    await user.click(screen.getByRole('button', { name: 'Mulai grounding 5-4-3-2-1' }));
    expect(screen.getAllByText('Langkah 1 dari 5').length).toBeGreaterThan(0);
    expect(screen.getByText('hal yang bisa kamu melihat')).toBeInTheDocument();
    expect(status()).toHaveTextContent(`Langkah 1 dari 5. ${GROUNDING_STEPS[0]?.prompt}`);
    expect(screen.getByRole('button', { name: 'Kembali' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Lanjut' })).toBeEnabled();
  });

  it('Lanjut dan Kembali berpindah satu langkah dan mengumumkannya', async () => {
    const user = userEvent.setup();
    render(<GroundingExercise />);
    await user.click(screen.getByRole('button', { name: /Mulai grounding/ }));
    await user.click(screen.getByRole('button', { name: 'Lanjut' }));
    expect(status()).toHaveTextContent(`Langkah 2 dari 5. ${GROUNDING_STEPS[1]?.prompt}`);
    expect(screen.getByRole('button', { name: 'Kembali' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Kembali' }));
    expect(status()).toHaveTextContent('Langkah 1 dari 5.');
  });

  it('langkah terakhir: tombol berubah menjadi Selesai; menekannya menutup latihan', async () => {
    const user = userEvent.setup();
    render(<GroundingExercise />);
    await user.click(screen.getByRole('button', { name: /Mulai grounding/ }));
    for (let i = 0; i < GROUNDING_STEPS.length - 1; i += 1) {
      await user.click(screen.getByRole('button', { name: 'Lanjut' }));
    }
    expect(status()).toHaveTextContent('Langkah 5 dari 5.');
    expect(screen.queryByRole('button', { name: 'Lanjut' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Selesai' }));
    expect(screen.getAllByText(/Kamu sudah melewati kelima langkah/).length).toBeGreaterThan(0);
    expect(status()).toHaveTextContent('Selesai. Kamu sudah melewati kelima langkah.');
    expect(screen.getByRole('button', { name: 'Ulangi grounding' })).toBeEnabled();
  });

  it('ulangi: kembali ke langkah 1', async () => {
    const user = userEvent.setup();
    render(<GroundingExercise />);
    await user.click(screen.getByRole('button', { name: /Mulai grounding/ }));
    for (let i = 0; i < GROUNDING_STEPS.length; i += 1) {
      await user.click(
        screen.getByRole('button', {
          name: i === GROUNDING_STEPS.length - 1 ? 'Selesai' : 'Lanjut',
        }),
      );
    }
    await user.click(screen.getByRole('button', { name: 'Ulangi grounding' }));
    expect(status()).toHaveTextContent('Langkah 1 dari 5.');
  });

  it('tidak ada kolom isian: tidak ada yang ditulis atau dikirim', async () => {
    const user = userEvent.setup();
    const { container } = render(<GroundingExercise />);
    await user.click(screen.getByRole('button', { name: /Mulai grounding/ }));
    expect(container.querySelector('input, textarea, select, form')).toBeNull();
  });
});
