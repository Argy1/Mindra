import '../router/app_routes.dart';

/// Backward-compatible route constants.
///
/// New code should import `AppRoutes` directly from `core/router/app_routes.dart`.
@Deprecated('Use AppRoutes from core/router/app_routes.dart instead.')
abstract final class RoutePaths {
  static const splash = AppRoutes.splash;
  static const onboarding = AppRoutes.onboarding;
  static const login = AppRoutes.login;
  static const register = AppRoutes.register;
  static const home = AppRoutes.home;

  // Assessment
  static const assessment = AppRoutes.assessment;
  static const assessmentDetail = '/home/assessment/:id';

  // Mood tracker
  static const moodTracker = AppRoutes.mood;
  static const moodHistory = AppRoutes.moodHistory;

  // Sleep tracker
  static const sleepTracker = AppRoutes.sleep;
  static const sleepHistory = AppRoutes.sleepHistory;

  // AI companion
  static const aiCompanion = AppRoutes.aiChat;

  // Telemedicine
  static const telemedicine = AppRoutes.telemedicine;
  static const telemedicineSession = '/home/telemedicine/consultation/:roomId';

  // CBT exercises
  static const cbtExercises = AppRoutes.cbt;
  static const cbtDetail = '/home/cbt/:id';

  // Voice journal
  static const voiceJournal = AppRoutes.voiceJournal;

  // Night reflection
  static const nightReflection = AppRoutes.reflection;

  // Crisis
  static const crisis = AppRoutes.crisis;

  // Caregiver
  static const caregiver = AppRoutes.caregiver;

  // Facilities map
  static const facilitiesMap = AppRoutes.facilities;

  // PDF report
  static const pdfReport = AppRoutes.pdfReport;

  // Profile
  static const profile = AppRoutes.profile;
  static const profileEdit = AppRoutes.editProfile;
  static const profileSettings = AppRoutes.notificationSettings;

  // Breath exercise
  static const breath = AppRoutes.breathingExercise;

  // Library placeholder from the old route table.
  static const library = AppRoutes.home;
}
