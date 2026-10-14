import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../domain/entities/chat_message_entity.dart';
import '../providers/companion_provider.dart';
import '../widgets/breathing_avatar.dart';
import '../widgets/crisis_overlay.dart';
import '../widgets/disclaimer_banner.dart';

class AiCompanionScreen extends ConsumerStatefulWidget {
  const AiCompanionScreen({super.key});

  @override
  ConsumerState<AiCompanionScreen> createState() => _AiCompanionScreenState();
}

class _AiCompanionScreenState extends ConsumerState<AiCompanionScreen> {
  final _controller = TextEditingController();
  final _focusNode = FocusNode();
  bool _crisisShowing = false;

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _send([String? preset]) {
    final text = (preset ?? _controller.text).trim();
    if (text.isEmpty) return;
    _controller.clear();
    ref.read(companionSessionProvider.notifier).sendMessage(text);
  }

  Future<void> _showCrisis() async {
    if (_crisisShowing) return;
    _crisisShowing = true;
    final result = await showCrisisOverlay(context);
    _crisisShowing = false;
    if (!mounted) return;
    // Clear the flag so it can re-trigger on a future detection.
    ref.read(crisisDetectedProvider.notifier).state = false;
    if (result == 'crisis') {
      if (mounted) context.push('/home/crisis');
    }
  }

