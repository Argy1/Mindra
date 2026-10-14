import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../domain/entities/psychologist_entity.dart';
import '../../domain/entities/time_slot_entity.dart';
import '../providers/telemedicine_provider.dart';

class BookingScreen extends ConsumerWidget {
  const BookingScreen({super.key, required this.psychologistId});
  final String psychologistId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final psy = ref.watch(psychologistDetailProvider(psychologistId));

    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      appBar: AppBar(
        backgroundColor: AppColors.surfaceCanvas,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => context.pop(),
        ),
        title: Text('Buat Janji', style: AppTextStyles.h3),
      ),
      body: psy.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) =>
            const Center(child: Text('Gagal memuat data psikolog')),
        data: (psychologist) => _BookingBody(
          psychologistId: psychologistId,
          psychologist: psychologist,
        ),
      ),
    );
  }
}

class _BookingBody extends ConsumerWidget {
  const _BookingBody({
    required this.psychologistId,
    required this.psychologist,
  });

  final String psychologistId;
  final Psychologist psychologist;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bookState = ref.watch(bookingProvider(psychologistId));
    final bookNotifier = ref.read(bookingProvider(psychologistId).notifier);

    // Navigate on success
    ref.listen(bookingProvider(psychologistId), (prev, next) {
      if (next.success && next.bookedConsultation != null) {
        _showSuccessDialog(context, next.bookedConsultation!.scheduledAt);
      }
    });

    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.screenPadding),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Psychologist summary
                Container(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceRaised,
                    borderRadius: BorderRadius.circular(AppRadius.card),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.04),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(AppRadius.sm),
                        child: psychologist.photoUrl.isNotEmpty
                            ? Image.network(
                                psychologist.photoUrl,
                                width: 48,
                                height: 48,
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) =>
                                    _MiniAvatar(name: psychologist.name),
                              )
                            : _MiniAvatar(name: psychologist.name),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(psychologist.name,
                                style: AppTextStyles.bodyM
                                    .copyWith(fontWeight: FontWeight.w700)),
                            Text(psychologist.title,
                                style: AppTextStyles.bodyS
                                    .copyWith(color: AppColors.fg3)),
                          ],
                        ),
                      ),
                      Text(
                        _formatPrice(psychologist.pricePerSession),
                        style: AppTextStyles.bodyS.copyWith(
                          color: AppColors.biru600,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.xl),

                // Calendar
                Text('Pilih Tanggal', style: AppTextStyles.h3),
                const SizedBox(height: AppSpacing.sm),
                _CalendarWidget(
                  selectedDate: bookState.selectedDate,
                  onDateSelected: bookNotifier.selectDate,
                ),
                const SizedBox(height: AppSpacing.xl),

                // Time slots
                if (bookState.selectedDate != null) ...[
                  Text('Pilih Waktu', style: AppTextStyles.h3),
                  const SizedBox(height: AppSpacing.sm),
                  _TimeSlotsGrid(
                    psychologistId: psychologistId,
                    date: bookState.selectedDate!,
                    selectedSlot: bookState.selectedSlot,
                    onSlotSelected: bookNotifier.selectSlot,
                  ),
                  const SizedBox(height: AppSpacing.xl),
                ],

                // Booking summary
                if (bookState.selectedDate != null &&
                    bookState.selectedSlot != null)
                  _BookingSummary(
                    psychologistName: psychologist.name,
                    date: bookState.selectedDate!,
                    slot: bookState.selectedSlot!,
                    price: psychologist.pricePerSession,
                  ),

                // Error
                if (bookState.error != null) ...[
                  const SizedBox(height: AppSpacing.sm),
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.sm),
                    decoration: BoxDecoration(
                      color: AppColors.danger50,
                      borderRadius: BorderRadius.circular(AppRadius.sm),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.error_outline,
                            color: AppColors.danger500, size: 16),
                        const SizedBox(width: AppSpacing.xs),
                        Expanded(
                          child: Text(
                            bookState.error!,
                            style: AppTextStyles.bodyS
                                .copyWith(color: AppColors.danger700),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 100),
              ],
            ),
          ),
        ),

        // Confirm button
        Container(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.screenPadding,
            AppSpacing.sm,
            AppSpacing.screenPadding,
            AppSpacing.xl,
          ),
          decoration: BoxDecoration(
            color: AppColors.surfaceCanvas,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.06),
                blurRadius: 12,
                offset: const Offset(0, -4),
              ),
            ],
          ),
          child: FilledButton(
            onPressed: bookState.selectedSlot == null || bookState.isLoading
                ? null
                : () => bookNotifier.book(psychologist),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.biru500,
              disabledBackgroundColor: AppColors.biru200,
              minimumSize: const Size.fromHeight(50),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppRadius.pill),
              ),
            ),
            child: bookState.isLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white),
                  )
                : Text('Konfirmasi Booking',
                    style: AppTextStyles.buttonL.copyWith(color: Colors.white)),
          ),
        ),
      ],
    );
  }

  String _formatPrice(int price) {
    if (price == 0) return 'Gratis';
    final f = price.toString().replaceAllMapped(
          RegExp(r'(\d)(?=(\d{3})+$)'),
          (m) => '${m[1]}.',
        );
    return 'Rp $f';
  }

  void _showSuccessDialog(BuildContext context, DateTime scheduledAt) {
    final df = DateFormat('EEEE, d MMMM yyyy', 'id_ID');
    final tf = DateFormat('HH:mm', 'id_ID');
    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.cardHero)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: const BoxDecoration(
                  color: AppColors.success50, shape: BoxShape.circle),
              child: const Icon(Icons.check_circle_rounded,
                  color: AppColors.success500, size: 36),
            ),
            const SizedBox(height: AppSpacing.md),
            Text('Berhasil!', style: AppTextStyles.h2),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Janji konsultasi dibuat untuk\n'
              '${df.format(scheduledAt)} pukul ${tf.format(scheduledAt)}',
              style: AppTextStyles.bodyM
                  .copyWith(color: AppColors.fg2, height: 1.5),
              textAlign: TextAlign.center,
            ),
          ],
        ),
        actions: [
          FilledButton(
            onPressed: () {
              Navigator.of(context).pop();
              context.go('/home/telemedicine/history');
            },
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.biru500,
              minimumSize: const Size.fromHeight(44),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppRadius.pill)),
            ),
            child: Text('Lihat Riwayat',
                style: AppTextStyles.buttonM.copyWith(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Calendar widget — current + next month, 2-month scroll
// ─────────────────────────────────────────────────────────────────────────────

class _CalendarWidget extends StatefulWidget {
  const _CalendarWidget({
    required this.selectedDate,
    required this.onDateSelected,
  });

  final DateTime? selectedDate;
  final ValueChanged<DateTime> onDateSelected;

  @override
  State<_CalendarWidget> createState() => _CalendarWidgetState();
}

class _CalendarWidgetState extends State<_CalendarWidget> {
  late DateTime _viewMonth;
  final _today = DateTime.now();

  @override
  void initState() {
    super.initState();
    _viewMonth = DateTime(_today.year, _today.month);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfaceRaised,
        borderRadius: BorderRadius.circular(AppRadius.card),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          // Month nav
          Padding(
            padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.sm, vertical: AppSpacing.sm),
            child: Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.chevron_left_rounded),
                  onPressed: _viewMonth.year == _today.year &&
                          _viewMonth.month == _today.month
                      ? null
                      : () => setState(() => _viewMonth =
                          DateTime(_viewMonth.year, _viewMonth.month - 1)),
                  color: AppColors.fg2,
                  disabledColor: AppColors.fg4,
                ),
                Expanded(
                  child: Text(
                    DateFormat('MMMM yyyy', 'id_ID').format(_viewMonth),
                    style: AppTextStyles.bodyM
                        .copyWith(fontWeight: FontWeight.w700),
                    textAlign: TextAlign.center,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.chevron_right_rounded),
                  onPressed: _viewMonth.month ==
                          DateTime(_today.year, _today.month + 1).month
                      ? null
                      : () => setState(() => _viewMonth =
                          DateTime(_viewMonth.year, _viewMonth.month + 1)),
                  color: AppColors.fg2,
                  disabledColor: AppColors.fg4,
                ),
              ],
            ),
          ),

          // Day-of-week header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
            child: Row(
              children: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
                  .map(
                    (d) => Expanded(
                      child: Center(
                        child: Text(
                          d,
                          style:
                              AppTextStyles.meta.copyWith(color: AppColors.fg4),
                        ),
                      ),
                    ),
                  )
                  .toList(),
            ),
          ),
          const SizedBox(height: AppSpacing.xs),

          // Days grid
          Padding(
            padding: const EdgeInsets.fromLTRB(
                AppSpacing.sm, 0, AppSpacing.sm, AppSpacing.sm),
            child: _buildDaysGrid(),
          ),
        ],
      ),
    );
  }

  Widget _buildDaysGrid() {
    final firstDay = DateTime(_viewMonth.year, _viewMonth.month, 1);
    // Monday = 1, so offset = weekday - 1
    final offset = (firstDay.weekday - 1) % 7;
    final daysInMonth = DateTime(_viewMonth.year, _viewMonth.month + 1, 0).day;
    final cellCount = offset + daysInMonth;
    final rows = (cellCount / 7).ceil();

    return Column(
      children: List.generate(rows, (row) {
        return Row(
          children: List.generate(7, (col) {
            final idx = row * 7 + col;
            final dayNum = idx - offset + 1;

            if (dayNum < 1 || dayNum > daysInMonth) {
              return const Expanded(child: SizedBox(height: 36));
            }

            final date = DateTime(_viewMonth.year, _viewMonth.month, dayNum);
            final isPast =
                date.isBefore(DateTime(_today.year, _today.month, _today.day));
            final isSelected = widget.selectedDate != null &&
                widget.selectedDate!.year == date.year &&
                widget.selectedDate!.month == date.month &&
                widget.selectedDate!.day == date.day;
            final isToday = date.year == _today.year &&
                date.month == _today.month &&
                date.day == _today.day;

            return Expanded(
              child: GestureDetector(
                onTap: isPast ? null : () => widget.onDateSelected(date),
                child: Container(
                  height: 36,
                  margin: const EdgeInsets.all(2),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? AppColors.biru500
                        : isToday
                            ? AppColors.biru50
                            : Colors.transparent,
                    shape: BoxShape.circle,
                    border: isToday && !isSelected
                        ? Border.all(color: AppColors.biru300)
                        : null,
                  ),
                  child: Center(
                    child: Text(
                      '$dayNum',
                      style: AppTextStyles.bodyS.copyWith(
                        color: isSelected
                            ? Colors.white
                            : isPast
                                ? AppColors.fg4
                                : AppColors.fg1,
                        fontWeight: isSelected || isToday
                            ? FontWeight.w700
                            : FontWeight.w400,
                      ),
                    ),
                  ),
                ),
              ),
            );
          }),
        );
      }),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Time slots grid
// ─────────────────────────────────────────────────────────────────────────────

class _TimeSlotsGrid extends ConsumerWidget {
  const _TimeSlotsGrid({
    required this.psychologistId,
    required this.date,
    required this.selectedSlot,
    required this.onSlotSelected,
  });

  final String psychologistId;
  final DateTime date;
  final TimeSlot? selectedSlot;
  final ValueChanged<TimeSlot> onSlotSelected;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final slotsAsync = ref.watch(
      availableSlotsProvider(AvailableSlotsKey(psychologistId, date)),
    );

    return slotsAsync.when(
      loading: () => const Center(
        child: Padding(
          padding: EdgeInsets.all(AppSpacing.lg),
          child: CircularProgressIndicator(),
        ),
      ),
      error: (_, __) => Text(
        'Gagal memuat jadwal',
        style: AppTextStyles.bodyS.copyWith(color: AppColors.danger500),
      ),
      data: (slots) => slots.isEmpty
          ? Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: AppColors.surfaceRaised,
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
              child: Row(
                children: [
                  const Icon(Icons.event_busy_rounded,
                      color: AppColors.fg4, size: 20),
                  const SizedBox(width: AppSpacing.sm),
                  Text(
                    'Tidak ada jadwal tersedia pada tanggal ini',
                    style: AppTextStyles.bodyS.copyWith(color: AppColors.fg3),
                  ),
                ],
              ),
            )
          : Wrap(
              spacing: AppSpacing.xs,
              runSpacing: AppSpacing.xs,
              children: slots
                  .map(
                    (slot) => GestureDetector(
                      onTap: () => onSlotSelected(slot),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 180),
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.md,
                          vertical: AppSpacing.xs,
                        ),
                        decoration: BoxDecoration(
                          color: selectedSlot?.id == slot.id
                              ? AppColors.biru500
                              : AppColors.surfaceRaised,
                          borderRadius: BorderRadius.circular(AppRadius.sm),
                          border: Border.all(
                            color: selectedSlot?.id == slot.id
                                ? AppColors.biru500
                                : AppColors.borderSoft,
                          ),
                        ),
                        child: Text(
                          slot.formattedTime,
                          style: AppTextStyles.bodyM.copyWith(
                            color: selectedSlot?.id == slot.id
                                ? Colors.white
                                : AppColors.fg1,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  )
                  .toList(),
            ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Booking summary card
// ─────────────────────────────────────────────────────────────────────────────

class _BookingSummary extends StatelessWidget {
  const _BookingSummary({
    required this.psychologistName,
    required this.date,
    required this.slot,
    required this.price,
  });

  final String psychologistName;
  final DateTime date;
  final TimeSlot slot;
  final int price;

  String _formatPrice(int p) {
    if (p == 0) return 'Gratis';
    final f = p.toString().replaceAllMapped(
          RegExp(r'(\d)(?=(\d{3})+$)'),
          (m) => '${m[1]}.',
        );
    return 'Rp $f';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.biru50,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.biru100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Ringkasan Booking', style: AppTextStyles.h4),
          const SizedBox(height: AppSpacing.sm),
          _SummaryRow(
            icon: Icons.person_outline_rounded,
            label: 'Psikolog',
            value: psychologistName,
          ),
          _SummaryRow(
            icon: Icons.calendar_today_outlined,
            label: 'Tanggal',
            value: DateFormat('EEEE, d MMMM yyyy', 'id_ID').format(date),
          ),
          _SummaryRow(
            icon: Icons.access_time_rounded,
            label: 'Waktu',
            value: '${slot.formattedTime} – '
                '${slot.endTime.hour.toString().padLeft(2, '0')}:'
                '${slot.endTime.minute.toString().padLeft(2, '0')} WIB',
          ),
          _SummaryRow(
            icon: Icons.payments_outlined,
            label: 'Biaya',
            value: _formatPrice(price),
            valueStyle: AppTextStyles.bodyM.copyWith(
              color: AppColors.biru600,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({
    required this.icon,
    required this.label,
    required this.value,
    this.valueStyle,
  });

  final IconData icon;
  final String label;
  final String value;
  final TextStyle? valueStyle;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.xs),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: AppColors.biru400),
          const SizedBox(width: AppSpacing.xs),
          SizedBox(
            width: 64,
            child: Text(label,
                style: AppTextStyles.bodyS.copyWith(color: AppColors.fg3)),
          ),
          Expanded(
            child: Text(
              value,
              style: valueStyle ??
                  AppTextStyles.bodyS.copyWith(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}

class _MiniAvatar extends StatelessWidget {
  const _MiniAvatar({required this.name});
  final String name;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 48,
      height: 48,
      color: AppColors.biru100,
      child: Center(
        child: Text(
          name.isNotEmpty ? name[0].toUpperCase() : '?',
          style: AppTextStyles.h3.copyWith(color: AppColors.biru600),
        ),
      ),
    );
  }
}
