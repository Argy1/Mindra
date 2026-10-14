import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../domain/entities/facility_entity.dart';
import '../providers/facilities_provider.dart';

class FacilitiesMapScreen extends ConsumerStatefulWidget {
  const FacilitiesMapScreen({super.key, this.isCrisisMode = false});

  final bool isCrisisMode;

  @override
  ConsumerState<FacilitiesMapScreen> createState() => _FacilitiesMapScreenState();
}

class _FacilitiesMapScreenState extends ConsumerState<FacilitiesMapScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseCtrl;
  late Animation<double> _pulseAnim;
  final _searchCtrl = TextEditingController();
  final _sheetCtrl = DraggableScrollableController();

  @override
  void initState() {
    super.initState();
    _pulseCtrl = AnimationController(vsync: this, duration: const Duration(seconds: 2))
      ..repeat(reverse: true);
    _pulseAnim = Tween<double>(begin: 0.8, end: 1.2).animate(
      CurvedAnimation(parent: _pulseCtrl, curve: Curves.easeInOut),
    );

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (widget.isCrisisMode) {
        ref.read(facilitiesProvider.notifier).setCrisisMode(true);
      }
    });
  }

  @override
  void dispose() {
    _pulseCtrl.dispose();
    _searchCtrl.dispose();
    _sheetCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(facilitiesProvider);
    final isCrisis = state.isCrisisMode;

    return Scaffold(
      backgroundColor: Colors.grey[200],
      body: Stack(
        children: [
          // Map canvas
          Positioned.fill(
            child: _MapCanvas(
              facilities: state.filtered,
              userLat: state.userLat,
              userLng: state.userLng,
              selectedFacility: state.selectedFacility,
              pulseAnim: _pulseAnim,
              onTap: (f) => ref.read(facilitiesProvider.notifier).selectFacility(f),
            ),
          ),

          // Top bar
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: _TopBar(
              isCrisisMode: isCrisis,
              onBack: () => Navigator.pop(context),
            ),
          ),

          // Bottom sheet
          DraggableScrollableSheet(
            controller: _sheetCtrl,
            initialChildSize: 0.38,
            minChildSize: 0.12,
            maxChildSize: 0.85,
            snap: true,
            snapSizes: const [0.12, 0.38, 0.85],
            builder: (ctx, scrollCtrl) => _BottomSheet(
              scrollController: scrollCtrl,
              searchCtrl: _searchCtrl,
              facilities: state.filtered,
              isCrisisMode: isCrisis,
              isLoading: state.isLoading,
              error: state.error,
              activeFilters: state.activeFilters,
              selectedFacility: state.selectedFacility,
              onToggleFilter: (t) => ref.read(facilitiesProvider.notifier).toggleFilter(t),
              onSearch: (q) => ref.read(facilitiesProvider.notifier).setSearch(q),
              onSelect: (f) {
                ref.read(facilitiesProvider.notifier).selectFacility(f);
                _sheetCtrl.animateTo(0.38,
                    duration: const Duration(milliseconds: 300),
                    curve: Curves.easeOut);
              },
              onClearSelection: () =>
                  ref.read(facilitiesProvider.notifier).selectFacility(null),
            ),
          ),

          // Crisis mode toggle button
          Positioned(
            top: kToolbarHeight + MediaQuery.of(context).padding.top + 8,
            right: 16,
            child: _CrisisToggle(
              isCrisisMode: isCrisis,
              onToggle: () =>
                  ref.read(facilitiesProvider.notifier).setCrisisMode(!isCrisis),
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Top Bar
// ─────────────────────────────────────────────────────────────────────────────

class _TopBar extends StatelessWidget {
  const _TopBar({required this.isCrisisMode, required this.onBack});

  final bool isCrisisMode;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.of(context).padding.top;
    return Container(
      padding: EdgeInsets.only(top: top),
      decoration: BoxDecoration(
        color: isCrisisMode ? AppColors.danger500 : AppColors.biru500,
        boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 4)],
      ),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.arrow_back, color: Colors.white),
            onPressed: onBack,
          ),
          Expanded(
            child: Text(
              isCrisisMode ? 'Layanan Darurat Terdekat' : 'Peta Fasilitas Mental',
              style: AppTextStyles.h3.copyWith(color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Crisis Toggle Button
// ─────────────────────────────────────────────────────────────────────────────

class _CrisisToggle extends StatelessWidget {
  const _CrisisToggle({required this.isCrisisMode, required this.onToggle});

  final bool isCrisisMode;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onToggle,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isCrisisMode ? AppColors.danger500 : AppColors.surfaceCard,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 6, offset: const Offset(0, 2))],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.emergency,
              size: 16,
              color: isCrisisMode ? Colors.white : AppColors.danger500,
            ),
            const SizedBox(width: 4),
            Text(
              isCrisisMode ? 'Mode Darurat' : 'Darurat',
              style: AppTextStyles.label.copyWith(
                color: isCrisisMode ? Colors.white : AppColors.danger500,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Map Canvas (CustomPainter)
// ─────────────────────────────────────────────────────────────────────────────

class _MapCanvas extends StatelessWidget {
  const _MapCanvas({
    required this.facilities,
    required this.userLat,
    required this.userLng,
    required this.selectedFacility,
    required this.pulseAnim,
    required this.onTap,
  });

  final List<MentalHealthFacility> facilities;
  final double userLat, userLng;
  final MentalHealthFacility? selectedFacility;
  final Animation<double> pulseAnim;
  final void Function(MentalHealthFacility) onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapUp: (details) {
        final box = context.findRenderObject() as RenderBox;
        final size = box.size;
        final pos = details.localPosition;

        // Viewport: ±1.5° from user center
        const viewHalf = 1.5;
        final minLat = userLat - viewHalf;
        final maxLat = userLat + viewHalf;
        final minLng = userLng - viewHalf;
        final maxLng = userLng + viewHalf;

        for (final f in facilities.reversed) {
          final fx = (f.longitude - minLng) / (maxLng - minLng) * size.width;
          final fy = (1 - (f.latitude - minLat) / (maxLat - minLat)) * size.height;
          if ((pos - Offset(fx, fy)).distance < 22) {
            onTap(f);
            return;
          }
        }
      },
      child: AnimatedBuilder(
        animation: pulseAnim,
        builder: (_, __) => CustomPaint(
          painter: _MapPainter(
            facilities: facilities,
            userLat: userLat,
            userLng: userLng,
            selected: selectedFacility,
            pulse: pulseAnim.value,
          ),
          child: Container(),
        ),
      ),
    );
  }
}

class _MapPainter extends CustomPainter {
  _MapPainter({
    required this.facilities,
    required this.userLat,
    required this.userLng,
    required this.selected,
    required this.pulse,
  });

  final List<MentalHealthFacility> facilities;
  final double userLat, userLng;
  final MentalHealthFacility? selected;
  final double pulse;

  static const _viewHalf = 1.5;

  Offset _project(double lat, double lng, Size size) {
    final minLat = userLat - _viewHalf;
    final maxLat = userLat + _viewHalf;
    final minLng = userLng - _viewHalf;
    final maxLng = userLng + _viewHalf;
    final x = (lng - minLng) / (maxLng - minLng) * size.width;
    final y = (1 - (lat - minLat) / (maxLat - minLat)) * size.height;
    return Offset(x, y);
  }

  Color _typeColor(FacilityType type) => switch (type) {
        FacilityType.rsjiwa => const Color(0xFFC0392B),
        FacilityType.klinikJiwa => const Color(0xFF2E6DA4),
        FacilityType.puskesmas => const Color(0xFF4A9E8F),
        FacilityType.psikiater => const Color(0xFFE07B00),
      };

  @override
  void paint(Canvas canvas, Size size) {
    // Map background: light beige
    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height),
        Paint()..color = const Color(0xFFE8E0D8));

    // Grid lines (simulate road grid)
    final gridPaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.6)
      ..strokeWidth = 1;
    for (var i = 0; i < 10; i++) {
      canvas.drawLine(Offset(size.width / 10 * i, 0),
          Offset(size.width / 10 * i, size.height), gridPaint);
      canvas.drawLine(Offset(0, size.height / 10 * i),
          Offset(size.width, size.height / 10 * i), gridPaint);
    }

    final userPos = _project(userLat, userLng, size);

    // User pulse ring
    final pulsePaint = Paint()
      ..color = AppColors.biru500.withValues(alpha: 0.2)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(userPos, 20 * pulse, pulsePaint);

    // Facility dots
    for (final f in facilities) {
      final pos = _project(f.latitude, f.longitude, size);
      final isSelected = selected?.id == f.id;
      final color = _typeColor(f.type);

      // Shadow for selected
      if (isSelected) {
        canvas.drawCircle(
            pos + const Offset(0, 2),
            18,
            Paint()
              ..color = Colors.black38
              ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4));
      }

      // Outer ring for selected
      if (isSelected) {
        canvas.drawCircle(pos, 18,
            Paint()
              ..color = color
              ..style = PaintingStyle.stroke
              ..strokeWidth = 2.5);
      }

      // Dot
      canvas.drawCircle(pos, isSelected ? 14 : 10,
          Paint()..color = color);

      // White inner
      canvas.drawCircle(pos, isSelected ? 6 : 4,
          Paint()..color = Colors.white);

      // IGD badge
      if (f.hasIgd) {
        canvas.drawCircle(
          pos + const Offset(8, -8),
          5,
          Paint()..color = const Color(0xFFC0392B),
        );
        final tp = TextPainter(
          text: const TextSpan(
            text: '!',
            style: TextStyle(color: Colors.white, fontSize: 7, fontWeight: FontWeight.bold),
          ),
          textDirection: TextDirection.ltr,
        )..layout();
        tp.paint(canvas, pos + const Offset(5.5, -11));
      }
    }

    // User dot
    canvas.drawCircle(userPos, 8, Paint()..color = AppColors.biru500);
    canvas.drawCircle(userPos, 4, Paint()..color = Colors.white);
  }

  @override
  bool shouldRepaint(_MapPainter old) =>
      old.pulse != pulse || old.selected != selected || old.facilities != facilities;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bottom Sheet
// ─────────────────────────────────────────────────────────────────────────────

class _BottomSheet extends StatelessWidget {
  const _BottomSheet({
    required this.scrollController,
    required this.searchCtrl,
    required this.facilities,
    required this.isCrisisMode,
    required this.isLoading,
    required this.error,
    required this.activeFilters,
    required this.selectedFacility,
    required this.onToggleFilter,
    required this.onSearch,
    required this.onSelect,
    required this.onClearSelection,
  });

  final ScrollController scrollController;
  final TextEditingController searchCtrl;
  final List<MentalHealthFacility> facilities;
  final bool isCrisisMode;
  final bool isLoading;
  final String? error;
  final List<FacilityType> activeFilters;
  final MentalHealthFacility? selectedFacility;
  final void Function(FacilityType) onToggleFilter;
  final void Function(String) onSearch;
  final void Function(MentalHealthFacility) onSelect;
  final VoidCallback onClearSelection;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surfaceCard,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 12, offset: Offset(0, -2))],
      ),
      child: Column(
        children: [
          // Drag handle
          Container(
            margin: const EdgeInsets.symmetric(vertical: 10),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.borderMedium,
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // Selected facility detail
          if (selectedFacility != null) ...[
            _FacilityDetailCard(
              facility: selectedFacility!,
              onClose: onClearSelection,
            ),
            const Divider(height: 1),
          ],

          // Search bar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: TextField(
              controller: searchCtrl,
              onChanged: onSearch,
              style: AppTextStyles.bodyM,
              decoration: InputDecoration(
                hintText: 'Cari nama atau alamat...',
                hintStyle: AppTextStyles.bodyM.copyWith(color: AppColors.fg4),
                prefixIcon: const Icon(Icons.search, size: 20),
                suffixIcon: searchCtrl.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 18),
                        onPressed: () {
                          searchCtrl.clear();
                          onSearch('');
                        },
                      )
                    : null,
                filled: true,
                fillColor: AppColors.surfaceCanvas,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.borderSoft),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.borderSoft),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.biru500, width: 1.5),
                ),
              ),
            ),
          ),

          // Filter chips (hidden in crisis mode — already filtered)
          if (!isCrisisMode)
            SizedBox(
              height: 36,
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                scrollDirection: Axis.horizontal,
                itemCount: FacilityType.values.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (_, i) {
                  final type = FacilityType.values[i];
                  final active = activeFilters.contains(type);
                  return FilterChip(
                    label: Text('${type.emoji} ${type.label}'),
                    labelStyle: AppTextStyles.label.copyWith(
                      color: active ? Colors.white : AppColors.fg2,
                    ),
                    selected: active,
                    onSelected: (_) => onToggleFilter(type),
                    backgroundColor: AppColors.surfaceCanvas,
                    selectedColor: AppColors.biru500,
                    checkmarkColor: Colors.white,
                    side: BorderSide(
                      color: active ? AppColors.biru500 : AppColors.borderSoft,
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                  );
                },
              ),
            ),

          const SizedBox(height: 8),

          // Count label
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Text(
                  '${facilities.length} fasilitas ditemukan',
                  style: AppTextStyles.label.copyWith(color: AppColors.fg4),
                ),
              ],
            ),
          ),
          const SizedBox(height: 4),

          // List
          Expanded(
            child: isLoading
                ? const Center(child: CircularProgressIndicator())
                : error != null
                    ? _ErrorView(message: error!)
                    : facilities.isEmpty
                        ? const _EmptyView()
                        : ListView.builder(
                            controller: scrollController,
                            itemCount: facilities.length,
                            itemBuilder: (_, i) => _FacilityListTile(
                              facility: facilities[i],
                              isSelected: selectedFacility?.id == facilities[i].id,
                              onTap: () => onSelect(facilities[i]),
                            ),
                          ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Facility Detail Card
// ─────────────────────────────────────────────────────────────────────────────

class _FacilityDetailCard extends StatelessWidget {
  const _FacilityDetailCard({required this.facility, required this.onClose});

  final MentalHealthFacility facility;
  final VoidCallback onClose;

  Future<void> _openMaps() async {
    final uri = Uri.parse(
      'https://www.google.com/maps/dir/?api=1'
      '&destination=${facility.latitude},${facility.longitude}'
      '&travelmode=driving',
    );
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surfaceCanvas,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderSoft),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: _typeColor(facility.type).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Center(
                  child: Text(facility.type.emoji, style: const TextStyle(fontSize: 18)),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(facility.name,
                        style: AppTextStyles.bodyM.copyWith(fontWeight: FontWeight.w600),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 2),
                    Text(facility.type.label,
                        style: AppTextStyles.label.copyWith(color: AppColors.fg4)),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close, size: 18),
                onPressed: onClose,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.location_on_outlined, size: 14, color: AppColors.fg4),
              const SizedBox(width: 4),
              Expanded(
                child: Text(facility.address,
                    style: AppTextStyles.bodyS.copyWith(color: AppColors.fg3),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis),
              ),
            ],
          ),
          if (facility.distanceKm != null) ...[
            const SizedBox(height: 4),
            Row(children: [
              const Icon(Icons.near_me_outlined, size: 14, color: AppColors.biru500),
              const SizedBox(width: 4),
              Text(facility.distanceLabel,
                  style: AppTextStyles.label.copyWith(color: AppColors.biru500)),
              const SizedBox(width: 12),
              if (facility.hasIgd) ...[
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.danger50,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text('IGD 24 jam',
                      style: AppTextStyles.label.copyWith(color: AppColors.danger500)),
                ),
                const SizedBox(width: 8),
              ],
              if (facility.hasBpjs) ...[
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.success50,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text('BPJS',
                      style: AppTextStyles.label.copyWith(color: AppColors.success500)),
                ),
              ],
            ]),
          ],
          if (facility.phone != null) ...[
            const SizedBox(height: 4),
            Row(children: [
              const Icon(Icons.phone_outlined, size: 14, color: AppColors.fg4),
              const SizedBox(width: 4),
              Text(facility.phone!,
                  style: AppTextStyles.bodyS.copyWith(color: AppColors.fg3)),
            ]),
          ],
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: _openMaps,
              icon: const Icon(Icons.directions, size: 18),
              label: const Text('Petunjuk Arah'),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.biru500,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Color _typeColor(FacilityType type) => switch (type) {
        FacilityType.rsjiwa => AppColors.danger500,
        FacilityType.klinikJiwa => AppColors.biru500,
        FacilityType.puskesmas => AppColors.sage500,
        FacilityType.psikiater => AppColors.matahari500,
      };
}

