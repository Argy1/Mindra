import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../domain/entities/caregiver_entity.dart';
import '../providers/caregiver_provider.dart';

class CaregiverDashboardScreen extends ConsumerStatefulWidget {
  CaregiverDashboardScreen({
    required CaregiverRelationship relationship,
    super.key,
  })  : relationship = relationship,
        patientId = relationship.patientId;

  const CaregiverDashboardScreen.byPatientId({
    required this.patientId,
    super.key,
  }) : relationship = null;

  final CaregiverRelationship? relationship;
  final String patientId;

  @override
  ConsumerState<CaregiverDashboardScreen> createState() =>
      _CaregiverDashboardScreenState();
}

class _CaregiverDashboardScreenState
    extends ConsumerState<CaregiverDashboardScreen> {
  bool _relationshipsRequested = false;
  String? _summaryRequestedFor;

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    final relationship = _resolveRelationship(user?.id);

    if (relationship == null) {
      return _buildRelationshipFallback(context, user?.id);
    }

    final summaryAsync =
        ref.watch(patientSummaryProvider(relationship.patientId));
    final summaryNotifier =
        ref.read(patientSummaryProvider(relationship.patientId).notifier);

    if (_summaryRequestedFor != relationship.patientId && user != null) {
      _summaryRequestedFor = relationship.patientId;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        summaryNotifier.load(
          relationship.patientId,
          relationship.permissions,
        );
      });
    }

    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      appBar: AppBar(
        backgroundColor: AppColors.surfaceCanvas,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => context.pop(),
        ),
        title: Text(
          relationship.patientName ?? 'Pasien',
          style: AppTextStyles.h3,
        ),
        actions: [
          TextButton(
            onPressed: () => context.push(AppRoutes.caregiverEducation),
            child: Text('Panduan',
                style: AppTextStyles.bodyM.copyWith(color: AppColors.biru500)),
          ),
        ],
      ),
      body: summaryAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => const Center(child: Text('Gagal memuat data.')),
        data: (summary) {
          if (summary == null) {
            return const Center(child: Text('Data tidak tersedia.'));
          }
          return _DashboardBody(summary: summary);
        },
      ),
    );
  }

  CaregiverRelationship? _resolveRelationship(String? userId) {
    if (widget.relationship != null) return widget.relationship;
    if (userId == null) return null;

    final patients = ref.watch(caregiverPatientsProvider);
    if (!_relationshipsRequested) {
      _relationshipsRequested = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        ref.read(caregiverPatientsProvider.notifier).load(userId);
      });
    }

    for (final relationship in patients.relationships) {
      if (relationship.patientId == widget.patientId) {
        return relationship;
      }
    }
    return null;
  }

  Widget _buildRelationshipFallback(BuildContext context, String? userId) {
    final patients = ref.watch(caregiverPatientsProvider);
    final isLoading = userId != null && patients.isLoading;

    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      appBar: AppBar(
        backgroundColor: AppColors.surfaceCanvas,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => context.pop(),
        ),
        title: Text('Dashboard Pendamping', style: AppTextStyles.h3),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: isLoading
              ? const CircularProgressIndicator()
              : Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.lock_outline_rounded,
                      color: AppColors.fg4,
                      size: 36,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Data pendamping tidak ditemukan.',
                      style: AppTextStyles.bodyM.copyWith(
                        color: AppColors.fg2,
                        fontWeight: FontWeight.w600,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Pastikan undangan sudah diterima, lalu buka ulang dari Mode Pendamping.',
                      style: AppTextStyles.bodyM.copyWith(color: AppColors.fg4),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: () => context.go(AppRoutes.caregiver),
                      child: const Text('Buka Mode Pendamping'),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}

class _DashboardBody extends StatelessWidget {
  const _DashboardBody({required this.summary});
  final PatientSummary summary;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        // Alert banner
        if (summary.hasAlert && summary.alertMessage != null)
          _AlertBanner(message: summary.alertMessage!),

        if (summary.hasAlert) const SizedBox(height: 16),

        // Quick stats row
        Row(
          children: [
            Expanded(
              child: _StatCard(
                emoji: '🔥',
                label: 'Streak',
                value: '${summary.activityStreak} hari',
                color: AppColors.matahari500,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _StatCard(
                emoji: '🕐',
                label: 'Terakhir aktif',
                value: summary.lastActive != null
                    ? _formatRelative(summary.lastActive!)
                    : '—',
                color: AppColors.biru500,
              ),
            ),
          ],
        ),

        const SizedBox(height: 16),

        if (summary.latestAssessmentCategory != null) ...[
          _InfoCard(
            icon: Icons.assignment_outlined,
            label: 'Hasil asesmen terakhir',
            value: summary.latestAssessmentCategory!,
          ),
          const SizedBox(height: 16),
        ],

        // Mood chart (if permitted)
        if (summary.permissions.moodDaily) ...[
          Text('Tren mood 7 hari terakhir',
              style: AppTextStyles.h4.copyWith(color: AppColors.fg2)),
          const SizedBox(height: 12),
          _MoodChart(weekMoods: summary.weekMoods),
          const SizedBox(height: 24),
        ],

        // Permission summary
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.surfaceCard,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.borderSoft),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Data yang kamu lihat',
                  style: AppTextStyles.label
                      .copyWith(color: AppColors.fg4, fontSize: 12)),
              const SizedBox(height: 8),
              _PermissionChip(
                  label: 'Mood harian', enabled: summary.permissions.moodDaily),
              _PermissionChip(
                  label: 'Hasil asesmen',
                  enabled: summary.permissions.assessmentResults),
              _PermissionChip(
                  label: 'Status aktivitas',
                  enabled: summary.permissions.appActivity),
              _PermissionChip(
                  label: 'Notifikasi darurat',
                  enabled: summary.permissions.emergencyAlerts),
            ],
          ),
        ),

        const SizedBox(height: 24),

        // Education teaser
        InkWell(
          onTap: () => context.push(AppRoutes.caregiverEducation),
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.matahari50,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                  color: AppColors.matahari500.withValues(alpha: 0.3)),
            ),
            child: Row(
              children: [
                const Text('📚', style: TextStyle(fontSize: 28)),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Panduan Mendampingi',
                          style: AppTextStyles.bodyM.copyWith(
                              color: AppColors.fg1,
                              fontWeight: FontWeight.w600)),
                      Text('Tips dan artikel dari para ahli',
                          style: AppTextStyles.bodyM
                              .copyWith(color: AppColors.fg4, fontSize: 13)),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right, color: AppColors.fg4, size: 20),
              ],
            ),
          ),
        ),
      ],
    );
  }

  static String _formatRelative(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m lalu';
    if (diff.inHours < 24) return '${diff.inHours}j lalu';
    if (diff.inDays == 1) return 'Kemarin';
    if (diff.inDays < 7) return '${diff.inDays} hari lalu';
    return DateFormat('d MMM', 'id_ID').format(dt);
  }
}

