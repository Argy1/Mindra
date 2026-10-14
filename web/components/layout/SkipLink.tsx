/** Tautan "Langsung ke konten": muncul saat difokus lewat keyboard. Target: <main id="isi">. */
export function SkipLink() {
  return (
    <a
      href="#isi"
      className="sr-only rounded-pill bg-biru-500 px-4 py-2.5 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-4 focus:z-50"
    >
      Langsung ke konten
    </a>
  );
}
