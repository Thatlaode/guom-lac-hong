#!/usr/bin/env python3
"""Dựng BỘ UI từ các tấm chủ dự án gửi (tools/nguon-ui/*.png) → client/assets/ui/bo-ui/ (QĐ-0041, QĐ-0042).
Chạy lại được bất cứ lúc nào: python3 tools/dung-bo-ui.py
- Chân dung 10 Dòng (đủ khung) + mặt tròn nhỏ (cho bảng xếp hạng)
- Huy hiệu 10 Dòng (đã cắt bỏ biển chữ in sẵn)
- Hình chiêu: mỗi Gốc 1 tấm → Dòng nam lấy 5 ô đầu, Dòng nữ 5 ô sau (đổi tại BANG_CHIEU bên dưới)
- Khung 9 mảnh, đầu bảng, khung bản đồ tròn, nút trống, icon tròn, bình máu/hơi, huy chương top 3
Nguồn ô caro giả → xóa nền tự động (tach-ui.py). Đầu ra WebP chất lượng 90."""
import os, json, colorsys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as ndi
HERE = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.join(HERE, 'nguon-ui')
OUT = os.path.join(HERE, '..', 'client', 'assets', 'ui', 'bo-ui')
exec(open(os.path.join(HERE, 'tach-ui.py'), encoding='utf-8').read().split("if __name__")[0])
_cache = {}
def sheet(n):
    if n not in _cache:
        im = Image.open(os.path.join(SRC, f's_{n}.png')); a, _ = alpha_of(im)
        _cache[n] = (Image.fromarray(a.astype(np.uint8), 'RGBA'), json.load(open(os.path.join(SRC, f's_{n}_hop.json'))))
    return _cache[n]
def box(n, i): return sheet(n)[1][i]
def crop(n, b, pad=2):
    img = sheet(n)[0]; return img.crop((max(0, b[0] - pad), max(0, b[1] - pad), b[2] + pad, b[3] + pad))
def trim(im):
    bb = im.getchannel('A').point(lambda v: 255 if v > 12 else 0).getbbox(); return im.crop(bb) if bb else im
def save(im, rel, w=None, h=None):
    p = os.path.join(OUT, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
    if w and im.width != w: im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    if h and im.height != h: im = im.resize((round(im.width * h / im.height), h), Image.LANCZOS)
    im.save(p, quality=90, method=6); MAN.append(rel); return im
MAN = []

# ---------- tiện ích màu ----------
def hue_fn(im, fn):
    a = np.asarray(im).astype(np.float32) / 255; rgb = a[..., :3]
    import matplotlib.colors as mc
    hsv = mc.rgb_to_hsv(rgb); hsv = fn(hsv); a[..., :3] = mc.hsv_to_rgb(np.clip(hsv, 0, 1))
    return Image.fromarray((a * 255).astype(np.uint8), 'RGBA')
def desat_blue(hsv):  # Kim (bạc): bỏ sắc xanh ở viền/áo, giữ da & tóc
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]; m = (h > 0.50) & (h < 0.72)
    s[m] = s[m] * 0.18; v[m] = np.minimum(1, v[m] * 1.06); return hsv
def to_brown(hsv):    # nút đỏ → nút nâu sơn mài (nút phụ)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]; m = (h < 0.06) | (h > 0.93)
    h[m] = 0.065; s[m] = s[m] * 0.62; v[m] = v[m] * 0.62; return hsv

# ---------- 1. chân dung + mặt tròn ----------
def face_circle(im, cx, cy, r, size=128):
    c = im.crop((int(cx - r), int(cy - r), int(cx + r), int(cy + r))).resize((size, size), Image.LANCZOS)
    m = Image.new('L', (size * 4, size * 4), 0); ImageDraw.Draw(m).ellipse((4, 4, size * 4 - 4, size * 4 - 4), fill=255)
    m = m.resize((size, size), Image.LANCZOS); bg = Image.new('RGBA', (size, size), (0, 0, 0, 0)); bg.paste(c, (0, 0), m); return bg
def portrait(n, i, fix=None):
    b = box(n, i); im = crop(n, b, 4)
    if fix: im = fix(im)
    return im
def fix_badge(im):  # xóa huy hiệu "120" in sẵn (góc dưới phải) bằng mảng soi gương từ góc dưới trái
    W, H = im.size; x0, y0, x1, y1 = int(W * 0.60), int(H * 0.73), int(W * 0.86), int(H * 0.98)
    patch = im.crop((W - x1, y0, W - x0, y1)).transpose(Image.FLIP_LEFT_RIGHT); out = im.copy(); out.alpha_composite(patch, (x0, y0)); return out
