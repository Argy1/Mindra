import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app_routes.dart';
import '../../features/splash/presentation/screens/splash_screen.dart';
import '../../features/onboarding/presentation/screens/onboarding_screen.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/register_screen.dart';
import '../../features/auth/presentation/screens/forgot_password_screen.dart';
import '../../features/home/presentation/screens/home_screen.dart';
import '../../features/assessment/presentation/screens/assessment_screen.dart';
import '../../features/assessment/presentation/screens/assessment_detail_screen.dart';
import '../../features/assessment/presentation/screens/assessment_result_screen.dart';
import '../../features/assessment/presentation/screens/assessment_history_screen.dart';
import '../../features/assessment/presentation/screens/assessment_past_result_screen.dart';
import '../../features/mood_tracker/presentation/screens/mood_tracker_screen.dart';
import '../../features/mood_tracker/presentation/screens/mood_history_screen.dart';
import '../../features/sleep_tracker/presentation/screens/sleep_history_screen.dart';
import '../../features/sleep_tracker/presentation/screens/sleep_tracker_screen.dart';
import '../../features/ai_companion/presentation/screens/ai_companion_screen.dart';
import '../../features/telemedicine/presentation/screens/telemedicine_screen.dart';
import '../../features/telemedicine/presentation/screens/psychologist_detail_screen.dart';
import '../../features/telemedicine/presentation/screens/booking_screen.dart';
import '../../features/telemedicine/presentation/screens/video_call_screen.dart';
import '../../features/telemedicine/presentation/screens/consultation_history_screen.dart';
import '../../features/cbt_exercise/presentation/screens/cbt_exercise_screen.dart';
import '../../features/cbt_exercise/presentation/screens/cbt_exercise_detail_screen.dart';
import '../../features/voice_journal/presentation/screens/voice_journal_screen.dart';
import '../../features/voice_journal/presentation/screens/voice_journal_list_screen.dart';
import '../../features/night_reflection/presentation/screens/night_reflection_screen.dart';
import '../../features/night_reflection/presentation/screens/reflection_history_screen.dart';
import '../../features/facilities_map/presentation/screens/facilities_map_screen.dart';
import '../../features/crisis/presentation/screens/crisis_screen.dart';
import '../../features/crisis/presentation/screens/grounding_screen.dart';
import '../../features/crisis/presentation/screens/breathing_exercise_screen.dart';
import '../../features/crisis/presentation/screens/emergency_contacts_screen.dart';
import '../../features/profile/presentation/screens/profile_screen.dart';
import '../../features/profile/presentation/screens/edit_profile_screen.dart';
import '../../features/satusehat/presentation/screens/satusehat_consent_screen.dart';
import '../../features/notifications/presentation/screens/notification_settings_screen.dart';
import '../../features/pdf_report/presentation/screens/pdf_report_screen.dart';
import '../../features/caregiver/presentation/screens/caregiver_screen.dart';
import '../../features/caregiver/presentation/screens/caregiver_setup_screen.dart';
import '../../features/caregiver/presentation/screens/caregiver_invite_screen.dart';
import '../../features/caregiver/presentation/screens/caregiver_education_screen.dart';
import '../../features/caregiver/presentation/screens/caregiver_dashboard_screen.dart';
import '../../features/caregiver/domain/entities/caregiver_entity.dart';
import '../../features/home/presentation/screens/weekly_insight_screen.dart';
import '../../features/profile/presentation/screens/accessibility_settings_screen.dart';

part 'app_router.g.dart';

// Wraps a Stream as a ChangeNotifier so GoRouter can refresh on auth changes.
class _RefreshStream extends ChangeNotifier {
  _RefreshStream(Stream<dynamic> stream) {
    _sub = stream.listen((_) => notifyListeners());
  }
  late final StreamSubscription<dynamic> _sub;

  @override
  void dispose() {
    _sub.cancel();
    super.dispose();
  }
}

String? _redirect(BuildContext context, GoRouterState state) {
  final isSignedIn = Supabase.instance.client.auth.currentSession != null;
  final loc = state.matchedLocation;

  final isPublic = loc == AppRoutes.splash ||
      loc == AppRoutes.onboarding ||
      loc.startsWith('/auth');

  if (!isSignedIn && !isPublic) return AppRoutes.login;
  if (isSignedIn && loc.startsWith('/auth')) return AppRoutes.home;
  return null;
}

