import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../domain/entities/emergency_contact_entity.dart';
import '../providers/crisis_provider.dart';

class EmergencyContactsScreen extends ConsumerWidget {
  const EmergencyContactsScreen({super.key});

  Future<void> _callContact(String phone) async {
    final cleaned = phone.replaceAll(RegExp(r'[^\d+]'), '');
    final uri = Uri(scheme: 'tel', path: cleaned);
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final contactsAsync = ref.watch(emergencyContactsProvider);

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
        title: Text('Kontak Darurat', style: AppTextStyles.h3),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.biru500,
        foregroundColor: Colors.white,
        onPressed: () => _showContactSheet(context, ref),
        icon: const Icon(Icons.add_rounded),
        label: Text('Tambah',
            style: AppTextStyles.buttonM.copyWith(color: Colors.white)),
      ),
      body: contactsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline,
                  color: AppColors.danger500, size: 40),
              const SizedBox(height: AppSpacing.sm),
              Text('Gagal memuat kontak', style: AppTextStyles.bodyM),
              const SizedBox(height: AppSpacing.xs),
              TextButton(
                onPressed: () => ref.invalidate(emergencyContactsProvider),
                child: const Text('Coba lagi'),
              ),
            ],
          ),
        ),
        data: (contacts) {
          if (contacts.isEmpty) {
            return _EmptyState(onAdd: () => _showContactSheet(context, ref));
          }

          return ListView.separated(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.screenPadding,
              AppSpacing.sm,
              AppSpacing.screenPadding,
              80,
            ),
            itemCount: contacts.length,
            separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
            itemBuilder: (_, i) {
              final c = contacts[i];
              return _ContactTile(
                contact: c,
                onCall: () => _callContact(c.phone),
                onEdit: () => _showContactSheet(context, ref, existing: c),
                onDelete: () => _confirmDelete(context, ref, c),
              );
            },
          );
        },
      ),
    );
  }

  void _showContactSheet(
    BuildContext context,
    WidgetRef ref, {
    EmergencyContact? existing,
  }) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surfaceRaised,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(AppRadius.modal),
        ),
      ),
      builder: (_) => _ContactFormSheet(existing: existing),
    );
  }

  void _confirmDelete(
    BuildContext context,
    WidgetRef ref,
    EmergencyContact contact,
  ) {
    showDialog<void>(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.cardHero),
        ),
        title: Text('Hapus kontak?', style: AppTextStyles.h3),
        content: Text(
          '${contact.name} akan dihapus dari kontak daruratmu.',
          style: AppTextStyles.bodyM.copyWith(color: AppColors.fg2),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Batal',
                style: AppTextStyles.bodyM.copyWith(color: AppColors.fg3)),
          ),
          FilledButton(
            onPressed: () async {
              Navigator.pop(context);
              await ref
                  .read(emergencyContactsControllerProvider.notifier)
                  .delete(contact.id);
            },
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.danger500,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppRadius.pill),
              ),
            ),
            child: Text('Hapus',
                style: AppTextStyles.buttonM.copyWith(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.onAdd});
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 96,
              height: 96,
              decoration: BoxDecoration(
                color: AppColors.biru50,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.people_outline_rounded,
                size: 48,
                color: AppColors.biru400,
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            Text('Belum ada kontak darurat',
                style: AppTextStyles.h3, textAlign: TextAlign.center),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Tambahkan orang-orang terdekatmu yang bisa\n'
              'dihubungi saat kamu butuh dukungan.',
              style: AppTextStyles.bodyM.copyWith(
                color: AppColors.fg3,
                height: 1.55,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.xl),
            FilledButton.icon(
              onPressed: onAdd,
              icon: const Icon(Icons.add_rounded, size: 18),
              label: const Text('Tambah Kontak'),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.biru500,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppRadius.pill),
                ),
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.xl,
                  vertical: AppSpacing.sm,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────