  @override
  Widget build(BuildContext context) {
    final messages = ref.watch(companionSessionProvider);
    final isStreaming = messages.any((m) => m.isStreaming);
    final showDisclaimer = ref.watch(disclaimerBannerProvider);
    final lastError = ref.watch(companionErrorProvider);

    // Trigger crisis overlay when the flag flips to true.
    ref.listen<bool>(crisisDetectedProvider, (prev, next) {
      if (next && (prev != true)) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) _showCrisis();
        });
      }
    });

    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      appBar: AppBar(
        backgroundColor: AppColors.surfaceCanvas,
        elevation: 0,
        titleSpacing: AppSpacing.sm,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          color: AppColors.fg1,
          onPressed: () => context.pop(),
        ),
        title: Row(
          children: [
            BreathingAvatar(size: 36, active: isStreaming),
            const SizedBox(width: AppSpacing.xs),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Mindra', style: AppTextStyles.h3),
                  Text(
                    isStreaming
                        ? 'sedang mengetik…'
                        : 'AI Companion • Selalu ada untukmu',
                    style: AppTextStyles.meta.copyWith(color: AppColors.fg3),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.health_and_safety_outlined, size: 20),
            color: const Color(0xFFB91C1C),
            tooltip: 'Bantuan krisis',
            onPressed: () => context.push('/home/crisis'),
          ),
          if (messages.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.refresh_rounded, size: 20),
              color: AppColors.fg3,
              tooltip: 'Mulai percakapan baru',
              onPressed: () =>
                  ref.read(companionSessionProvider.notifier).clear(),
            ),
        ],
      ),
      body: Column(
        children: [
          if (showDisclaimer)
            DisclaimerBanner(
              onDismiss: () =>
                  ref.read(disclaimerBannerProvider.notifier).dismiss(),
            ),
          Expanded(
            child: messages.isEmpty
                ? _EmptyState(onSuggestionTap: _send)
                : _MessageList(messages: messages),
          ),
          if (lastError != null)
            _ErrorBar(
                message: lastError,
                onRetry: () {
                  ref.read(companionSessionProvider.notifier).retryLast();
                }),
          _QuickStartChips(onTap: _send),
          _InputBar(
            controller: _controller,
            focusNode: _focusNode,
            onSend: _send,
            isStreaming: isStreaming,
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────────────

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.onSuggestionTap});

  final void Function(String) onSuggestionTap;

  static const _starters = [
    'Aku merasa cemas hari ini',
    'Bantu aku latihan pernapasan',
    'Aku susah tidur belakangan ini',
    'Apa itu thought record?',
  ];

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.screenPadding),
      children: [
        const SizedBox(height: AppSpacing.xl),
        const Center(child: BreathingAvatar(size: 72, active: false)),
        const SizedBox(height: AppSpacing.lg),
        Center(
          child: Text(
            'Halo, aku Mindra.',
            style: AppTextStyles.h2,
            textAlign: TextAlign.center,
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        Center(
          child: Text(
            'Ceritakan apa yang kamu rasakan.\nAku di sini untuk mendengar.',
            style: AppTextStyles.bodyM.copyWith(color: AppColors.fg3),
            textAlign: TextAlign.center,
          ),
        ),
        const SizedBox(height: AppSpacing.xxl),
        Text('Mulai dari sini:', style: AppTextStyles.h4),
        const SizedBox(height: AppSpacing.md),
        Wrap(
          spacing: AppSpacing.xs,
          runSpacing: AppSpacing.xs,
          children: _starters
              .map(
                (s) => ActionChip(
                  label: Text(s, style: AppTextStyles.bodyS),
                  backgroundColor: AppColors.surfaceRaised,
                  side: const BorderSide(color: AppColors.borderSoft),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppRadius.pill),
                  ),
                  onPressed: () => onSuggestionTap(s),
                ),
              )
              .toList(),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Message list — reverse: true with newest at the bottom
// ─────────────────────────────────────────────────────────────────────────────

class _MessageList extends StatelessWidget {
  const _MessageList({required this.messages});
  final List<ChatMessage> messages;

  @override
  Widget build(BuildContext context) {
    final reversed = messages.reversed.toList();
    return ListView.builder(
      reverse: true,
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.screenPadding,
        vertical: AppSpacing.md,
      ),
      itemCount: reversed.length,
      itemBuilder: (_, i) => _MessageBubble(message: reversed[i]),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Bubble
// ─────────────────────────────────────────────────────────────────────────────

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.message});

  final ChatMessage message;

  @override
  Widget build(BuildContext context) {
    final isUser = message.role == MessageRole.user;
    final time = DateFormat('HH:mm', 'id_ID').format(message.createdAt);

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Column(
        crossAxisAlignment:
            isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            mainAxisAlignment:
                isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
            children: [
              if (!isUser) ...[
                const BreathingAvatar(size: 28),
                const SizedBox(width: AppSpacing.xs),
              ],
              Flexible(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.md,
                    vertical: AppSpacing.sm,
                  ),
                  constraints: BoxConstraints(
                    maxWidth: MediaQuery.sizeOf(context).width * 0.75,
                  ),
                  decoration: BoxDecoration(
                    color: isUser ? AppColors.biru500 : AppColors.biru50,
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(16),
                      topRight: const Radius.circular(16),
                      bottomLeft: Radius.circular(isUser ? 16 : 4),
                      bottomRight: Radius.circular(isUser ? 4 : 16),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.neutral900.withValues(alpha: 0.05),
                        blurRadius: 4,
                        offset: const Offset(0, 1),
                      ),
                    ],
                  ),
                  child: message.isStreaming && message.content.isEmpty
                      ? const _TypingIndicator()
                      : Text(
                          message.content,
                          style: AppTextStyles.bodyM.copyWith(
                            color: isUser ? Colors.white : AppColors.fg1,
                            height: 1.55,
                          ),
                        ),
                ),
              ),
              if (isUser) const SizedBox(width: 4),
            ],
          ),
          Padding(
            padding: EdgeInsets.only(
              top: 2,
              left: isUser ? 0 : 36,
              right: isUser ? 4 : 0,
            ),
            child: Text(
              time,
              style: AppTextStyles.meta.copyWith(color: AppColors.fg4),
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Typing indicator
// ─────────────────────────────────────────────────────────────────────────────

class _TypingIndicator extends StatefulWidget {
  const _TypingIndicator();

  @override
  State<_TypingIndicator> createState() => _TypingIndicatorState();
}

class _TypingIndicatorState extends State<_TypingIndicator>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 20,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: List.generate(3, (i) {
          return AnimatedBuilder(
            animation: _ctrl,
            builder: (_, __) {
              final phase = (_ctrl.value + i / 3) % 1.0;
              final opacity = (phase < 0.5) ? phase * 2 : (1 - phase) * 2;
              return Container(
                margin: const EdgeInsets.symmetric(horizontal: 2),
                width: 6,
                height: 6,
                decoration: BoxDecoration(
                  color:
                      AppColors.fg3.withValues(alpha: opacity.clamp(0.2, 1.0)),
                  shape: BoxShape.circle,
                ),
              );
            },
          );
        }),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Quick-start chips (above input)
// ─────────────────────────────────────────────────────────────────────────────

class _QuickStartChips extends StatelessWidget {
  const _QuickStartChips({required this.onTap});

  final void Function(String) onTap;

  static const _chips = [
    ('😔', 'Lagi sedih'),
    ('😰', 'Merasa cemas'),
    ('💬', 'Mau cerita'),
    ('😴', 'Susah tidur'),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 44,
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
      color: AppColors.surfaceCanvas,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: _chips.length,
        separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.xs),
        itemBuilder: (_, i) {
          final (emoji, label) = _chips[i];
          return ActionChip(
            label: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(emoji, style: const TextStyle(fontSize: 14)),
                const SizedBox(width: 4),
                Text(label, style: AppTextStyles.bodyS),
              ],
            ),
            backgroundColor: AppColors.surfaceRaised,
            side: const BorderSide(color: AppColors.borderSoft),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppRadius.pill),
            ),
            visualDensity: VisualDensity.compact,
            onPressed: () => onTap('$emoji $label'),
          );
        },
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Error bar with retry
// ─────────────────────────────────────────────────────────────────────────────

