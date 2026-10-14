import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './Tabs';

function Example({ onValueChange }: { onValueChange?: (value: string) => void }) {
  return (
    <Tabs defaultValue="7" onValueChange={onValueChange}>
      <TabsList label="Periode">
        <TabsTrigger value="7">7 hari</TabsTrigger>
        <TabsTrigger value="30">30 hari</TabsTrigger>
        <TabsTrigger value="90">90 hari</TabsTrigger>
      </TabsList>
      <TabsContent value="7">Isi tujuh hari</TabsContent>
      <TabsContent value="30">Isi tiga puluh hari</TabsContent>
      <TabsContent value="90">Isi sembilan puluh hari</TabsContent>
    </Tabs>
  );
}

describe('Tabs', () => {
  it('struktur ARIA: tablist bernama, tab, dan tabpanel yang saling terhubung', () => {
    render(<Example />);
    expect(screen.getByRole('tablist', { name: 'Periode' })).toBeInTheDocument();
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);

    const selected = screen.getByRole('tab', { name: '7 hari' });
    expect(selected).toHaveAttribute('aria-selected', 'true');
    const panel = screen.getByRole('tabpanel');
    expect(panel).toHaveAttribute('aria-labelledby', selected.id);
    expect(selected).toHaveAttribute('aria-controls', panel.id);
  });

  it('aria-controls semua tab menunjuk elemen yang ada (juga untuk tab tidak aktif)', () => {
    render(<Example />);
    for (const tab of screen.getAllByRole('tab')) {
      const target = document.getElementById(tab.getAttribute('aria-controls') ?? '');
      expect(target).toBeInTheDocument();
    }
  });

  it('hanya tab aktif yang masuk urutan Tab (roving tabindex)', () => {
    render(<Example />);
    expect(screen.getByRole('tab', { name: '7 hari' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: '30 hari' })).toHaveAttribute('tabindex', '-1');
  });

  it('hanya isi panel aktif yang dirender', () => {
    render(<Example />);
    expect(screen.getByText('Isi tujuh hari')).toBeInTheDocument();
    expect(screen.queryByText('Isi tiga puluh hari')).not.toBeInTheDocument();
  });

  it('klik berpindah tab dan melapor lewat onValueChange', async () => {
    const onValueChange = vi.fn();
    render(<Example onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole('tab', { name: '30 hari' }));
    expect(screen.getByText('Isi tiga puluh hari')).toBeInTheDocument();
    expect(onValueChange).toHaveBeenCalledWith('30');
  });

  it('panah kanan/kiri berpindah tab, berputar di ujung, dan fokus ikut pindah', async () => {
    render(<Example />);
    await userEvent.tab();
    expect(screen.getByRole('tab', { name: '7 hari' })).toHaveFocus();

    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: '30 hari' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: '30 hari' })).toHaveAttribute('aria-selected', 'true');

    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(screen.getByRole('tab', { name: '90 hari' })).toHaveFocus();
  });

  it('Home dan End melompat ke tab pertama dan terakhir', async () => {
    render(<Example />);
    await userEvent.tab();
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('tab', { name: '90 hari' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: '7 hari' })).toHaveAttribute('aria-selected', 'true');
  });

  it('mode terkendali mengikuti prop value', () => {
    const { rerender } = render(
      <Tabs value="a">
        <TabsList label="X">
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">isi a</TabsContent>
        <TabsContent value="b">isi b</TabsContent>
      </Tabs>,
    );
    expect(screen.getByText('isi a')).toBeInTheDocument();
    rerender(
      <Tabs value="b">
        <TabsList label="X">
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">isi a</TabsContent>
        <TabsContent value="b">isi b</TabsContent>
      </Tabs>,
    );
    expect(screen.getByText('isi b')).toBeInTheDocument();
  });
});
