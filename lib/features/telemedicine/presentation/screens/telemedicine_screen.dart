import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../data/datasources/telemedicine_remote_datasource.dart';
import '../../domain/entities/psychologist_entity.dart';
import '../providers/telemedicine_provider.dart';

class TelemedicineScreen extends ConsumerStatefulWidget {
  const TelemedicineScreen({super.key});

  @override
  ConsumerState<TelemedicineScreen> createState() => _TelemedicineScreenState();
}

class _TelemedicineScreenState extends ConsumerState<TelemedicineScreen> {
  final _searchController = TextEditingController();

  static const _specializations = [
    null,
    'Depresi',
    'Kecemasan',
    'Trauma',
    'Pernikahan',
    'Remaja',
    'Stres Kerja',
  ];

  static const _specializationLabels = [
    'Semua',
    'Depresi',
    'Kecemasan',
    'Trauma',
    'Pernikahan',
    'Remaja',
    'Stres Kerja',
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(psychologistListProvider);
    final notifier = ref.read(psychologistListProvider.notifier);

    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      appBar: AppBar(
        backgroundColor: AppColors.surfaceCanvas,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        title: Text('Konsultasi Online', style: AppTextStyles.h3),
        actions: [
          TextButton.icon(
            onPressed: () => context.push('/home/telemedicine/history'),
            icon: const Icon(Icons.history_rounded,
                size: 18, color: AppColors.biru500),
            label: Text(
              'Riwayat',
              style: AppTextStyles.bodyS.copyWith(
                color: AppColors.biru500,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Search bar
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.screenPadding,
              AppSpacing.xs,
              AppSpacing.screenPadding,
              AppSpacing.sm,
            ),
            child: TextField(
              controller: _searchController,
              onChanged: notifier.setQuery,
              decoration: InputDecoration(
                hintText: 'Cari psikolog...',
                hintStyle: AppTextStyles.bodyM.copyWith(color: AppColors.fg4),
                prefixIcon: const Icon(Icons.search_rounded,
                    color: AppColors.fg4, size: 20),
                suffixIcon: state.query.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.close_rounded,
                            size: 18, color: AppColors.fg4),
                        onPressed: () {
                          _searchController.clear();
                          notifier.setQuery('');
                        },
                      )
                    : null,
                filled: true,
                fillColor: AppColors.surfaceRaised,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.md,
                  vertical: AppSpacing.sm,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppRadius.pill),
                  borderSide: BorderSide(color: AppColors.borderSoft),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppRadius.pill),
                  borderSide: BorderSide(color: AppColors.borderSoft),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppRadius.pill),
                  borderSide:
                      const BorderSide(color: AppColors.biru400, width: 1.5),
                ),
              ),
            ),
          ),

          // Specialization filter chips
          SizedBox(
            height: 36,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.screenPadding),
              itemCount: _specializations.length,
              separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.xs),
              itemBuilder: (_, i) {
                final spec = _specializations[i];
                final label = _specializationLabels[i];
                final selected = state.specialization == spec;
                return GestureDetector(
                  onTap: () => notifier.setSpecialization(spec),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.md, vertical: AppSpacing.xs),
                    decoration: BoxDecoration(
                      color: selected
                          ? AppColors.biru500
                          : AppColors.surfaceRaised,
                      borderRadius: BorderRadius.circular(AppRadius.pill),
                      border: Border.all(
                        color:
                            selected ? AppColors.biru500 : AppColors.borderSoft,
                      ),
                    ),
                    child: Text(
                      label,
                      style: AppTextStyles.bodyS.copyWith(
                        color: selected ? Colors.white : AppColors.fg2,
                        fontWeight:
                            selected ? FontWeight.w600 : FontWeight.w400,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),

          // Sort row
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.screenPadding,
              AppSpacing.sm,
              AppSpacing.screenPadding,
              AppSpacing.xs,
            ),
            child: Row(
              children: [
                Text('Urutkan: ',
                    style: AppTextStyles.bodyS.copyWith(color: AppColors.fg4)),
                _SortChip(
                  label: 'Rating',
                  selected: state.sort == PsychologistSort.rating,
                  onTap: () => notifier.setSort(PsychologistSort.rating),
                ),
                const SizedBox(width: AppSpacing.xs),
                _SortChip(
                  label: 'Termurah',
                  selected: state.sort == PsychologistSort.cheapest,
                  onTap: () => notifier.setSort(PsychologistSort.cheapest),
                ),
                const SizedBox(width: AppSpacing.xs),
                _SortChip(
                  label: 'Tersedia Hari Ini',
                  selected: state.sort == PsychologistSort.availableToday,
                  onTap: () =>
                      notifier.setSort(PsychologistSort.availableToday),
                ),
              ],
            ),
          ),

          // List
          Expanded(
            child: state.psychologists.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.error_outline,
                        color: AppColors.danger500, size: 40),
                    const SizedBox(height: AppSpacing.sm),
                    Text('Gagal memuat data', style: AppTextStyles.bodyM),
                    const SizedBox(height: AppSpacing.xs),
                    TextButton(
                      onPressed: () =>
                          ref.read(psychologistListProvider.notifier).load(),
                      child: const Text('Coba lagi'),
                    ),
                  ],
                ),
              ),
              data: (list) => list.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.person_search_outlined,
                              size: 48, color: AppColors.fg4),
                          const SizedBox(height: AppSpacing.sm),
                          Text('Psikolog tidak ditemukan',
                              style: AppTextStyles.bodyM
                                  .copyWith(color: AppColors.fg3)),
                        ],
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(
                        AppSpacing.screenPadding,
                        AppSpacing.xs,
                        AppSpacing.screenPadding,
                        AppSpacing.xxxl,
                      ),
                      itemCount: list.length,
                      separatorBuilder: (_, __) =>
                          const SizedBox(height: AppSpacing.sm),
                      itemBuilder: (_, i) =>
                          _PsychologistCard(psychologist: list[i]),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SortChip extends StatelessWidget {
  const _SortChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding:
            const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: 4),
        decoration: BoxDecoration(
          color: selected ? AppColors.biru50 : Colors.transparent,
          borderRadius: BorderRadius.circular(AppRadius.pill),
          border: Border.all(
            color: selected ? AppColors.biru400 : AppColors.borderSoft,
          ),
        ),
        child: Text(
          label,
          style: AppTextStyles.meta.copyWith(
            color: selected ? AppColors.biru600 : AppColors.fg3,
            fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
          ),
        ),
      ),
    );
  }
}

