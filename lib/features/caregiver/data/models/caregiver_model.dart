import '../../domain/entities/caregiver_entity.dart';

class CaregiverTipModel extends CaregiverTip {
  const CaregiverTipModel({
    required super.id,
    required super.title,
    required super.content,
    required super.category,
    super.readMinutes,
  });

  factory CaregiverTipModel.fromJson(Map<String, dynamic> j) =>
      CaregiverTipModel(
        id: j['id'] as String,
        title: j['title'] as String,
        content: j['content'] as String,
        category: j['category'] as String,
        readMinutes: j['read_minutes'] as int? ?? 3,
      );

  static const List<CaregiverTipModel> seeds = [
    CaregiverTipModel(
      id: 'art1',
      title: 'Cara mendampingi orang dengan depresi',
      content:
          'Mendampingi seseorang dengan depresi bisa terasa membebani, namun kehadiranmu sangat berarti. Dengarkan tanpa menghakimi, jangan paksakan solusi, dan validasi perasaan mereka. Ingat bahwa depresi bukan kelemahan karakter — ini kondisi medis yang butuh waktu dan dukungan profesional.\n\nLangkah praktis:\n• Tanyakan "Apa yang kamu butuhkan sekarang?" daripada memberi saran\n• Bantu dengan hal-hal kecil konkret (ambilkan makan, temani ke dokter)\n• Konsisten hadir meski mereka menolak — keberadaanmu tetap terasa\n• Jangan bilang "kamu punya banyak yang disyukuri" — ini meremehkan rasa sakitnya',
      category: 'supporting',
      readMinutes: 5,
    ),
    CaregiverTipModel(
      id: 'art2',
      title: 'Hal yang sebaiknya tidak dikatakan',
      content:
          'Niat baik kadang tersampaikan dengan cara yang menyakitkan. Hindari kalimat-kalimat ini saat berbicara dengan orang yang berjuang dengan kesehatan mental:\n\n❌ "Kamu harus bersyukur, masih banyak yang lebih susah"\n❌ "Sudahlah, move on saja"\n❌ "Kamu terlalu lebay/sensitif"\n❌ "Coba lebih rajin ibadah"\n❌ "Kamu yang bikin diri sendiri sedih"\n\nGunakan sebaliknya:\n✓ "Aku di sini bersamamu"\n✓ "Boleh aku tahu lebih banyak tentang yang kamu rasakan?"\n✓ "Perasaanmu valid. Kamu tidak harus merasakan ini sendirian"',
      category: 'communication',
      readMinutes: 4,
    ),
    CaregiverTipModel(
      id: 'art3',
      title: 'Kapan harus mencari bantuan profesional',
      content:
          'Sebagai pendamping, kenali tanda bahaya yang membutuhkan intervensi segera:\n\n🔴 Tanda darurat (hubungi 119 ext 8 atau bawa ke IGD):\n• Berbicara tentang ingin mengakhiri hidup\n• Menyakiti diri sendiri\n• Menghilang dari kontak selama berhari-hari\n• Psikosis (melihat/mendengar hal yang tidak ada)\n\n🟡 Segera cari psikolog/psikiater jika:\n• Gejala berlangsung lebih dari 2 minggu\n• Tidak bisa menjalani aktivitas sehari-hari\n• Menolak makan atau merawat diri\n• Menggunakan alkohol/zat sebagai pelarian',
      category: 'crisis',
      readMinutes: 5,
    ),
    CaregiverTipModel(
      id: 'art4',
      title: 'Merawat dirimu sebagai pendamping',
      content:
          'Kamu tidak bisa menuangkan dari cangkir yang kosong. Kelelahan pengasuh (caregiver fatigue) nyata dan bisa berdampak serius pada kesehatanmu sendiri.\n\nTanda-tanda kelelahan pengasuh:\n• Merasa selalu lelah meski sudah cukup tidur\n• Mudah marah atau menangis tanpa alasan jelas\n• Menarik diri dari hubungan sosialmu sendiri\n• Merasa bersalah saat meluangkan waktu untuk dirimu\n\nStrategi pemulihan:\n• Jadwalkan "waktu untukku" minimal 30 menit sehari\n• Bergabung dengan kelompok dukungan pendamping\n• Bicarakan bebanmu dengan orang yang kamu percaya\n• Pertimbangkan sesi konseling untuk dirimu sendiri',
      category: 'self_care',
      readMinutes: 5,
    ),
  ];
}

class CaregiverRelationshipModel extends CaregiverRelationship {
  const CaregiverRelationshipModel({
    required super.id,
    required super.patientId,
    required super.inviteCode,
    required super.status,
    required super.permissions,
    required super.createdAt,
    super.caregiverId,
    super.caregiverPhone,
    super.patientName,
    super.caregiverName,
  });

  factory CaregiverRelationshipModel.fromJson(Map<String, dynamic> j) {
    final statusStr = j['status'] as String? ?? 'pending';
    final status = switch (statusStr) {
      'active' => RelationshipStatus.active,
      'declined' => RelationshipStatus.declined,
      _ => RelationshipStatus.pending,
    };
    final permsRaw = j['permissions'];
    final permissions = permsRaw is Map<String, dynamic>
        ? CaregiverPermissions.fromJson(permsRaw)
        : const CaregiverPermissions();

    return CaregiverRelationshipModel(
      id: j['id'] as String,
      patientId: j['patient_id'] as String,
      caregiverId: j['caregiver_id'] as String?,
      inviteCode: j['invite_code'] as String,
      status: status,
      permissions: permissions,
      caregiverPhone: j['caregiver_phone'] as String?,
      patientName: (j['patient_profile'] as Map?)?['name'] as String?,
      caregiverName: (j['caregiver_profile'] as Map?)?['name'] as String?,
      createdAt: DateTime.parse(j['created_at'] as String),
    );
  }
}
