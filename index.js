const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  DisconnectReason
} = require("@whiskeysockets/baileys");

const P = require("pino");
const fs = require("fs");
const qrcode = require("qrcode-terminal");
const path = require("path");

const ADMIN_JID = "6281332908050@s.whatsapp.net";
const GROUP_JID = "120363420819214355@g.us";

let isActive = true;

const forwardCachePath = path.join(__dirname, "data", "forwardCache.json");
if (!fs.existsSync(forwardCachePath)) fs.writeFileSync(forwardCachePath, JSON.stringify({}));
let forwardCache = JSON.parse(fs.readFileSync(forwardCachePath, "utf-8"));

const replyMapPath = path.join(__dirname, "data", "replyMap.json");
if (!fs.existsSync(replyMapPath)) fs.writeFileSync(replyMapPath, JSON.stringify({}));
let replyMap = JSON.parse(fs.readFileSync(replyMapPath, "utf-8"));

const groupListPath = path.join(__dirname, "data", "group-list.json");
if (!fs.existsSync(groupListPath)) fs.writeFileSync(groupListPath, JSON.stringify({ groups: [] }, null, 2));
function getGroupList() {
  return JSON.parse(fs.readFileSync(groupListPath));
}
function saveGroupList(data) {
  fs.writeFileSync(groupListPath, JSON.stringify(data, null, 2));
}

async function refreshGroupList(sock) {
  const all = await sock.groupFetchAllParticipating();
  const list = { groups: Object.keys(all) };
  saveGroupList(list);
  return list;
}