def thuy_nam():  # vòng khung trống Thủy (blue2 #2) + mặt nam (blue1 #1) đặt bên trong
    ring = crop('blue2', box('blue2', 2), 4); src = crop('blue1', box('blue1', 1), 4)
    W, H = ring.size; r_in = W * 0.36; face = face_circle(src, src.width * 0.50, src.height * 0.47, src.width * 0.36, int(r_in * 2))
    face = hue_fn(face, lambda hsv: (hsv.__setitem__((Ellipsis, 1), np.where((hsv[..., 0] > .5) & (hsv[..., 0] < .72), np.minimum(1, hsv[..., 1] * 1.5), hsv[..., 1])), hsv)[1])
    base = Image.new('RGBA', ring.size, (0, 0, 0, 0)); base.alpha_composite(face, (int(W / 2 - r_in), int(H * 0.47 - r_in))); base.alpha_composite(ring); return base
PORTRAIT = {
    'kiem': lambda: hue_fn(portrait('blue1', 1), desat_blue), 'tram': lambda: hue_fn(portrait('blue1', 2), desat_blue),
    'tre': lambda: portrait('green', 2), 'duoc': lambda: portrait('green', 3),
    'bang': thuy_nam, 'lua': lambda: portrait('blue2', 1, fix_badge),
    'hoa': lambda: portrait('fire', 2), 'gao': lambda: portrait('fire', 3),
    'thach': lambda: portrait('gold', 1), 'chieng': lambda: portrait('gold', 4),
}
for fk, f in PORTRAIT.items():
    im = trim(f()); save(im, f'chan-dung/{fk}.webp', w=320)
    save(face_circle(im, im.width * 0.50, im.height * 0.47, im.width * 0.33, 128), f'mat/{fk}.webp')

# ---------- 2. huy hiệu Dòng (cắt biển chữ in sẵn ở đáy) ----------
def emblem(n, i, keep=0.76):
    im = crop(n, box(n, i), 3); W, H = im.size; im = im.crop((0, 0, W, int(H * keep)))
    a = np.asarray(im).astype(np.float32); f = int(H * keep * 0.16); ramp = np.linspace(1, 0, f) ** 1.4
    a[-f:, :, 3] *= ramp[:, None]; return trim(Image.fromarray(a.astype(np.uint8), 'RGBA'))
EMB = {'kiem': ('blue1', 0), 'tram': ('blue1', 4), 'tre': ('green', 0), 'duoc': ('green', 1), 'bang': ('blue2', 0),
       'lua': ('blue2', 3), 'hoa': ('fire', 0), 'gao': ('fire', 1), 'thach': ('gold', 0), 'chieng': ('gold', 3)}
for fk, (n, i) in EMB.items(): save(emblem(n, i), f'huy-hieu/{fk}.webp', w=200)

# ---------- 3. hình chiêu (ô vuông ~110px) ----------
def skill_cells(n, region):
    img = sheet(n)[0]; sub = img.crop(region); al = np.asarray(sub)[..., 3]
    m = al > 60; m = ndi.binary_opening(m, iterations=2); lab, k = ndi.label(m); cells = []
    for sl in ndi.find_objects(lab):
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if 85 < w < 150 and 85 < h < 150 and 0.8 < w / h < 1.25: cells.append((sl[1].start + region[0], sl[0].start + region[1], sl[1].stop + region[0], sl[0].stop + region[1]))
    if len(cells) < 8:  # ô dính nhau → chia lưới theo cỡ ô chuẩn
        cells = grid_cells(n, region)
    cells.sort(key=lambda c: (round(c[1] / 60), c[0])); return cells
def grid_cells(n, region, cell=None):
    img = sheet(n)[0]; al = np.asarray(img.crop(region))[..., 3] > 60
    cols = np.where(al.mean(0) > 0.25)[0]; rows = np.where(al.mean(1) > 0.25)[0]
    def runs(ix):
        out = []; s = ix[0]; p = ix[0]
        for v in ix[1:]:
            if v != p + 1: out.append((s, p + 1)); s = v
            p = v
        out.append((s, p + 1)); return [r for r in out if r[1] - r[0] > 60]
    return [(region[0] + c0, region[1] + r0, region[0] + c1, region[1] + r1) for (r0, r1) in runs(rows) for (c0, c1) in runs(cols)]
