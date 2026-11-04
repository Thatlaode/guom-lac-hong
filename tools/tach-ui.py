#!/usr/bin/env python3
"""Tách bộ UI chủ dự án gửi (tấm 1536×1024) thành từng phần tử PNG/WebP trong suốt (QĐ-0041).
B1  python3 tools/tach-ui.py quet <tấm.png> <thư mục>   → tách tự động, in số thứ tự + ảnh xem nhanh có đánh số
B2  python3 tools/tach-ui.py xuat <tấm.png> <thư mục> <bảng-ten.json> → xuất phần tử theo tên đã đặt
Tấm có nền ô caro giả (RGB): xóa vùng caro lớn (xám nhạt không màu, liền khối) — giữ điểm sáng nhỏ trong họa tiết.
Tấm có kênh trong suốt (RGBA): dùng luôn kênh alpha."""
import sys, json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as ndi

def alpha_of(im):
    a = np.asarray(im.convert('RGBA')).astype(np.float32)
    if im.mode == 'RGBA' and (a[..., 3] < 250).mean() > 0.2: return a, a[..., 3]
    rgb = a[..., :3] / 255; mx, mn = rgb.max(2), rgb.min(2); sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    bgc = (sat < 0.13) & (mx > 0.66)
    lab, n = ndi.label(bgc); idx = range(1, n + 1); sizes = ndi.sum(bgc, lab, idx)
    # ô caro = vừa có ô trắng tinh vừa có ô xám nhạt, xen kẽ → mỗi loại chiếm phần đáng kể; da mặt / đồ bạc sáng mượt sẽ không đạt
    white = ndi.sum(bgc & (mx > 0.965), lab, idx) / np.maximum(sizes, 1); gray = ndi.sum(bgc & (mx > 0.70) & (mx < 0.90), lab, idx) / np.maximum(sizes, 1)
    big = np.zeros(n + 1, bool); big[1:] = (sizes > 900) & (white > 0.18) & (gray > 0.18)
    bg = big[lab]
    bg = ndi.binary_dilation(bg, iterations=2) & (sat < 0.20) & (mx > 0.55) | bg       # ăn thêm viền răng cưa của ô caro
    alpha = np.where(bg, 0, 255).astype(np.float32)
    alpha = ndi.gaussian_filter(alpha, 0.6)                            # mép mềm
    a[..., 3] = alpha; return a, alpha

def comps(alpha, thr=40, gap=5, minpx=250):
    gap = int(os.environ.get('GAP', gap))
    m = alpha > thr; m2 = ndi.binary_dilation(m, iterations=gap)
    lab, n = ndi.label(m2); out = []
    for i, sl in enumerate(ndi.find_objects(lab)):
        if sl is None: continue
        sub = (lab[sl] == i + 1) & m[sl]
        if sub.sum() < minpx: continue
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        out.append([x0, y0, x1, y1])
    out.sort(key=lambda b: (round(b[1] / 40), b[0])); return out

def quet(src, outdir):
    os.makedirs(outdir, exist_ok=True); im = Image.open(src); a, al = alpha_of(im); boxes = comps(al)
    prev = Image.fromarray(a.astype(np.uint8), 'RGBA'); bgc = Image.new('RGBA', prev.size, (40, 60, 70, 255)); bgc.alpha_composite(prev)
    d = ImageDraw.Draw(bgc)
    for i, (x0, y0, x1, y1) in enumerate(boxes):
        d.rectangle([x0, y0, x1, y1], outline=(255, 0, 255, 255), width=2); d.text((x0 + 3, y0 + 2), str(i), fill=(255, 255, 0, 255))
    base = os.path.join(outdir, os.path.basename(src).replace('.png', ''))
    bgc.convert('RGB').save(base + '_so.jpg', quality=85); json.dump(boxes, open(base + '_hop.json', 'w'))
    print(len(boxes), 'phần tử →', base + '_so.jpg')

def xuat(src, outdir, names_json):
    im = Image.open(src); a, al = alpha_of(im); boxes = json.load(open(src.replace('.png', '') + '_hop.json')) if os.path.exists(src.replace('.png', '') + '_hop.json') else comps(al)
    spec = json.load(open(names_json)); os.makedirs(outdir, exist_ok=True); img = Image.fromarray(a.astype(np.uint8), 'RGBA')
    for key, v in spec.items():
        ids = v['id'] if isinstance(v['id'], list) else [v['id']]
        bb = [boxes[i] for i in ids]; x0 = min(b[0] for b in bb); y0 = min(b[1] for b in bb); x1 = max(b[2] for b in bb); y1 = max(b[3] for b in bb)
        pad = v.get('pad', 2); crop = img.crop((max(0, x0 - pad), max(0, y0 - pad), x1 + pad, y1 + pad))
        if v.get('w'): h = round(crop.height * v['w'] / crop.width); crop = crop.resize((v['w'], h), Image.LANCZOS)
        crop.save(os.path.join(outdir, key + '.webp'), quality=90, method=6)
    print('xuất', len(spec), 'phần tử →', outdir)

if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'quet': quet(sys.argv[2], sys.argv[3])
    else: xuat(sys.argv[2], sys.argv[3], sys.argv[4])
