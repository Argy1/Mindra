import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:printing/printing.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../domain/entities/report_entity.dart';
import '../providers/report_provider.dart';

class PdfReportScreen extends ConsumerStatefulWidget {
  const PdfReportScreen({super.key});

  @override
  ConsumerState<PdfReportScreen> createState() => _PdfReportScreenState();
}

class _PdfReportScreenState extends ConsumerState<PdfReportScreen> {
  bool _showPreview = false;

  @override
  Widget build(BuildContext context) {
    final options = ref.watch(reportOptionsProvider);
    final genState = ref.watch(reportGenerationProvider);

    if (_showPreview && genState.hasResult) {
      return _PreviewScreen(
        pdfBytes: genState.pdfBytes!,
        onBack: () => setState(() => _showPreview = false),
        onShare: () => _share(genState.pdfBytes!),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      appBar: AppBar(
        backgroundColor: AppColors.surfaceCanvas,
        elevation: 0,
        title: Text('Ekspor Laporan PDF', style: AppTextStyles.h3),
        actions: [
          if (genState.hasResult)
            TextButton.icon(
              onPressed: () => setState(() => _showPreview = true),
              icon: const Icon(Icons.visibility_outlined, size: 18),
              label: const Text('Preview'),
            ),
        ],
      ),
      body: genState.isLoading
          ? _LoadingView(progress: genState.progress)
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Success banner
                  if (genState.hasResult) ...[
                    _SuccessBanner(
                      pdfPath: genState.pdfPath!,
                      pdfBytes: genState.pdfBytes!,
                      onPreview: () => setState(() => _showPreview = true),
                      onReset: () => ref.read(reportGenerationProvider.notifier).reset(),
                    ),
                    const SizedBox(height: 24),
                  ],

                  // Error banner
                  if (genState.error != null) ...[
                    _ErrorBanner(message: genState.error!),
                    const SizedBox(height: 16),
                  ],

                  // Period selection
                  _SectionHeader(title: 'Periode Laporan'),
                  const SizedBox(height: 10),
                  _PeriodSelector(
                    selected: options.periodDays,
                    onSelect: (d) => ref.read(reportOptionsProvider.notifier).setPeriod(d),
                  ),
                  const SizedBox(height: 24),

                  // Sections
                  _SectionHeader(title: 'Bagian yang Disertakan'),
                  const SizedBox(height: 10),
                  _SectionsPanel(
                    selected: options.sections,
                    onToggle: (s) => ref.read(reportOptionsProvider.notifier).toggleSection(s),
                  ),
                  const SizedBox(height: 24),

                  // Reflections (only if reflections section enabled)
                  if (options.sections.contains(ReportSection.reflections)) ...[
                    _SectionHeader(title: 'Catatan Refleksi'),
                    const SizedBox(height: 4),
                    Text(
                      'Kosongkan untuk menyertakan semua catatan dalam periode ini.',
                      style: AppTextStyles.bodyS.copyWith(color: AppColors.fg4),
                    ),
                    const SizedBox(height: 10),
                    _ReflectionSelector(
                      selected: options.selectedReflectionIds,
                      onToggle: (id) =>
                          ref.read(reportOptionsProvider.notifier).toggleReflection(id),
                      onSelectAll: () =>
                          ref.read(reportOptionsProvider.notifier).selectAllReflections(),
                    ),
                    const SizedBox(height: 24),
                  ],

                  // Generate button
                  _GenerateButton(options: options),
                  const SizedBox(height: 40),
                ],
              ),
            ),
    );
  }

  Future<void> _share(Uint8List bytes) async {
    await Printing.sharePdf(bytes: bytes, filename: 'Laporan_Mindra.pdf');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading View
// ─────────────────────────────────────────────────────────────────────────────

class _LoadingView extends StatelessWidget {
  const _LoadingView({required this.progress});

  final double progress;

  String get _label {
    if (progress < 0.3) return 'Mengambil data...';
    if (progress < 0.7) return 'Membangun laporan...';
    return 'Membuat PDF...';
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.picture_as_pdf, size: 64, color: AppColors.biru500),
            const SizedBox(height: 24),
            LinearProgressIndicator(
              value: progress,
              backgroundColor: AppColors.borderSoft,
              color: AppColors.biru500,
              minHeight: 6,
              borderRadius: BorderRadius.circular(3),
            ),
            const SizedBox(height: 16),
            Text(_label,
                style: AppTextStyles.bodyM.copyWith(color: AppColors.fg3)),
            const SizedBox(height: 4),
            Text('${(progress * 100).toInt()}%',
                style: AppTextStyles.label.copyWith(color: AppColors.biru500)),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Preview Screen
// ─────────────────────────────────────────────────────────────────────────────

class _PreviewScreen extends StatelessWidget {
  const _PreviewScreen({
    required this.pdfBytes,
    required this.onBack,
    required this.onShare,
  });

  final Uint8List pdfBytes;
  final VoidCallback onBack;
  final VoidCallback onShare;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[300],
      appBar: AppBar(
        backgroundColor: AppColors.biru500,
        foregroundColor: Colors.white,
        title: Text('Preview Laporan', style: AppTextStyles.h3.copyWith(color: Colors.white)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: onBack,
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.share_outlined),
            onPressed: onShare,
            tooltip: 'Bagikan PDF',
          ),
        ],
      ),
      body: PdfPreview(
        build: (_) async => pdfBytes,
        canChangeOrientation: false,
        canChangePageFormat: false,
        canDebug: false,
        pdfFileName: 'Laporan_Mindra.pdf',
        actions: [
          PdfPreviewAction(
            icon: const Icon(Icons.share),
            onPressed: (_, __, ___) => onShare(),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Success Banner
// ─────────────────────────────────────────────────────────────────────────────

class _SuccessBanner extends StatelessWidget {
  const _SuccessBanner({
    required this.pdfPath,
    required this.pdfBytes,
    required this.onPreview,
    required this.onReset,
  });

  final String pdfPath;
  final Uint8List pdfBytes;
  final VoidCallback onPreview;
  final VoidCallback onReset;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.success50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.success500.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.check_circle, color: AppColors.success500, size: 20),
              const SizedBox(width: 8),
              Text('Laporan berhasil dibuat!',
                  style: AppTextStyles.bodyM.copyWith(
                      color: AppColors.success500, fontWeight: FontWeight.w600)),
              const Spacer(),
              IconButton(
                icon: const Icon(Icons.close, size: 18, color: AppColors.fg4),
                onPressed: onReset,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'Tersimpan di: $pdfPath',
            style: AppTextStyles.bodyS.copyWith(color: AppColors.fg3),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: onPreview,
                  icon: const Icon(Icons.visibility_outlined, size: 16),
                  label: const Text('Lihat PDF'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.biru500,
                    side: const BorderSide(color: AppColors.biru500),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton.icon(
                  onPressed: () => Printing.sharePdf(
                      bytes: pdfBytes, filename: 'Laporan_Mindra.pdf'),
                  icon: const Icon(Icons.share_outlined, size: 16),
                  label: const Text('Bagikan'),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.biru500,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Error Banner
// ─────────────────────────────────────────────────────────────────────────────

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.danger50,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.danger500.withValues(alpha: 0.3)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.error_outline, color: AppColors.danger500, size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Text(message,
                style: AppTextStyles.bodyS.copyWith(color: AppColors.danger500)),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Section Header
// ─────────────────────────────────────────────────────────────────────────────

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Text(title,
        style: AppTextStyles.h4.copyWith(color: AppColors.fg1));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Period Selector
// ─────────────────────────────────────────────────────────────────────────────

class _PeriodSelector extends StatelessWidget {
  const _PeriodSelector({required this.selected, required this.onSelect});

  final int selected;
  final void Function(int) onSelect;

  static const _options = [
    (label: '30 Hari', days: 30),
    (label: '60 Hari', days: 60),
    (label: '90 Hari', days: 90),
  ];

  @override
  Widget build(BuildContext context) {
    return Row(
      children: _options.map((o) {
        final active = selected == o.days;
        return Expanded(
          child: Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: () => onSelect(o.days),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: active ? AppColors.biru500 : AppColors.surfaceCard,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: active ? AppColors.biru500 : AppColors.borderSoft,
                    width: active ? 2 : 1,
                  ),
                ),
                child: Column(
                  children: [
                    Text(
                      o.label,
                      style: AppTextStyles.bodyM.copyWith(
                        color: active ? Colors.white : AppColors.fg2,
                        fontWeight: FontWeight.w600,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sections Panel
// ─────────────────────────────────────────────────────────────────────────────

class _SectionsPanel extends StatelessWidget {
  const _SectionsPanel({required this.selected, required this.onToggle});

  final Set<String> selected;
  final void Function(String) onToggle;

  static const _sections = [
    (id: ReportSection.assessments, label: 'Asesmen Kesehatan Mental', icon: Icons.psychology_outlined),
    (id: ReportSection.mood, label: 'Catatan Suasana Hati', icon: Icons.mood_outlined),
    (id: ReportSection.sleep, label: 'Pola Tidur', icon: Icons.bedtime_outlined),
    (id: ReportSection.consultations, label: 'Riwayat Konsultasi', icon: Icons.video_call_outlined),
    (id: ReportSection.reflections, label: 'Catatan Refleksi', icon: Icons.edit_note_outlined),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfaceCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderSoft),
      ),
      child: Column(
        children: _sections.asMap().entries.map((entry) {
          final i = entry.key;
          final s = entry.value;
          final active = selected.contains(s.id);
          return Column(
            children: [
              ListTile(
                leading: Icon(
                  s.icon,
                  color: active ? AppColors.biru500 : AppColors.fg4,
                  size: 22,
                ),
                title: Text(s.label,
                    style: AppTextStyles.bodyM.copyWith(
                      color: active ? AppColors.fg1 : AppColors.fg3,
                    )),
                trailing: Checkbox(
                  value: active,
                  onChanged: (_) => onToggle(s.id),
                  activeColor: AppColors.biru500,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                ),
                onTap: () => onToggle(s.id),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
              ),
              if (i < _sections.length - 1)
                const Divider(height: 1, indent: 12, endIndent: 12),
            ],
          );
        }).toList(),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Reflection Selector
// ─────────────────────────────────────────────────────────────────────────────

class _ReflectionSelector extends ConsumerWidget {
  const _ReflectionSelector({
    required this.selected,
    required this.onToggle,
    required this.onSelectAll,
  });

  final List<String> selected;
  final void Function(String) onToggle;
  final VoidCallback onSelectAll;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // We use Supabase directly via the provider to fetch recent reflections preview
    // For the selector we show a minimal placeholder with "select all" toggle
    // The actual filtering happens in buildReport()

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surfaceCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderSoft),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  selected.isEmpty
                      ? 'Semua catatan dalam periode'
                      : '${selected.length} catatan dipilih',
                  style: AppTextStyles.bodyM.copyWith(color: AppColors.fg2),
                ),
              ),
              TextButton(
                onPressed: onSelectAll,
                child: Text(
                  selected.isEmpty ? 'Sudah semua' : 'Pilih semua',
                  style: AppTextStyles.label.copyWith(color: AppColors.biru500),
                ),
              ),
            ],
          ),
          if (selected.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              'ID yang dipilih akan disertakan secara spesifik dalam laporan.',
              style: AppTextStyles.bodyS.copyWith(color: AppColors.fg4),
            ),
          ] else ...[
            const SizedBox(height: 4),
            Text(
              'Semua refleksi dalam periode yang dipilih akan disertakan.',
              style: AppTextStyles.bodyS.copyWith(color: AppColors.fg4),
            ),
          ],
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Generate Button
// ─────────────────────────────────────────────────────────────────────────────

class _GenerateButton extends ConsumerWidget {
  const _GenerateButton({required this.options});

  final ReportOptions options;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);

    return SizedBox(
      width: double.infinity,
      height: 52,
      child: FilledButton.icon(
        onPressed: user == null
            ? null
            : () {
                final userName = user.userMetadata?['full_name'] as String? ??
                    user.email?.split('@').first ??
                    'Pengguna';
                ref.read(reportGenerationProvider.notifier).generate(
                      userId: user.id,
                      userName: userName,
                      options: options,
                    );
              },
        icon: const Icon(Icons.picture_as_pdf_outlined, size: 20),
        label: Text(
          'Buat Laporan PDF',
          style: AppTextStyles.bodyM.copyWith(color: Colors.white, fontWeight: FontWeight.w600),
        ),
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.biru500,
          foregroundColor: Colors.white,
          disabledBackgroundColor: AppColors.borderMedium,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
    );
  }
}
