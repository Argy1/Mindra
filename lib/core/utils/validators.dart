abstract final class MindraValidators {
  static String? email(String? v) {
    if (v == null || v.isEmpty) return 'Email tidak boleh kosong';
    final re = RegExp(r'^[\w.+\-]+@[\w\-]+\.[a-zA-Z]{2,}$');
    if (!re.hasMatch(v.trim())) return 'Format email tidak valid';
    return null;
  }

  static String? password(String? v) {
    if (v == null || v.isEmpty) return 'Kata sandi tidak boleh kosong';
    if (v.length < 8) return 'Kata sandi minimal 8 karakter';
    return null;
  }

  static String? confirmPassword(String? v, String password) {
    if (v == null || v.isEmpty) return 'Konfirmasi kata sandi tidak boleh kosong';
    if (v != password) return 'Kata sandi tidak cocok';
    return null;
  }

  static String? name(String? v) {
    if (v == null || v.trim().isEmpty) return 'Nama tidak boleh kosong';
    if (v.trim().length < 2) return 'Nama minimal 2 karakter';
    return null;
  }

  static String? required(String? v, {String label = 'Kolom ini'}) {
    if (v == null || v.trim().isEmpty) return '$label tidak boleh kosong';
    return null;
  }

  static String? phone(String? v) {
    if (v == null || v.isEmpty) return 'Nomor telepon tidak boleh kosong';
    final digits = v.replaceAll(RegExp(r'[\s\-\+]'), '');
    if (!RegExp(r'^[0-9]{9,15}$').hasMatch(digits)) {
      return 'Format nomor telepon tidak valid';
    }
    return null;
  }

  static String? minLength(String? v, int min, {String label = 'Teks'}) {
    if (v == null || v.isEmpty) return '$label tidak boleh kosong';
    if (v.length < min) return '$label minimal $min karakter';
    return null;
  }

  static String? maxLength(String? v, int max, {String label = 'Teks'}) {
    if (v != null && v.length > max) return '$label maksimal $max karakter';
    return null;
  }
}
