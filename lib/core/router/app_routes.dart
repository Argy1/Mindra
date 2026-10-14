abstract final class AppRoutes {
  // ── Public ────────────────────────────────────────────────────
  static const splash = '/';
  static const onboarding = '/onboarding';

  // ── Auth ──────────────────────────────────────────────────────
  static const login = '/auth/login';
  static const register = '/auth/register';
  static const forgotPassword = '/auth/forgot-password';

  // ── Main shell ────────────────────────────────────────────────
  static const home = '/home';

  // Assessment
  static const assessment = '/home/assessment';
  static const assessmentHistory = '/home/assessment/history';
  static const assessmentPastResult = '/home/assessment/past-result';
  // Navigate to a specific type: context.go('/home/assessment/phq9')
  // Navigate to result:          context.go('/home/assessment/phq9/result')
  // Navigate to history:         context.push(AppRoutes.assessmentHistory)
  // Navigate to past result:     context.push('${AppRoutes.assessmentPastResult}?type=phq9&id=$id')

  // Mood
  static const mood = '/home/mood';
  static const moodHistory = '/home/mood/history';

  // Sleep
  static const sleep = '/home/sleep';
  static const sleepHistory = '/home/sleep/history';

  // Other features
  static const aiChat = '/home/ai-chat';
  static const telemedicine = '/home/telemedicine';
  static const consultationHistory = '/home/telemedicine/history';
  // Psychologist detail:  context.go('/home/telemedicine/$id')
  // Booking:              context.go('/home/telemedicine/$id/booking')
  // Video call:           context.go('/home/telemedicine/consultation/$id')
  static const cbt = '/home/cbt';
  // CBT detail:           context.go('/home/cbt/$type')
  static const voiceJournal = '/home/voice-journal';
  static const voiceJournalList = '/home/voice-journal/list';
  static const reflection = '/home/reflection';
  static const reflectionHistory = '/home/reflection/history';
  static const facilities = '/home/facilities';
  static const crisis = '/home/crisis';
  static const grounding = '/home/crisis/grounding';
  static const breathingExercise = '/home/crisis/breathing';
  static const emergencyContacts = '/home/crisis/contacts';

  // Profile
  static const profile = '/home/profile';
  static const editProfile = '/home/profile/edit';
  static const pdfReport = '/home/profile/report';
  static const satusehatConsent = '/home/profile/satusehat';
  static const notificationSettings = '/home/profile/notifications';

  static const caregiver = '/home/caregiver';
  static const caregiverSetup = '/home/caregiver/setup';
  static const caregiverInvite = '/home/caregiver/invite';
  static const caregiverEducation = '/home/caregiver/education';
  static String caregiverDashboard(String patientId) =>
      '$caregiver/dashboard/$patientId';

  static const weeklyInsight = '/home/weekly-insight';

  static const accessibility = '/home/profile/accessibility';
}