class _ContactTile extends StatelessWidget {
  const _ContactTile({
    required this.contact,
    required this.onCall,
    required this.onEdit,
    required this.onDelete,
  });

  final EmergencyContact contact;
  final VoidCallback onCall;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surfaceRaised,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: contact.isPrimary
            ? Border.all(color: AppColors.biru400, width: 1.5)
            : Border.all(color: AppColors.borderSoft),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          // Avatar
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: AppColors.biru100,
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                contact.name.isNotEmpty ? contact.name[0].toUpperCase() : '?',
                style: AppTextStyles.h3.copyWith(color: AppColors.biru600),
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),

          // Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        contact.name,
                        style: AppTextStyles.bodyM
                            .copyWith(fontWeight: FontWeight.w700),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (contact.isPrimary)
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.biru50,
                          borderRadius: BorderRadius.circular(AppRadius.xs),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.star_rounded,
                                size: 10, color: AppColors.biru500),
                            const SizedBox(width: 2),
                            Text(
                              'Utama',
                              style: AppTextStyles.meta.copyWith(
                                color: AppColors.biru600,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
                Text(
                  '${contact.relationship.label} • ${contact.phone}',
                  style: AppTextStyles.bodyS.copyWith(color: AppColors.fg3),
                ),
              ],
            ),
          ),

          // Actions
          IconButton(
            icon: const Icon(Icons.call_rounded, color: AppColors.success500),
            onPressed: onCall,
            tooltip: 'Hubungi',
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert_rounded, color: AppColors.fg3),
            onSelected: (v) {
              if (v == 'edit') onEdit();
              if (v == 'delete') onDelete();
            },
            itemBuilder: (_) => [
              const PopupMenuItem(
                value: 'edit',
                child: Row(
                  children: [
                    Icon(Icons.edit_outlined, size: 18),
                    SizedBox(width: 8),
                    Text('Edit'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'delete',
                child: Row(
                  children: [
                    Icon(Icons.delete_outline_rounded,
                        size: 18, color: AppColors.danger500),
                    SizedBox(width: 8),
                    Text('Hapus', style: TextStyle(color: AppColors.danger500)),
                  ],
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
// Add/edit form
// ─────────────────────────────────────────────────────────────────────────────

class _ContactFormSheet extends ConsumerStatefulWidget {
  const _ContactFormSheet({this.existing});
  final EmergencyContact? existing;

  @override
  ConsumerState<_ContactFormSheet> createState() => _ContactFormSheetState();
}

class _ContactFormSheetState extends ConsumerState<_ContactFormSheet> {
  late final TextEditingController _nameCtrl;
  late final TextEditingController _phoneCtrl;
  late ContactRelationship _relationship;
  late bool _isPrimary;
  String? _error;

  bool get _isEditing => widget.existing != null;

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    _nameCtrl = TextEditingController(text: e?.name ?? '');
    _phoneCtrl = TextEditingController(text: e?.phone ?? '');
    _relationship = e?.relationship ?? ContactRelationship.family;
    _isPrimary = e?.isPrimary ?? false;
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final name = _nameCtrl.text.trim();
    final phone = _phoneCtrl.text.trim();

    if (name.isEmpty) {
      setState(() => _error = 'Nama tidak boleh kosong');
      return;
    }
    if (phone.isEmpty || phone.length < 7) {
      setState(() => _error = 'Nomor telepon tidak valid');
      return;
    }
    setState(() => _error = null);

    final notifier = ref.read(emergencyContactsControllerProvider.notifier);
    final ok = _isEditing
        ? await notifier.update(
            widget.existing!.copyWith(
              name: name,
              phone: phone,
              relationship: _relationship,
              isPrimary: _isPrimary,
            ),
          )
        : await notifier.add(
            name: name,
            phone: phone,
            relationship: _relationship,
            isPrimary: _isPrimary,
          );

    if (!mounted) return;
    if (ok) {
      Navigator.pop(context);
    } else {
      setState(() => _error = 'Gagal menyimpan kontak. Coba lagi.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(emergencyContactsControllerProvider);
    final isLoading = state.isLoading;

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
            _isEditing ? 'Edit Kontak' : 'Tambah Kontak Darurat',
            style: AppTextStyles.h2,
          ),
          const SizedBox(height: AppSpacing.lg),

          // Name
          _FieldLabel(text: 'Nama'),
          const SizedBox(height: 4),
          TextField(
            controller: _nameCtrl,
            textCapitalization: TextCapitalization.words,
            decoration: _decoration(hint: 'mis. Ibu, Andi, dr. Sari'),
          ),
          const SizedBox(height: AppSpacing.md),

          // Phone
          _FieldLabel(text: 'Nomor Telepon'),
          const SizedBox(height: 4),
          TextField(
            controller: _phoneCtrl,
            keyboardType: TextInputType.phone,
            inputFormatters: [
              FilteringTextInputFormatter.allow(RegExp(r'[0-9+\-\s]')),
            ],
            decoration: _decoration(hint: '+62 812 3456 7890'),
          ),
          const SizedBox(height: AppSpacing.md),

          // Relationship
          _FieldLabel(text: 'Hubungan'),
          const SizedBox(height: 4),
          Container(
            padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.sm, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.surfaceCanvas,
              borderRadius: BorderRadius.circular(AppRadius.md),
              border: Border.all(color: AppColors.borderSoft),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<ContactRelationship>(
                value: _relationship,
                isExpanded: true,
                icon: const Icon(Icons.expand_more_rounded),
                onChanged: (v) {
                  if (v != null) setState(() => _relationship = v);
                },
                items: ContactRelationship.values
                    .map((r) => DropdownMenuItem(
                          value: r,
                          child: Text(r.label, style: AppTextStyles.bodyM),
                        ))
                    .toList(),
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.md),

          // Primary toggle
          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: () => setState(() => _isPrimary = !_isPrimary),
              borderRadius: BorderRadius.circular(AppRadius.md),
              child: Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
                child: Row(
                  children: [
                    const Icon(Icons.star_rounded,
                        color: AppColors.biru500, size: 20),
                    const SizedBox(width: AppSpacing.xs),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Jadikan kontak utama',
                              style: AppTextStyles.bodyM
                                  .copyWith(fontWeight: FontWeight.w600)),
                          Text(
                            'Akan ditampilkan paling atas saat krisis',
                            style: AppTextStyles.bodyS
                                .copyWith(color: AppColors.fg3),
                          ),
                        ],
                      ),
                    ),
                    Switch.adaptive(
                      value: _isPrimary,
                      activeTrackColor: AppColors.biru500,
                      onChanged: (v) => setState(() => _isPrimary = v),
                    ),
                  ],
                ),
              ),
            ),
          ),

          if (_error != null) ...[
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
                      _error!,
                      style: AppTextStyles.bodyS
                          .copyWith(color: AppColors.danger700),
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: AppSpacing.lg),

          FilledButton(
            onPressed: isLoading ? null : _save,
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.biru500,
              minimumSize: const Size.fromHeight(50),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppRadius.pill),
              ),
            ),
            child: isLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white),
                  )
                : Text(
                    _isEditing ? 'Simpan Perubahan' : 'Simpan',
                    style: AppTextStyles.buttonL.copyWith(color: Colors.white),
                  ),
          ),
        ],
      ),
    );
  }

  InputDecoration _decoration({required String hint}) => InputDecoration(
        hintText: hint,
        hintStyle: AppTextStyles.bodyM.copyWith(color: AppColors.fg4),
        filled: true,
        fillColor: AppColors.surfaceCanvas,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.sm,
        ),
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
          borderSide: const BorderSide(color: AppColors.biru400, width: 1.5),
        ),
      );
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: AppTextStyles.bodyS.copyWith(
        color: AppColors.fg2,
        fontWeight: FontWeight.w600,
      ),
    );
  }
}
