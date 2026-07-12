# ESK Backend API Documentation

Tüm endpoint'ler `/api` prefix'i altında çalışır.

---

## 1. Admin Router (`/api/admin`)

> **Sadece admin panel içindir.** Bu endpoint'lere yalnızca admin yetkisine sahip kullanıcılar erişebilir.

### Orders
| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/admin/orders/` | Tüm siparişleri listeler (query param ile filtreleme) |
| GET | `/api/admin/orders/:id` | Tek sipariş detayı |
| PUT | `/api/admin/orders/:id` | Sipariş güncelle |
| POST | `/api/admin/orders/status/` | Sipariş durumu güncelle |
| POST | `/api/admin/orders/complete/` | Sipariş tamamla |

### Categories
| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/admin/category/` | Kategorileri listeler (query param ile filtreleme) |
| POST | `/api/admin/category/` | Kategori ekle |
| PUT | `/api/admin/category/` | Kategori güncelle |
| DELETE | `/api/admin/category/:id` | Kategori sil |

### Subcategories
| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/admin/subcategory` | Alt kategorileri listeler (query: search) |
| POST | `/api/admin/subcategory/` | Alt kategori ekle |
| PUT | `/api/admin/subcategory/` | Alt kategori güncelle |
| DELETE | `/api/admin/subcategory/:id` | Alt kategori sil |

### Products
| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/admin/product` | Ürünleri listeler (query: search) |
| POST | `/api/admin/product/` | Ürün ekle |
| PUT | `/api/admin/product/` | Ürün güncelle |
| DELETE | `/api/admin/product/:id` | Ürün sil |

### Variants
| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/admin/variant/` | Varyantları listeler (query param ile filtreleme) |
| PUT | `/api/admin/variant/` | Varyant güncelle |
| DELETE | `/api/admin/variant/:id` | Varyant sil |

### Shipments
| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/admin/shipment/` | Gönderileri listeler (query param ile filtreleme) |
| GET | `/api/admin/shipment/:id` | Tek gönderi detayı |
| PUT | `/api/admin/shipment/:id` | Gönderi güncelle |

### Other
| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/admin/customers/` | Müşterileri listeler (query param ile filtreleme) |
| POST | `/api/admin/orderitems/tracking` | OrderItem takip notu ekle/güncelle (body: `{ orderItemId, note }` veya `{ ids: [], note }`) |
| POST | `/api/admin/variant-upload` | Varyant Excel dosyası yükle (multipart file, headers: `hierarchy_type`, `hierarchy_id`) |

---

## 2. Account Router (`/api/account`)

> **Login olmak zorunludur.** `requireAuth` middleware ile korunur. Kullanıcı yalnızca kendi verilerini görür.

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/account/orders` | Kullanıcının siparişlerini listeler (OrderItem, Customer, Shipment, OrderStatus, Billing include edilir) |
| GET | `/api/account/shipments` | Kullanıcının gönderilerini listeler (Carrier, ShipmentStatus include edilir) |
| GET | `/api/account/invoices` | Kullanıcının faturalarını listeler |

---

## 3. Auth Router (`/api/auth`)

| Method | Path | Açıklama |
|--------|------|----------|
| POST | `/api/auth/register` | Kayıt ol (`email`, `password`, `name`, `surname`) |
| POST | `/api/auth/login` | Giriş yap (`email`, `password`) — HttpOnly cookie'ye token yazılır |
| POST | `/api/auth/logout` | Çıkış yap — token'lar temizlenir |
| POST | `/api/auth/refresh-token` | Refresh token ile yeni access token al |
| POST | `/api/auth/forgot-password` | Şifre sıfırlama maili gönder (`email`) |
| POST | `/api/auth/reset-password/:token` | Şifre sıfırlama (`password`) |
| GET | `/api/auth/google` | Google ile giriş (Passport) |
| GET | `/api/auth/google/callback` | Google callback — cookie'ye token yazılır, frontend'e yönlendirilir |

---

## 4. User Router (`/api/user`)

> `authMiddleware` ile korunur.

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/user/user-details` | Oturum açmış kullanıcının detaylarını döndürür |

---

## 5. Product Router (`/api/product`)

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/product/` | Ürünleri listeler |
| GET | `/api/product/name/` | Header'daki `query` ile alt kategori adına göre ürünleri getirir |
| GET | `/api/product/:id` | Alt kategori ID'sine göre ürünleri getirir |
| GET | `/api/product/details/:id` | Ürün detayını getirir (FE için) |
| POST | `/api/product/` | Ürün ekle |
| DELETE | `/api/product/:id` | Ürün sil |

---

