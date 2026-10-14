import 'dart:io';
import 'dart:typed_data';

import 'package:intl/intl.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

import '../../../../core/errors/app_exception.dart';
import '../../domain/entities/report_entity.dart';
import '../../domain/repositories/report_repository.dart';

// ── PDF color palette (matches Mindra brand) ──────────────────────────────────
const _kBlue = PdfColor.fromInt(0xFF2E6DA4);
const _kGreen = PdfColor.fromInt(0xFF4A9E8F);
const _kDark = PdfColor.fromInt(0xFF1A1A2E);
const _kGray600 = PdfColor.fromInt(0xFF635E55);
const _kGray400 = PdfColor.fromInt(0xFFA8A299);
const _kSurface = PdfColor.fromInt(0xFFF8F7F5);
const _kBorder = PdfColor.fromInt(0xFFDFDBD3);
const _kRed = PdfColor.fromInt(0xFFC0392B);
const _kYellow = PdfColor.fromInt(0xFFE07B00);

class ReportRepositoryImpl implements ReportRepository {
  const ReportRepositoryImpl(this._client);
  final dynamic _client;

  // ── Public API ──────────────────────────────────────────────────────────────

  @override
  Future<MindraReport> buildReport(
    String userId, {
    String userName = 'Pengguna Mindra',
    int periodDays = 30,
    Set<String> sections = ReportSection.all,
    List<String> selectedReflectionIds = const [],
  }) async {
    final now = DateTime.now();
    final from = now.subtract(Duration(days: periodDays));

    final futures = await Future.wait([
      sections.contains(ReportSection.assessments)
          ? _fetchAssessments(userId, from, now)
          : Future.value(<AssessmentResultSummary>[]),
      sections.contains(ReportSection.mood)
          ? _fetchMoodEntries(userId, from, now)
          : Future.value(<MoodSummaryEntry>[]),
      sections.contains(ReportSection.sleep)
          ? _fetchSleepEntries(userId, from, now)
          : Future.value(<SleepSummaryEntry>[]),
      sections.contains(ReportSection.consultations)
          ? _fetchConsultations(userId, from, now)
          : Future.value(<ConsultationSummaryEntry>[]),
      sections.contains(ReportSection.reflections)
          ? _fetchReflections(userId, from, now)
          : Future.value(<ReflectionEntry>[]),
    ]);

    return MindraReport(
      userId: userId,
      userName: userName,
      generatedAt: now,
      periodDays: periodDays,
      sections: sections,
      selectedReflectionIds: selectedReflectionIds,
      assessmentResults: futures[0] as List<AssessmentResultSummary>,
      moodEntries: futures[1] as List<MoodSummaryEntry>,
      sleepEntries: futures[2] as List<SleepSummaryEntry>,
      consultations: futures[3] as List<ConsultationSummaryEntry>,
      reflections: futures[4] as List<ReflectionEntry>,
    );
  }

