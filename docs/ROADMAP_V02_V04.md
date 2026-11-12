# VitaeWorld | Aktif V0.2–V0.4 yol haritası

**Karar (12 Kasım 2026):** Önümüzdeki üç aşamanın tek odağı:

## 1. Etkileşimli mekânlar (V0.2)
 
**Durum:** İlk nesne-etkileşim motoru, bağlamsal KULLAN düğmesi,
E/touch ortak eylem yolu, kapı fiziksel geçişi ve durumlu mobilyalar
Lab 12'de uygulandı. Tam iskelet animasyonları, karakter/nesne
IK eşleştirmesi, uzun süreli durum saklama ve güvenilir cihaz
üzerindeki görsel testler tamamlanmadı.


**Amaç:** Mekândaki nesneler yalnızca dekor değil, kullanılabilir olsun.

- Ortak `Interactable` bileşeni (ID, eylem, mesafe, görüş hattı, durum).
- Yalnızca işaret edilen erişilebilir nesnenin üzerinde **KULLAN** etiketi.
- Kapı / dolap açma, sandalye ve koltuğa oturma, yatağa uzanma,
  lavabo ve küvet için etkileşim prototipleri.
- Hareket sırasında oyuncunun çarpışma geometrisi ve animasyon durumları
  birlikte değişmeli; eşyanın üzerinden görünmez duvarla yasaklama yok.
- Dokunmatik ve klavye aynı eylem sistemini kullanmalı.
- **Kabul:** 50 farklı seed × tüm bina türlerinde en yakın uygun
  etkileşimi seçebilme; kapı ve merdiven erişimini kaybetmeme.

## 2. Akıllı mimari ve oda yerleşimi (V0.3)

**Amaç:** Tasarımın geometrisi kadar mobilyaların ilişkisini öğrenmek.

- Mevcut 5:3 oda oranı, kapı grafı ve collision güvenlik sınırları
  **kaldırılamaz**.
