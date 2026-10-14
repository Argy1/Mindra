import '../../domain/entities/emergency_contact_entity.dart';

class EmergencyContactModel extends EmergencyContact {
  const EmergencyContactModel({
    required super.id,
    required super.userId,
    required super.name,
    required super.phone,
    required super.relationship,
    required super.isPrimary,
    required super.createdAt,
  });

  factory EmergencyContactModel.fromJson(Map<String, dynamic> j) =>
      EmergencyContactModel(
        id: j['id'] as String,
        userId: j['user_id'] as String,
        name: j['name'] as String,
        phone: j['phone'] as String,
        relationship: ContactRelationship.values.firstWhere(
          (e) => e.name == j['relationship'],
          orElse: () => ContactRelationship.other,
        ),
        isPrimary: j['is_primary'] as bool? ?? false,
        createdAt: DateTime.parse(j['created_at'] as String),
      );

  Map<String, dynamic> toInsertJson() => {
        'user_id': userId,
        'name': name,
        'phone': phone,
        'relationship': relationship.name,
        'is_primary': isPrimary,
      };

  Map<String, dynamic> toUpdateJson() => {
        'name': name,
        'phone': phone,
        'relationship': relationship.name,
        'is_primary': isPrimary,
      };
}
