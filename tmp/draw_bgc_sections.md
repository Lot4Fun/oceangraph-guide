# BGC断面図の生成対応計画

## 概要

`generate_section/main.py` の鉛直断面図生成処理を拡張し、`add_bgc_params` 実装で追加した6つの BGC パラメータの断面図 SVG も生成する。

現在は `temperature` / `salinity` / `oxygen` の3種のみ対応しているため、以下6種を追加する。

| 追加パラメータ | JSON key | 単位 |
|---|---|---|
| クロロフィル | `chlorophyll` | mg/m³ |
| 硝酸塩 | `nitrate` | μmol/kg |
| 後方散乱係数 | `bbp700` | m⁻¹ |
| pH | `ph` | pH |
| 照度490 | `irradiance490` | W/m²/nm |
| PAR | `par` | μmol/m²/s |

---

## 変更対象ファイル

- `generate_section/main.py`（実装）
- `generate_section/README.md`（生成物一覧を3 SVG → 9 SVGに更新）

---

## パラメータ仕様

| graph_type | JSON key | cmap | 深度範囲 | 備考 |
|---|---|---|---|---|
| `chlorophyll` | `chlorophyll` | `YlGn` | 5–2000 dbar | |
| `nitrate` | `nitrate` | `BuPu` | 5–2000 dbar | |
| `bbp700` | `bbp700` | `hot_r` | 5–2000 dbar | |
| `ph` | `ph` | `RdBu` | 5–2000 dbar | |
| `irradiance490` | `irradiance490` | `YlOrRd` | 5–2000 dbar | null含む |
| `par` | `par` | `YlOrRd` | 5–2000 dbar | null含む |

### 照度系パラメータ（irradiance490, par）の特殊性

- JSON 値に `null`（Python: `None`）が含まれる（`add_bgc_params` 仕様。端部 NaN を物理的欠測として null 出力）
- 描画深度範囲は他のパラメータと同様に 5–2000 dbar で統一する（200 dbar 以深はデータが存在しない cycle が多いが、断面図としては欠測（NaN）として描画すれば十分）

---

## 実装手順

### Step 1: `read_metadata_csv()` の更新

**変更内容:** `defaultdict` に6つの新フィールドを追加し、CSV の各カラムを読み込む。

現在の `data` 初期化:
```python
data = defaultdict(lambda: {
    "potential_temperature": [],
    "absolute_salinity": [],
    "oxygen": [],
    "cycles": []
})
```

変更後:
```python
data = defaultdict(lambda: {
    "potential_temperature": [],
    "absolute_salinity": [],
    "oxygen": [],
    "chlorophyll": [],
    "nitrate": [],
    "bbp700": [],
    "ph": [],
    "irradiance490": [],
    "par": [],
    "cycles": []
})
```

CSV 読み込みループへの追加（`has_oxygen` と同パターンで6行追加）:
```python
if row["has_chlorophyll"].lower() == "true":
    data[key]["chlorophyll"].append(cycle_number)
if row["has_nitrate"].lower() == "true":
    data[key]["nitrate"].append(cycle_number)
if row["has_bbp700"].lower() == "true":
    data[key]["bbp700"].append(cycle_number)
if row["has_ph"].lower() == "true":
    data[key]["ph"].append(cycle_number)
if row["has_irradiance490"].lower() == "true":
    data[key]["irradiance490"].append(cycle_number)
if row["has_par"].lower() == "true":
    data[key]["par"].append(cycle_number)
```

---

### Step 2: `generate_json_files()` の更新

**変更内容:** `availability` dict に新パラメータを追加し、SVG 生成ジョブも追加する。

現在の `availability` 定義:
```python
availability = {
    "temperature": len(values["potential_temperature"]) >= 3,
    "salinity": len(values["absolute_salinity"]) >= 3,
    "oxygen": len(values["oxygen"]) >= 3,
}
```

