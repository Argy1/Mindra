import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';

class GroundingScreen extends StatefulWidget {
  const GroundingScreen({super.key});

  @override
  State<GroundingScreen> createState() => _GroundingScreenState();
}

class _GroundingScreenState extends State<GroundingScreen> {
  static const _steps = [
    (
      count: 5,
      sense: 'LIHAT',
      instruction: 'Sebutkan 5 hal yang bisa kamu LIHAT di sekitarmu sekarang',
    ),
    (
      count: 4,
      sense: 'SENTUH',
      instruction: 'Sebutkan 4 hal yang bisa kamu SENTUH',
    ),
    (
      count: 3,
      sense: 'DENGAR',
      instruction: 'Sebutkan 3 hal yang bisa kamu DENGAR',
    ),
    (
      count: 2,
      sense: 'CIUM',
      instruction: 'Sebutkan 2 hal yang bisa kamu CIUM',
    ),
    (
      count: 1,
      sense: 'RASAKAN',
      instruction: 'Sebutkan 1 hal yang bisa kamu RASAKAN',
    ),
  ];

  int _step = 0;
  bool _completed = false;
  final List<List<String>> _entries = List.generate(5, (_) => []);
  final TextEditingController _inputCtrl = TextEditingController();
  Timer? _stepTimer;
  int _secondsRemaining = 60;

  @override
  void initState() {
    super.initState();
    _startStepTimer();
  }

  @override
  void dispose() {
    _stepTimer?.cancel();
    _inputCtrl.dispose();
    super.dispose();
  }

  void _startStepTimer() {
    _stepTimer?.cancel();
    setState(() => _secondsRemaining = 60);
    _stepTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) return;
      setState(() {
        if (_secondsRemaining > 0) _secondsRemaining--;
      });
    });
  }

  void _addEntry() {
    final text = _inputCtrl.text.trim();
    if (text.isEmpty) return;
    final maxItems = _steps[_step].count;
    if (_entries[_step].length >= maxItems) return;
    setState(() {
      _entries[_step].add(text);
      _inputCtrl.clear();
    });
  }

  void _removeEntry(int index) {
    setState(() => _entries[_step].removeAt(index));
  }

  void _next() {
    if (_step >= _steps.length - 1) {
      setState(() => _completed = true);
      _stepTimer?.cancel();
      return;
    }
    setState(() {
      _step++;
      _inputCtrl.clear();
    });
    _startStepTimer();
  }

  void _skip() => _next();

  @override
  Widget build(BuildContext context) {
    if (_completed) return const _CompletionView();
    final step = _steps[_step];
    final entries = _entries[_step];
    final canAdd = entries.length < step.count;

    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      appBar: AppBar(
        backgroundColor: AppColors.surfaceCanvas,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close_rounded, size: 22),
          color: AppColors.fg2,
          onPressed: () => context.pop(),
        ),
        title: Text('Grounding 5-4-3-2-1', style: AppTextStyles.h4),
        centerTitle: true,
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: AppSpacing.md),
            child: Center(
              child: Row(
                children: [
                  const Icon(Icons.timer_outlined,
                      size: 16, color: AppColors.fg4),
                  const SizedBox(width: 4),
                  Text(
                    '${(_secondsRemaining ~/ 60).toString().padLeft(2, '0')}:'
                    '${(_secondsRemaining % 60).toString().padLeft(2, '0')}',
                    style: AppTextStyles.bodyS.copyWith(color: AppColors.fg3),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.screenPadding),
          child: Column(
            children: [
              // Progress dots (5 circles)
              _ProgressDots(activeIndex: _step, total: _steps.length),
              const SizedBox(height: AppSpacing.xl),

              // Big number
              Text(
                '${step.count}',
                style: AppTextStyles.displayXL.copyWith(
                  color: AppColors.biru500,
                  fontSize: 80,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                'hal yang bisa kamu ${step.sense}',
                style: AppTextStyles.bodyL
                    .copyWith(color: AppColors.fg2, height: 1.5),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                step.instruction,
                style: AppTextStyles.bodyS.copyWith(color: AppColors.fg4),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.xl),

              // Entries chips
              Expanded(
                child: SingleChildScrollView(
                  child: Wrap(
                    spacing: AppSpacing.xs,
                    runSpacing: AppSpacing.xs,
                    alignment: WrapAlignment.center,
                    children: [
                      ...entries.asMap().entries.map(
                            (e) => _EntryChip(
                              label: e.value,
                              onDelete: () => _removeEntry(e.key),
                            ),
                          ),
                      if (canAdd) _AddChip(onTap: _showInputSheet),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.md),

              // Action buttons
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _skip,
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size.fromHeight(48),
                        side: BorderSide(color: AppColors.borderMedium),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(AppRadius.pill),
                        ),
                      ),
                      child: Text(
                        'Lewati',
                        style: AppTextStyles.buttonM
                            .copyWith(color: AppColors.fg3),
                      ),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    flex: 2,
                    child: FilledButton(
                      onPressed: _next,
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.biru500,
                        minimumSize: const Size.fromHeight(48),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(AppRadius.pill),
                        ),
                      ),
                      child: Text(
                        _step < _steps.length - 1 ? 'Lanjut →' : 'Selesai',
                        style:
                            AppTextStyles.buttonM.copyWith(color: Colors.white),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showInputSheet() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surfaceRaised,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(AppRadius.modal),
        ),
      ),
      builder: (_) {
        return Padding(
          padding: EdgeInsets.fromLTRB(
            AppSpacing.screenPadding,
            AppSpacing.lg,
            AppSpacing.screenPadding,
            MediaQuery.viewInsetsOf(context).bottom + AppSpacing.lg,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.neutral300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                'Tambah satu hal',
                style: AppTextStyles.h3,
              ),
              const SizedBox(height: AppSpacing.sm),
              TextField(
                controller: _inputCtrl,
                autofocus: true,
                onSubmitted: (_) {
                  _addEntry();
                  Navigator.pop(context);
                },
                decoration: InputDecoration(
                  hintText: 'mis. lampu di langit-langit',
                  hintStyle: AppTextStyles.bodyM.copyWith(color: AppColors.fg4),
                  filled: true,
                  fillColor: AppColors.surfaceCanvas,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    borderSide: BorderSide(color: AppColors.borderSoft),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    borderSide: BorderSide(color: AppColors.borderSoft),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    borderSide:
                        const BorderSide(color: AppColors.biru400, width: 1.5),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              FilledButton(
                onPressed: () {
                  _addEntry();
                  Navigator.pop(context);
                },
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.biru500,
                  minimumSize: const Size.fromHeight(44),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppRadius.pill),
                  ),
                ),
                child: Text('Tambah',
                    style: AppTextStyles.buttonM.copyWith(color: Colors.white)),
              ),
            ],
          ),
        );
      },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────

class _ProgressDots extends StatelessWidget {
  const _ProgressDots({required this.activeIndex, required this.total});

  final int activeIndex;
  final int total;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(total, (i) {
        final isActive = i <= activeIndex;
        return Container(
          width: isActive ? 12 : 10,
          height: isActive ? 12 : 10,
          margin: const EdgeInsets.symmetric(horizontal: 5),
          decoration: BoxDecoration(
            color: isActive ? AppColors.biru500 : AppColors.neutral200,
            shape: BoxShape.circle,
          ),
        );
      }),
    );
  }
}