class _ErrorBar extends StatelessWidget {
  const _ErrorBar({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(
        AppSpacing.screenPadding,
        AppSpacing.xs,
        AppSpacing.screenPadding,
        AppSpacing.xs,
      ),
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: AppColors.danger50,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.danger200),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline_rounded,
              size: 16, color: AppColors.danger700),
          const SizedBox(width: AppSpacing.xs),
          Expanded(
            child: Text(
              message,
              style: AppTextStyles.bodyS
                  .copyWith(color: AppColors.danger700, height: 1.4),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(width: AppSpacing.xs),
          TextButton(
            onPressed: onRetry,
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
              minimumSize: const Size(0, 32),
              foregroundColor: AppColors.danger700,
            ),
            child: Text(
              'Coba lagi',
              style: AppTextStyles.label.copyWith(
                  color: AppColors.danger700, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Input bar
// ─────────────────────────────────────────────────────────────────────────────

class _InputBar extends StatelessWidget {
  const _InputBar({
    required this.controller,
    required this.focusNode,
    required this.onSend,
    required this.isStreaming,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final VoidCallback onSend;
  final bool isStreaming;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.sm,
        ),
        decoration: const BoxDecoration(
          color: AppColors.surfaceRaised,
          border: Border(
            top: BorderSide(color: AppColors.borderSoft),
          ),
        ),
        child: Row(
          children: [
            Expanded(
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.md,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: AppColors.surfaceCanvas,
                  borderRadius: BorderRadius.circular(AppRadius.pill),
                  border: Border.all(color: AppColors.borderSoft),
                ),
                child: TextField(
                  controller: controller,
                  focusNode: focusNode,
                  minLines: 1,
                  maxLines: 4,
                  textCapitalization: TextCapitalization.sentences,
                  decoration: const InputDecoration(
                    hintText: 'Ketik pesanmu…',
                    border: InputBorder.none,
                    isDense: true,
                    contentPadding: EdgeInsets.zero,
                  ),
                  onSubmitted: (_) => onSend(),
                ),
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            IconButton(
              onPressed: isStreaming ? null : onSend,
              icon: Icon(
                Icons.arrow_upward_rounded,
                color:
                    isStreaming ? AppColors.neutral300 : AppColors.fgOnPrimary,
              ),
              style: IconButton.styleFrom(
                backgroundColor:
                    isStreaming ? AppColors.neutral100 : AppColors.biru500,
                shape: const CircleBorder(),
                fixedSize: const Size(40, 40),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
