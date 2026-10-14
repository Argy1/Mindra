import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:permission_handler/permission_handler.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../constants/app_constants.dart';
import '../errors/app_exception.dart';

/// Wraps Agora RTC engine setup for video consultations.
///
/// agora_rtc_engine is commented out in pubspec.yaml until native SDKs are
/// configured per the README. All method bodies are stubbed; replace each
/// TODO block once the dependency is re-enabled.
class AgoraService {
  AgoraService._();
  static final AgoraService instance = AgoraService._();

  // TODO: replace with RtcEngine instance once agora_rtc_engine is added
  // RtcEngine? _engine;

  bool _initialized = false;
  bool get isInitialized => _initialized;

  /// Requests camera + microphone permissions, returns true if granted.
  Future<bool> requestPermissions() async {
    final statuses = await [
      Permission.camera,
      Permission.microphone,
    ].request();
    return statuses.values.every(
      (s) => s == PermissionStatus.granted,
    );
  }

  /// Fetches a short-lived RTC token from the Supabase Edge Function.
  ///
  /// Edge Function: `supabase/functions/generate-agora-token/index.ts`
  Future<String?> fetchToken({
    required String channelName,
    required String uid,
  }) async {
    try {
      final session = Supabase.instance.client.auth.currentSession;
      if (session == null) {
        throw const AppException(
            'Silakan login ulang untuk memulai video call.');
      }

      final resp = await http.post(
        Uri.parse(
          '${AppConstants.supabaseUrl}'
          '/functions/v1/generate-agora-token',
        ),
        headers: {
          'Authorization': 'Bearer ${session.accessToken}',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({'channel': channelName, 'uid': uid}),
      );

      if (resp.statusCode == 200) {
        final body = jsonDecode(resp.body) as Map<String, dynamic>;
        return body['token'] as String?;
      }
      throw AppException(
          'Gagal mengambil token video call (${resp.statusCode}).');
    } catch (e, st) {
      if (e is AppException) rethrow;
      throwAppException('Gagal mengambil token video call.', e, st);
    }
  }

  /// Initialises the Agora engine and joins a channel.
  ///
  /// [appId]       — from Agora console (store in .env as AGORA_APP_ID)
  /// [channelName] — unique per consultation (use consultationId)
  /// [token]       — fetched via [fetchToken]
  /// [uid]         — numeric user id (0 = auto-assign)
  Future<void> joinChannel({
    required String appId,
    required String channelName,
    required String token,
    required int uid,
  }) async {
    if (_initialized) return;

    // TODO: Uncomment once agora_rtc_engine is added to pubspec.yaml
    //
    // _engine = createAgoraRtcEngine();
    // await _engine!.initialize(RtcEngineContext(appId: appId));
    // await _engine!.enableVideo();
    // await _engine!.startPreview();
    // await _engine!.joinChannel(
    //   token: token,
    //   channelId: channelName,
    //   uid: uid,
    //   options: const ChannelMediaOptions(
    //     channelProfile: ChannelProfileType.channelProfileCommunication,
    //     clientRoleType: ClientRoleType.clientRoleBroadcaster,
    //   ),
    // );

    _initialized = true;
  }

  /// Mutes/unmutes local audio.
  Future<void> muteLocalAudio(bool mute) async {
    // TODO: await _engine?.muteLocalAudioStream(mute);
  }

  /// Enables/disables local camera.
  Future<void> muteLocalVideo(bool mute) async {
    // TODO: await _engine?.muteLocalVideoStream(mute);
  }

  /// Switches between front and back camera.
  Future<void> switchCamera() async {
    // TODO: await _engine?.switchCamera();
  }

  /// Leaves the channel and destroys the engine.
  Future<void> leaveChannel() async {
    if (!_initialized) return;
    // TODO: await _engine?.leaveChannel();
    // TODO: await _engine?.release();
    // TODO: _engine = null;
    _initialized = false;
  }
}
