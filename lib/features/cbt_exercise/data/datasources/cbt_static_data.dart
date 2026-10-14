import '../../domain/entities/exercise_entity.dart';

// Pre-populated activity suggestions per category
// Grounded in Behavioral Activation Therapy (Martell, Addis & Jacobson)
const List<ActivityItem> kDefaultActivities = [
  // Fisik
  ActivityItem(id: 'phy_1', label: 'Jalan kaki 15 menit', category: ActivityCategory.fisik),
  ActivityItem(id: 'phy_2', label: 'Peregangan ringan 10 menit', category: ActivityCategory.fisik),
  ActivityItem(id: 'phy_3', label: 'Yoga atau senam ringan', category: ActivityCategory.fisik),
  ActivityItem(id: 'phy_4', label: 'Bersepeda atau naik turun tangga', category: ActivityCategory.fisik),
  ActivityItem(id: 'phy_5', label: 'Berenang atau mandi air hangat', category: ActivityCategory.fisik),

  // Sosial
  ActivityItem(id: 'soc_1', label: 'Hubungi atau chat teman', category: ActivityCategory.sosial),
  ActivityItem(id: 'soc_2', label: 'Kirim pesan ke anggota keluarga', category: ActivityCategory.sosial),
  ActivityItem(id: 'soc_3', label: 'Berkumpul dengan orang yang kamu percaya', category: ActivityCategory.sosial),
  ActivityItem(id: 'soc_4', label: 'Bantu orang lain atau kegiatan sukarela', category: ActivityCategory.sosial),
  ActivityItem(id: 'soc_5', label: 'Bergabung komunitas atau grup minat', category: ActivityCategory.sosial),

  // Kreatif
  ActivityItem(id: 'cre_1', label: 'Menulis jurnal atau puisi', category: ActivityCategory.kreatif),
  ActivityItem(id: 'cre_2', label: 'Melukis, menggambar, atau mewarnai', category: ActivityCategory.kreatif),
  ActivityItem(id: 'cre_3', label: 'Memasak atau mencoba resep baru', category: ActivityCategory.kreatif),
  ActivityItem(id: 'cre_4', label: 'Mendengarkan atau memainkan musik', category: ActivityCategory.kreatif),
  ActivityItem(id: 'cre_5', label: 'Membuat sesuatu dengan tangan', category: ActivityCategory.kreatif),

  // Perawatan Diri
  ActivityItem(id: 'self_1', label: 'Tidur siang singkat (20 menit)', category: ActivityCategory.perawatanDiri),
  ActivityItem(id: 'self_2', label: 'Membaca buku atau artikel positif', category: ActivityCategory.perawatanDiri),
  ActivityItem(id: 'self_3', label: 'Meditasi atau latihan pernapasan', category: ActivityCategory.perawatanDiri),
  ActivityItem(id: 'self_4', label: 'Makan makanan bergizi dan minum cukup', category: ActivityCategory.perawatanDiri),
  ActivityItem(id: 'self_5', label: 'Waktu untuk diri sendiri tanpa gangguan', category: ActivityCategory.perawatanDiri),

  // Produktif
  ActivityItem(id: 'pro_1', label: 'Bersihkan satu area kecil di rumah', category: ActivityCategory.produktif),
  ActivityItem(id: 'pro_2', label: 'Selesaikan satu tugas kecil yang tertunda', category: ActivityCategory.produktif),
  ActivityItem(id: 'pro_3', label: 'Atur jadwal atau rencana minggu ini', category: ActivityCategory.produktif),
  ActivityItem(id: 'pro_4', label: 'Belajar satu hal baru selama 15 menit', category: ActivityCategory.produktif),
  ActivityItem(id: 'pro_5', label: 'Rapikan email atau pesan yang menumpuk', category: ActivityCategory.produktif),
];