class _PsychologistCard extends StatelessWidget {
  const _PsychologistCard({required this.psychologist});

  final Psychologist psychologist;

  String _formatPrice(int price) {
    if (price == 0) return 'Gratis';
    final formatted = price.toString().replaceAllMapped(
          RegExp(r'(\d)(?=(\d{3})+$)'),
          (m) => '${m[1]}.',
        );
    return 'Rp $formatted';
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/home/telemedicine/${psychologist.id}'),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: AppColors.surfaceRaised,
          borderRadius: BorderRadius.circular(AppRadius.card),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Avatar
            ClipRRect(
              borderRadius: BorderRadius.circular(AppRadius.md),
              child: psychologist.photoUrl.isNotEmpty
                  ? Image.network(
                      psychologist.photoUrl,
                      width: 72,
                      height: 72,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) =>
                          _AvatarFallback(name: psychologist.name),
                    )
                  : _AvatarFallback(name: psychologist.name),
            ),
            const SizedBox(width: AppSpacing.sm),

            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Name + HIMPSI badge
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          psychologist.name,
                          style: AppTextStyles.bodyM
                              .copyWith(fontWeight: FontWeight.w700),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (psychologist.isHimpsiVerified) ...[
                        const SizedBox(width: AppSpacing.xs),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.biru50,
                            borderRadius: BorderRadius.circular(AppRadius.xs),
                            border: Border.all(color: AppColors.biru200),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.verified_rounded,
                                  size: 10, color: AppColors.biru500),
                              const SizedBox(width: 2),
                              Text(
                                'HIMPSI',
                                style: AppTextStyles.meta.copyWith(
                                  color: AppColors.biru600,
                                  fontSize: 9,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    psychologist.title,
                    style: AppTextStyles.bodyS.copyWith(color: AppColors.fg3),
                  ),
                  const SizedBox(height: AppSpacing.xs),

                  // Specializations
                  Wrap(
                    spacing: 4,
                    runSpacing: 4,
                    children: psychologist.specializations
                        .take(3)
                        .map(
                          (s) => Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.sage50,
                              borderRadius: BorderRadius.circular(AppRadius.xs),
                            ),
                            child: Text(
                              s,
                              style: AppTextStyles.meta
                                  .copyWith(color: AppColors.sage700),
                            ),
                          ),
                        )
                        .toList(),
                  ),
                  const SizedBox(height: AppSpacing.xs),

                  // Rating + availability + price
                  Row(
                    children: [
                      const Icon(Icons.star_rounded,
                          size: 14, color: AppColors.matahari400),
                      const SizedBox(width: 2),
                      Text(
                        psychologist.rating.toStringAsFixed(1),
                        style: AppTextStyles.meta
                            .copyWith(fontWeight: FontWeight.w700),
                      ),
                      Text(
                        ' (${psychologist.reviewCount})',
                        style:
                            AppTextStyles.meta.copyWith(color: AppColors.fg4),
                      ),
                      const Spacer(),
                      if (psychologist.isAvailableNow)
                        Container(
                          width: 7,
                          height: 7,
                          margin: const EdgeInsets.only(right: 4),
                          decoration: const BoxDecoration(
                            color: AppColors.success500,
                            shape: BoxShape.circle,
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
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AvatarFallback extends StatelessWidget {
  const _AvatarFallback({required this.name});
  final String name;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 72,
      height: 72,
      color: AppColors.biru100,
      child: Center(
        child: Text(
          name.isNotEmpty ? name[0].toUpperCase() : '?',
          style: AppTextStyles.h2.copyWith(color: AppColors.biru600),
        ),
      ),
    );
  }
}