class _EntryChip extends StatelessWidget {
  const _EntryChip({required this.label, required this.onDelete});

  final String label;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.only(
          left: AppSpacing.sm, right: 4, top: 6, bottom: 6),
      decoration: BoxDecoration(
        color: AppColors.biru50,
        borderRadius: BorderRadius.circular(AppRadius.pill),
        border: Border.all(color: AppColors.biru200),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: AppTextStyles.bodyS.copyWith(
              color: AppColors.biru700,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(width: 4),
          GestureDetector(
            onTap: onDelete,
            child: Container(
              width: 18,
              height: 18,
              decoration: BoxDecoration(
                color: AppColors.biru500,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.close_rounded,
                  size: 12, color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }
}

class _AddChip extends StatelessWidget {
  const _AddChip({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding:
            const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(AppRadius.pill),
          border: Border.all(
            color: AppColors.biru400,
            style: BorderStyle.solid,
            width: 1.5,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.add_rounded, size: 14, color: AppColors.biru500),
            const SizedBox(width: 4),
            Text(
              'Tambah →',
              style: AppTextStyles.bodyS.copyWith(
                color: AppColors.biru600,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Completion screen
// ─────────────────────────────────────────────────────────────────────────────

class _CompletionView extends StatelessWidget {
  const _CompletionView();

  Future<void> _callHotline() async {
    // stub — handled by parent screen if needed
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.screenPadding),
          child: Column(
            children: [
              const Spacer(),
              Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  color: AppColors.success50,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.success500.withValues(alpha: 0.2),
                      blurRadius: 24,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: const Center(
                  child: Text('🌟', style: TextStyle(fontSize: 56)),
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
              Text(
                'Kamu luar biasa!',
                style: AppTextStyles.displayM,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                'Latihan ini sudah membantu banyak orang\n'
                'melewati momen berat.',
                style: AppTextStyles.bodyL.copyWith(
                  color: AppColors.fg3,
                  height: 1.55,
                ),
                textAlign: TextAlign.center,
              ),
              const Spacer(),
              FilledButton(
                onPressed: () => context.go('/home'),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.biru500,
                  minimumSize: const Size.fromHeight(52),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppRadius.pill),
                  ),
                ),
                child: Text(
                  'Kembali ke Beranda',
                  style: AppTextStyles.buttonL.copyWith(color: Colors.white),
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              OutlinedButton.icon(
                onPressed: () async {
                  await _callHotline();
                  if (context.mounted) context.pop();
                },
                icon: const Icon(Icons.phone_rounded,
                    size: 18, color: AppColors.hangat500),
                label: Text(
                  'Hubungi Hotline',
                  style: AppTextStyles.buttonM
                      .copyWith(color: AppColors.hangat500),
                ),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(48),
                  side: const BorderSide(color: AppColors.hangat500),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppRadius.pill),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              TextButton.icon(
                onPressed: () => context.go('/home/ai-chat'),
                icon: const Icon(Icons.chat_bubble_outline_rounded,
                    size: 18, color: AppColors.biru500),
                label: Text(
                  'Ngobrol dengan AI',
                  style: AppTextStyles.bodyM.copyWith(
                    color: AppColors.biru500,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
            ],
          ),
        ),
      ),
    );
  }
}