変更後（6種を追加）:
```python
availability = {
    "temperature": len(values["potential_temperature"]) >= 3,
    "salinity": len(values["absolute_salinity"]) >= 3,
    "oxygen": len(values["oxygen"]) >= 3,
    "chlorophyll": len(values["chlorophyll"]) >= 3,
    "nitrate": len(values["nitrate"]) >= 3,
    "bbp700": len(values["bbp700"]) >= 3,
    "ph": len(values["ph"]) >= 3,
    "irradiance490": len(values["irradiance490"]) >= 3,
    "par": len(values["par"]) >= 3,
}
```

SVG 生成ジョブの追加は既存の `for graph_type, is_available in availability.items():` ループで自動対応される（変更不要）。

---

### Step 3: `generate_svg()` の更新

変更箇所は2点。

#### 3a: `json_key_map` の拡張

現在:
```python
json_key_map = {
    "temperature": "potential_temperature",
    "salinity": "absolute_salinity",
    "oxygen": "oxygen",
}
```

変更後（新パラメータは graph_type と JSON key が一致するのでマッピング登録なしでも動くが、明示的に追加して可読性を上げる）:
```python
json_key_map = {
    "temperature": "potential_temperature",
    "salinity": "absolute_salinity",
    "oxygen": "oxygen",
    "chlorophyll": "chlorophyll",
    "nitrate": "nitrate",
    "bbp700": "bbp700",
    "ph": "ph",
    "irradiance490": "irradiance490",
    "par": "par",
}
```

#### 3b: `cmap` の拡張

現在:
```python
cmap = {
    "temperature": "turbo",
    "salinity": "viridis",
    "oxygen": "plasma"
}.get(graph_type, "viridis")
```

変更後:
```python
cmap = {
    "temperature": "turbo",
    "salinity": "viridis",
    "oxygen": "plasma",
    "chlorophyll": "YlGn",
    "nitrate": "BuPu",
    "bbp700": "hot_r",
    "ph": "RdBu",
    "irradiance490": "YlOrRd",
    "par": "YlOrRd",
}.get(graph_type, "viridis")
```

---

### Step 4: `interpolate_profile_to_grid()` の更新

**変更内容:** JSON の `null`（Python: `None`）を NaN に変換してから `np.array` に渡す。

現在:
```python
values = np.array(profile_data.get(json_key, []))
```

変更後:
```python
raw_values = profile_data.get(json_key, [])
values = np.array([np.nan if v is None else v for v in raw_values], dtype=float)
```

`dtype=float` を明示することで、None 混入時に object 配列になるのを防ぐ。  
`pressures` は null を含まないため変更不要。

---

## availability.json の仕様変更

`availability.json` に9種のフィールドが書き込まれるようになる。  
フロントエンドが期待するスキーマが変わるため、フロントエンド側での対応が必要かどうか確認すること（本タスクのスコープ外）。

---

## 実装チェックリスト

- [ ] **Step 1:** `read_metadata_csv()` — defaultdict に6フィールド追加、CSV 読み込みに6行追加
- [ ] **Step 2:** `generate_json_files()` — `availability` dict に6エントリ追加
- [ ] **Step 3a:** `generate_svg()` — `json_key_map` に6エントリ追加
- [ ] **Step 3b:** `generate_svg()` — `cmap` dict に6エントリ追加
- [ ] **Step 4:** `interpolate_profile_to_grid()` — None → NaN 変換を追加
- [ ] **README.md:** `generate_section/README.md` の生成物一覧を3 SVG → 9 SVGに更新

---

## 注意事項

- `read_metadata_csv()` で存在しない CSV カラムを参照すると `KeyError` になる。`add_bgc_params` の Step 10 で `has_chlorophyll` 等の列が metadata.csv に含まれていることを前提とする。古いスナップショットの metadata.csv には列が存在しない場合があるため、`row.get("has_chlorophyll", "false")` を使うとより安全（後方互換対応の要否は要確認）。
- BGC データが存在しない WMO ID（`has_chlorophyll == False` が全サイクル）では `availability.chlorophyll == false` となり、SVG ジョブは投入されない（既存ロジックで自動対応）。
- 照度系（irradiance490, par）は200 dbar 以深でほぼ欠測になるが、描画範囲は2000 dbar で統一する。深層の欠測は NaN として描画されるため視覚的に問題ない。
