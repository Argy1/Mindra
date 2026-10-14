import '../entities/report_entity.dart';

abstract class ReportRepository {
  Future<MindraReport> buildReport(
    String userId, {
    int periodDays = 30,
    Set<String> sections,
    List<String> selectedReflectionIds,
  });

  Future<String> generatePdf(MindraReport report);
}