  /// Builds the PDF in-memory and returns the raw bytes.
  Future<Uint8List> buildPdfBytes(MindraReport report) async {
    final doc = pw.Document(title: 'Laporan Kesehatan Mental Mindra');

    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.fromLTRB(48, 56, 48, 48),
        header: (ctx) => _header(report),
        footer: (ctx) => _footer(ctx),
        build: (ctx) => [
          ..._executiveSummary(report),
          if (report.sections.contains(ReportSection.assessments) &&
              report.assessmentResults.isNotEmpty)
            ..._assessmentSection(report),
          if (report.sections.contains(ReportSection.mood) &&
              report.moodEntries.isNotEmpty)
            ..._moodSection(report),
          if (report.sections.contains(ReportSection.sleep) &&
              report.sleepEntries.isNotEmpty)
            ..._sleepSection(report),
          if (report.sections.contains(ReportSection.consultations) &&
              report.consultations.isNotEmpty)
            ..._consultationSection(report),
          if (report.sections.contains(ReportSection.reflections) &&
              report.selectedReflections.isNotEmpty)
            ..._reflectionSection(report),
        ],
      ),
    );

    return doc.save();
  }

  /// Saves bytes to the documents directory and returns the file path.
  Future<String> savePdf(Uint8List bytes, {String? filename}) async {
    final dir = await getApplicationDocumentsDirectory();
    final name = filename ??
        'mindra_laporan_${DateTime.now().millisecondsSinceEpoch}.pdf';
    final file = File('${dir.path}/$name');
    await file.writeAsBytes(bytes);
    return file.path;
  }

  @override
  Future<String> generatePdf(MindraReport report) async {
    final bytes = await buildPdfBytes(report);
    return savePdf(
      bytes,
      filename: 'mindra_laporan_${report.periodDays}hari.pdf',
    );
  }

  // ── Data fetching ───────────────────────────────────────────────────────────

  Future<List<AssessmentResultSummary>> _fetchAssessments(
    String userId,
    DateTime from,
    DateTime to,
  ) async {
    try {
      final rows = await _client
          .from('assessments')
          .select()
          .eq('user_id', userId)
          .gte('completed_at', from.toIso8601String())
          .lte('completed_at', to.toIso8601String())
          .order('completed_at', ascending: true) as List;
      return rows
          .map((r) => AssessmentResultSummary(
                type: r['type'] as String? ?? '',
                score: r['total_score'] as int? ?? 0,
                category: r['category'] as String? ?? '',
                date: DateTime.tryParse(r['completed_at'] as String? ?? '') ??
                    DateTime.now(),
              ))
          .toList();
    } catch (e, st) {
      throwAppException('Gagal mengambil data asesmen untuk laporan.', e, st);
    }
  }

  Future<List<MoodSummaryEntry>> _fetchMoodEntries(
    String userId,
    DateTime from,
    DateTime to,
  ) async {
    try {
      final rows = await _client
          .from('mood_entries')
          .select()
          .eq('user_id', userId)
          .gte('created_at', from.toIso8601String())
          .lte('created_at', to.toIso8601String())
          .order('created_at', ascending: true) as List;

      return rows.map((r) {
        final moodType = r['mood_type'] as String? ?? 'netral';
        return MoodSummaryEntry(
          moodType: moodType,
          date: DateTime.tryParse(r['created_at'] as String? ?? '') ??
              DateTime.now(),
          score: _moodScore(moodType),
          triggers: List<String>.from(r['triggers'] as List? ?? []),
        );
      }).toList();
    } catch (e, st) {
      throwAppException('Gagal mengambil data mood untuk laporan.', e, st);
    }
  }

  Future<List<SleepSummaryEntry>> _fetchSleepEntries(
    String userId,
    DateTime from,
    DateTime to,
  ) async {
    try {
      final rows = await _client
          .from('sleep_entries')
          .select()
          .eq('user_id', userId)
          .gte('bedtime', from.toIso8601String())
          .lte('bedtime', to.toIso8601String())
          .order('bedtime', ascending: true) as List;

      return rows.map((r) {
        final bedtime = DateTime.tryParse(r['bedtime'] as String? ?? '');
        final wakeTime = DateTime.tryParse(r['wake_time'] as String? ?? '');
        final hours = (bedtime != null && wakeTime != null)
            ? wakeTime.difference(bedtime).inMinutes / 60.0
            : 0.0;
        return SleepSummaryEntry(
          date: bedtime ?? DateTime.now(),
          hours: hours.clamp(0.0, 16.0),
          quality: r['quality'] as int? ?? 3,
        );
      }).toList();
    } catch (e, st) {
      throwAppException('Gagal mengambil data tidur untuk laporan.', e, st);
    }
  }

  Future<List<ConsultationSummaryEntry>> _fetchConsultations(
    String userId,
    DateTime from,
    DateTime to,
  ) async {
    try {
      final rows = await _client
          .from('consultations')
          .select('*, psychologists(full_name)')
          .eq('user_id', userId)
          .gte('scheduled_at', from.toIso8601String())
          .lte('scheduled_at', to.toIso8601String())
          .order('scheduled_at', ascending: true) as List;

      return rows.map((r) {
        final psych = r['psychologists'] as Map<String, dynamic>?;
        return ConsultationSummaryEntry(
          date: DateTime.tryParse(r['scheduled_at'] as String? ?? '') ??
              DateTime.now(),
          psychologistName: psych?['full_name'] as String? ?? '—',
          durationMinutes: r['duration_minutes'] as int? ?? 50,
          status: r['status'] as String? ?? 'pending',
        );
      }).toList();
    } catch (e, st) {
      throwAppException(
          'Gagal mengambil data konsultasi untuk laporan.', e, st);
    }
  }

  Future<List<ReflectionEntry>> _fetchReflections(
    String userId,
    DateTime from,
    DateTime to,
  ) async {
    try {
      final rows = await _client
          .from('night_reflections')
          .select()
          .eq('user_id', userId)
          .gte('created_at', from.toIso8601String())
          .lte('created_at', to.toIso8601String())
          .order('created_at', ascending: false)
          .limit(20) as List;

      return rows
          .map((r) => ReflectionEntry(
                id: r['id'] as String? ?? '',
                date: DateTime.tryParse(r['created_at'] as String? ?? '') ??
                    DateTime.now(),
                gratitude: r['gratitude'] as String? ?? '',
                highlight: r['highlight'] as String? ?? '',
                tomorrow: r['tomorrow'] as String? ?? '',
                moodScore: r['mood_score'] as int?,
              ))
          .toList();
    } catch (e, st) {
      throwAppException('Gagal mengambil data refleksi untuk laporan.', e, st);
    }
  }

  // ── PDF building helpers ────────────────────────────────────────────────────

  pw.Widget _header(MindraReport report) {
    final df = DateFormat('d MMMM yyyy', 'id_ID');
    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Container(
          padding: const pw.EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: const pw.BoxDecoration(color: _kBlue),
          child: pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            children: [
              pw.Text(
                'LAPORAN KESEHATAN MENTAL',
                style: pw.TextStyle(
                  fontSize: 13,
                  fontWeight: pw.FontWeight.bold,
                  color: PdfColors.white,
                ),
              ),
              pw.Text(
                'mindra',
                style: pw.TextStyle(
                  fontSize: 13,
                  fontWeight: pw.FontWeight.bold,
                  color: PdfColors.white,
                  letterSpacing: 2,
                ),
              ),
            ],
          ),
        ),
        pw.Container(
          padding: const pw.EdgeInsets.symmetric(horizontal: 12, vertical: 5),
          color: _kSurface,
          child: pw.Row(
            children: [
              pw.Text('Nama: ',
                  style: pw.TextStyle(fontSize: 9, color: _kGray600)),
              pw.Text(report.userName,
                  style: pw.TextStyle(
                      fontSize: 9,
                      fontWeight: pw.FontWeight.bold,
                      color: _kDark)),
              pw.SizedBox(width: 16),
              pw.Text('Periode: ',
                  style: pw.TextStyle(fontSize: 9, color: _kGray600)),
              pw.Text('${report.periodDays} hari',
                  style: pw.TextStyle(
                      fontSize: 9,
                      fontWeight: pw.FontWeight.bold,
                      color: _kDark)),
              pw.SizedBox(width: 16),
              pw.Text('Dibuat: ',
                  style: pw.TextStyle(fontSize: 9, color: _kGray600)),
              pw.Text(df.format(report.generatedAt),
                  style: pw.TextStyle(fontSize: 9, color: _kDark)),
            ],
          ),
        ),
        pw.SizedBox(height: 4),
      ],
    );
  }

  pw.Widget _footer(pw.Context ctx) {
    return pw.Column(
      children: [
        pw.Divider(color: _kBorder, thickness: 0.5),
        pw.SizedBox(height: 4),
        pw.Row(
          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
          children: [
            pw.Text(
              'Laporan ini bukan dokumen medis resmi. Konsultasikan dengan tenaga kesehatan berlisensi.',
              style: pw.TextStyle(
                  fontSize: 7,
                  color: _kGray400,
                  fontStyle: pw.FontStyle.italic),
            ),
            pw.Text(
              'Halaman ${ctx.pageNumber} dari ${ctx.pagesCount}',
              style: pw.TextStyle(fontSize: 7, color: _kGray400),
            ),
          ],
        ),
      ],
    );
  }

  List<pw.Widget> _executiveSummary(MindraReport report) {
    return [
      _sectionTitle('Ringkasan Eksekutif', '1'),
      pw.SizedBox(height: 8),
      pw.Row(
        children: [
          pw.Expanded(
            child: _statCard(
              'Rata-rata Mood',
              '${report.avgMoodScore.toStringAsFixed(1)} / 7',
              _kBlue,
            ),
          ),
          pw.SizedBox(width: 8),
          pw.Expanded(
            child: _statCard(
              'Rata-rata Tidur',
              '${report.avgSleepHours.toStringAsFixed(1)} jam',
              _kGreen,
            ),
          ),
          pw.SizedBox(width: 8),
          pw.Expanded(
            child: _statCard(
              'Asesmen Selesai',
              '${report.assessmentResults.length}x',
              _kBlue,
            ),
          ),
          pw.SizedBox(width: 8),
          pw.Expanded(
            child: _statCard(
              'Sesi Konsultasi',
              '${report.consultations.length}x',
              _kGreen,
            ),
          ),
        ],
      ),
      pw.SizedBox(height: 20),
    ];
  }

  List<pw.Widget> _assessmentSection(MindraReport report) {
    final df = DateFormat('d MMM yy', 'id_ID');
    return [
      _sectionTitle('Tren Asesmen', '2'),
      pw.SizedBox(height: 8),
      if (report.assessmentResults.isNotEmpty) ...[
        _barChart(
          values:
              report.assessmentResults.map((e) => e.score.toDouble()).toList(),
          labels: report.assessmentResults
              .map((e) => '${e.type.toUpperCase()}\n${df.format(e.date)}')
              .toList(),
          color: _kBlue,
          maxVal: report.assessmentResults
              .map((e) => double.parse(e.maxScore.isEmpty ? '40' : e.maxScore))
              .fold(0.0, (a, b) => a > b ? a : b),
        ),
        pw.SizedBox(height: 12),
      ],
      pw.Table(
        border: pw.TableBorder.all(color: _kBorder, width: 0.5),
        columnWidths: {
          0: const pw.FlexColumnWidth(2),
          1: const pw.FlexColumnWidth(3),
          2: const pw.FlexColumnWidth(1.5),
          3: const pw.FlexColumnWidth(2),
        },
        children: [
          _tableHeader(['Tanggal', 'Instrumen', 'Skor', 'Kategori']),
          ...report.assessmentResults.map((r) => pw.TableRow(
                children: [
                  _tableCell(df.format(r.date)),
                  _tableCell(r.typeLabel),
                  _tableCell('${r.score} / ${r.maxScore}'),
                  _tableCell(_categoryId(r.category),
                      color: _categoryColor(r.category)),
                ],
              )),
        ],
      ),
      pw.SizedBox(height: 20),
    ];
  }

  List<pw.Widget> _moodSection(MindraReport report) {
    // Group by week for chart
    final weeklyAvg = _weeklyMoodAvg(report.moodEntries);
    return [
      _sectionTitle('Perjalanan Suasana Hati', '3'),
      pw.SizedBox(height: 8),
      if (weeklyAvg.isNotEmpty)
        _barChart(
          values: weeklyAvg.values.toList(),
          labels: weeklyAvg.keys.map((w) => 'Mg $w').toList(),
          color: _kBlue,
          maxVal: 7,
        ),
      pw.SizedBox(height: 10),
      pw.Row(children: [
        pw.Text('Rata-rata: ',
            style: pw.TextStyle(fontSize: 9, color: _kGray600)),
        pw.Text('${report.avgMoodScore.toStringAsFixed(1)} / 7',
            style: pw.TextStyle(
                fontSize: 9, fontWeight: pw.FontWeight.bold, color: _kDark)),
        pw.SizedBox(width: 20),
        pw.Text('Total catatan: ',
            style: pw.TextStyle(fontSize: 9, color: _kGray600)),
        pw.Text('${report.moodEntries.length}',
            style: pw.TextStyle(
                fontSize: 9, fontWeight: pw.FontWeight.bold, color: _kDark)),
      ]),
      if (report.topTriggers.isNotEmpty) ...[
        pw.SizedBox(height: 8),
        pw.Text('Pemicu teratas:',
            style: pw.TextStyle(
                fontSize: 9, fontWeight: pw.FontWeight.bold, color: _kDark)),
        pw.SizedBox(height: 4),
        pw.Wrap(
          spacing: 6,
          runSpacing: 4,
          children: report.topTriggers.entries
              .map((e) => pw.Container(
                    padding: const pw.EdgeInsets.symmetric(
                        horizontal: 6, vertical: 2),
                    decoration: pw.BoxDecoration(
                      color: _kSurface,
                      borderRadius: pw.BorderRadius.circular(4),
                      border: pw.Border.all(color: _kBorder, width: 0.5),
                    ),
                    child: pw.Text('${e.key} (${e.value}x)',
                        style: pw.TextStyle(fontSize: 8, color: _kGray600)),
                  ))
              .toList(),
        ),
      ],
      pw.SizedBox(height: 20),
    ];
  }

  List<pw.Widget> _sleepSection(MindraReport report) {
    final recentSleep = report.sleepEntries.take(14).toList();
    final df = DateFormat('d/M', 'id_ID');

    // Mood-sleep correlation insight
    String correlationInsight;
    if (report.avgMoodScore > 4 && report.avgSleepHours >= 7) {
      correlationInsight =
          'Kualitas tidur kamu baik dan berkorelasi positif dengan suasana hati yang stabil.';
    } else if (report.avgSleepHours < 6) {
      correlationInsight =
          'Kurang tidur terdeteksi dalam periode ini. Tidur lebih awal dapat meningkatkan kesejahteraan.';
    } else {
      correlationInsight =
          'Data tidur mencukupi. Konsistensi jadwal tidur membantu menjaga kestabilan emosi.';
    }

    return [
      _sectionTitle('Pola Tidur', '4'),
      pw.SizedBox(height: 8),
      if (recentSleep.isNotEmpty)
        _barChart(
          values: recentSleep.map((e) => e.hours).toList(),
          labels: recentSleep.map((e) => df.format(e.date)).toList(),
          color: _kGreen,
          maxVal: 10,
          chartHeight: 70,
          barWidthFactor: 0.7,
        ),
      pw.SizedBox(height: 10),
      pw.Row(children: [
        pw.Text('Rata-rata durasi: ',
            style: pw.TextStyle(fontSize: 9, color: _kGray600)),
        pw.Text('${report.avgSleepHours.toStringAsFixed(1)} jam',
            style: pw.TextStyle(
                fontSize: 9, fontWeight: pw.FontWeight.bold, color: _kDark)),
        pw.SizedBox(width: 16),
        pw.Text('Kualitas rata-rata: ',
            style: pw.TextStyle(fontSize: 9, color: _kGray600)),
        pw.Text('${report.avgSleepQuality.toStringAsFixed(1)} / 5',
            style: pw.TextStyle(
                fontSize: 9, fontWeight: pw.FontWeight.bold, color: _kDark)),
      ]),
      pw.SizedBox(height: 8),
      pw.Container(
        padding: const pw.EdgeInsets.all(8),
        decoration: pw.BoxDecoration(
          color: _kSurface,
          borderRadius: pw.BorderRadius.circular(4),
          border: pw.Border.all(color: _kBorder, width: 0.5),
        ),
        child: pw.Text(
          '💡 $correlationInsight',
          style: pw.TextStyle(
              fontSize: 9, color: _kGray600, fontStyle: pw.FontStyle.italic),
        ),
      ),
      pw.SizedBox(height: 20),
    ];
  }

  List<pw.Widget> _consultationSection(MindraReport report) {
    final df = DateFormat('d MMM yyyy', 'id_ID');
    return [
      _sectionTitle('Riwayat Konsultasi', '5'),
      pw.SizedBox(height: 8),
      pw.Table(
        border: pw.TableBorder.all(color: _kBorder, width: 0.5),
        columnWidths: {
          0: const pw.FlexColumnWidth(2.5),
          1: const pw.FlexColumnWidth(3),
          2: const pw.FlexColumnWidth(1.5),
          3: const pw.FlexColumnWidth(2),
        },
        children: [
          _tableHeader(['Tanggal', 'Psikolog', 'Durasi', 'Status']),
          ...report.consultations.map((c) => pw.TableRow(
                children: [
                  _tableCell(df.format(c.date)),
                  _tableCell(c.psychologistName),
                  _tableCell('${c.durationMinutes} mnt'),
                  _tableCell(_statusId(c.status),
                      color: _statusColor(c.status)),
                ],
              )),
        ],
      ),
      pw.SizedBox(height: 20),
    ];
  }

  List<pw.Widget> _reflectionSection(MindraReport report) {
    final df = DateFormat('EEEE, d MMMM yyyy', 'id_ID');
    return [
      _sectionTitle('Catatan Refleksi Terpilih', '6'),
      pw.SizedBox(height: 8),
      ...report.selectedReflections.map((r) => pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Container(
                padding:
                    const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: const pw.BoxDecoration(color: _kBlue),
                child: pw.Text(
                  df.format(r.date),
                  style: pw.TextStyle(
                      fontSize: 9,
                      color: PdfColors.white,
                      fontWeight: pw.FontWeight.bold),
                ),
              ),
              pw.Container(
                padding: const pw.EdgeInsets.all(10),
                decoration: pw.BoxDecoration(
                  color: _kSurface,
                  border: pw.Border.all(color: _kBorder, width: 0.5),
                ),
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    _reflectionField('Rasa Syukur', r.gratitude),
                    pw.SizedBox(height: 6),
                    _reflectionField('Momen Terbaik', r.highlight),
                    pw.SizedBox(height: 6),
                    _reflectionField('Rencana Besok', r.tomorrow),
                  ],
                ),
              ),
              pw.SizedBox(height: 10),
            ],
          )),
    ];
  }

  // ── Small PDF widget helpers ─────────────────────────────────────────────────

  pw.Widget _sectionTitle(String title, String num) => pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Row(children: [
            pw.Container(
              width: 4,
              height: 18,
              color: _kBlue,
            ),
            pw.SizedBox(width: 8),
            pw.Text(
              '$num. $title',
              style: pw.TextStyle(
                fontSize: 13,
                fontWeight: pw.FontWeight.bold,
                color: _kDark,
              ),
            ),
          ]),
          pw.SizedBox(height: 2),
          pw.Divider(color: _kBorder, thickness: 0.5),
        ],
      );

  pw.Widget _statCard(String label, String value, PdfColor accent) =>
      pw.Container(
        padding: const pw.EdgeInsets.all(10),
        decoration: pw.BoxDecoration(
          border: pw.Border.all(color: _kBorder, width: 0.5),
          borderRadius: pw.BorderRadius.circular(6),
          color: _kSurface,
        ),
        child: pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Text(label, style: pw.TextStyle(fontSize: 8, color: _kGray600)),
            pw.SizedBox(height: 4),
            pw.Text(value,
                style: pw.TextStyle(
                  fontSize: 16,
                  fontWeight: pw.FontWeight.bold,
                  color: accent,
                )),
          ],
        ),
      );

  pw.Widget _barChart({
    required List<double> values,
    required List<String> labels,
    required PdfColor color,
    required double maxVal,
    double chartHeight = 80,
    double barWidthFactor = 1.0,
  }) {
    if (values.isEmpty) return pw.SizedBox();
    final effectiveMax = maxVal > 0 ? maxVal : 1;
    final barWidth = (16 * barWidthFactor).clamp(8.0, 24.0);

    return pw.Container(
      padding: const pw.EdgeInsets.all(8),
      decoration: pw.BoxDecoration(
        color: _kSurface,
        border: pw.Border.all(color: _kBorder, width: 0.5),
        borderRadius: pw.BorderRadius.circular(4),
      ),
      child: pw.Row(
        crossAxisAlignment: pw.CrossAxisAlignment.end,
        mainAxisAlignment: pw.MainAxisAlignment.start,
        children: List.generate(values.length.clamp(0, 30), (i) {
          final h =
              (values[i] / effectiveMax * chartHeight).clamp(2.0, chartHeight);
          final labelLines = labels[i].split('\n');
          return pw.Padding(
            padding: const pw.EdgeInsets.only(right: 3),
            child: pw.Column(
              mainAxisAlignment: pw.MainAxisAlignment.end,
              crossAxisAlignment: pw.CrossAxisAlignment.center,
              children: [
                pw.Text(
                  values[i] < 10
                      ? values[i].toStringAsFixed(1)
                      : values[i].toStringAsFixed(0),
                  style: pw.TextStyle(fontSize: 6, color: _kGray600),
                ),
                pw.SizedBox(height: 2),
                pw.Container(
                  width: barWidth,
                  height: h,
                  decoration: pw.BoxDecoration(
                    color: color,
                    borderRadius: pw.BorderRadius.circular(2),
                  ),
                ),
                pw.SizedBox(height: 3),
                for (final line in labelLines)
                  pw.Text(
                    line,
                    style: pw.TextStyle(fontSize: 6, color: _kGray400),
                    textAlign: pw.TextAlign.center,
                  ),
              ],
            ),
          );
        }),
      ),
    );
  }

  pw.TableRow _tableHeader(List<String> cols) => pw.TableRow(
        decoration: const pw.BoxDecoration(color: _kBlue),
        children: cols
            .map((c) => pw.Padding(
                  padding: const pw.EdgeInsets.all(6),
                  child: pw.Text(c,
                      style: pw.TextStyle(
                        fontSize: 9,
                        fontWeight: pw.FontWeight.bold,
                        color: PdfColors.white,
                      )),
                ))
            .toList(),
      );

  pw.Widget _tableCell(String text, {PdfColor? color}) => pw.Padding(
        padding: const pw.EdgeInsets.all(5),
        child: pw.Text(
          text,
          style: pw.TextStyle(fontSize: 8.5, color: color ?? _kDark),
        ),
      );

  pw.Widget _reflectionField(String label, String value) => pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Text(label,
              style: pw.TextStyle(
                  fontSize: 8, fontWeight: pw.FontWeight.bold, color: _kBlue)),
          pw.SizedBox(height: 2),
          pw.Text(value.isEmpty ? '—' : value,
              style: pw.TextStyle(fontSize: 9, color: _kGray600)),
        ],
      );

  // ── Utilities ────────────────────────────────────────────────────────────────

  int _moodScore(String moodType) => switch (moodType.toLowerCase()) {
        'sangat_baik' || 'bahagia' || 'syukur' => 7,
        'baik' || 'tenang' => 6,
        'cukup' || 'hangat' => 5,
        'netral' => 4,
        'kurang' || 'lelah' => 3,
        'buruk' || 'sedih' || 'cemas' => 2,
        'sangat_buruk' => 1,
        _ => 4,
      };

  Map<int, double> _weeklyMoodAvg(List<MoodSummaryEntry> entries) {
    if (entries.isEmpty) return {};
    final byWeek = <int, List<int>>{};
    for (final e in entries) {
      final week = (e.date.difference(entries.first.date).inDays ~/ 7) + 1;
      byWeek.putIfAbsent(week, () => []).add(e.score);
    }
    return byWeek
        .map((k, v) => MapEntry(k, v.reduce((a, b) => a + b) / v.length));
  }

  String _categoryId(String cat) => switch (cat.toLowerCase()) {
        'minimal' => 'Minimal',
        'mild' => 'Ringan',
        'moderate' => 'Sedang',
        'severe' => 'Berat',
        _ => cat,
      };

  PdfColor _categoryColor(String cat) => switch (cat.toLowerCase()) {
        'minimal' => _kGreen,
        'mild' => _kYellow,
        'moderate' => _kYellow,
        'severe' => _kRed,
        _ => _kGray600,
      };

  String _statusId(String status) => switch (status) {
        'pending' => 'Menunggu',
        'confirmed' => 'Dikonfirmasi',
        'ongoing' => 'Berlangsung',
        'completed' => 'Selesai',
        'cancelled' => 'Dibatalkan',
        _ => status,
      };

  PdfColor _statusColor(String status) => switch (status) {
        'completed' => _kGreen,
        'cancelled' => _kRed,
        'ongoing' => _kGreen,
        _ => _kBlue,
      };
}
