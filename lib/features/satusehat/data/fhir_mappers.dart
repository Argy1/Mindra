import '../../assessment/data/assessment_repository.dart';
import '../../profile/domain/entities/user_profile_entity.dart';
import '../../telemedicine/domain/entities/consultation_entity.dart';

/// Builds FHIR R4 resource payloads from Mindra domain entities.
///
/// All methods are pure — they take entities and return JSON-ready maps.
/// Transport is handled by `SatusehatService`.
abstract final class FhirMappers {
  // FHIR / SATUSEHAT canonical system URIs.
  static const _nikSystem = 'https://fhir.kemkes.go.id/id/nik';
  static const _loincSystem = 'http://loinc.org';
  static const _interpretationSystem =
      'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation';
  static const _actCodeSystem =
      'http://terminology.hl7.org/CodeSystem/v3-ActCode';

  /// Verified LOINC total-score codes per instrument.
  ///
  /// PHQ-9 (44261-6), GAD-7 (70274-6) and PSS-10 (106860-0) are ACTIVE in
  /// LOINC 2.82 (checked 2026-10-15). SRQ-20 has no LOINC total-score code,
  /// so it uses a Mindra-local system; `Observation.code.text` is always set.
  static const _instrumentCoding = {
    'phq9': (
      system: _loincSystem,
      code: '44261-6',
      display: 'Patient Health Questionnaire 9 item (PHQ-9) total score',
    ),
    'gad7': (
      system: _loincSystem,
      code: '70274-6',
      display:
          'Generalized anxiety disorder 7 item (GAD-7) total score',
    ),
    'pss': (
      system: _loincSystem,
      code: '106860-0',
      display: 'Perceived stress scale-10 total score [PSS-10]',
    ),
    'pss10': (
      system: _loincSystem,
      code: '106860-0',
      display: 'Perceived stress scale-10 total score [PSS-10]',
    ),
    'srq20': (
      system: 'https://mindra.app/fhir/instrument',
      code: 'srq20-total',
      display: 'WHO Self-Reporting Questionnaire 20 (SRQ-20) total score',
    ),
    'swls': (
      system: 'https://mindra.app/fhir/instrument',
      code: 'swls-total',
      display: 'Satisfaction With Life Scale (SWLS) total score',
    ),
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Patient
  // ───────────────────────────────────────────────────────────────────────────

  /// Maps a [UserProfileEntity] to a FHIR Patient resource.
  ///
  /// [nik] is the citizen's 16-digit national ID; required by SATUSEHAT.
  static Map<String, dynamic> patientFromProfile(
    UserProfileEntity profile, {
    required String nik,
    String? province,
  }) {
    return {
      'resourceType': 'Patient',
      'identifier': [
        {'system': _nikSystem, 'value': nik},
      ],
      'active': true,
      'name': [
        {'use': 'official', 'text': profile.name},
      ],
      'gender': _fhirGender(profile.gender),
      if (profile.dateOfBirth != null)
        'birthDate': _fhirDate(profile.dateOfBirth!),
      if (profile.city != null && profile.city!.isNotEmpty)
        'address': [
          {
            'use': 'home',
            'city': profile.city,
            if (province != null && province.isNotEmpty) 'state': province,
            'country': 'ID',
          },
        ],
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Observation — assessment result
  // ───────────────────────────────────────────────────────────────────────────

  /// Maps an [AssessmentResult] to a FHIR Observation resource.
  ///
  /// [patientFhirId] is the SATUSEHAT logical id of the Patient resource.
  static Map<String, dynamic> observationFromAssessment(
    AssessmentResult result, {
    required String patientFhirId,
  }) {
    final coding = _instrumentCoding[result.type] ??
        (
          system: 'https://mindra.app/fhir/instrument',
          code: '${result.type}-total',
          display: '${result.type.toUpperCase()} total score',
        );

    return {
      'resourceType': 'Observation',
      'status': 'final',
      'category': [
        {
          'coding': [
            {
              'system':
                  'http://terminology.hl7.org/CodeSystem/observation-category',
              'code': 'survey',
              'display': 'Survey',
            },
          ],
        },
      ],
      'code': {
        'coding': [
          {
            'system': coding.system,
            'code': coding.code,
            'display': coding.display,
          },
        ],
        'text': coding.display,
      },
      'subject': {'reference': 'Patient/$patientFhirId'},
      'effectiveDateTime': result.completedAt.toUtc().toIso8601String(),
      'issued': DateTime.now().toUtc().toIso8601String(),
      'valueInteger': result.totalScore,
      'interpretation': [
        {
          'coding': [
            {
              'system': _interpretationSystem,
              'code': _interpretationCode(result.category),
              'display': _interpretationDisplay(result.category),
            },
          ],
          'text': _categoryLabelId(result.category),
        },
      ],
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Encounter — consultation
  // ───────────────────────────────────────────────────────────────────────────

  /// Maps a [Consultation] to a FHIR Encounter resource.
  static Map<String, dynamic> encounterFromConsultation(
    Consultation consultation, {
    required String patientFhirId,
    String? organizationId,
  }) {
    final end = consultation.scheduledAt
        .add(Duration(minutes: consultation.durationMinutes));

    return {
      'resourceType': 'Encounter',
      'status': _encounterStatus(consultation.status),
      'class': {
        'system': _actCodeSystem,
        'code': 'VR',
        'display': 'virtual',
      },
      'subject': {'reference': 'Patient/$patientFhirId'},
      'period': {
        'start': consultation.scheduledAt.toUtc().toIso8601String(),
        'end': end.toUtc().toIso8601String(),
      },
      if (organizationId != null && organizationId.isNotEmpty)
        'serviceProvider': {
          'reference': 'Organization/$organizationId',
        },
      'reasonCode': [
        {
          'text': 'Konsultasi kesehatan jiwa daring',
        },
      ],
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Helpers
  // ───────────────────────────────────────────────────────────────────────────

  static String _fhirDate(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-'
      '${d.month.toString().padLeft(2, '0')}-'
      '${d.day.toString().padLeft(2, '0')}';

  static String _fhirGender(String? gender) {
    final g = (gender ?? '').toLowerCase().trim();
    return switch (g) {
      'male' || 'laki-laki' || 'laki_laki' || 'pria' || 'l' => 'male',
      'female' || 'perempuan' || 'wanita' || 'p' => 'female',
      'lainnya' => 'other',
      '' => 'unknown',
      _ => 'other',
    };
  }

  static String _encounterStatus(ConsultationStatus status) =>
      switch (status) {
        ConsultationStatus.pending => 'planned',
        ConsultationStatus.confirmed => 'planned',
        ConsultationStatus.ongoing => 'in-progress',
        ConsultationStatus.completed => 'finished',
        ConsultationStatus.cancelled => 'cancelled',
      };

  /// Maps a Mindra severity category to a v3-ObservationInterpretation code.
  static String _interpretationCode(String category) =>
      switch (category.toLowerCase()) {
        'minimal' => 'N', // Normal
        'mild' => 'A', // Abnormal
        'moderate' => 'A',
        'severe' => 'AA', // Critically abnormal
        _ => 'N',
      };

  static String _interpretationDisplay(String category) =>
      switch (category.toLowerCase()) {
        'minimal' => 'Normal',
        'mild' || 'moderate' => 'Abnormal',
        'severe' => 'Critically abnormal',
        _ => 'Normal',
      };

  static String _categoryLabelId(String category) =>
      switch (category.toLowerCase()) {
        'minimal' => 'Minimal',
        'mild' => 'Ringan',
        'moderate' => 'Sedang',
        'severe' => 'Berat',
        _ => category,
      };
}