String _withQuery(String location, GoRouterState state) {
  final query = state.uri.query;
  return query.isEmpty ? location : '$location?$query';
}

String _pathParam(GoRouterState state, String key) =>
    Uri.encodeComponent(state.pathParameters[key] ?? '');

GoRoute _legacyRedirect(String path, String location) {
  return GoRoute(
    path: path,
    redirect: (_, state) => _withQuery(location, state),
  );
}

GoRoute _legacyParamRedirect(
  String path,
  String Function(GoRouterState state) location,
) {
  return GoRoute(
    path: path,
    redirect: (_, state) => _withQuery(location(state), state),
  );
}

List<RouteBase> _legacyRoutes() => [
      _legacyRedirect('/login', AppRoutes.login),
      _legacyRedirect('/register', AppRoutes.register),
      _legacyRedirect('/forgot-password', AppRoutes.forgotPassword),
      _legacyRedirect('/assessment/history', AppRoutes.assessmentHistory),
      _legacyRedirect(
          '/assessment/past-result', AppRoutes.assessmentPastResult),
      _legacyParamRedirect(
        '/assessment/:type/result',
        (state) =>
            '${AppRoutes.assessment}/${_pathParam(state, 'type')}/result',
      ),
      _legacyParamRedirect(
        '/assessment/:type',
        (state) => '${AppRoutes.assessment}/${_pathParam(state, 'type')}',
      ),
      _legacyRedirect('/assessment', AppRoutes.assessment),
      _legacyRedirect('/mood/history', AppRoutes.moodHistory),
      _legacyRedirect('/mood', AppRoutes.mood),
      _legacyRedirect('/sleep/history', AppRoutes.sleepHistory),
      _legacyRedirect('/sleep', AppRoutes.sleep),
      _legacyRedirect('/companion', AppRoutes.aiChat),
      _legacyRedirect('/ai-chat', AppRoutes.aiChat),
      _legacyRedirect('/telemedicine/history', AppRoutes.consultationHistory),
      _legacyParamRedirect(
        '/telemedicine/consultation/:id',
        (state) =>
            '${AppRoutes.telemedicine}/consultation/${_pathParam(state, 'id')}',
      ),
      _legacyParamRedirect(
        '/telemedicine/session/:roomId',
        (state) =>
            '${AppRoutes.telemedicine}/consultation/${_pathParam(state, 'roomId')}',
      ),
      _legacyParamRedirect(
        '/telemedicine/:id/booking',
        (state) =>
            '${AppRoutes.telemedicine}/${_pathParam(state, 'id')}/booking',
      ),
      _legacyParamRedirect(
        '/telemedicine/:id',
        (state) => '${AppRoutes.telemedicine}/${_pathParam(state, 'id')}',
      ),
      _legacyRedirect('/telemedicine', AppRoutes.telemedicine),
      _legacyParamRedirect(
        '/cbt/:type',
        (state) => '${AppRoutes.cbt}/${_pathParam(state, 'type')}',
      ),
      _legacyRedirect('/cbt', AppRoutes.cbt),
      _legacyRedirect('/journal/list', AppRoutes.voiceJournalList),
      _legacyRedirect('/journal', AppRoutes.voiceJournal),
      _legacyRedirect('/voice-journal/list', AppRoutes.voiceJournalList),
      _legacyRedirect('/voice-journal', AppRoutes.voiceJournal),
      _legacyRedirect('/reflect/history', AppRoutes.reflectionHistory),
      _legacyRedirect('/reflect', AppRoutes.reflection),
      _legacyRedirect('/reflection/history', AppRoutes.reflectionHistory),
      _legacyRedirect('/reflection', AppRoutes.reflection),
      _legacyRedirect('/crisis/grounding', AppRoutes.grounding),
      _legacyRedirect('/crisis/breathing', AppRoutes.breathingExercise),
      _legacyRedirect('/crisis/contacts', AppRoutes.emergencyContacts),
      _legacyRedirect('/crisis', AppRoutes.crisis),
      _legacyRedirect('/breath', AppRoutes.breathingExercise),
      _legacyRedirect('/facilities', AppRoutes.facilities),
      _legacyRedirect('/report', AppRoutes.pdfReport),
      _legacyRedirect('/profile/edit', AppRoutes.editProfile),
      _legacyRedirect('/profile/settings', AppRoutes.notificationSettings),
      _legacyRedirect('/profile', AppRoutes.profile),
      _legacyRedirect('/caregiver/setup', AppRoutes.caregiverSetup),
      _legacyRedirect('/caregiver/invite', AppRoutes.caregiverInvite),
      _legacyRedirect('/caregiver/education', AppRoutes.caregiverEducation),
      _legacyParamRedirect(
        '/caregiver/dashboard/:patientId',
        (state) => AppRoutes.caregiverDashboard(
          _pathParam(state, 'patientId'),
        ),
      ),
      _legacyRedirect('/caregiver', AppRoutes.caregiver),
    ];

