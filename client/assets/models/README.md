# Ổ cắm model nhân vật (QĐ-0017, QĐ-0018)
Mỗi Dòng 1 thư mục: `kiem/ duoc/ bang/ hoa/ thach/`, trong đó:
- `model.glb` — model có khung xương tên kiểu Mixamo (Hips, Spine, LeftArm, LeftHandIndex1…). Tiền tố `mixamorig:` tự bỏ.
- `profile.json` — ví dụ:
```json
{ "file": "model.glb", "scale": 1, "modelScale": 1, "offsetY": 0, "rotY": 0, "armDown": 1.2,
  "boneMap": { "pelvis": "Hips" },
  "sockets": { "weapon": { "bone": "RightHand", "pos": [0,0.1,0.03], "rot": [0,0,1.57], "scale": 1 } },
  "fxScale": 1, "license": "ai làm / nguồn / giấy phép" }
```
Rồi ghi vào `assets/manifest.json`: `"CHAR-KIEM-BASE": "models/kiem/profile.json"`. Không có → dùng hình nộm.
`armDown`: model đứng chữ T (Mixamo) thì để ~1.2 cho tay buông xuống.
