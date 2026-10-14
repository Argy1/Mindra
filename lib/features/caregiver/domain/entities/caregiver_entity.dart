class CaregiverTip {
  const CaregiverTip({
    required this.id,
    required this.title,
    required this.content,
    required this.category,
    this.readMinutes = 3,
  });

  final String id;
  final String title;
  final String content;
  final String category;
  final int readMinutes;
}

class CaregiverPermissions {
  const CaregiverPermissions({
    this.moodDaily = true,
    this.assessmentResults = false,
    this.appActivity = false,
    this.emergencyAlerts = true,
  });

  final bool moodDaily;
  final bool assessmentResults;
  final bool appActivity;
  final bool emergencyAlerts;

  CaregiverPermissions copyWith({
    bool? moodDaily,
    bool? assessmentResults,
    bool? appActivity,
    bool? emergencyAlerts,
  }) =>
      CaregiverPermissions(
        moodDaily: moodDaily ?? this.moodDaily,
        assessmentResults: assessmentResults ?? this.assessmentResults,
        appActivity: appActivity ?? this.appActivity,
        emergencyAlerts: emergencyAlerts ?? this.emergencyAlerts,
      );

  Map<String, dynamic> toJson() => {
        'mood_daily': moodDaily,
        'assessment_results': assessmentResults,
        'app_activity': appActivity,
        'emergency_alerts': emergencyAlerts,
      };

  factory CaregiverPermissions.fromJson(Map<String, dynamic> j) =>
      CaregiverPermissions(
        moodDaily: j['mood_daily'] as bool? ?? true,
        assessmentResults: j['assessment_results'] as bool? ?? false,
        appActivity: j['app_activity'] as bool? ?? false,
        emergencyAlerts: j['emergency_alerts'] as bool? ?? true,
      );
}

enum RelationshipStatus { pending, active, declined }

class CaregiverRelationship {
  const CaregiverRelationship({
    required this.id,
    required this.patientId,
    required this.inviteCode,
    required this.status,
    required this.permissions,
    required this.createdAt,
    this.caregiverId,
    this.caregiverPhone,
    this.patientName,
    this.caregiverName,
  });

  final String id;
  final String patientId;
  final String? caregiverId;
  final String inviteCode;
  final RelationshipStatus status;
  final CaregiverPermissions permissions;
  final String? caregiverPhone;
  final String? patientName;
  final String? caregiverName;
  final DateTime createdAt;
}

class PatientSummary {
  const PatientSummary({
    required this.patientId,
    required this.patientName,
    required this.weekMoods,
    required this.activityStreak,
    required this.hasAlert,
    required this.permissions,
    this.latestAssessmentCategory,
    this.lastActive,
    this.alertMessage,
  });

  final String patientId;
  final String patientName;
  final List<int?> weekMoods;
  final int activityStreak;
  final bool hasAlert;
  final CaregiverPermissions permissions;
  final String? latestAssessmentCategory;
  final DateTime? lastActive;
  final String? alertMessage;
}
