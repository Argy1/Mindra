import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/errors/app_exception.dart';
import '../../domain/entities/crisis_resource_entity.dart';
import '../../domain/entities/emergency_contact_entity.dart';
import '../../domain/repositories/crisis_repository.dart';
import '../models/crisis_resource_model.dart';
import '../models/emergency_contact_model.dart';

class CrisisRepositoryImpl implements CrisisRepository {
  const CrisisRepositoryImpl(this._client);
  final SupabaseClient _client;

  @override
  Future<List<CrisisResource>> getResources() async {
    try {
      final data = await _client.from('crisis_resources').select();
      if (data.isEmpty) return CrisisResourceModel.seeds;
      return data.map(CrisisResourceModel.fromJson).toList();
    } catch (e) {
      debugPrint('Gagal memuat resource krisis dari Supabase: $e');
      return CrisisResourceModel.seeds;
    }
  }

  @override
  Future<List<EmergencyContact>> getEmergencyContacts(String userId) async {
    try {
      final data = await _client
          .from('emergency_contacts')
          .select()
          .eq('user_id', userId)
          .order('is_primary', ascending: false)
          .order('created_at');
      return data.map(EmergencyContactModel.fromJson).toList();
    } catch (e, st) {
      throwAppException('Gagal memuat kontak darurat.', e, st);
    }
  }

  @override
  Future<EmergencyContact> addEmergencyContact({
    required String userId,
    required String name,
    required String phone,
    required ContactRelationship relationship,
    required bool isPrimary,
  }) async {
    // If new contact is primary, unset existing primary first
    if (isPrimary) {
      await _client
          .from('emergency_contacts')
          .update({'is_primary': false}).eq('user_id', userId);
    }
    final data = await _client
        .from('emergency_contacts')
        .insert({
          'user_id': userId,
          'name': name,
          'phone': phone,
          'relationship': relationship.name,
          'is_primary': isPrimary,
        })
        .select()
        .single();
    return EmergencyContactModel.fromJson(data);
  }

  @override
  Future<EmergencyContact> updateEmergencyContact(
      EmergencyContact contact) async {
    if (contact.isPrimary) {
      await _client
          .from('emergency_contacts')
          .update({'is_primary': false})
          .eq('user_id', contact.userId)
          .neq('id', contact.id);
    }
    final data = await _client
        .from('emergency_contacts')
        .update({
          'name': contact.name,
          'phone': contact.phone,
          'relationship': contact.relationship.name,
          'is_primary': contact.isPrimary,
        })
        .eq('id', contact.id)
        .select()
        .single();
    return EmergencyContactModel.fromJson(data);
  }

  @override
  Future<void> deleteEmergencyContact(String id) async {
    await _client.from('emergency_contacts').delete().eq('id', id);
  }
}
