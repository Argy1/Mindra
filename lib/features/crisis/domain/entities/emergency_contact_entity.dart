enum ContactRelationship {
  parent,
  partner,
  sibling,
  family,
  friend,
  therapist,
  other;

  String get label => switch (this) {
        ContactRelationship.parent => 'Orang Tua',
        ContactRelationship.partner => 'Pasangan',
        ContactRelationship.sibling => 'Saudara',
        ContactRelationship.family => 'Keluarga',
        ContactRelationship.friend => 'Teman',
        ContactRelationship.therapist => 'Terapis',
        ContactRelationship.other => 'Lainnya',
      };
}

class EmergencyContact {
  const EmergencyContact({
    required this.id,
    required this.userId,
    required this.name,
    required this.phone,
    required this.relationship,
    required this.isPrimary,
    required this.createdAt,
  });

  final String id;
  final String userId;
  final String name;
  final String phone;
  final ContactRelationship relationship;
  final bool isPrimary;
  final DateTime createdAt;

  EmergencyContact copyWith({
    String? id,
    String? userId,
    String? name,
    String? phone,
    ContactRelationship? relationship,
    bool? isPrimary,
    DateTime? createdAt,
  }) =>
      EmergencyContact(
        id: id ?? this.id,
        userId: userId ?? this.userId,
        name: name ?? this.name,
        phone: phone ?? this.phone,
        relationship: relationship ?? this.relationship,
        isPrimary: isPrimary ?? this.isPrimary,
        createdAt: createdAt ?? this.createdAt,
      );
}
