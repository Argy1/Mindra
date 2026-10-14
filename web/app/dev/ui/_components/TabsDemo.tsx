'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';

/** Tab periode seperti kartu "Minggu ini" di beranda. Coba panah kiri/kanan, Home, End. */
export function TabsDemo() {
  return (
    <Tabs defaultValue="7">
      <TabsList label="Periode">
        <TabsTrigger value="7">7 hari</TabsTrigger>
        <TabsTrigger value="30">30 hari</TabsTrigger>
        <TabsTrigger value="90">90 hari</TabsTrigger>
      </TabsList>
      <TabsContent value="7" className="mt-4 rounded-lg bg-canvas p-4 text-sm">
        Harimu terasa lebih ringan setiap kali kamu tidur lebih dari 7 jam.
      </TabsContent>
      <TabsContent value="30" className="mt-4 rounded-lg bg-canvas p-4 text-sm">
        Dalam 30 hari terakhir, kamu check-in 24 kali. Hari paling berat jatuh di hari Jumat.
      </TabsContent>
      <TabsContent value="90" className="mt-4 rounded-lg bg-canvas p-4 text-sm">
        Tiga bulan terakhir menunjukkan pola yang stabil.
      </TabsContent>
    </Tabs>
  );
}
