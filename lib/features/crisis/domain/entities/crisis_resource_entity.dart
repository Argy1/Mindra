class CrisisResource {
  const CrisisResource({
    required this.id,
    required this.name,
    required this.phone,
    required this.description,
    required this.isAvailable24h,
    this.whatsapp,
  });

  final String id;
  final String name;
  final String phone;
  final String description;
  final bool isAvailable24h;
  final String? whatsapp;
}
