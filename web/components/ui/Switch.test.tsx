import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Switch } from './Switch';

describe('Switch', () => {
  it('memakai role="switch" dengan nama dari label (orang + jenis data)', () => {
    render(<Switch label="Hasil skrining untuk Rina Sari" />);
    expect(
      screen.getByRole('switch', { name: 'Hasil skrining untuk Rina Sari' }),
    ).toBeInTheDocument();
  });

  it('mati secara bawaan', () => {
    render(<Switch label="A" />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('defaultChecked menyalakannya sejak awal', () => {
    render(<Switch label="A" defaultChecked />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('mode tak terkendali: klik menukar status dan melapor lewat onCheckedChange', async () => {
    const onCheckedChange = vi.fn();
    render(<Switch label="A" defaultChecked={false} onCheckedChange={onCheckedChange} />);
    const toggle = screen.getByRole('switch');

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(onCheckedChange).toHaveBeenLastCalledWith(true);

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(onCheckedChange).toHaveBeenLastCalledWith(false);
  });

  it('mode terkendali: status mengikuti prop, bukan klik', async () => {
    const onCheckedChange = vi.fn();
    render(<Switch label="A" checked={false} onCheckedChange={onCheckedChange} />);
    const toggle = screen.getByRole('switch');
    await userEvent.click(toggle);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('bisa dioperasikan dengan keyboard (Spasi dan Enter)', async () => {
    function Harness() {
      const [on, setOn] = useState(false);
      return <Switch label="A" checked={on} onCheckedChange={setOn} />;
    }
    render(<Harness />);
    const toggle = screen.getByRole('switch');
    await userEvent.tab();
    expect(toggle).toHaveFocus();
    await userEvent.keyboard(' ');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    await userEvent.keyboard('{Enter}');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('nonaktif: tidak bisa diubah', async () => {
    const onCheckedChange = vi.fn();
    render(<Switch label="A" disabled onCheckedChange={onCheckedChange} />);
    await userEvent.click(screen.getByRole('switch'));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