async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth");
  const sock = makeWASocket({
    version: (await fetchLatestBaileysVersion()).version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, P().child({ level: "fatal" }))
    },
    logger: P({ level: "silent" }),
    emitOwnEvents: true
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) qrcode.generate(qr, { small: true });
    if (connection === "close") {
      const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) startSock();
    } else if (connection === "open") {
      console.log("✅ Bot terhubung ke WhatsApp");
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.remoteJid;
    const from = msg.key.participant || sender;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
    const lower = text.toLowerCase();
    const isAdmin = from === ADMIN_JID;

    if (lower.startsWith(".addgrub") && isAdmin) {
      const link = lower.split(" ")[1];
      if (!link || !link.includes("https://chat.whatsapp.com/")) return await sock.sendMessage(sender, { text: "❌ Format salah. Contoh: .addgrub https://chat.whatsapp.com/abc123" });
      const inviteCode = link.split("/").pop();
      try {
        const jid = await sock.groupAcceptInvite(inviteCode);
        const list = getGroupList();
        if (list.groups.includes(jid)) {
          return await sock.sendMessage(sender, { text: `⚠️ Bot sudah bergabung di grup tersebut:
${jid}` });
        }
        list.groups.push(jid);
        saveGroupList(list);
        return await sock.sendMessage(sender, { text: `✅ Grup berhasil ditambahkan:
${jid}` });
      } catch (e) {
        return await sock.sendMessage(sender, { text: "❌ Gagal join grup. Pastikan link valid dan bot tidak diblokir." });
      }
    }

    if (lower === ".refreshgrub" && isAdmin) {
      const list = await refreshGroupList(sock);
      const isi = list.groups.map((g, i) => `${i + 1}. ${g}`).join("\n");
      return await sock.sendMessage(sender, { text: `🔄 *Group list diperbarui:*

${isi}` });
    }

    if (lower === ".listgrub" && isAdmin) {
      const list = getGroupList();
      if (!list.groups.length) return await sock.sendMessage(sender, { text: "📭 Belum ada grup yang terdaftar." });
      const isi = list.groups.map((g, i) => `${i + 1}. ${g}`).join("\n");
      return await sock.sendMessage(sender, { text: `📃 *DAFTAR GRUP TERSIMPAN:*

${isi}` });
    }

    if (lower.startsWith(".delgrub") && isAdmin) {
      const jid = lower.split(" ")[1];
      if (!jid) return await sock.sendMessage(sender, { text: "❌ Masukkan JID grup yang ingin dihapus." });
      const list = getGroupList();
      const index = list.groups.indexOf(jid);
      if (index === -1) return await sock.sendMessage(sender, { text: "❌ JID tidak ditemukan dalam daftar." });
      list.groups.splice(index, 1);
      saveGroupList(list);
      return await sock.sendMessage(sender, { text: `✅ Grup ${jid} berhasil dihapus dari daftar.` });
    }

        // ✅ START / SHUTDOWN - Harus bisa dieksekusi kapan saja oleh admin
    if (lower === ".start" && isAdmin) {
      if (isActive) return await sock.sendMessage(sender, { text: "✅ Bot sudah dalam keadaan aktif." });
      isActive = true;
      return await sock.sendMessage(sender, { text: "✅ Bot berhasil diaktifkan kembali oleh admin." });
    }

    if (lower === ".shutdown" && isAdmin) {
      isActive = false;
      return await sock.sendMessage(sender, { text: "🔌 Bot dimatikan sementara oleh admin." });
    }

    // ❌ Jika bot nonaktif, hanya izinkan command .menu
    if (!isActive) {
      if (lower === ".menu") {
        return await sock.sendMessage(sender, {
          text: "🚫 Bot sedang dalam mode tidur.\n\nKetik *.start* untuk mengaktifkan kembali (khusus admin)."
        });
      }
      return; // Nonaktifkan semua perintah lain
    }



    // =========================== FITUR BOT ===========================

    if (lower === ".promosi" && isAdmin) {
      const grupMetadata = await sock.groupFetchAllParticipating();
      const allGroupJIDs = Object.keys(grupMetadata).filter(jid => jid !== GROUP_JID);

      const pesanPromosi = `https://chat.whatsapp.com/JDTB28TiPg8G2lsVblEexq

*FINYRA SOFTWARE | KOMUNITAS DIGITAL KREATIF*

Bergabunglah dengan komunitas kami dan temukan berbagai layanan digital terbaik:

- Jasa Pembuatan Website (Custom & Responsive)  
- Jasa Desain Website (Figma - UI/UX Profesional)  
- Jasa Desain Logo (Unik & Eksklusif)  
- Pembuatan PPT Presentasi (Keren & Profesional)  
- Reseller Resmi Komponen Komputer

*Kenapa Gabung?*  
✓ Harga Terjangkau  
✓ Layanan Cepat & Berkualitas  
✓ Konsultasi Gratis  
✓ Komunitas Supportif`;

      let total = allGroupJIDs.length;
      let sukses = 0;
      let gagal = 0;
      let detail = "";

      for (const jid of allGroupJIDs) {
        try {
          await sock.sendMessage(jid, { text: pesanPromosi });
          sukses++;
          detail += `✅ ${grupMetadata[jid]?.subject || jid}\n`;
        } catch (e) {
          gagal++;
          detail += `❌ ${grupMetadata[jid]?.subject || jid} (${e.message})\n`;
        }
      }

      const laporan = `📣 *LAPORAN PROMOSI FINYRA*\n\n📌 Total grup terdeteksi: *${total}*\n📬 Pesan berhasil dikirim: *${sukses}*\n⚠️ Gagal terkirim: *${gagal}*\n\n📄 *Detail:*\n${detail.trim()}`;
      await sock.sendMessage(GROUP_JID, { text: laporan });
      await sock.sendMessage(sender, { text: "✅ Pesan promosi sedang dikirim. Laporan akan muncul di grup utama." });

      // Simpan log
      const logPath = path.join(__dirname, "data", "promosi-log.txt");
      fs.appendFileSync(logPath, `\n[${new Date().toISOString()}]\n${laporan}\n`);
      return;
    }

    if (lower === ".menu") {
      const menuPath = path.join(__dirname, "data", "menu.json");
      const logoPath = path.join(__dirname, "data", "logo.jpeg");
      const menuData = JSON.parse(fs.readFileSync(menuPath, "utf-8"));
      let output = "🌟 *Finyra Software | Creative Design Studio*\n\n📋 *DAFTAR MENU UTAMA:*\n\n";
      for (const kategori in menuData) {
        output += `╭─ ❏ *${kategori}*\n`;
        menuData[kategori].forEach((item, i) => {
          output += `│ ${i + 1}. ${item}\n`;
        });
        output += "╰───────────────\n\n";
      }
      const logoBuffer = fs.readFileSync(logoPath);
      return await sock.sendMessage(sender, { image: logoBuffer, caption: output.trim() });
    }

    if (lower === ".owner") {
      return await sock.sendMessage(sender, { text: "👤 *Pemilik Bot:* wa.me/6281332908050" });
    }

    if (lower === ".cinta") {
      const persen = Math.floor(Math.random() * 100);
      return await sock.sendMessage(sender, { text: `❤️ *Persentase Cinta*\n\nCinta kamu sebesar *${persen}%* 💘` });
    }

    if (lower === ".special-woment") {
      const pesanZizi = "❤️ *Pesan Spesial untuk Zizi* ❤️\n\nZizi, tahu nggak? ... – Dari yang selalu mencintaimu, *Rafi* ❤️";
      return await sock.sendMessage(sender, { text: pesanZizi });
    }

    if (lower === ".list-harga") {
      const hargaPath = path.join(__dirname, "data", "harga.json");
      const jasaList = JSON.parse(fs.readFileSync(hargaPath, "utf-8"));
      let textHarga = "💰 *DAFTAR HARGA JASA:*\n\n";
      jasaList.forEach((jasa, i) => {
        textHarga += `*${i + 1}. ${jasa.nama}*\n🆔 ID: ${jasa.id}\n💵 Harga: ${jasa.harga}\n📁 Kategori: ${jasa.kategori}\n📦 Status: ${jasa.tersedia ? "✅ Ready" : "❌ Tidak tersedia"}\n\n`;
      });
      return await sock.sendMessage(sender, { text: textHarga.trim() });
    }

    if (lower.startsWith(".setstatus") && isAdmin) {
      const [_, id, status] = text.split(" ");
      const filePath = path.join(__dirname, "data", "harga.json");
      const jasaList = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const index = jasaList.findIndex(j => j.id === id);
      if (index === -1) return await sock.sendMessage(sender, { text: "❌ ID jasa tidak ditemukan." });
      jasaList[index].tersedia = status === "ready";
      fs.writeFileSync(filePath, JSON.stringify(jasaList, null, 2));
      return await sock.sendMessage(sender, { text: `✅ Status jasa *${id}* diubah menjadi *${status.toUpperCase()}*.` });
    }

    if (lower.startsWith(".pesan")) {
      const match = text.match(/\\.pesan\\s+(\\w+)\\s*x(\\d+)/i);
      if (!match) return await sock.sendMessage(sender, { text: "❌ Format salah.\n\nContoh: .pesan WEB01 x2" });
      const [, id, jumlah] = match;
      const filePath = path.join(__dirname, "data", "harga.json");
      const jasaList = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const item = jasaList.find(j => j.id.toLowerCase() === id.toLowerCase());
      if (!item) return await sock.sendMessage(sender, { text: "❌ ID jasa tidak ditemukan." });
      if (!item.tersedia) return await sock.sendMessage(sender, { text: "❌ Jasa tidak tersedia saat ini." });
      const total = parseInt(item.harga.replace(/[^\d]/g, "")) * parseInt(jumlah);
      const formatTotal = total.toLocaleString("id-ID");
      const nomor = sender.split("@")[0];
      const isi = `🧾 *PEMESANAN BARU*\n\n🆔 *ID Jasa:* ${item.id}\n📦 *Jenis:* ${item.nama}\n💵 *Harga Satuan:* ${item.harga}\n📁 *Kategori:* ${item.kategori}\n🔢 *Jumlah:* ${jumlah}\n💰 *Total:* Rp ${formatTotal}\n📱 *Pemesan:* wa.me/${nomor}`;
      await sock.sendMessage(ADMIN_JID, { text: isi });
      await sock.sendMessage(GROUP_JID, { text: isi });
      return await sock.sendMessage(sender, { text: "✅ *Pesanan kamu sudah dikirim ke admin dan grup.*" });
    }

    // Forward otomatis
    if (!sender.endsWith("@g.us")) {
      const nomor = sender.split("@")[0];
      const isCommand = text.startsWith(".");
      if (!isCommand && text.length > 1) {
        const forwardMsg = await sock.sendMessage(GROUP_JID, {
          text: `📩 *Pesan baru dari wa.me/${nomor}*\n\n💬 ${text}`
        });
        forwardCache[forwardMsg.key.id] = sender;
        fs.writeFileSync(forwardCachePath, JSON.stringify(forwardCache, null, 2));
      }
    }

    // Balas dari grup
    if (sender === GROUP_JID && msg.message?.extendedTextMessage?.contextInfo?.stanzaId) {
      const repliedId = msg.message.extendedTextMessage.contextInfo.stanzaId;
      const originalSender = forwardCache[repliedId];
      if (originalSender) {
        const sent = await sock.sendMessage(originalSender, { text });
        replyMap[msg.key.id] = { responseId: sent.key.id, to: originalSender };
        fs.writeFileSync(replyMapPath, JSON.stringify(replyMap, null, 2));
      }
    }
  });

  sock.ev.on("messages.update", async (updates) => {
    for (const update of updates) {
      if (update.update?.message === null && replyMap[update.key.id]) {
        const { to, responseId } = replyMap[update.key.id];
        await sock.sendMessage(to, {
          delete: { remoteJid: to, fromMe: true, id: responseId }
        });
        delete replyMap[update.key.id];
        fs.writeFileSync(replyMapPath, JSON.stringify(replyMap, null, 2));
      }
    }
  });
}

startSock();

