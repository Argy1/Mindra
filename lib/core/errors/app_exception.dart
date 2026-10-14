class AppException implements Exception {
  const AppException(this.message, {this.cause});

  final String message;
  final Object? cause;

  @override
  String toString() => message;
}

Never throwAppException(
  String message,
  Object error,
  StackTrace stackTrace,
) {
  Error.throwWithStackTrace(
    AppException(message, cause: error),
    stackTrace,
  );
}

String errorMessage(Object error, {String fallback = 'Terjadi kesalahan.'}) {
  if (error is AppException) return error.message;

  final text = error.toString();
  if (text.isEmpty || text == 'null') return fallback;
  return text.replaceFirst(RegExp(r'^Exception:\s*'), '');
}