// ─────────────────────────────────────────────────────────────────────────────
// Facility List Tile
// ─────────────────────────────────────────────────────────────────────────────

class _FacilityListTile extends StatelessWidget {
  const _FacilityListTile({
    required this.facility,
    required this.isSelected,
    required this.onTap,
  });

  final MentalHealthFacility facility;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.biru50 : null,
          border: Border(bottom: BorderSide(color: AppColors.borderSoft, width: 0.5)),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: _typeColor(facility.type).withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Center(
                child: Text(facility.type.emoji, style: const TextStyle(fontSize: 20)),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(facility.name,
                      style: AppTextStyles.bodyM.copyWith(
                        fontWeight: FontWeight.w600,
                        color: isSelected ? AppColors.biru700 : AppColors.fg1,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      Text(facility.type.label,
                          style: AppTextStyles.label.copyWith(color: AppColors.fg4)),
                      if (facility.hasIgd) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                          decoration: BoxDecoration(
                            color: AppColors.danger50,
                            borderRadius: BorderRadius.circular(3),
                          ),
                          child: Text('IGD',
                              style: AppTextStyles.label.copyWith(
                                  color: AppColors.danger500, fontSize: 9)),
                        ),
                      ],
                      if (facility.hasBpjs) ...[
                        const SizedBox(width: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                          decoration: BoxDecoration(
                            color: AppColors.success50,
                            borderRadius: BorderRadius.circular(3),
                          ),
                          child: Text('BPJS',
                              style: AppTextStyles.label.copyWith(
                                  color: AppColors.success500, fontSize: 9)),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(facility.address,
                      style: AppTextStyles.bodyS.copyWith(color: AppColors.fg3),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                if (facility.distanceKm != null)
                  Text(facility.distanceLabel,
                      style: AppTextStyles.label.copyWith(color: AppColors.biru500)),
                const Icon(Icons.chevron_right, color: AppColors.fg4, size: 18),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Color _typeColor(FacilityType type) => switch (type) {
        FacilityType.rsjiwa => AppColors.danger500,
        FacilityType.klinikJiwa => AppColors.biru500,
        FacilityType.puskesmas => AppColors.sage500,
        FacilityType.psikiater => AppColors.matahari500,
      };
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty / Error views
// ─────────────────────────────────────────────────────────────────────────────

class _EmptyView extends StatelessWidget {
  const _EmptyView();

  @override
  Widget build(BuildContext context) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.search_off, size: 48, color: AppColors.fg4),
            const SizedBox(height: 8),
            Text('Tidak ada fasilitas ditemukan',
                style: AppTextStyles.bodyM.copyWith(color: AppColors.fg4)),
          ],
        ),
      );
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: AppColors.danger500),
              const SizedBox(height: 8),
              Text(message,
                  style: AppTextStyles.bodyM.copyWith(color: AppColors.fg3),
                  textAlign: TextAlign.center),
            ],
          ),
        ),
      );
}
