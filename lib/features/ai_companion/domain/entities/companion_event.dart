/// Peristiwa dari `POST /api/v1/companion/chat` di Mindra Web (Server-Sent Events).
///
/// Server memegang seluruh alur Teman cerita: deteksi krisis berbasis aturan SEBELUM model, balasan tetap saat
/// krisis, penyimpanan percakapan, dan peringatan krisis untuk psikolog atau pendamping yang berizin. Aplikasi
/// hanya menampilkan peristiwa di bawah ini. Kontrak lengkap: `web/docs/ARCHITECTURE.md` bagian 7 dan
/// `/api/v1/openapi.json`.
sealed class CompanionEvent {
  const CompanionEvent();
}

/// Id percakapan (baru atau lanjutan); kirim kembali di pesan berikutnya.
final class CompanionMeta extends CompanionEvent {
  const CompanionMeta(this.conversationId);
  final String conversationId;
}

/// Potongan teks balasan; ditempelkan berurutan.
final class CompanionDelta extends CompanionEvent {
  const CompanionDelta(this.text);
  final String text;
}

/// Pesan mengandung tanda krisis: [message] adalah balasan tetap dari server (model tidak dipanggil).
final class CompanionCrisis extends CompanionEvent {
  const CompanionCrisis({
    required this.message,
    this.resourceName,
    this.displayNumber,
    this.telHref,
  });

  final String message;
  final String? resourceName;
  final String? displayNumber;
  final String? telHref;
}

/// Akhir giliran. [saved] false berarti percakapan belum tersimpan di server.
final class CompanionDone extends CompanionEvent {
  const CompanionDone({required this.conversationId, required this.saved});
  final String conversationId;
  final bool saved;
}

/// Galat dari server di tengah aliran (kode tetap, pesan Indonesia tanpa isi percakapan).
final class CompanionStreamError extends CompanionEvent {
  const CompanionStreamError({required this.code, required this.message});
  final String code;
  final String message;
}
