// Unit tests for clinical assessment scoring.
//
// Verified against AssessmentClinical (lib/features/assessment/presentation/
// providers/assessment_provider.dart). Thresholds follow the published
// clinical references: PHQ-9 Kroenke et al. (2001), GAD-7 Spitzer et al.
// (2006), PSS-10 Cohen et al. (1983), SRQ-20 WHO/Beusenberg & Orley (1994).
//
// NOTE: each instrument has its own clinically-correct cut-points — they are
// deliberately NOT identical. GAD-7 has four tiers (no "Sedang-Berat"), PSS-10
// uses stress bands, and SRQ-20 uses a WHO ≥6 caseness threshold.

import 'package:flutter_test/flutter_test.dart';
import 'package:mindra/features/assessment/presentation/providers/assessment_provider.dart';

void main() {
  group('PHQ-9 scoring', () {
    // depression: <=4 minimal | <=9 mild | <=14 moderate | <=19 mod-severe | severe
    const cases = <int, (String, String)>{
      0: ('Minimal', 'minimal'),
      4: ('Minimal', 'minimal'),
      5: ('Ringan', 'mild'),
      9: ('Ringan', 'mild'),
      10: ('Sedang', 'moderate'),
      14: ('Sedang', 'moderate'),
      15: ('Sedang–Berat', 'severe'),
      19: ('Sedang–Berat', 'severe'),
      20: ('Berat', 'severe'),
      27: ('Berat', 'severe'),
    };

    cases.forEach((score, expected) {
      test('score $score → ${expected.$1} / ${expected.$2}', () {
        expect(AssessmentClinical.labelIndonesian('phq9', score), expected.$1);
        expect(AssessmentClinical.categoryEnglish('phq9', score), expected.$2);
      });
    });

    test('max score is 27 (9 items × 3)', () {
      expect(AssessmentClinical.maxScoreFor('phq9'), 27);
    });

    test('severity tiers map 0→3', () {
      expect(AssessmentClinical.tier('phq9', 0), 0);
      expect(AssessmentClinical.tier('phq9', 7), 1);
      expect(AssessmentClinical.tier('phq9', 12), 2);
      expect(AssessmentClinical.tier('phq9', 25), 3);
    });
  });

  group('GAD-7 scoring', () {
    // anxiety: <=4 minimal | <=9 mild | <=14 moderate | severe (4 tiers)
    const cases = <int, (String, String)>{
      0: ('Minimal', 'minimal'),
      4: ('Minimal', 'minimal'),
      5: ('Ringan', 'mild'),
      9: ('Ringan', 'mild'),
      10: ('Sedang', 'moderate'),
      14: ('Sedang', 'moderate'),
      15: ('Berat', 'severe'),
      21: ('Berat', 'severe'),
    };

    cases.forEach((score, expected) {
      test('score $score → ${expected.$1} / ${expected.$2}', () {
        expect(AssessmentClinical.labelIndonesian('gad7', score), expected.$1);
        expect(AssessmentClinical.categoryEnglish('gad7', score), expected.$2);
      });
    });

    test('GAD-7 has no "Sedang-Berat" tier (unlike PHQ-9)', () {
      // Score 15 on GAD-7 is already the top "Berat" band.
      expect(AssessmentClinical.labelIndonesian('gad7', 15), 'Berat');
      expect(AssessmentClinical.labelIndonesian('gad7', 15),
          isNot(contains('Sedang')));
    });

    test('max score is 21 (7 items × 3)', () {
      expect(AssessmentClinical.maxScoreFor('gad7'), 21);
    });
  });

  group('PSS-10 scoring', () {
    // perceived stress: <=13 low | <=26 moderate | high
    const cases = <int, (String, String)>{
      0: ('Stres Rendah', 'minimal'),
      13: ('Stres Rendah', 'minimal'),
      14: ('Stres Sedang', 'moderate'),
      26: ('Stres Sedang', 'moderate'),
      27: ('Stres Tinggi', 'severe'),
      40: ('Stres Tinggi', 'severe'),
    };

    cases.forEach((score, expected) {
      test('score $score → ${expected.$1} / ${expected.$2}', () {
        expect(AssessmentClinical.labelIndonesian('pss10', score), expected.$1);
        expect(AssessmentClinical.categoryEnglish('pss10', score), expected.$2);
      });
    });

    test('max score is 40 (10 items × 4)', () {
      expect(AssessmentClinical.maxScoreFor('pss10'), 40);
    });
  });

  group('SRQ-20 scoring', () {
    // WHO common-mental-disorder screen: caseness threshold ≥6.
    // <=5 none | <=10 mild | <=15 moderate | severe
    const cases = <int, (String, String)>{
      0: ('Tidak ada gangguan', 'minimal'),
      5: ('Tidak ada gangguan', 'minimal'),
      6: ('Kemungkinan gangguan ringan', 'mild'),
      10: ('Kemungkinan gangguan ringan', 'mild'),
      11: ('Kemungkinan gangguan sedang', 'moderate'),
      15: ('Kemungkinan gangguan sedang', 'moderate'),
      16: ('Kemungkinan gangguan berat', 'severe'),
      20: ('Kemungkinan gangguan berat', 'severe'),
    };

    cases.forEach((score, expected) {
      test('score $score → ${expected.$1} / ${expected.$2}', () {
        expect(AssessmentClinical.labelIndonesian('srq20', score), expected.$1);
        expect(AssessmentClinical.categoryEnglish('srq20', score), expected.$2);
      });
    });

    test('score 5 is below WHO caseness threshold of 6', () {
      expect(AssessmentClinical.tier('srq20', 5), 0);
      expect(AssessmentClinical.tier('srq20', 6), greaterThan(0));
    });

    test('max score is 20 (20 yes/no items)', () {
      expect(AssessmentClinical.maxScoreFor('srq20'), 20);
    });
  });

  group('explanation + recommendations', () {
    test('every PHQ-9 tier yields a non-empty Indonesian explanation', () {
      for (final score in [2, 7, 12, 24]) {
        expect(AssessmentClinical.explanation('phq9', score), isNotEmpty);
      }
    });

    test('severe results recommend professional help', () {
      final recs = AssessmentClinical.recommendationsFor('phq9', 25);
      expect(recs, hasLength(3));
      expect(recs.any((r) => r.highlight), isTrue);
      expect(
        recs.any((r) => r.route.contains('telemedicine') ||
            r.route.contains('crisis')),
        isTrue,
      );
    });

    test('minimal results recommend gentle self-care, no crisis CTA', () {
      final recs = AssessmentClinical.recommendationsFor('phq9', 2);
      expect(recs, hasLength(3));
      expect(recs.any((r) => r.route.contains('crisis')), isFalse);
    });
  });
}