## 6. Category Router (`/api/category`)

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/category/` | Tüm kategorileri listeler |
| GET | `/api/category/:id` | Tek kategori getir |
| POST | `/api/category/` | Kategori ekle |
| DELETE | `/api/category/:id` | Kategori sil |

---

## 7. Subcategory Router (`/api/subcategory`)

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/subcategory/` | Tüm alt kategorileri listeler |
| GET | `/api/subcategory/:id` | Kategori ID'sine göre alt kategorileri getirir |
| GET | `/api/subcategory/details/:id` | Alt kategori detayını getirir (FE için) |
| GET | `/api/subcategory/name/` | Header'daki `query` ile kategori adına göre alt kategorileri getirir |
| POST | `/api/subcategory/` | Alt kategori ekle |
| DELETE | `/api/subcategory/:id` | Alt kategori sil |

---

## 8. Variant Router (`/api/variant`)

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/variant/` | Tüm varyantları listeler |
| GET | `/api/variant/:id` | Tek varyant getir |
| POST | `/api/variant/id-list` | ID listesine göre varyantları getirir (body: `{ ids: [] }`) |
| GET | `/api/variant/productId/:id` | Ürün ID'sine göre varyantları getirir |
| GET | `/api/variant/drop/:id` | Excel dropdown için varyant verisi |
| POST | `/api/variant/` | Varyant ekle |
| PUT | `/api/variant/` | Varyant güncelle |
| DELETE | `/api/variant/:id` | Varyant sil |

---

## 9. Order Router (`/api/orders`)

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/orders/orders/` | Header'daki `query` ile siparişleri getirir |
| POST | `/api/orders/` | Sipariş oluştur |

---

## 10. Order Item Router (`/api/orderitem`)

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/orderitem/` | Tüm order item'ları listeler |
| POST | `/api/orderitem/` | Order item ekle |

---

## 11. Cart Router (`/api/cart`)

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/cart/` | Sepeti getirir (cookie'deki `userCart` veya DB'den kullanıcıya ait sepet) |
| PUT | `/api/cart/update` | Sepete ürün ekle/güncelle (body: `{ id, quantity }`) |
| DELETE | `/api/cart/delete` | Sepetten ürün sil (body: `{ id }`) |

---

## 12. Carrier Router (`/api/carriers`)

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/carriers/` | Tüm taşıyıcıları listeler |
| GET | `/api/carriers/:id` | Tek taşıyıcı getir |
| POST | `/api/carriers/` | Taşıyıcı ekle |
| PUT | `/api/carriers/` | Taşıyıcı güncelle |
| DELETE | `/api/carriers/:id` | Taşıyıcı sil |

---

## 13. Carrier Price Router (`/api/carrierprice`)

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/carrierprice/` | Header'daki `query` ile taşıyıcı fiyatlarını getirir |
| GET | `/api/carrierprice/:id` | Tek taşıyıcı fiyatı getir |
| POST | `/api/carrierprice/` | Taşıyıcı fiyatı ekle |
| DELETE | `/api/carrierprice/:id` | Taşıyıcı fiyatı sil |

---

## 14. Customer Router (`/api/customer`)

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/customer/` | Tüm müşterileri listeler |
| POST | `/api/customer/` | Müşteri ekle |

---

## 15. Shipment Router (`/api/shipments`)

| Method | Path | Açıklama |
|--------|------|----------|
| POST | `/api/shipments/calculate` | Kargo ücreti hesapla (body: `{ isResidential, zipCode }`) |

---

## 16. Invoice Router (`/api/invoices`)

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/invoices/pdf/:orderId` | Sipariş ID'sine göre PDF fatura oluşturur ve döndürür |

---

## 17. Image Router (`/api/images`)

| Method | Path | Açıklama |
|--------|------|----------|
| POST | `/api/images/upload` | Resim yükle (multipart file) — R2'ye kaydeder, DB'ye URL ekler |
| GET | `/api/images/all` | Tüm resimleri listeler (query: search) |
| POST | `/api/images/delete` | Toplu resim sil (body: `{ images: [{id, url}] }`) — R2 ve DB'den siler |
| POST | `/api/images/attach` | Resimleri ürün/alt kategori/varyanta ata (body: `{ ids: [], target: "product"|"subcategory"|"variant", targetId }`) |
| GET | `/api/images/subcategory/:name` | Alt kategori adına göre resimleri getirir |

---

## 18. R2 Router (`/api/r2`)

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/r2/get-images` | R2'deki tüm resimleri listeler |
| POST | `/api/r2/upload-image` | R2'ye resim yükle (multipart file) |
| DELETE | `/api/r2/delete-image` | R2'den resim sil (body: `{ key }`) |

---

## 19. Featured Router (`/api/featured`)

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/featured/` | Öne çıkan ürünleri listeler (query param ile filtreleme) |
| GET | `/api/featured/:id` | Tek öne çıkan ürün getir |
| POST | `/api/featured/` | Öne çıkan ürün ekle |
| DELETE | `/api/featured/:id` | Öne çıkan ürün sil |

---

