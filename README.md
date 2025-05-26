# Task Management System

Next.js 15 App Router ile geliştirilmiş kanban tabanlı görev yönetim sistemi. AI asistan entegrasyonu ile akıllı görev yönetimi sunar.

## Özellikler

- 🎯 **Kanban Board**: Görev durumlarını görsel olarak yönetme
- 🤖 **AI Asistan**: OpenAI ile akıllı görev yönetimi
- 👥 **Kullanıcı Rolleri**: Admin ve User rolleri
- 🏢 **Müşteri Yönetimi**: Müşteri bazlı görev organizasyonu
- 📝 **Görev Notları**: Görevlere yorum ekleme
- 📎 **Dosya Ekleri**: Görevlere dosya ekleme
- 🏷️ **Etiketler**: Görevleri kategorize etme
- 🔐 **Güvenli Auth**: NextAuth.js ile kimlik doğrulama

## Teknolojiler

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Auth**: NextAuth.js
- **AI**: OpenAI GPT-3.5-turbo
- **UI**: Lucide React Icons

## Kurulum

### 1. Projeyi klonlayın

```bash
git clone <repo-url>
cd cpa_task
```

### 2. Bağımlılıkları yükleyin

```bash
npm install
```

### 3. Environment variables

`.env` dosyası oluşturun ve gerekli değerleri doldurun:

```env
# Database
DATABASE_URL="postgresql://postgres:205630@localhost:5432/mcpdemo"

# NextAuth
NEXTAUTH_SECRET="your-super-secret-key-here-change-this-in-production"
NEXTAUTH_URL="http://localhost:3000"

# OpenAI
OPENAI_API_KEY="your-openai-api-key-here"
```

### 4. Database kurulumu

PostgreSQL veritabanınızı oluşturun ve Prisma migration'larını çalıştırın:

```bash
# Prisma client oluştur
npx prisma generate

# Database migration
npx prisma migrate dev --name init

# Demo verileri ekle
npm run db:seed

# (Opsiyonel) Prisma Studio ile veritabanını görüntüle
npx prisma studio
```

### 5. Uygulamayı çalıştırın

```bash
npm run dev
```

Uygulama http://localhost:3000 adresinde çalışacaktır.

## Demo Hesaplar

Seed script çalıştırıldıktan sonra aşağıdaki demo hesapları kullanabilirsiniz:

- **Admin**: admin@example.com / admin123
- **User**: user@example.com / user123

## Kullanım

### Giriş Yapma

1. http://localhost:3000 adresine gidin
2. Demo hesaplardan biriyle giriş yapın:
   - Admin: admin@example.com / admin123
   - User: user@example.com / user123

### Görev Yönetimi

1. **Görev Oluşturma**: "Yeni Görev" butonuna tıklayın
2. **Durum Değiştirme**: Görev kartındaki menüden durumu değiştirin
3. **Kanban Board**: Görevleri sütunlar arasında görüntüleyin

### AI Asistan

1. "AI Asistan" sekmesine geçin
2. Doğal dilde sorular sorun:
   - "Kaç tane admin kullanıcı var?"
   - "Toplam kullanıcı sayısı nedir?"
   - "Doğrulanmış kullanıcı sayısı?"

## API Endpoints

### Authentication
- `POST /api/auth/[...nextauth]` - NextAuth endpoints

### Users
- `GET /api/users` - Kullanıcıları listele (Admin only)
- `POST /api/users` - Yeni kullanıcı oluştur (Admin only)

### Customers
- `GET /api/customers` - Müşterileri listele
- `POST /api/customers` - Yeni müşteri oluştur
- `GET /api/customers/[id]/files` - Müşteri dosyalarını listele
- `POST /api/customers/[id]/files` - Müşteri dosyası ekle

### Tasks
- `GET /api/tasks` - Görevleri listele
- `POST /api/tasks` - Yeni görev oluştur
- `GET /api/tasks/[id]` - Görev detayı
- `PUT /api/tasks/[id]` - Görev güncelle
- `DELETE /api/tasks/[id]` - Görev sil
- `GET /api/tasks/[id]/notes` - Görev notları
- `POST /api/tasks/[id]/notes` - Görev notu ekle

### AI Chat
- `POST /api/chat` - AI asistan ile sohbet

## Proje Yapısı

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   ├── auth/              # Auth sayfaları
│   ├── globals.css        # Global CSS
│   ├── layout.tsx         # Root layout
│   ├── page.tsx          # Ana sayfa
│   └── providers.tsx      # Context providers
├── components/            # React components
│   ├── ChatInterface.tsx  # AI chat arayüzü
│   ├── CreateTaskModal.tsx
│   ├── Dashboard.tsx      # Ana dashboard
│   ├── LoadingSpinner.tsx
│   ├── TaskBoard.tsx      # Kanban board
│   ├── TaskCard.tsx       # Görev kartı
│   └── TaskColumn.tsx     # Kanban sütunu
├── lib/                   # Utility libraries
│   ├── ai-agent.ts       # OpenAI AI agent
│   ├── auth.ts           # NextAuth config
│   ├── prisma.ts         # Prisma client
│   └── utils.ts          # Utility functions
└── types/                 # TypeScript types
    └── next-auth.d.ts    # NextAuth type extensions
```

## Geliştirme

### Database Schema Değişiklikleri

```bash
# Schema değişikliği sonrası
npx prisma migrate dev --name your-migration-name
npx prisma generate
```

### Demo Verileri Yenileme

```bash
# Veritabanını sıfırla ve demo verileri ekle
npx prisma migrate reset
npm run db:seed
```

### AI Asistan Geliştirme

`src/lib/ai-agent.ts` dosyasında yeni özellikler ekleyebilirsiniz:

```typescript
// Yeni tool fonksiyonu eklemek için
async newTool(params: any) {
  try {
    // Tool logic
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: 'Error message' }
  }
}
```

## Sorun Giderme

### Yaygın Hatalar

1. **Database bağlantı hatası**: DATABASE_URL'in doğru olduğundan emin olun
2. **NextAuth JWT hatası**: NEXTAUTH_SECRET'in ayarlandığından emin olun
3. **OpenAI API hatası**: OPENAI_API_KEY'in geçerli olduğundan emin olun

### Loglama

Geliştirme sırasında console.log'ları kontrol edin:
- Browser console: Frontend hataları
- Terminal: Backend API hataları

## Lisans

MIT License

## Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun
