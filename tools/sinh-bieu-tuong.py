#!/usr/bin/env python3
# ⚠ CŨ (từ 0.6.0-beta.2): hình chiêu/huy hiệu nay lấy từ bộ UI thật — tools/dung-bo-ui.py. Chạy file này sẽ KHÔNG còn được manifest dùng.
"""Sinh bộ biểu tượng SVG thuần Việt cho Gươm Lạc Hồng (QĐ-0037).
Chạy: python3 tools/sinh-bieu-tuong.py  → ghi vào client/assets/ui/... và cập nhật client/assets/manifest.json
Khung: vuông bo nhẹ (r=4), viền vàng kim đôi, nền sơn mài theo màu Gốc, góc có ô vuông kiểu hoa văn Đông Sơn.
Chiêu lớn: thêm vành răng cưa + mặt trời trống đồng chìm. Tâm Pháp: khung bát giác."""
import json, math, os
ROOT = os.path.join(os.path.dirname(__file__), '..', 'client', 'assets')
GOLD = ('#FFF1BC', '#D5AD59', '#8A6328')
ELEM = {'kim': ('#4A4F55', '#1E2226'), 'moc': ('#3E5A2E', '#18241A'), 'thuy': ('#22546A', '#0E2230'), 'hoa': ('#7A2228', '#2E0E12'), 'tho': ('#6E4E26', '#2A1C10')}
DONG = {  # mã Dòng: (gốc, mã hình đánh thường, chiêu1, chiêu2, chiêu lớn, tâm pháp)
 'THANKIEM': ('kim', 'sword', 'dash', 'whirl', 'turtle', 'execute'),
 'NGANCHAM': ('kim', 'needle', 'needles', 'swallow', 'cloudneedle', 'eye'),
 'THIETTRUC': ('moc', 'staff', 'sweep', 'bamboo', 'bambooburst', 'bambooshield'),
 'BACHTHAO': ('moc', 'pill', 'vine', 'bowl', 'butterfly', 'leafheal'),
 'HAITHUONG': ('thuy', 'spear', 'waves3', 'bubbles', 'stakes', 'wave'),
 'THUYTIEN': ('thuy', 'ribbon', 'ribbonfan', 'drop', 'whirlpool', 'splash'),
 'VIEMDAO': ('hoa', 'saber', 'charge', 'flameblade', 'meteor', 'flame'),
 'HOALIEN': ('hoa', 'fireball', 'flower', 'lantern', 'redsky', 'flowerflame'),
 'THIETSON': ('tho', 'hammer', 'stomp', 'rockshield', 'mountain', 'rock'),
 'DONGCO': ('tho', 'soundwave', 'gong', 'drum', 'gongrays', 'drum4'),
}
G_FILL = 'fill="url(#g)" stroke="#1E120A" stroke-width="2.6" stroke-linejoin="round"'
G_LINE = 'fill="none" stroke="url(#g)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"'
G_LINE2 = 'fill="none" stroke="#1E120A" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"'
def line(d, w=5): return f'<path d="{d}" fill="none" stroke="#1E120A" stroke-width="{w+4}" stroke-linecap="round" stroke-linejoin="round"/><path d="{d}" fill="none" stroke="url(#g)" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>'
def shape(d): return f'<path d="{d}" {G_FILL}/>'
def circ(x, y, r): return f'<circle cx="{x}" cy="{y}" r="{r}" {G_FILL}/>'
def ring(x, y, r, w=4): return f'<circle cx="{x}" cy="{y}" r="{r}" fill="none" stroke="#1E120A" stroke-width="{w+4}"/><circle cx="{x}" cy="{y}" r="{r}" fill="none" stroke="url(#g)" stroke-width="{w}"/>'
SW = lambda cx=64, cy=64, a=-45, L=100: f'<g transform="rotate({a} {cx} {cy})">' + shape(f'M{cx-7} {cy+L*0.18} L{cx-7} {cy-L/2+10} L{cx} {cy-L/2} L{cx+7} {cy-L/2+10} L{cx+7} {cy+L*0.18} Z') + shape(f'M{cx-20} {cy+L*0.18} h40 v8 h-40 Z') + shape(f'M{cx-5} {cy+L*0.18+8} h10 v{L*0.2} h-10 Z') + circ(cx, cy+L*0.38+12, 6) + line(f'M{cx} {cy-L/2+14} V{cy+L*0.12}', 1.5) + '</g>'
def flame(cx, cy, s=1):
    return shape(f'M{cx} {cy-30*s} C{cx+18*s} {cy-10*s} {cx+20*s} {cy+8*s} {cx+8*s} {cy+20*s} C{cx+10*s} {cy+6*s} {cx+2*s} {cy+2*s} {cx} {cy-4*s} C{cx-4*s} {cy+6*s} {cx-12*s} {cy+8*s} {cx-8*s} {cy+20*s} C{cx-22*s} {cy+8*s} {cx-16*s} {cy-12*s} {cx} {cy-30*s} Z')
def petal5(cx, cy, r):
    out = ''
    for i in range(5):
        a = math.radians(i * 72 - 90); x, y = cx + math.cos(a) * r * 0.55, cy + math.sin(a) * r * 0.55
        out += f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{r*0.32:.1f}" ry="{r*0.52:.1f}" transform="rotate({i*72} {x:.1f} {y:.1f})" {G_FILL}/>'
    return out + circ(cx, cy, r * 0.2)
def sunstar(cx, cy, r, n=14, op=1):
    pts = []
    for i in range(n * 2):
        a = math.pi * i / n - math.pi / 2; rr = r if i % 2 == 0 else r * 0.45; pts.append(f'{cx+math.cos(a)*rr:.1f},{cy+math.sin(a)*rr:.1f}')
    return f'<polygon points="{" ".join(pts)}" {G_FILL} opacity="{op}"/>'
GL = {
 'sword': lambda: SW(),
 'dash': lambda: SW(72, 58, 60, 84) + line('M18 70 L46 58') + line('M14 86 L40 74', 4) + line('M26 100 L48 88', 3),
 'whirl': lambda: line('M64 64 m-6 0 a6 6 0 1 1 12 0 a14 14 0 1 1 -28 0 a24 24 0 1 1 48 0 a34 34 0 1 1 -68 0', 4.5) + SW(64, 64, 30, 60),
 'turtle': lambda: shape('M64 26 L94 42 L94 76 L64 94 L34 76 L34 42 Z') + shape('M64 44 L78 52 L78 68 L64 76 L50 68 L50 52 Z') + line('M64 26 V44 M94 42 L78 52 M94 76 L78 68 M64 94 V76 M34 76 L50 68 M34 42 L50 52', 3) + circ(64, 18, 7),
 'execute': lambda: SW(58, 56, 35, 86) + shape('M88 78 C88 90 80 98 74 98 C68 98 62 92 62 84 C62 74 74 64 76 56 C80 66 88 70 88 78 Z'),
 'needle': lambda: line('M30 98 L96 32', 4) + shape('M96 32 L104 22 L100 36 Z') + ring(36, 92, 6, 3),
 'needles': lambda: ''.join(line(f'M{24+i*10} {104-i*4} L{70+i*14} {30-i*2}', 3.5) for i in range(5)),
 'swallow': lambda: shape('M18 58 C40 50 54 54 64 66 C74 54 88 50 110 58 C92 60 80 68 72 82 L64 108 L56 82 C48 68 36 60 18 58 Z'),
 'cloudneedle': lambda: shape('M24 78 C14 78 14 62 26 60 C26 46 44 42 50 52 C56 38 80 40 82 56 C98 54 104 72 92 78 Z') + line('M44 104 L104 22', 4) + shape('M104 22 L112 12 L108 26 Z'),
 'eye': lambda: shape('M14 64 C34 34 94 34 114 64 C94 94 34 94 14 64 Z') + ring(64, 64, 16, 4) + circ(64, 64, 7),
 'staff': lambda: line('M24 108 L104 20', 6) + ''.join(line(f'M{36+i*16} {94-i*17.6} l6 6', 3) for i in range(5)),
 'sweep': lambda: line('M20 98 L92 30', 6) + line('M30 30 A50 50 0 0 0 98 98', 3.5) + line('M18 44 A62 62 0 0 0 84 110', 2.5),
 'bamboo': lambda: ''.join(shape(f'M{35+i*24} 112 V{24+i*6} h10 V112 Z') + ''.join(shape(f'M{32+i*24} {44+j*22+i*6} h16 v4 h-16 Z') for j in range(3)) for i in range(3)) + shape('M100 30 C112 26 118 34 114 42 C108 38 102 36 100 30 Z'),
 'bambooburst': lambda: sunstar(64, 64, 52, 12, 0.35) + line('M64 112 V20', 9) + ''.join(line(f'M56 {40+j*22} h16', 3) for j in range(3)) + line('M30 104 L54 70', 4) + line('M98 104 L74 70', 4),
 'bambooshield': lambda: shape('M64 14 L104 28 V64 C104 88 86 104 64 114 C42 104 24 88 24 64 V28 Z') + ''.join(line(f'M{48+i*16} 36 V96', 4) for i in range(3)),
 'pill': lambda: shape('M38 90 L90 38 A18 18 0 0 0 64 12 L12 64 A18 18 0 0 0 38 90 Z') + shape('M90 38 A18 18 0 0 1 116 64 L64 116 A18 18 0 0 1 38 90 Z') + line('M64 64 L80 80', 3) ,
 'vine': lambda: line('M14 64 C34 34 50 94 64 64 C78 34 94 94 114 64', 5) + shape('M40 40 C30 30 40 20 48 26 C50 34 46 40 40 40 Z') + shape('M88 88 C98 98 88 108 80 102 C78 94 82 88 88 88 Z'),
 'bowl': lambda: shape('M18 64 H110 C108 88 90 104 64 104 C38 104 20 88 18 64 Z') + line('M44 54 C38 44 50 38 44 26', 3.5) + line('M64 54 C58 42 70 36 64 22', 3.5) + line('M84 54 C78 44 90 38 84 26', 3.5),
 'butterfly': lambda: shape('M64 60 C50 26 16 26 20 52 C22 70 46 70 64 64 Z') + shape('M64 60 C78 26 112 26 108 52 C106 70 82 70 64 64 Z') + shape('M64 66 C50 74 30 86 40 100 C50 108 60 90 64 74 Z') + shape('M64 66 C78 74 98 86 88 100 C78 108 68 90 64 74 Z') + line('M64 50 V100', 4),
 'leafheal': lambda: shape('M24 104 C20 50 60 18 108 20 C108 70 80 108 24 104 Z') + line('M30 98 L96 32', 3) + shape('M84 76 h8 v-8 h8 v8 h8 v8 h-8 v8 h-8 v-8 h-8 Z'),
 'spear': lambda: line('M22 106 L90 38', 5) + shape('M90 38 L112 16 L104 46 Z') + shape('M80 36 L92 48 L84 52 L76 44 Z'),
 'waves3': lambda: ''.join(line(f'M16 {42+i*22} C30 {30+i*22} 44 {54+i*22} 58 {42+i*22} S86 {30+i*22} 100 {42+i*22}', 4.5) + shape(f'M100 {34+i*22} L114 {42+i*22} L100 {50+i*22} Z') for i in range(3)),
 'bubbles': lambda: ring(48, 74, 22, 4) + ring(86, 48, 14, 4) + ring(90, 92, 9, 3) + ring(40, 28, 7, 3),
 'stakes': lambda: ''.join(shape(f'M{22+i*21} 112 V{56-(i%2)*14} L{30+i*21} {40-(i%2)*14} L{38+i*21} {56-(i%2)*14} V112 Z') for i in range(5)) + line('M10 86 C30 78 50 94 70 86 S110 78 118 86', 3),
 'wave': lambda: shape('M12 92 C24 52 58 34 86 40 C70 46 62 58 66 70 C76 56 96 54 114 64 C104 78 88 96 12 92 Z'),
 'ribbon': lambda: line('M18 100 C40 30 70 110 88 50 S110 30 112 20', 7) + line('M18 100 C40 30 70 110 88 50 S110 30 112 20', 2),
 'ribbonfan': lambda: ''.join(line(f'M22 102 C{48+i*6} {64-i*14} {70+i*4} {84-i*20} {110} {60-i*22}', 4) for i in range(3)),
 'drop': lambda: shape('M64 14 C84 46 96 62 96 80 C96 98 82 112 64 112 C46 112 32 98 32 80 C32 62 44 46 64 14 Z') + line('M16 40 H40 M10 60 H34 M16 80 H30', 3.5),
 'whirlpool': lambda: line('M64 64 m-4 0 a4 4 0 1 1 8 0 a12 12 0 1 1 -24 0 a20 20 0 1 1 40 0 a28 28 0 1 1 -56 0 a36 36 0 1 1 72 0 a44 44 0 1 1 -88 0', 4),
 'splash': lambda: shape('M64 104 C40 104 34 84 44 74 C48 88 58 90 64 88 C70 90 80 88 84 74 C94 84 88 104 64 104 Z') + shape('M64 66 L56 30 L64 40 L72 30 Z') + circ(36, 48, 6) + circ(92, 48, 6) + circ(64, 20, 5),
 'saber': lambda: shape('M28 104 C34 70 60 36 104 18 C84 44 62 76 40 108 Z') + shape('M22 96 L46 112 L42 118 L18 102 Z'),
 'charge': lambda: shape('M110 64 L70 40 V54 H16 V74 H70 V88 Z') + flame(94, 98, 0.55) + line('M82 30 H114 M84 104 H108', 3),
 'flameblade': lambda: flame(64, 60, 1.35) + shape('M34 104 C40 80 56 58 84 44 C70 64 58 84 46 110 Z'),
 'meteor': lambda: line('M14 18 L66 70 M30 10 L74 54 M8 36 L56 84', 4) + circ(84, 84, 22) + sunstar(84, 84, 32, 10, 0.6),
 'flame': lambda: flame(64, 66, 1.45),
 'fireball': lambda: circ(72, 56, 22) + flame(72, 56, 1.0) + line('M14 104 L46 76 M26 112 L52 88', 4),
 'flower': lambda: petal5(64, 64, 46),
 'lantern': lambda: line('M64 10 V26', 4) + shape('M46 26 H82 V34 H46 Z') + shape('M40 34 C24 50 24 80 40 94 H88 C104 80 104 50 88 34 Z') + shape('M46 94 H82 V102 H46 Z') + line('M64 102 V118', 3) + line('M52 40 V88 M76 40 V88', 2.5),
 'redsky': lambda: sunstar(64, 52, 40, 14, 0.9) + circ(64, 52, 14) + petal5(30, 98, 16) + petal5(98, 100, 14),
 'flowerflame': lambda: petal5(64, 78, 34) + flame(64, 34, 0.75),
 'hammer': lambda: line('M30 108 L78 52', 6) + shape('M60 22 L104 58 L90 74 L46 38 Z'),
 'stomp': lambda: shape('M14 96 L44 46 L60 68 L76 40 L114 96 Z') + line('M30 110 L44 98 L36 92 M64 114 V100 M98 110 L84 98 L92 92', 3.5) + line('M20 20 L34 34 M108 20 L94 34', 3),
 'rockshield': lambda: shape('M64 12 L106 30 L100 82 L64 116 L28 82 L22 30 Z') + line('M40 44 L60 56 L52 76 M78 40 L74 64 L90 80', 3),
 'mountain': lambda: shape('M8 104 L46 32 L64 58 L82 22 L120 104 Z') + line('M8 112 C30 104 50 120 70 112 S108 104 120 112', 3.5) + sunstar(82, 22, 14, 8, 0.8),
 'rock': lambda: shape('M24 92 L34 50 L62 30 L94 40 L108 78 L84 100 L44 104 Z') + line('M46 60 L64 72 L60 92 M80 52 L74 70', 3),
 'soundwave': lambda: circ(28, 64, 10) + ''.join(line(f'M{44+i*16} {40-i*8} A{30+i*16} {30+i*16} 0 0 1 {44+i*16} {88+i*8}', 4) for i in range(4)),
 'gong': lambda: ring(64, 64, 42, 6) + circ(64, 64, 18) + ring(64, 64, 30, 2),
 'drum': lambda: shape('M24 40 C24 26 104 26 104 40 V88 C104 102 24 102 24 88 Z') + f'<ellipse cx="64" cy="40" rx="40" ry="12" {G_FILL}/>' + sunstar(64, 40, 10, 8) + line('M34 52 V92 M94 52 V92', 3),
 'gongrays': lambda: sunstar(64, 64, 58, 14, 0.5) + ring(64, 64, 34, 6) + circ(64, 64, 14),
 'drum4': lambda: f'<ellipse cx="64" cy="64" rx="46" ry="46" {G_FILL}/>' + sunstar(64, 64, 26, 12) + ''.join(circ(64 + 36 * math.cos(a), 64 + 36 * math.sin(a), 5) for a in [0.785, 2.356, 3.927, 5.498]),
}
def defs(e, ult=False):
    a, b = ELEM[e]
    return f'''<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{GOLD[0]}"/><stop offset=".55" stop-color="{GOLD[1]}"/><stop offset="1" stop-color="{GOLD[2]}"/></linearGradient>
<linearGradient id="f" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF1BC"/><stop offset=".35" stop-color="#D5AD59"/><stop offset=".7" stop-color="#8A6328"/><stop offset="1" stop-color="#E9C77A"/></linearGradient>
<radialGradient id="bg" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="{a}"/><stop offset="1" stop-color="{b}"/></radialGradient></defs>'''
def frame(kind):
    s = '<rect x="3" y="3" width="122" height="122" rx="5" fill="url(#bg)" stroke="url(#f)" stroke-width="5"/>'
    s += '<rect x="11" y="11" width="106" height="106" rx="2" fill="none" stroke="#D5AD59" stroke-opacity=".55" stroke-width="1.5"/>'
    for x, y in [(11, 11), (117, 11), (11, 117), (117, 117)]:
        s += f'<rect x="{x-4}" y="{y-4}" width="8" height="8" transform="rotate(45 {x} {y})" fill="url(#f)" stroke="#1E120A" stroke-width="1"/>'
    if kind == 'ult':  # vành răng cưa Đông Sơn trên & dưới + mặt trời chìm
        s += sunstar(64, 64, 56, 14, 0.12)
        for i in range(12):
            x = 22 + i * 7.6; s += f'<path d="M{x:.1f} 5 l3.8 5 l3.8 -5 Z" fill="#FFF1BC" opacity=".8"/><path d="M{x:.1f} 123 l3.8 -5 l3.8 5 Z" fill="#FFF1BC" opacity=".8"/>'
    if kind == 'tp':
        pts = ' '.join(f'{64+56*math.cos(math.pi/8+i*math.pi/4):.1f},{64+56*math.sin(math.pi/8+i*math.pi/4):.1f}' for i in range(8))
        s += f'<polygon points="{pts}" fill="none" stroke="url(#f)" stroke-width="3"/>'
    if kind == 'basic':
        s += '<path d="M5 30 V5 H30" fill="none" stroke="#FFF1BC" stroke-width="2"/>'
    return s
