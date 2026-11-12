# VitaeWorld | Aktif V0.2–V0.4 yol haritası

**Karar (12 Kasım 2026):** Önümüzdeki üç aşamanın tek odağı:

## 1. Etkileşimli mekânlar (V0.2)

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
