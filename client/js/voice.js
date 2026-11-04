/* =====================================================================
   VOICE CHAT & CHAT CHỮ (QĐ-0048)
   · Kênh CHUNG (voice): chỉ nghe người ở GẦN — rõ trong 6 m, nhỏ dần, tắt hẳn ở 30 m (GLH.VOICE)
   · Kênh ĐỘI (voice + chữ): nghe đồng đội ở mọi khoảng cách (chế độ Đánh Đội; Đánh Lẻ không có đội)
   · Chat chữ: kênh Chung (cả trận) / Đội · phím Enter (máy tính) hoặc nút 💬 (điện thoại)
   · Mic: Tắt · Nhấn giữ để nói (phím V / nút 🎙️) · Luôn mở. Cần https (trình duyệt chặn mic khi http).
   Tiếng nói đi thẳng giữa 2 máy (WebRTC); máy chủ chỉ chuyển tin bắt tay — không ghi âm, không lưu.
   Người máy 🤖 không có voice. Mạng chặn kết nối thẳng (NAT khó) thì cần máy chủ TURN — xem 14-Phat-hanh-VPS.
   ===================================================================== */
const Voice = {
  peers: new Map(), stream: null, on: false, talking: false, ICE: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }],
  init(G) {
    if (this.G) return; this.G = G; setInterval(() => this.tick(), 1000);
    addEventListener('keydown', e => { if (e.code === 'KeyV' && !e.repeat && !(e.target && e.target.tagName === 'INPUT')) this.ptt(true); if (e.code === 'Enter' && G.mode === 'play' && !(e.target && e.target.tagName === 'INPUT')) { e.preventDefault(); this.openChat(); } });
    addEventListener('keyup', e => { if (e.code === 'KeyV') this.ptt(false); });
  },
  mode() { return (this.G && this.G.S.mic) || 'off'; },
  async enable() {
    if (this.stream || this.mode() === 'off') return !!this.stream;
    if (!window.isSecureContext || !navigator.mediaDevices) { this.G.hud.toast('Voice cần trang https — trình duyệt đang chặn micro', '#ff9a6a'); return false; }
    try { this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
    catch (e) { this.G.hud.toast('Không mở được micro — hãy cho phép micro trong trình duyệt', '#ff9a6a'); return false; }
    this.setTalk(this.mode() === 'open'); for (const p of this.peers.values()) this.addTrack(p); return true;
  },
  disable() { if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; } this.setTalk(false); },
  setTalk(on) { this.talking = !!on; if (this.stream) this.stream.getAudioTracks().forEach(t => t.enabled = this.talking); document.body.classList.toggle('mic-on', this.talking); },
  async ptt(down) { if (this.mode() !== 'ptt' || !this.G || this.G.mode !== 'play') return; if (down && !this.stream && !(await this.enable())) return; this.setTalk(down); },
  /* mỗi giây: nối với người ở gần / đồng đội, ngắt người đã đi xa; chỉnh âm lượng theo khoảng cách */
  tick() {
    const G = this.G; if (!G || G.mode !== 'play' || !G.me || (G.S.hear === 'off' && this.mode() === 'off')) { if (this.peers.size) this.closeAll(); return; }
    const me = G.me, R = GLH.VOICE.range;
    for (const P of G.players.values()) {
      if (P.isMe || P.bot) continue; const d = Math.hypot(P.x - me.x, P.z - me.z), mate = me.team && P.team === me.team, want = d < R + 5 || mate, p = this.peers.get(P.id);
      if (want && !p && G.myId < P.id) this.connect(P.id, true);
      if (!want && p && d > R + 15) this.close(P.id, true);
    }
  },
  update() { // gọi mỗi khung: âm lượng theo khoảng cách + biểu tượng đang nói
    const G = this.G; if (!G || !G.me || !this.peers.size) return; const me = G.me, R = GLH.VOICE.range, F = GLH.VOICE.full, vol = G.S.voiceVol ?? 1;
    for (const [id, p] of this.peers) {
      const P = G.players.get(id); if (!P || !p.gain) continue; const d = Math.hypot(P.x - me.x, P.z - me.z), mate = me.team && P.team === me.team;
      let k = mate ? 1 : d <= F ? 1 : Math.max(0, 1 - (d - F) / (R - F)); k = k * k * vol; if (G.S.hear === 'team' && !mate) k = 0; if (G.S.hear === 'off') k = 0;
      p.gain.gain.setTargetAtTime(k, Audio2.ctx.currentTime, 0.15);
      if (p.an) { p.an.getByteTimeDomainData(p.buf); let m = 0; for (let i = 0; i < p.buf.length; i += 8) m = Math.max(m, Math.abs(p.buf[i] - 128)); P.speaking = m > 10 && k > 0.02; }
    }
  },
  addTrack(p) { if (this.stream && p.pc && !p.sent) { for (const t of this.stream.getAudioTracks()) p.pc.addTrack(t, this.stream); p.sent = true; } },
  connect(id, initiator) {
    if (this.peers.has(id)) return this.peers.get(id); const pc = new RTCPeerConnection({ iceServers: this.ICE }), p = { pc, sent: false }; this.peers.set(id, p);
    if (!this.stream) pc.addTransceiver('audio', { direction: 'recvonly' }); else this.addTrack(p);
    pc.onicecandidate = e => { if (e.candidate) this.G.send({ t: 'rtc', to: id, k: 'ice', sig: e.candidate }); };
    pc.ontrack = e => {
      Audio2.init(); const ctx = Audio2.ctx; if (!ctx || p.gain) return; const st = e.streams[0] || new MediaStream([e.track]);
      const el = new window.Audio(); el.srcObject = st; el.muted = true; el.play().catch(() => { }); p.el = el; // Chrome cần gắn vào thẻ audio để WebAudio nhận tiếng
      const src = ctx.createMediaStreamSource(st), g = ctx.createGain(), an = ctx.createAnalyser(); an.fftSize = 512; g.gain.value = 0; src.connect(an); src.connect(g); g.connect(ctx.destination); Object.assign(p, { src, gain: g, an, buf: new Uint8Array(512) });
    };
    pc.onnegotiationneeded = async () => { if (!initiator && !p.ready) return; try { await pc.setLocalDescription(await pc.createOffer()); this.G.send({ t: 'rtc', to: id, k: 'sdp', sig: pc.localDescription }); } catch (e) { } };
    pc.onconnectionstatechange = () => { if (['failed', 'closed'].includes(pc.connectionState)) this.close(id, false); };
    if (initiator) { p.ready = true; }
    return p;
  },
  async onSignal(m) {
    const G = this.G; if (!G || G.mode !== 'play') return; if (m.k === 'bye') return this.close(m.from, false);
    const p = this.peers.get(m.from) || this.connect(m.from, false), pc = p.pc;
    try {
      if (m.k === 'sdp') {
        const d = m.sig; if (d.type === 'offer' && pc.signalingState !== 'stable') { if (G.myId < m.from) return; await pc.setLocalDescription({ type: 'rollback' }); }
        await pc.setRemoteDescription(d); if (d.type === 'offer') { p.ready = true; await pc.setLocalDescription(await pc.createAnswer()); G.send({ t: 'rtc', to: m.from, k: 'sdp', sig: pc.localDescription }); }
      } else if (m.k === 'ice') await pc.addIceCandidate(m.sig);
    } catch (e) { }
  },
  close(id, tell) { const p = this.peers.get(id); if (!p) return; try { p.pc.close(); p.gain && p.gain.disconnect(); p.el && (p.el.srcObject = null); } catch (e) { } this.peers.delete(id); if (tell && this.G) this.G.send({ t: 'rtc', to: id, k: 'bye', sig: 1 }); const P = this.G && this.G.players.get(id); if (P) P.speaking = false; },
  closeAll() { for (const id of [...this.peers.keys()]) this.close(id, false); },
  /* ---------- chat chữ ---------- */
  openChat() {
    const G = this.G; if (G.mode !== 'play') return; let b = document.getElementById('chatIn'); G.unlock && G.unlock();
    if (!b) { b = document.createElement('div'); b.id = 'chatIn'; b.innerHTML = '<select id="chatCh"><option value="all">Chung</option><option value="team">Đội</option></select><input id="chatTx" maxlength="120" placeholder="Nhập tin… (Enter gửi, Esc đóng)" autocomplete="off"><button id="chatGo">Gửi</button>'; document.body.appendChild(b);
      const send = () => { const t = $('chatTx').value.trim(); if (t) G.send({ t: 'chat', ch: $('chatCh').value, text: t }); $('chatTx').value = ''; b.classList.add('hidden'); G.isTouch || G.lock(); };
      $('chatGo').onclick = send; $('chatTx').onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') send(); if (e.key === 'Escape') { b.classList.add('hidden'); G.isTouch || G.lock(); } }; }
    b.classList.remove('hidden'); setTimeout(() => $('chatTx').focus(), 30);
  },
  onChat(m) {
    const G = this.G, F = GLH.FACTIONS[m.fk], box = document.getElementById('chatLog') || (() => { const d = document.createElement('div'); d.id = 'chatLog'; d.dataset.lay = 'chatLog'; document.body.appendChild(d); return d; })();
    const d = document.createElement('div'); d.className = 'cl ' + m.ch; d.innerHTML = `<i>${m.ch === 'team' ? 'Đội' : 'Chung'}</i><b style="color:${F ? F.col : '#fff'}">${esc(m.name)}:</b> ${esc(m.text)}`; box.appendChild(d);
    while (box.children.length > 6) box.firstChild.remove(); setTimeout(() => d.classList.add('out'), 9000); setTimeout(() => d.remove(), 9500); Audio2.play('UI-NOTIFY');
  },
};
