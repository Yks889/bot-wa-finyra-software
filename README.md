# 🤖 FINYRA WhatsApp Bot

Bot WhatsApp otomatis berbasis [Baileys](https://github.com/WhiskeySockets/Baileys), dibuat untuk mengelola pesanan jasa digital, mengirim promosi, dan menjawab pertanyaan pengguna secara langsung. Cocok untuk usaha digital studio, desain, dan layanan kreatif seperti FINYRA.

---

## 📸 Logo

![Logo FINYRA](logo/logo.jpeg)

---

## ✨ Fitur Utama

- 🔌 **Start/Shutdown Bot** — Mengaktifkan/mematikan bot melalui perintah admin
- 📋 **Menu Interaktif** — Menampilkan daftar layanan dari `data/menu.json` lengkap dengan gambar/logo
- 📣 **Promosi Otomatis ke Grup** — Mengirim promosi ke beberapa grup WA dengan variasi pesan
- 💬 **Forward Chat** — Pesan dari pengguna pribadi diforward ke grup admin
- 💬 **Reply Balik ke Pengirim** — Balasan dari grup akan dikirim balik ke user via chat pribadi
- 🛒 **.pesan [ID] x[Jumlah]** — User bisa memesan jasa langsung via command
- 📃 **Daftar Harga (.list-harga)** — Menampilkan data harga dari `data/harga.json`
- ⚙️ **Set Status Jasa** — Admin bisa mengubah ketersediaan jasa
- 💘 **Persentase Cinta (.cinta)** — Command fun random
- 🎁 **Pesan Spesial untuk Zizi (.special-woment)** — Custom perintah personal
- 👤 **Pemilik Bot (.owner)** — Menampilkan info kontak admin

---

## 🧾 Struktur Data

**📁 Folder `data/`:**
- `menu.json` → Daftar menu per kategori
- `harga.json` → Daftar jasa: id, nama, harga, kategori, status tersedia
- `forwardCache.json` → Cache pesan untuk tracking reply otomatis
- `replyMap.json` → Menyimpan ID pesan reply untuk sistem balasan personal

---

## 📦 Instalasi & Setup

### 1. Clone repo

```bash
git clone https://github.com/username/finyra-wa-bot.git
cd finyra-wa-bot
npm install
```

### 2. Jalankan bot

```bash
node index.js
```

📱 Scan QR Code di terminal untuk login WhatsApp.

---

## ⚙️ Konfigurasi

### Ubah ID admin & grup:

```js
const ADMIN_JID = "628XXXXXXXXX@s.whatsapp.net"
const GROUP_JID = "1203XXXXXXXXXXX@g.us"
```

### Struktur `harga.json`:

```json
[
  {
    "id": "WEB01",
    "nama": "Jasa Website Company Profile",
    "harga": "Rp 1.500.000",
    "kategori": "Website",
    "tersedia": true
  }
]
```

---

## 📤 Fitur Promosi

Perintah:
```
.promosi
```

- Hanya bisa dikirim oleh admin
- Maksimal 5 grup sekaligus
- Cooldown 1 jam
- Jika diblokir oleh grup, bot akan otomatis mengaktifkan cooldown darurat

---

## 🛠️ Perintah Bot

| Perintah | Fungsi |
|----------|--------|
| `.start` | Mengaktifkan bot |
| `.shutdown` | Menonaktifkan bot |
| `.menu` | Menampilkan layanan yang tersedia |
| `.list-harga` | Daftar harga jasa |
| `.pesan [ID] x[Jumlah]` | Memesan jasa |
| `.setstatus [ID] [ready/tidak]` | Mengubah status jasa (admin) |
| `.owner` | Info kontak pemilik bot |
| `.cinta` | Persentase cinta acak |
| `.special-woment` | Pesan spesial (Zizi ❤️) |

---

## ✅ Catatan Tambahan

- Bot hanya merespons `.menu`, `.pesan`, dll jika **aktif**
- Forward pesan hanya berlaku untuk DM ke bot (bukan dari grup)
- Bot menggunakan file QR yang disimpan di `./auth` untuk login WA multi-device
- Bot akan restart otomatis jika koneksi terputus (kecuali logout)

---

## 📄 Lisensi

Proyek ini open-source di bawah lisensi [MIT](LICENSE)
