# 🧪 Little Swan — Testing Guide

## ⚡ Quick Start (5 دقائق)

### 1. Supabase Setup

```bash
# 1. اعمل project جديد على supabase.com
# 2. اذهب إلى SQL Editor → New Query
# 3. ارفع schema.sql واضغط Run
# 4. ارفع seed.sql واضغط Run
# 5. هتشوف: Students=20, Classes=5, Sessions=6...
```

### 2. Create Auth Users

في Supabase Dashboard → Authentication → Users → Add User:

| Email | Password | Role |
|-------|----------|------|
| admin@littleswan.com | Test@1234 | super_admin |
| staff1@littleswan.com | Test@1234 | staff |
| staff2@littleswan.com | Test@1234 | staff |
| coach1@littleswan.com | Test@1234 | coach |
| coach2@littleswan.com | Test@1234 | coach |
| coach3@littleswan.com | Test@1234 | coach |

### 3. Environment Setup

```bash
cp .env.local.example .env.local
# أضف:
# NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 4. Run

```bash
npm install
npm run dev
# افتح: http://localhost:3000
```

---

## ✅ Test Checklist

### 🔐 Auth
- [ ] Login بـ admin@littleswan.com / Test@1234
- [ ] يفتح /dashboard مباشرة
- [ ] Logout يرجع لـ /login
- [ ] URL محمية — لو فتحت /dashboard بدون login يرجع /login

### 🌗 Light/Dark Mode
- [ ] زرار القمر في الـ topbar يحول لـ dark mode
- [ ] زرار الشمس يرجع لـ light mode
- [ ] الاختيار بيتحفظ بعد reload

### 📊 Dashboard
- [ ] تظهر stats صح (20 طالبة، حصص اليوم، إيرادات)
- [ ] قائمة آخر الطالبات تظهر
- [ ] تنبيه "مطلوب دفع" يظهر لـ نور وهنا (remaining=0)
- [ ] تنبيه طلب تحويل معلق لـ سارة محمود

### 👩‍🎓 Students
- [ ] قائمة 20 طالبة تظهر
- [ ] فلتر بالحالة (active/frozen/inactive) يشتغل
- [ ] فلتر بالمستوى يشتغل
- [ ] بحث بالاسم يشتغل
- [ ] الضغط على طالبة يفتح ملفها
- [ ] ملف الطالبة يظهر: subscription, attendance, payments
- [ ] زر تجميد يغير الحالة لـ frozen
- [ ] زر إعادة تفعيل يغير الحالة لـ active
- [ ] إضافة طالبة جديدة يحفظ ويفتح ملفها

### 🎓 Classes
- [ ] 5 فصول تظهر بكروت
- [ ] capacity bar يظهر صح
- [ ] فتح فصل يظهر الطالبات المسجلة
- [ ] تسجيل طالبة جديدة في فصل يشتغل
- [ ] إضافة فصل جديد → تعارض Hall يظهر warning

### 📅 Sessions
- [ ] التقويم الأسبوعي يظهر
- [ ] زرار "إنشاء حصص الأسبوع" يولد حصص من الفصول
- [ ] التنقل بين الأسابيع يشتغل
- [ ] فتح حصة يظهر تفاصيلها

### ✅ Attendance
- [ ] اختيار حصة من القائمة يجيب الطالبات
- [ ] تحديد حاضرة/غائبة/تعويض يشتغل
- [ ] حفظ الحضور → يخصم من subscription تلقائي
- [ ] طالبة remaining=0 تظهر "مطلوب دفع" باللون الأصفر

### 💳 Payments
- [ ] قائمة مدفوعات اليوم + فلتر بالتاريخ
- [ ] إضافة دفعة subscription → ينشئ subscription تلقائي
- [ ] إضافة دفعة partial → يظهر remaining_balance
- [ ] الـ stats cards صح (إيرادات، مصروفات، صافي)

### 👩‍🏫 Coaches
- [ ] 3 مدربات بكروت + ساعات + مرتب
- [ ] فتح مدربة → سجل حضور + مرتب شهري
- [ ] كوتش check-in page → يطلب GPS

### 📝 Exams
- [ ] امتحانين يظهرا
- [ ] فتح امتحان → يظهر الطالبات بالمستوى
- [ ] تسجيل pass → يرقي الطالبة تلقائياً للمستوى التالي
- [ ] تسجيل fail → المستوى ما يتغيرش

### 🔄 Transfers
- [ ] طلب تحويل سارة يظهر كـ pending
- [ ] زر موافقة → يحول الطالبة ويغير status لـ approved
- [ ] زر رفض → يغير status لـ rejected

### 📦 Inventory
- [ ] 5 منتجات تظهر
- [ ] تحذير مخزون منخفض يظهر لـ مايوه S (2 قطع)
- [ ] إضافة منتج جديد يشتغل

### ⭐ Events
- [ ] حفل نهاية العام + ورشة الصيف يظهران
- [ ] فتح الحفل → 3 طالبات مسجلة (1 دفعت)
- [ ] تسجيل طالبة جديدة + دفع يشتغل

### 💸 Expenses
- [ ] مصروفات اليوم تظهر
- [ ] إضافة مصروف جديد يظهر فوراً

### 📈 Reports
- [ ] مخطط الإيرادات 30 يوم يظهر
- [ ] breakdown by type يظهر

### ⚙️ Settings
- [ ] القيم الحالية تظهر (100m radius، 5 غيابات، إلخ)
- [ ] تغيير قيمة وحفظها يشتغل
- [ ] زرار "استخدام موقعي الحالي" يملأ الـ GPS

---

## 🐛 Common Issues & Fixes

### مشكلة: الصفحة مش بتحمل
```
Solution: تأكد .env.local فيه الـ Supabase URL صح
```

### مشكلة: Login فاشل
```
Solution: تأكد إن الـ email في Supabase Auth Users
```

### مشكلة: بيانات مش ظاهرة
```
Solution: شيل الـ RLS policies مؤقتاً من Supabase
Dashboard → Table Editor → [table] → RLS → Disable
```

### مشكلة: GPS مش شغال
```
Solution: اشتغل على HTTPS أو localhost فقط
في production: Vercel بيعمل HTTPS تلقائياً
```

---

## 🚀 Deploy to Vercel

```bash
# 1. Push to GitHub
git init && git add . && git commit -m "Little Swan v2"
git remote add origin https://github.com/YOUR_USERNAME/little-swan.git
git push -u origin main

# 2. Import in Vercel
# vercel.com → New Project → Import from GitHub

# 3. Add Environment Variables in Vercel:
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
# SUPABASE_SERVICE_ROLE_KEY

# 4. Deploy!
```

**Live URL:** `https://little-swan-xxxx.vercel.app`
**DB Dashboard:** `https://app.supabase.com/project/YOUR_PROJECT_ID`

---

## 🔗 Useful Links

| Resource | URL |
|----------|-----|
| Supabase Dashboard | https://app.supabase.com |
| Supabase SQL Editor | Dashboard → SQL Editor |
| Supabase Auth Users | Dashboard → Authentication → Users |
| Supabase Table Editor | Dashboard → Table Editor |
| Vercel Dashboard | https://vercel.com/dashboard |
| Local App | http://localhost:3000 |
