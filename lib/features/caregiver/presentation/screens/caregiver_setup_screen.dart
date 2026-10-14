import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../domain/entities/caregiver_entity.dart';
import '../providers/caregiver_provider.dart';

class CaregiverSetupScreen extends ConsumerStatefulWidget {
  const CaregiverSetupScreen({super.key});

  @override
  ConsumerState<CaregiverSetupScreen> createState() =>
      _CaregiverSetupScreenState();
}

class _CaregiverSetupScreenState extends ConsumerState<CaregiverSetupScreen> {
  bool _loaded = false;
  bool _showInviteForm = false;
  final _phoneCtrl = TextEditingController();
  CaregiverPermissions _permissions = const CaregiverPermissions();

  @override
  void dispose() {
    _phoneCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    final state = ref.watch(patientCaregiverProvider);
    final notifier = ref.read(patientCaregiverProvider.notifier);

    if (!_loaded && user != null) {
      _loaded = true;
      WidgetsBinding.instance
          .addPostFrameCallback((_) => notifier.load(user.id));
    }

    // Show invite code dialog if just created
    if (state.pendingInviteCode != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _showInviteCodeDialog(context, state.pendingInviteCode!);
        notifier.clearInviteCode();
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
        title: Text('Kelola Pendampingku', style: AppTextStyles.h3),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Explainer
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.biru50,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              'Pendampingmu akan dapat melihat data yang kamu izinkan. Kamu dapat mencabut akses kapan saja.',
              style: AppTextStyles.bodyM
                  .copyWith(color: AppColors.biru700, height: 1.5),
            ),
          ),

          const SizedBox(height: 24),

          // Existing caregivers
          if (state.isLoading)
            const Center(child: CircularProgressIndicator())
          else if (state.relationships.isEmpty && !_showInviteForm)
            _EmptyCaregiversView(onAdd: () => setState(() => _showInviteForm = true))
          else ...[
            if (state.relationships.isNotEmpty) ...[
              Text('Pendampingku',
                  style: AppTextStyles.h4.copyWith(color: AppColors.fg2)),
              const SizedBox(height: 12),
              ...state.relationships.map((r) => _CaregiverRelationshipTile(
                    relationship: r,
                    onRemove: () async {
                      final ok = await _confirmRemove(context);
                      if (ok && mounted) notifier.remove(r.id);
                    },
                    onPermissionChanged: (perms) =>
                        notifier.updatePermissions(r.id, perms),
                  )),
              const SizedBox(height: 20),
            ],
          ],

          // Invite form
          if (_showInviteForm) ...[
            Text('Undang pendamping baru',
                style: AppTextStyles.h4.copyWith(color: AppColors.fg2)),
            const SizedBox(height: 14),

            // Phone input
            TextField(
              controller: _phoneCtrl,
              keyboardType: TextInputType.phone,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              style: AppTextStyles.bodyM.copyWith(color: AppColors.fg1),
              decoration: InputDecoration(
                labelText: 'Nomor telepon pendamping',
                hintText: '08xxxxxxxxxx',
                prefixIcon: const Icon(Icons.phone_outlined,
                    color: AppColors.fg4, size: 20),
                filled: true,
                fillColor: AppColors.surfaceCard,
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppColors.borderSoft)),
                enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppColors.borderSoft)),
                focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(
                        color: AppColors.biru400, width: 1.5)),
              ),
            ),

            const SizedBox(height: 20),
            Text('Izin akses',
                style: AppTextStyles.h4.copyWith(color: AppColors.fg2)),
            const SizedBox(height: 8),
            Text(
              'Pilih data apa yang boleh dilihat pendampingmu.',
              style: AppTextStyles.bodyM.copyWith(color: AppColors.fg4),
            ),
            const SizedBox(height: 12),

            _PermissionsEditor(
              permissions: _permissions,
              onChanged: (p) => setState(() => _permissions = p),
            ),

            const SizedBox(height: 24),

            if (state.error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(state.error!,
                    style: AppTextStyles.bodyM
                        .copyWith(color: AppColors.danger500),
                    textAlign: TextAlign.center),
              ),

            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () =>
                        setState(() { _showInviteForm = false; _phoneCtrl.clear(); }),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.fg3,
                      side: const BorderSide(color: AppColors.borderMedium),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: const Text('Batal'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: FilledButton(
                    onPressed: state.isLoading || user == null
                        ? null
                        : () async {
                            final phone = _phoneCtrl.text.trim();
                            if (phone.length < 9) return;
                            await notifier.invite(
                              patientId: user.id,
                              phone: phone,
                              permissions: _permissions,
                            );
                            if (mounted) {
                              setState(() => _showInviteForm = false);
                              _phoneCtrl.clear();
                            }
                          },
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.biru500,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: state.isLoading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white))
                        : const Text('Kirim Undangan'),
                  ),
                ),
              ],
            ),
          ] else if (!state.isLoading) ...[
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: () => setState(() => _showInviteForm = true),
              icon: const Icon(Icons.add, size: 18),
              label: const Text('Undang Pendamping Baru'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.biru500,
                side: const BorderSide(color: AppColors.biru300),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
                padding: const EdgeInsets.symmetric(vertical: 14),
                minimumSize: const Size(double.infinity, 0),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Future<bool> _confirmRemove(BuildContext context) async {
    return await showDialog<bool>(
          context: context,
          builder: (_) => AlertDialog(
            title: const Text('Hapus pendamping?'),
            content: const Text(
                'Pendampingmu tidak akan bisa lagi melihat datamu.'),
            actions: [
              TextButton(
                  onPressed: () => Navigator.pop(context, false),
                  child: const Text('Batal')),
              TextButton(
                onPressed: () => Navigator.pop(context, true),
                child: Text('Hapus',
                    style: TextStyle(color: AppColors.danger500)),
              ),
            ],
          ),
        ) ??
        false;
  }

  void _showInviteCodeDialog(BuildContext context, String code) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Kode Undangan'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Bagikan kode ini kepada pendampingmu. Mereka dapat memasukkannya di aplikasi Mindra.',
            ),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              decoration: BoxDecoration(
                color: AppColors.biru50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.biru200),
              ),
              child: Text(
                code,
                style: const TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 6,
                  color: AppColors.biru600,
                  fontFeatures: [FontFeature.tabularFigures()],
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Clipboard.setData(ClipboardData(text: code));
              Navigator.pop(context);
            },
            child: const Text('Salin & Tutup'),
          ),
        ],
      ),
    );
  }
}

// ─── Sub-widgets ──────────────────────────────────────────────────────────────

class _EmptyCaregiversView extends StatelessWidget {
  const _EmptyCaregiversView({required this.onAdd});
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const Icon(Icons.people_outline, size: 56, color: AppColors.fg4),
        const SizedBox(height: 12),
        Text('Belum ada pendamping',
            style: AppTextStyles.h4.copyWith(color: AppColors.fg3)),
        const SizedBox(height: 6),
        Text('Undang seseorang yang kamu percaya untuk mendampingimu.',
            style: AppTextStyles.bodyM.copyWith(color: AppColors.fg4),
            textAlign: TextAlign.center),
        const SizedBox(height: 20),
        FilledButton.icon(
          onPressed: onAdd,
          icon: const Icon(Icons.add, size: 18),
          label: const Text('Undang Pendamping'),
          style: FilledButton.styleFrom(
            backgroundColor: AppColors.biru500,
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12)),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          ),
        ),
      ],
    );
  }
}

class _CaregiverRelationshipTile extends StatelessWidget {
  const _CaregiverRelationshipTile({
    required this.relationship,
    required this.onRemove,
    required this.onPermissionChanged,
  });

  final CaregiverRelationship relationship;
  final VoidCallback onRemove;
  final void Function(CaregiverPermissions) onPermissionChanged;

  @override
  Widget build(BuildContext context) {
    final r = relationship;
    final isPending = r.status == RelationshipStatus.pending;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surfaceCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.borderSoft),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: isPending ? AppColors.warning100 : AppColors.sage100,
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Icon(
                    isPending ? Icons.hourglass_empty : Icons.person_outline,
                    size: 20,
                    color: isPending ? AppColors.warning500 : AppColors.sage600,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      r.caregiverName ?? r.caregiverPhone ?? 'Pendamping',
                      style: AppTextStyles.bodyM.copyWith(
                          color: AppColors.fg1, fontWeight: FontWeight.w600),
                    ),
                    Text(
                      isPending ? 'Menunggu konfirmasi' : 'Aktif',
                      style: AppTextStyles.label.copyWith(
                        color: isPending
                            ? AppColors.warning500
                            : AppColors.sage500,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.remove_circle_outline,
                    color: AppColors.danger300, size: 20),
                onPressed: onRemove,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
            ],
          ),
          if (!isPending) ...[
            const Divider(height: 20),
            Text('Izin akses',
                style: AppTextStyles.label
                    .copyWith(color: AppColors.fg4, fontSize: 12)),
            const SizedBox(height: 8),
            _PermissionsEditor(
              permissions: r.permissions,
              onChanged: onPermissionChanged,
              compact: true,
            ),
          ],
        ],
      ),
    );
  }
}

class _PermissionsEditor extends StatelessWidget {
  const _PermissionsEditor(
      {required this.permissions, required this.onChanged, this.compact = false});

  final CaregiverPermissions permissions;
  final void Function(CaregiverPermissions) onChanged;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _PermTile(
          icon: Icons.mood_outlined,
          label: 'Mood harian (nilai saja)',
          value: permissions.moodDaily,
          onChanged: (v) => onChanged(permissions.copyWith(moodDaily: v)),
          compact: compact,
        ),
        _PermTile(
          icon: Icons.assignment_outlined,
          label: 'Hasil asesmen',
          value: permissions.assessmentResults,
          onChanged: (v) =>
              onChanged(permissions.copyWith(assessmentResults: v)),
          compact: compact,
        ),
        _PermTile(
          icon: Icons.access_time_outlined,
          label: 'Status aktivitas aplikasi',
          value: permissions.appActivity,
          onChanged: (v) => onChanged(permissions.copyWith(appActivity: v)),
          compact: compact,
        ),
        _PermTile(
          icon: Icons.notifications_active_outlined,
          label: 'Notifikasi darurat',
          value: permissions.emergencyAlerts,
          onChanged: (v) =>
              onChanged(permissions.copyWith(emergencyAlerts: v)),
          compact: compact,
        ),
      ],
    );
  }
}

class _PermTile extends StatelessWidget {
  const _PermTile({
    required this.icon,
    required this.label,
    required this.value,
    required this.onChanged,
    this.compact = false,
  });

  final IconData icon;
  final String label;
  final bool value;
  final void Function(bool) onChanged;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: compact ? 2 : 4),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppColors.fg3),
          const SizedBox(width: 10),
          Expanded(
            child: Text(label,
                style: AppTextStyles.bodyM.copyWith(
                    color: AppColors.fg2,
                    fontSize: compact ? 13 : 14)),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeThumbColor: AppColors.biru500,
            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
        ],
      ),
    );
  }
}
