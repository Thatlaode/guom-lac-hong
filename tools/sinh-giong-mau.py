#!/usr/bin/env python3
"""Sinh GIỌNG MẪU (tạm) cho mọi ổ lồng tiếng bằng espeak-ng tiếng Việt (QĐ-0044).
Mỗi câu thoại trong giong-noi/kich-ban.json → 1 file mp3: <thư mục Dòng>/VO-<DÒNG>-<HÀNH ĐỘNG>-<số>.mp3
Người dẫn trận → nguoi-dan-tran/ANN-<SỰ KIỆN>-<số>.mp3. Chuẩn hóa -16 LUFS · 44.1 kHz · mono (cùng mức với âm meme).
Thay giọng thật: ghi đè file cùng tên (giữ tên) — không cần sửa gì khác. Danh sách tra cứu: giong-noi/DANH-SACH.csv
Cần: espeak-ng, ffmpeg.  Chạy: python3 tools/sinh-giong-mau.py [--chi-thieu]"""
import json, os, subprocess, sys, csv
from concurrent.futures import ThreadPoolExecutor
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'client', 'assets', 'audio')
K = json.load(open(os.path.join(ROOT, 'giong-noi', 'kich-ban.json'), encoding='utf-8')); A = json.load(open(os.path.join(ROOT, 'audio.json'), encoding='utf-8'))
ONLY_MISSING = '--chi-thieu' in sys.argv
VOICE = {'kiem': ('m3', 52, 165), 'tram': ('f2', 62, 170), 'tre': ('m1', 42, 160), 'duoc': ('f4', 68, 155), 'bang': ('m2', 38, 150),
         'lua': ('f1', 72, 172), 'hoa': ('m4', 48, 180), 'gao': ('f3', 60, 168), 'thach': ('m6', 28, 140), 'chieng': ('f5', 55, 150)}
jobs = []; rows = []
for fk, d in K['dong'].items():
    if not isinstance(d, dict): continue
    v, pitch, spd = VOICE.get(fk, ('m3', 50, 160))
    for act, lines in d['lines'].items():
        slot = f"VO-{d['code']}-{act}"; files = []
        for i, t in enumerate(lines, 1):
            rel = f"giong-noi/{d['folder']}/{slot}-{i}.mp3"; files.append(rel); jobs.append((t, v, pitch, spd, rel)); rows.append([slot, i, t, rel, 'giọng mẫu espeak'])
        A['files'][slot] = files
for ev, s in K['ann'].items():
    if not isinstance(s, dict): continue
    slot = f'ANN-{ev}'; files = []
    for i, t in enumerate(s['lines'], 1):
        rel = f'nguoi-dan-tran/{slot}-{i}.mp3'; files.append(rel); jobs.append((t, 'm7', 30, 150, rel)); rows.append([slot, i, t, rel, 'giọng mẫu espeak'])
    A['files'][slot] = files
def run(j):
    t, v, pitch, spd, rel = j; out = os.path.join(ROOT, rel)
    if ONLY_MISSING and os.path.exists(out): return
    os.makedirs(os.path.dirname(out), exist_ok=True); wav = out + '.wav'
    subprocess.run(['espeak-ng', '-v', 'vi+' + v, '-p', str(pitch), '-s', str(spd), '-a', '160', '-w', wav, t.replace('…', ', ').replace('—', ', ')], check=True)
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', wav, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11,aresample=44100', '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-q:a', '6', out], check=True); os.remove(wav)
with ThreadPoolExecutor(8) as ex: list(ex.map(run, jobs))
A['_giong_noi'] = 'Lồng tiếng: VO-<DÒNG>-<HÀNH ĐỘNG>-<số>.mp3, người dẫn trận ANN-<SỰ KIỆN>-<số>.mp3 — hiện là GIỌNG MẪU máy đọc (espeak-ng), ghi đè file cùng tên để thay giọng thật. Tra cứu: giong-noi/DANH-SACH.csv'
json.dump(A, open(os.path.join(ROOT, 'audio.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for c, m in K.get('meme', {}).items():
    if c.startswith('MEME'): rows.append([c, 1, m['sub'], f'meme/{c}.mp3', 'âm meme · ' + m['khi']])
with open(os.path.join(ROOT, 'giong-noi', 'DANH-SACH.csv'), 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f); w.writerow(['Mã ổ', 'Số', 'Phụ đề (câu thoại)', 'File (trong client/assets/audio/)', 'Ghi chú']); w.writerows(rows)
print('xong', len(jobs), 'câu thoại +', len(K.get('meme', {})) - 1, 'meme →', os.path.normpath(ROOT))