- İlk veri kaynağı: [FloorplanQA-Layouts](https://huggingface.co/datasets/OldDelorean/FloorplanQA-Layouts),
  **CC BY 4.0**. 600 sentetik yatak odası, 600 salon, 600 mutfak planı;
  HSSD kökenli 200 plan ilk eğitimden hariç.
- Öğrenilen ilk model: oda türü ve nesne türüne koşullu,
  2B mobilya konumlarının Gauss karışımı (`model/layout-priors.json`).
- **Durum (12 Kasım 2026):** İlk model gerçekten eğitildi; 1.800 sentetik
  plandan 16 kategorilik karışım ve bağımsız test metrikleri oluşturuldu.
  Tam bina grafı modeli ile görsel kalite doğrulaması henüz açık.
- 80/20 *oda-planı bazlı* train/test ayrımı; normalleştirilmiş,
  bina planına taşınabilir `x,z` konum öncülleri.
- Öğrenilen puanlar kural tabanlı yerleştirmeye **yumuşak ipucu**
  verir; veri hatası fizik/kapı kuralını geçersiz kılamaz.
- Kaynağı açık, deterministik eğitim betiği + ölçülen test NLL.
- **Kabul:** gerçekten internetten indirilen veri, eğitilmiş ağırlıklar,
  raporlu test metrikleri, 100 seed collision/accessibility regresyonu.
- İkinci aşama: CC BY 4.0 [ResPlan](https://github.com/m-agour/ResPlan)
  oda komşuluk grafı modeli. Kaynaktaki türetilmiş emlak planı
  provenance/takedown koşulları ayrıca incelenmeli.

## 3. Görsel atmosfer ve karakter (V0.4)

- Gerçek pencereler, cephe uyumlu pencere yerleşimi, cam ve perdeler.
- Dışarıdan ve içeriden düzgün görünen duvar kalınlıkları ve çatı.
- Gün/gece döngüsü, ortam ışığı ve ışığı aç/kapat etkileşimi.
- Yapı tipine göre malzeme ve dekorasyon kuralları.
- LOD, görüntüde olmayan nesneler için culling, KTX2 dokular.
- **Kabul:** orta sınıf Android cihazda 30 FPS hedefi, masaüstünde
  60 FPS; gerçek cihaz ölçümü olmadan tamamlandı denmez.

## Mimari ilkeler

- Saf plan/model mantığı ayrı modüllerde; Three.js sahne katmanı bağımsız.
- Lisans ve kaynak manifesti olmadan eğitim verisi eklenmez.
- Kullanıcı tarafından indirilen eğitim görselleri runtime'da taşınmaz;
  oyunda yalnızca küçük öğrenilmiş parametreler tutulur.
- Öğrenilen puanlar her zaman AABB, oda sınırı, kapı açıklığı ve merdiven
  güvenlik testlerinden sonra değerlendirilir.
- Hazır model seçimi görsel olarak doğrulanana kadar yönü
  ölçüldü/kanıtlandı diye sunulmaz.

## Lab 13 (12 Kasım 2026) ilerleme

- 36 bina kullanım programı ve 8 farklı plan grameri.
- İç/dış kapılarda gerçek, kesintisiz kapı üstü duvarı.
- Tuvalet-banyo ve servis alanlarında cam bulunmayan opak kapılar;
  başka odalarda seed üzerinden seçilen gerçek camlı/buzlu camlı kapılar.
- Dış kapı görsel olarak var fakat bilinçli şekilde kilitli ve
  etkileşim dışı.
- Yeni CC0 duvar, taş, laminat ve terakota doku aileleri.
- Gelecek işler: pencereler, cephe detayları, eğitimli plan
  varyantlarının kör estetik karşılaştırması, model bazlı animasyon/IK.

## Lab 14 (12 Kasım 2026): pencereler ve doğal ışık

- **Uygulandı:** Dış duvarlarda gerçek geometrik pencere açıklıkları;
  cam, çerçeve, denizlik ve oda türüne göre iç perde varyasyonları.
- **Uygulandı:** Tuvalet/banyo mahremiyetini koruyan pencere kuralları,
  kapı açıklıklarından ayrı üretim, dış cephe geçiş engelleri.
- **Uygulandı:** Giriş cephesinde küçük saçak ve bina türüne göre görünüm.
- **Uygulandı:** 24 saatlik elle/otomatik gün-gece döngüsü; güneş,
  gökyüzü, sis ve ortam ışığı birbirine bağlı.
- **Açık:** Gerçek zamanlı ışık-gölge projeksiyonları, hacimsel gün ışığı,
  tüm cephe için mimari kör değerlendirme ve gerçek telefon FPS testi.

## Lab 15 — Semantik yerleşime dönüş ve üst kat zemini

- Kullanıcı tercihi doğrultusunda eğitilmiş konum bonusu kapatıldı;
  eski semantik/ilişkisel yerleşim puanlayıcısı yeniden varsayılan.
- Gerçek pencerenin önüne uzun dolap / ekran yerleştirilmesi
  fiziksel kural ile önleniyor.
- Alt kattayken üst katın zemin döşemesi, merdiven boşluklarıyla birlikte
  renderlanıyor. Üst kat duvarları ve mobilyaları gizli kaldığından
  gereksiz draw call yükü eklenmiyor.
- Eğitilmiş model parametreleri karşılaştırmalı araştırma için depoda
  tutuluyor; kullanıcı onayı olmadan tekrar etkinleşmeyecek.

## Lab 16 — Mobilya erişimi ve yapısal kat örtüşmesi

- Eski klasik yerleşim sıralaması **aynen korunuyor**. Yalnızca
  son 4–7 aday arasında koltuk, sandalye, yatak, lavabo ve dolapların
  erişilebilir yüzleri küçük bir bağlayıcı puan olarak değerlendiriliyor.
- Daha geniş veri kümeleri veya eğitimli modele otomatik geri dönüş yok.
- Alt kat tavanı, üst katın gerçekten bulunan zemin döşemesinin altına
  gereksiz bir ikinci katman çizmek yerine yalnızca kapatılmamış alanlarda
  oluşturuluyor. Merdiven boşluğunun döşeme kenarlarında ince çerçeve var.
- Sonraki kontrol: Gerçek mobil tarayıcıda tavan/merdiven görüntüsü
  ve farklı bina planlarında mobilyaların elle görsel incelenmesi.

## Lab 17 (12 Kasım 2026): büyük deterministik güncelleme

- 81 mobilya + 3 armatür + 2 karakter GLB'sinin yayınlama sırasında
  oyunun kendi statik dosyalarına alınması, SHA-256 kaynak manifesti ve
  her dosya için glTF bütünlük kontrolü.
- Tarayıcıda 6 paralel model yükleme sınırı, ortak önbellek, yeniden
  deneme, tanılama ekranı, görsel yedekler ve model tekrar yükleme.
- Klasik yerleştirme korunarak masa-sandalye dağılımı, mutfak çalışma
  üçgeni, koltuk/TV grubu ve yatak başı sehpası ilişkileri geliştirildi.
- Seed + bina programı + mimari ile birebir tekrar üretilebilen URL.
- Aynı dünyadaki kapı ve cihaz durumlarının yerel saklanması ve
  kullanıcı tarafından sıfırlanması.
- Hâlâ açık: farklı cihazlarda yükleme doğrulaması, gerçek FPS,
  tam karakter IK ve otomatik sanat kalitesi değerlendirmesi.

## Lab 18 — Stiller, tüm katlar ve deterministic son düzenlemeler

- 14 tasarım ailesi ve 27 yeni prosedürel yer, duvar, trim ve tavan
  yüzeyi. Yeni dokular internet gerektirmeden üretilebiliyor.
- Bina programına uygun stil varsayılanı; elle stil seçimi,
  paylaşılabilir seed URL'sinde ve yerel kayıtlarda stil kimliği.
- Şu anki iki katta **her iki katın tam geometrisi ve mobilyaları**
  görünür. Tek aktif güneş/ortam ışığı, gerçek üst döşeme ve merdiven
  boşluğu korunuyor. İleride 3+ kat için uzaktaki katlar shell moduna
  geçecek; henüz üç katlı playable bina iddiası yok.
- Duvara yapışık çıtalar, kaplama panelleri, dado ve endüstriyel
  raylar. Kapı/pencere boşluklarına ve dolaşıma müdahale edilmiyor.
- Oda planı arketipleri, stile göre dekor yoğunluğu,
  aynı seed ile tekrarlanabilir `styleReport` ve QA.
- Sonraki: çok katlı yapılar, gerçek 3D pencere/duvar malzeme
  benchmark'ları ve mobil/masaüstü FPS ölçümü.

## Lab 19 — İç mekân kapsamlı tamamlama

- Oda tipine göre banyo/servis fayans kaplamaları, mutfak
  backsplash yüzeyleri, yatak başı ve akustik paneller, dekoratif
  galeriler ve cove tavan detayları.
- Tüm kapılarda kasalar/eşikler ve oda işlevine göre
  sabit numaralı giriş tabelaları; yazı atlası tek dokudur.
- Kat başına en fazla dört işlevsel oda ışığı, gölge haritası yok.
- Otomatik/Ekonomi/Dengeli/Görsel grafik modları.
  FPS düşüşünde mobil çözünürlüğü kademeli azaltma.
- Tüm katlarda erişim, çakışma, sağlam kapı üstü,
  banyo mahremiyeti ve son detay geometri denetimi;
  raporlar kullanıcıya gösteriliyor.
- Eski semantik yerleşim korunuyor; modeller ve 36 bina
  programı değişmiyor, eğitimli konum bonusu kapalı.
- Resmî kalan doğrulama: gerçek tarayıcı görsel inceleme,
  orta/düşük seviye mobil FPS ve GPU uyumluluğu,
  detaylı ergonomi/animasyon. Bunlar test edilmiş gibi yazılmayacak.