REG = {'fire': (40, 548, 1040, 785), 'gold': None, 'green': None, 'blue1': (15, 548, 970, 775), 'blue2': (30, 590, 915, 805)}
ELEM_OF = {'kim': 'blue1', 'thuy': 'blue2', 'moc': 'green', 'hoa': 'fire', 'tho': 'gold'}
def region_from_ids(n, lo, hi):
    bb = sheet(n)[1][lo:hi + 1]; return (min(b[0] for b in bb) - 4, min(b[1] for b in bb) - 4, max(b[2] for b in bb) + 4, max(b[3] for b in bb) + 4)
REG['gold'] = region_from_ids('gold', 18, 33); REG['green'] = region_from_ids('green', 26, 43)
CELLS = {n: skill_cells(n, r) for n, r in REG.items()}
for n, c in CELLS.items(): print('ô chiêu', n, len(c))
FACT = [('kiem', 'kim', 0), ('tram', 'kim', 1), ('tre', 'moc', 0), ('duoc', 'moc', 1), ('bang', 'thuy', 0), ('lua', 'thuy', 1), ('hoa', 'hoa', 0), ('gao', 'hoa', 1), ('thach', 'tho', 0), ('chieng', 'tho', 1)]
# BANG_CHIEU: Dòng → 5 số thứ tự ô (đánh thường, chiêu 1, chiêu 2, chiêu lớn, Tâm Pháp) trong tấm của Gốc đó. Đổi ở đây nếu muốn ghép khác.
BANG_CHIEU = {}
for fk, e, k in FACT:
    N = len(CELLS[ELEM_OF[e]]); half = N // 2
    BANG_CHIEU[fk] = [(k * 4 + j) % N for j in range(4)] + [min(N - 1, 8 + k * 4 if N > 9 else half + k)]
for fk, e, k in FACT:
    n = ELEM_OF[e]; c = CELLS[n]
    for j, ci in enumerate(BANG_CHIEU[fk]):
        im = sheet(n)[0].crop(c[ci])
        if e == 'kim': im = hue_fn(im, desat_blue)
        save(im.resize((128, 128), Image.LANCZOS), f'chieu/{fk}-{j}.webp' if j < 4 else f'chieu/{fk}-tp.webp')

# ---------- 4. khung 9 mảnh (redframe1 #0) ----------
def nine(src, T, R, B, L):
    a = np.asarray(src).copy(); H, W = a.shape[:2]; al = a[..., 3] > 40
    def best_col(x_lo, x_hi, y_lo, y_hi): return min(range(x_lo, x_hi), key=lambda x: al[y_lo:y_hi, x].sum())
    def best_row(y_lo, y_hi, x_lo, x_hi): return min(range(y_lo, y_hi), key=lambda y: al[y, x_lo:x_hi].sum())
    ct = best_col(L, W - R, 0, T); a[:T, L:W - R] = a[:T, ct:ct + 1]
    cb = best_col(L, W - R, H - B, H); a[H - B:, L:W - R] = a[H - B:, cb:cb + 1]
    rl = best_row(T, H - B, 0, L); a[T:H - B, :L] = a[rl:rl + 1, :L]
    rr = best_row(T, H - B, W - R, W); a[T:H - B, W - R:] = a[rr:rr + 1, W - R:]
    a[T:H - B, L:W - R, 3] = 0
    # nén phần giữa còn 24px để ảnh nhẹ
    keep_x = list(range(0, L)) + list(range(L, L + 24)) + list(range(W - R, W)); keep_y = list(range(0, T)) + list(range(T, T + 24)) + list(range(H - B, H))
    return Image.fromarray(a[np.ix_(keep_y, keep_x)], 'RGBA')