## 20. Search Router (`/api/search`)

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/search/` | Arama yapar (query param ile) |

---

## 21. Services Router (`/api/services`)

| Method | Path | Açıklama |
|--------|------|----------|
| POST | `/api/services/shipping-options` | UPS kargo seçeneklerini hesaplar (body: `{ recipient, packageDetails }`) |
| POST | `/api/services/sending-options` | Taibeta kargo seçeneklerini hesaplar (body: `{ recipient, packageDetails }`) |
| POST | `/api/services/combined-shipping-options` | UPS + Taibeta birleşik kargo seçeneklerini hesaplar (body: `{ recipient, packageDetails }`) |

---

## 22. Stripe Router (`/api/stripe`)

| Method | Path | Açıklama |
|--------|------|----------|
| POST | `/api/stripe/create-payment-intent` | Stripe ödeme niyeti oluşturur |
| POST | `/api/stripe/calculate-tax` | Stripe vergi hesaplaması yapar |

---

## 23. Claims Router (`/api/claims`)

| Method | Path | Açıklama |
|--------|------|----------|
| POST | `/api/claims/` | Talep/şikayet oluştur |
| GET | `/api/claims/` | Tüm talepleri listeler (admin, query: limit, offset, searchTerm) |
| GET | `/api/claims/:id` | Tek talep getir |
| PUT | `/api/claims/:id/read` | Talebi okundu işaretle |
| DELETE | `/api/claims/:id` | Talep sil |

---

## 24. Shipping Profiles Router (`/api/shippingprofiles`)

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/shippingprofiles/` | Kullanıcının gönderim profillerini listeler |
| POST | `/api/shippingprofiles/` | Gönderim profili ekle |
| PUT | `/api/shippingprofiles/:id` | Gönderim profili güncelle |
| DELETE | `/api/shippingprofiles/:id` | Gönderim profili sil |

---

## 25. Price Router (`/api/price`)

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/price/` | Tüm fiyatları listeler |
| GET | `/api/price/:id` | Tek fiyat getir |
| POST | `/api/price/` | Fiyat ekle |
| PUT | `/api/price/` | Fiyat güncelle |
| DELETE | `/api/price/:id` | Fiyat sil |

---

## 26. Description Router (`/api/description`)

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/description/` | Tüm açıklamaları listeler |
| GET | `/api/description/:id` | Tek açıklama getir |
| POST | `/api/description/` | Açıklama ekle |
| PUT | `/api/description/` | Açıklama güncelle |
| DELETE | `/api/description/:id` | Açıklama sil |

---

## 27. Dimension Router (`/api/dimension`)

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/dimension/` | Tüm boyutları listeler |
| GET | `/api/dimension/:id` | Tek boyut getir |
| POST | `/api/dimension/` | Boyut ekle |
| PUT | `/api/dimension/` | Boyut güncelle |
| DELETE | `/api/dimension/:id` | Boyut sil |

---

## 28. Package Info Router (`/api/package`)

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/package/` | Tüm paket bilgilerini listeler |
| GET | `/api/package/:id` | Tek paket bilgisi getir |
| POST | `/api/package/` | Paket bilgisi ekle |
| PUT | `/api/package/` | Paket bilgisi güncelle |
| DELETE | `/api/package/:id` | Paket bilgisi sil |

---

## 29. Pallet Info Router (`/api/pallet`)

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/pallet/` | Tüm palet bilgilerini listeler |
| GET | `/api/pallet/:id` | Tek palet bilgisi getir |
| POST | `/api/pallet/` | Palet bilgisi ekle |
| PUT | `/api/pallet/` | Palet bilgisi güncelle |
| DELETE | `/api/pallet/:id` | Palet bilgisi sil |

---

## 30. Specification Router (`/api/specification`)

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/specification/` | Tüm spesifikasyonları listeler |
| GET | `/api/specification/:id` | Tek spesifikasyon getir |
| POST | `/api/specification/` | Spesifikasyon ekle |
| PUT | `/api/specification/` | Spesifikasyon güncelle |
| DELETE | `/api/specification/:id` | Spesifikasyon sil |

---

## Özet — Erişim Kısıtlamaları

| Router | Base Path | Auth Gerekiyor mu? | Admin Gerekli mi? |
|--------|-----------|-------------------|-------------------|
| Account | `/api/account` | Evet (`requireAuth`) | Hayır |
| Admin | `/api/admin` | Hayır (controller içinde yönetilir) | Evet (admin panel) |
| Auth | `/api/auth` | Hayır | Hayır |
| User | `/api/user` | Evet (`authMiddleware`) | Hayır |
| Claims | `/api/claims` | POST için evet, GET/PUT/DELETE admin | Kısmen |
| Cart | `/api/cart` | Hayır (cookie bazlı) | Hayır |
| Diğerleri | `/api/*` | Hayır | Hayır |
