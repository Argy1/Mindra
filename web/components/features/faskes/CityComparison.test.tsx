import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CityComparison as CityRow } from '@/lib/domain/faskes/dashboard';
import { CityComparison } from './CityComparison';

const cities: CityRow[] = [
  { city: 'Kota Bogor', isOwn: true, hidden: false, avgPhq9: 8.2, weeksShown: 12 },
  { city: 'Kab. Cianjur', isOwn: false, hidden: true, avgPhq9: null, weeksShown: 0 },
];

describe('CityComparison', () => {
  it('menyebut bahwa angkanya rata-rata seluruh periode, bukan angka pekan di kartu', () => {
    render(<CityComparison cities={cities} periodLabel="12 minggu" />);
    expect(screen.getByText(/Rata-rata seluruh 12 minggu terakhir/)).toBeInTheDocument();
    expect(screen.getByText(/bisa berbeda dari kartu di atas/)).toBeInTheDocument();
  });

  it('kota tersembunyi tetap ditulis disembunyikan', () => {
    render(<CityComparison cities={cities} periodLabel="4 minggu" />);
    expect(screen.getByText(/Kab\. Cianjur disembunyikan/)).toBeInTheDocument();
  });
});