def icon(e, glyph, kind):
    body = GL[glyph]()
    if kind == 'tp': body = f'<g transform="translate(64 64) scale(.78) translate(-64 -64)">{body}</g>'
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">{defs(e)}{frame(kind)}<g transform="translate(64 64) scale(.82) translate(-64 -64)">{body}</g></svg>'
def emblem(e, glyph):
    """huy hiệu Dòng: tròn như mặt trống đồng"""
    a, b = ELEM[e]; body = GL[glyph]()
    rings = ''.join(f'<circle cx="64" cy="64" r="{r}" fill="none" stroke="#D5AD59" stroke-opacity=".5" stroke-width="1.2"/>' for r in (50, 44))
    ticks = ''.join(f'<line x1="{64+46*math.cos(i*math.pi/18):.1f}" y1="{64+46*math.sin(i*math.pi/18):.1f}" x2="{64+50*math.cos(i*math.pi/18):.1f}" y2="{64+50*math.sin(i*math.pi/18):.1f}" stroke="#D5AD59" stroke-width="1.5"/>' for i in range(36))
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">{defs(e)}<circle cx="64" cy="64" r="60" fill="url(#bg)" stroke="url(#f)" stroke-width="5"/>{rings}{ticks}<g transform="translate(64 64) scale(.62) translate(-64 -64)">{body}</g></svg>'
def main():
    man_p = os.path.join(ROOT, 'manifest.json'); man = json.load(open(man_p, encoding='utf-8'))
    os.makedirs(os.path.join(ROOT, 'ui', 'skill'), exist_ok=True); os.makedirs(os.path.join(ROOT, 'ui', 'dong'), exist_ok=True)
    n = 0
    for D, (e, b0, s1, s2, s3, tp) in DONG.items():
        for i, (g, kind) in enumerate([(b0, 'basic'), (s1, 'sk'), (s2, 'sk'), (s3, 'ult')]):
            p = f'ui/skill/SK-{D}-{i}.svg'; open(os.path.join(ROOT, p), 'w').write(icon(e, g, kind)); man[f'SK-{D}-{i}'] = p; n += 1
        p = f'ui/skill/TP-{D}.svg'; open(os.path.join(ROOT, p), 'w').write(icon(e, tp, 'tp')); man[f'TP-{D}'] = p; n += 1
        p = f'ui/dong/EMB-DONG-{D}.svg'; open(os.path.join(ROOT, p), 'w').write(emblem(e, b0)); man[f'EMB-DONG-{D}'] = p; n += 1
    json.dump(man, open(man_p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1); print('đã sinh', n, 'biểu tượng')
if __name__ == '__main__': main()