// ─── Sub-widgets ──────────────────────────────────────────────────────────────

class _AlertBanner extends StatelessWidget {
  const _AlertBanner({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.danger50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.danger300),
      ),
      child: Row(
        children: [
          const Icon(Icons.warning_amber_rounded,
              color: AppColors.danger500, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Perhatian',
                    style: AppTextStyles.bodyM.copyWith(
                        color: AppColors.danger700,
                        fontWeight: FontWeight.w600)),
                Text(message,
                    style: AppTextStyles.bodyM
                        .copyWith(color: AppColors.danger500)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard(
      {required this.emoji,
      required this.label,
      required this.value,
      required this.color});
  final String emoji, label, value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surfaceCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderSoft),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(emoji, style: const TextStyle(fontSize: 22)),
          const SizedBox(height: 8),
          Text(value,
              style: AppTextStyles.h4
                  .copyWith(color: color, fontWeight: FontWeight.w700)),
          Text(label,
              style: AppTextStyles.label
                  .copyWith(color: AppColors.fg4, fontSize: 12)),
        ],
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard(
      {required this.icon, required this.label, required this.value});
  final IconData icon;
  final String label, value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surfaceCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderSoft),
      ),
      child: Row(
        children: [
          Icon(icon, size: 20, color: AppColors.fg3),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label,
                  style: AppTextStyles.label
                      .copyWith(color: AppColors.fg4, fontSize: 11)),
              Text(value,
                  style: AppTextStyles.bodyM.copyWith(
                      color: AppColors.fg1, fontWeight: FontWeight.w600)),
            ],
          ),
        ],
      ),
    );
  }
}

class _MoodChart extends StatelessWidget {
  const _MoodChart({required this.weekMoods});
  final List<int?> weekMoods;

  static const _dayLabels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  Color _moodColor(int? v) {
    if (v == null) return AppColors.borderMedium;
    if (v >= 6) return AppColors.moodGreat;
    if (v >= 5) return AppColors.moodGood;
    if (v >= 4) return AppColors.moodOkay;
    if (v >= 3) return AppColors.moodNeutral;
    if (v >= 2) return AppColors.moodLow;
    return AppColors.moodBad;
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.borderSoft),
      ),
      child: Column(
        children: [
          SizedBox(
            height: 120,
            child: BarChart(
              BarChartData(
                maxY: 7,
                minY: 0,
                gridData: const FlGridData(show: false),
                borderData: FlBorderData(show: false),
                titlesData: FlTitlesData(
                  leftTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false)),
                  topTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false)),
                  rightTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false)),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      getTitlesWidget: (v, _) => Text(
                        _dayLabels[v.toInt() % 7],
                        style: AppTextStyles.label
                            .copyWith(color: AppColors.fg4, fontSize: 10),
                      ),
                    ),
                  ),
                ),
                barGroups: List.generate(7, (i) {
                  final mood = weekMoods[i];
                  return BarChartGroupData(
                    x: i,
                    barRods: [
                      BarChartRodData(
                        toY: mood?.toDouble() ?? 0,
                        color: _moodColor(mood),
                        width: 20,
                        borderRadius: BorderRadius.circular(4),
                        backDrawRodData: BackgroundBarChartRodData(
                          show: true,
                          toY: 7,
                          color: AppColors.borderSoft,
                        ),
                      ),
                    ],
                  );
                }),
              ),
            ),
          ),
          const SizedBox(height: 10),
          Text(
            weekMoods.every((m) => m == null)
                ? 'Belum ada data mood minggu ini.'
                : 'Data mood 7 hari terakhir',
            style: AppTextStyles.label
                .copyWith(color: AppColors.fg4, fontSize: 11),
          ),
        ],
      ),
    );
  }
}

class _PermissionChip extends StatelessWidget {
  const _PermissionChip({required this.label, required this.enabled});
  final String label;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          Icon(
            enabled ? Icons.check_circle_outline : Icons.radio_button_unchecked,
            size: 14,
            color: enabled ? AppColors.sage500 : AppColors.fg4,
          ),
          const SizedBox(width: 8),
          Text(
            label,
            style: AppTextStyles.bodyM.copyWith(
              color: enabled ? AppColors.fg2 : AppColors.fg4,
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }
}