f0 = crop('redframe1', box('redframe1', 0), 0)
save(nine(f0, 225, 150, 112, 150), 'khung/khung-lon.webp')
# huy chương đỉnh khung (trống đồng + hoa sen) – dán riêng ở giữa cạnh trên
save(trim(f0.crop((int(f0.width * 0.30), 0, int(f0.width * 0.70), 100))), 'khung/dinh.webp', w=300)
# khung nhỏ (redframe1 #12, có ô nút ở đáy) & khung dọc
f12 = crop('redframe1', box('redframe1', 12), 0); save(nine(f12, 110, 95, 95, 95), 'khung/khung-nho.webp')
# dải đầu bảng (redframe1 #17: 3 dải, lấy dải trên) + gạch ngang
b17 = box('redframe1', 17); top = crop('redframe1', (b17[0], b17[1], b17[2], b17[1] + 78), 0); save(trim(top), 'khung/dau-bang.webp', w=520)
save(trim(crop('redframe1', box('redframe1', 26), 0)), 'vien/gach.webp', w=320)
save(trim(crop('redframe1', (b17[0], b17[1] + 80, b17[2], b17[1] + 112), 0)), 'vien/gach-dai.webp', w=520)
# khung bản đồ tròn (#13) – xóa 2 nút "−" in sẵn bằng soi gương nửa trái
f13 = trim(crop('redframe1', box('redframe1', 13), 0)); W, H = f13.size
left = f13.crop((0, 0, W // 2, H)); mir = left.transpose(Image.FLIP_LEFT_RIGHT); ring = f13.copy(); ring.paste(mir, (W - W // 2, 0))
save(ring, 'khung/ban-do.webp', w=360)
# ---------- 5. nút trống ----------
btn = trim(crop('redframe1', box('redframe1', 3), 0)); save(btn, 'nut/do.webp', w=300); save(hue_fn(btn, to_brown), 'nut/nau.webp', w=300)
save(trim(crop('redframe1', box('redframe1', 11), 0)), 'nut/thanh.webp', w=440)
# ---------- 6. icon tròn ----------
def split_comps(n, b, k):  # tách k vật xếp thành hàng/cột: cắt ở chỗ alpha mỏng nhất gần mỗi ranh giới đều
    im = crop(n, b, 0); al = (np.asarray(im)[..., 3] > 60).astype(float); H, W = al.shape; vert = H > W
    prof = al.sum(1) if vert else al.sum(0); L = H if vert else W; cuts = [0]
    for q in range(1, k):
        c = q * L / k; w = L / (3 * k); lo, hi = int(c - w), int(c + w); cuts.append(lo + int(np.argmin(prof[lo:hi])))
    cuts.append(L); return [trim(im.crop((0, cuts[q], W, cuts[q + 1]) if vert else (cuts[q], 0, cuts[q + 1], H))) for q in range(k)]
for im, nm in zip(split_comps('redframe1', box('redframe1', 14), 6), ['nhan-vat', 'tui', 'bi-kip', 'phong-thu', 'cai-dat', 'cua-hang']): save(im, f'icon/{nm}.webp', w=96)
for i, nm in [(16, 'bao'), (18, 'thu'), (19, 'bxh'), (20, 'nhiem-vu'), (21, 'qua'), (22, 'vuong')]: save(trim(crop('redframe1', box('redframe1', i), 1)), f'icon/{nm}.webp', w=96)
for im, nm in zip(split_comps('redframe1', box('redframe1', 23), 5), ['sen', 'canh-bao', 'binh', 'tien', 'vip']): save(im, f'icon/{nm}.webp', w=96)
for i, nm in [(34, 'bo-mau'), (35, 'bo-hoi'), (36, 'tui-tien'), (37, 'cuon-thu'), (38, 'hom'), (39, 'ruong'), (40, 'hoa-dan'), (41, 'la-ban'), (42, 'sao')]: save(trim(crop('fire', box('fire', i), 1)), f'icon/{nm}.webp', w=96)
for i, nm in [(39, 'ruou'), (40, 'bo-luc')]: save(trim(crop('blue1', box('blue1', i), 1)), f'icon/{nm}.webp', w=96)
for i, nm in [(9, 'kiem'), (10, 'khien'), (11, 'doi'), (14, 'banh-rang')]: save(trim(crop('fire', box('fire', i), 1)), f'icon/{nm}.webp', w=96)
# ---------- 7. huy chương top 3 (fire #17, bảng xếp hạng mẫu) ----------
b = box('fire', 17); x0 = b[0] + 40; ys = [b[1] + 100, b[1] + 156, b[1] + 211]
for j, y in enumerate(ys):
    m0 = crop('fire', (x0, y, x0 + 64, y + 58), 0); W, H = m0.size; mk = Image.new('L', (W * 4, H * 4), 0); ImageDraw.Draw(mk).ellipse((W * 4 * .1, H * 4 * .04, W * 4 * .9, H * 4 * .96), fill=255)
    mk = mk.resize((W, H), Image.LANCZOS); o = Image.new('RGBA', (W, H), (0, 0, 0, 0)); o.paste(m0, (0, 0), mk); save(trim(o), f'huy-chuong/{j + 1}.webp', w=80)
# ---------- 8. cờ / phướn Gốc (làm nền thẻ chọn nhân vật) ----------
for n, i in [('fire', 46), ('blue1', 47), ('green', 48), ('gold', 36)]:
    try: save(trim(crop(n, box(n, i), 1)), f'co/{n}.webp', h=200)
    except Exception as ex: print('bỏ cờ', n, ex)
json.dump({'chieu': BANG_CHIEU, 'files': sorted(MAN)}, open(os.path.join(OUT, 'bo-ui.json'), 'w'), ensure_ascii=False, indent=1)
print('xong', len(MAN), 'tệp →', os.path.normpath(OUT))