@riverpod
GoRouter appRouter(Ref ref) {
  final refresh = _RefreshStream(
    Supabase.instance.client.auth.onAuthStateChange,
  );
  ref.onDispose(refresh.dispose);

  return GoRouter(
    initialLocation: AppRoutes.splash,
    debugLogDiagnostics: false,
    refreshListenable: refresh,
    redirect: _redirect,
    routes: [
      // ── Splash ──────────────────────────────────────────────
      GoRoute(
        path: AppRoutes.splash,
        builder: (_, __) => const SplashScreen(),
      ),

      // ── Onboarding ──────────────────────────────────────────
      GoRoute(
        path: AppRoutes.onboarding,
        builder: (_, __) => const OnboardingScreen(),
      ),

      // ── Auth ────────────────────────────────────────────────
      GoRoute(
        path: '/auth',
        redirect: (_, __) => AppRoutes.login,
      ),
      GoRoute(
        path: AppRoutes.login,
        builder: (_, __) => const LoginScreen(),
      ),
      GoRoute(
        path: AppRoutes.register,
        builder: (_, __) => const RegisterScreen(),
      ),
      GoRoute(
        path: AppRoutes.forgotPassword,
        builder: (_, __) => const ForgotPasswordScreen(),
      ),

      ..._legacyRoutes(),

      // ── Home + nested feature routes ─────────────────────────
      GoRoute(
        path: AppRoutes.home,
        builder: (_, __) => const HomeScreen(),
        routes: [
          // Assessment
          GoRoute(
            path: 'assessment',
            builder: (_, __) => const AssessmentScreen(),
            routes: [
              // Literal routes before param routes to avoid collision
              GoRoute(
                path: 'history',
                builder: (_, __) => const AssessmentHistoryScreen(),
              ),
              GoRoute(
                path: 'past-result',
                builder: (_, state) => AssessmentPastResultScreen(
                  type: state.uri.queryParameters['type'] ?? 'phq9',
                  resultId: state.uri.queryParameters['id'] ?? '',
                ),
              ),
              GoRoute(
                path: ':type',
                builder: (_, state) => AssessmentDetailScreen(
                  id: state.pathParameters['type']!,
                ),
                routes: [
                  GoRoute(
                    path: 'result',
                    builder: (_, state) => AssessmentResultScreen(
                      type: state.pathParameters['type']!,
                    ),
                  ),
                ],
              ),
            ],
          ),

          // Mood
          GoRoute(
            path: 'mood',
            builder: (_, __) => const MoodTrackerScreen(),
            routes: [
              GoRoute(
                path: 'history',
                builder: (_, __) => const MoodHistoryScreen(),
              ),
            ],
          ),

          // Sleep
          GoRoute(
            path: 'sleep',
            builder: (_, __) => const SleepTrackerScreen(),
            routes: [
              GoRoute(
                path: 'history',
                builder: (_, __) => const SleepHistoryScreen(),
              ),
            ],
          ),

          // AI Chat
          GoRoute(
            path: 'ai-chat',
            builder: (_, __) => const AiCompanionScreen(),
          ),

          // Telemedicine
          GoRoute(
            path: 'telemedicine',
            builder: (_, __) => const TelemedicineScreen(),
            routes: [
              // Literal routes before param route to avoid collision
              GoRoute(
                path: 'history',
                builder: (_, __) => const ConsultationHistoryScreen(),
              ),
              GoRoute(
                path: 'consultation/:id',
                builder: (_, state) => VideoCallScreen(
                  consultationId: state.pathParameters['id']!,
                ),
              ),
              GoRoute(
                path: ':id',
                builder: (_, state) => PsychologistDetailScreen(
                  id: state.pathParameters['id']!,
                ),
                routes: [
                  GoRoute(
                    path: 'booking',
                    builder: (_, state) => BookingScreen(
                      psychologistId: state.pathParameters['id']!,
                    ),
                  ),
                ],
              ),
            ],
          ),

          // CBT
          GoRoute(
            path: 'cbt',
            builder: (_, __) => const CbtExerciseScreen(),
            routes: [
              GoRoute(
                path: ':type',
                builder: (_, state) => CbtExerciseDetailScreen(
                  type: state.pathParameters['type']!,
                ),
              ),
            ],
          ),

          // Voice Journal
          GoRoute(
            path: 'voice-journal',
            builder: (_, __) => const VoiceJournalScreen(),
            routes: [
              GoRoute(
                path: 'list',
                builder: (_, __) => const VoiceJournalListScreen(),
              ),
            ],
          ),

          // Night Reflection
          GoRoute(
            path: 'reflection',
            builder: (_, __) => const NightReflectionScreen(),
            routes: [
              GoRoute(
                path: 'history',
                builder: (_, __) => const ReflectionHistoryScreen(),
              ),
            ],
          ),

          // Facilities Map
          GoRoute(
            path: 'facilities',
            builder: (_, state) => FacilitiesMapScreen(
              isCrisisMode: state.uri.queryParameters['crisis'] == 'true',
            ),
          ),

          // Crisis
          GoRoute(
            path: 'crisis',
            builder: (_, __) => const CrisisScreen(),
            routes: [
              GoRoute(
                path: 'grounding',
                builder: (_, __) => const GroundingScreen(),
              ),
              GoRoute(
                path: 'breathing',
                builder: (_, __) => const BreathingExerciseScreen(),
              ),
              GoRoute(
                path: 'contacts',
                builder: (_, __) => const EmergencyContactsScreen(),
              ),
            ],
          ),

          // Profile
          GoRoute(
            path: 'profile',
            builder: (_, __) => const ProfileScreen(),
            routes: [
              GoRoute(
                path: 'edit',
                builder: (_, __) => const EditProfileScreen(),
              ),
              GoRoute(
                path: 'report',
                builder: (_, __) => const PdfReportScreen(),
              ),
              GoRoute(
                path: 'satusehat',
                builder: (_, __) => const SatusehatConsentScreen(),
              ),
              GoRoute(
                path: 'notifications',
                builder: (_, __) => const NotificationSettingsScreen(),
              ),
              GoRoute(
                path: 'accessibility',
                builder: (_, __) => const AccessibilitySettingsScreen(),
              ),
            ],
          ),

          // Weekly Insight
          GoRoute(
            path: 'weekly-insight',
            builder: (_, __) => const WeeklyInsightScreen(),
          ),

          // Caregiver
          GoRoute(
            path: 'caregiver',
            builder: (_, __) => const CaregiverScreen(),
            routes: [
              GoRoute(
                path: 'setup',
                builder: (_, __) => const CaregiverSetupScreen(),
              ),
              GoRoute(
                path: 'invite',
                builder: (_, __) => const CaregiverInviteScreen(),
              ),
              GoRoute(
                path: 'education',
                builder: (_, __) => const CaregiverEducationScreen(),
              ),
              GoRoute(
                path: 'dashboard/:patientId',
                builder: (_, state) {
                  final extra = state.extra;
                  if (extra is CaregiverRelationship) {
                    return CaregiverDashboardScreen(relationship: extra);
                  }
                  return CaregiverDashboardScreen.byPatientId(
                    patientId: state.pathParameters['patientId']!,
                  );
                },
              ),
            ],
          ),
        ],
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Text('Halaman tidak ditemukan: ${state.error}'),
      ),
    ),
  );
}
