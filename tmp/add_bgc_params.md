# BGC-Argo Parameters追加計画

## 概要
現在DOXYのみ対応しているBio-Argo処理を拡張し、以下のBGCパラメータを追加する。

**基本方針:** DOXYの実装をそのまま他のBGCパラメータにもコピーする。

### 追加パラメータ
1. **クロロフィル (Chlorophyll-a):** `CHLA_ADJUSTED`, `CHLA_ADJUSTED_QC`
2. **硝酸塩 (Nitrate):** `NITRATE_ADJUSTED`, `NITRATE_ADJUSTED_QC`
3. **後方散乱係数 (BBP700):** `BBP700_ADJUSTED`, `BBP700_ADJUSTED_QC`
4. **pH:** `PH_IN_SITU_TOTAL_ADJUSTED`, `PH_IN_SITU_TOTAL_ADJUSTED_QC`
5. **照度 (Irradiance):** `DOWN_IRRADIANCE490_ADJUSTED`, `DOWN_IRRADIANCE490_ADJUSTED_QC`
6. **光合成有効放射 (PAR):** `DOWNWELLING_PAR_ADJUSTED`, `DOWNWELLING_PAR_ADJUSTED_QC`

---

## 実装方針

### DOXYと全く同じ処理を適用
全BGCパラメータに対してDOXYの既存実装をコピーする。変更点は以下の3つのみ：

1. **Validation:** `validate_bio_nc_file()`をいずれか1つのBGCパラメータが存在すればOKに修正
2. **Data Loading:** 繰り返しコードを防ぐため`load_bgc_parameter()`共通関数を作成（処理ロジックはDOXYと同一）
3. **NaN Interpolation:** 照度系（IRR490, PAR）は内挿のみ実行、外挿はスキップ
4. **Output:** 新パラメータのJSONキー名とメタデータフラグを追加

### 処理フロー（DOXYと同じ）
1. **Data Loading:** ADJUSTED → unadjustedのフォールバック
2. **Pressure Filtering:** MAX_PRES以下のデータを抽出
3. **QC Check (80%):** QC失敗したら空リストに（プロファイルは破棄しない）
4. **Valid Indices:** P,T,SのQCで決定したインデックスで抽出
5. **NaN Interpolation:** 線形補間（照度系のみ外挿スキップ）
6. **Duplicate Removal:** 圧力重複を除去
7. **Rounding:** 適切な精度に丸める
8. **Output:** JSON + metadata CSV

---

## 実装手順

### Step 1: Validation関数の修正
**File:** `convert_raw_data.py`, lines 64-82

```python
def validate_bio_nc_file(nc_file):
    """Validate if the NetCDF file has at least one complete BGC parameter (with QC)."""
    required_metadata = [
        'PLATFORM_NUMBER', 'CYCLE_NUMBER', 'JULD', 'JULD_QC',
        'LATITUDE', 'LONGITUDE', 'POSITION_QC', 'PRES'
    ]
    
    # Check required metadata
    for var in required_metadata:
        if var not in nc_file.data_vars:
            return False
    
    # Check if at least one complete BGC parameter pair exists (parameter + QC).
    # Both ADJUSTED and unadjusted variants are accepted because load_bgc_parameter()
    # uses ADJUSTED -> unadjusted fallback; rejecting unadjusted-only files here would
    # cause valid profiles to be treated as missing_vars_bio.
    bgc_param_pairs = [
        ('DOXY_ADJUSTED', 'DOXY_ADJUSTED_QC'),
        ('DOXY', 'DOXY_QC'),
        ('CHLA_ADJUSTED', 'CHLA_ADJUSTED_QC'),
        ('CHLA', 'CHLA_QC'),
        ('NITRATE_ADJUSTED', 'NITRATE_ADJUSTED_QC'),
        ('NITRATE', 'NITRATE_QC'),
        ('BBP700_ADJUSTED', 'BBP700_ADJUSTED_QC'),
        ('BBP700', 'BBP700_QC'),
        ('PH_IN_SITU_TOTAL_ADJUSTED', 'PH_IN_SITU_TOTAL_ADJUSTED_QC'),
        ('PH_IN_SITU_TOTAL', 'PH_IN_SITU_TOTAL_QC'),
        ('DOWN_IRRADIANCE490_ADJUSTED', 'DOWN_IRRADIANCE490_ADJUSTED_QC'),
        ('DOWN_IRRADIANCE490', 'DOWN_IRRADIANCE490_QC'),
        ('DOWNWELLING_PAR_ADJUSTED', 'DOWNWELLING_PAR_ADJUSTED_QC'),
        ('DOWNWELLING_PAR', 'DOWNWELLING_PAR_QC'),
    ]
    
    return any(
        param in nc_file.data_vars and qc_param in nc_file.data_vars
        for param, qc_param in bgc_param_pairs
    )
```

---

### Step 2a: BGCパラメータ読み込み用の共通関数を追加
**File:** `convert_raw_data.py`, 適切な場所（validate_bio_nc_file()の後など）

DOXYのロジックを共通関数化。**各パラメータごとに個別のmodeを返します**：

```python
def load_bgc_parameter(bio_nc, param_name, initial_mode):
    """
    Load BGC parameter with ADJUSTED -> unadjusted fallback.
    
    Args:
        bio_nc: Bio NetCDF dataset
        param_name: Base parameter name (e.g., 'DOXY', 'CHLA')
        initial_mode: Initial mode string ('R', 'D', or '-')
    
    Returns:
        tuple: (data_list, qc_list, param_mode)
        - param_mode: 'R'/'D' if ADJUSTED used, 'r'/'d' if unadjusted, '-' if no data
    """
    adjusted_var = f"{param_name}_ADJUSTED"
    adjusted_qc_var = f"{param_name}_ADJUSTED_QC"
    unadjusted_var = param_name
    unadjusted_qc_var = f"{param_name}_QC"
    
    use_adjusted = False
    
    # Try ADJUSTED first
    if adjusted_var in bio_nc.data_vars:
        raw_adj = bio_nc[adjusted_var][0].values.tolist()
        all_nan = all(math.isnan(d) if isinstance(d, float) else False for d in raw_adj)
        if not all_nan:
            use_adjusted = True
            data = raw_adj
            qc = bio_nc[adjusted_qc_var][0].values.tolist()
            return data, qc, initial_mode  # use initial_mode; bio_mode is not in scope
    
    # Fallback to unadjusted
    if not use_adjusted and unadjusted_var in bio_nc.data_vars:
        data = bio_nc[unadjusted_var][0].values.tolist()
        qc = bio_nc[unadjusted_qc_var][0].values.tolist()
        return data, qc, initial_mode.lower()
    
    # No data available
    return [], [], '-'
```

---

### Step 2b: データ読み込み（共通関数を使用）
**File:** `convert_raw_data.py`, lines 475-495

既存のDOXYロジックを共通関数呼び出しに置き換え、全BGCパラメータを読み込む。
**各パラメータごとに個別のmodeを記録**：

```python
# Load all BGC parameters with individual mode tracking
if bio_nc:
    # DOXY (replace existing code with function call)
    raw_doxy, doxy_qc, doxy_mode = load_bgc_parameter(bio_nc, 'DOXY', bio_mode)
    
    # New BGC parameters (each has its own mode)
    raw_chla, chla_qc, chla_mode = load_bgc_parameter(bio_nc, 'CHLA', bio_mode)
    raw_nitrate, nitrate_qc, nitrate_mode = load_bgc_parameter(bio_nc, 'NITRATE', bio_mode)
    raw_bbp700, bbp700_qc, bbp700_mode = load_bgc_parameter(bio_nc, 'BBP700', bio_mode)
    raw_ph, ph_qc, ph_mode = load_bgc_parameter(bio_nc, 'PH_IN_SITU_TOTAL', bio_mode)
    raw_irr490, irr490_qc, irr490_mode = load_bgc_parameter(bio_nc, 'DOWN_IRRADIANCE490', bio_mode)
    raw_par, par_qc, par_mode = load_bgc_parameter(bio_nc, 'DOWNWELLING_PAR', bio_mode)
else:
    raw_doxy, doxy_qc, doxy_mode = [], [], '-'
    raw_chla, chla_qc, chla_mode = [], [], '-'
    raw_nitrate, nitrate_qc, nitrate_mode = [], [], '-'
    raw_bbp700, bbp700_qc, bbp700_mode = [], [], '-'
    raw_ph, ph_qc, ph_mode = [], [], '-'
    raw_irr490, irr490_qc, irr490_mode = [], [], '-'
    raw_par, par_qc, par_mode = [], [], '-'
```

---

### Step 3: フィルタリング（DOXYをコピー）
**File:** `convert_raw_data.py`, lines 497-507

```python
# DOXY (existing - keep as is)
doxy = [d for p, d in zip(raw_pres, raw_doxy) if 0 <= p <= MAX_PRES] if raw_doxy else []
doxy_qc = [qc for p, qc in zip(raw_pres, doxy_qc) if 0 <= p <= MAX_PRES] if doxy_qc else []

# Copy for all BGC params
chla = [c for p, c in zip(raw_pres, raw_chla) if 0 <= p <= MAX_PRES] if raw_chla else []
chla_qc = [qc for p, qc in zip(raw_pres, chla_qc) if 0 <= p <= MAX_PRES] if chla_qc else []

# ... (repeat for all BGC params)
```

---

### Step 4a: QCチェック用共通関数を追加
**File:** `convert_raw_data.py`, 適切な場所（`load_bgc_parameter()`の後など）

```python
def check_bgc_qc(qc_list: list) -> bool:
    """Check if BGC parameter passes 80% QC threshold.
    
    Returns True if no QC data (don't reject) or >= 80% of values pass.
    """
    if not qc_list:
        return True
    passed = sum(1 for qc in qc_list if qc in (b'1', b'2', b'8'))
    return passed / len(qc_list) >= 0.8

def check_irradiance_qc(qc_list: list) -> bool:
    """Check if irradiance data has at least one valid measurement.
    
    Irradiance sensors only measure in the surface layer (~0-200m), so most
    values in a deep profile will be NaN/invalid. The 80% threshold used for
    other BGC params would reject almost all irradiance profiles.
    Returns True if no QC data or at least one value passes QC.
    """
    if not qc_list:
        return True
    return any(qc in (b'1', b'2', b'8') for qc in qc_list)
```

### Step 4b: QCチェック（共通関数を使用）
**File:** `convert_raw_data.py`, lines 509-535

```python
# DOXY (replace existing 4-line pattern)
if not check_bgc_qc(doxy_qc):
    doxy = []
    doxy_mode = '-'

# New BGC params (80%閾値)
if not check_bgc_qc(chla_qc):
    chla = []
    chla_mode = '-'
if not check_bgc_qc(nitrate_qc):
    nitrate = []
    nitrate_mode = '-'
if not check_bgc_qc(bbp700_qc):
    bbp700 = []
    bbp700_mode = '-'
if not check_bgc_qc(ph_qc):
    ph = []
    ph_mode = '-'

# 照度系パラメータ（表層のみ有効なため1点以上あればOK）
if not check_irradiance_qc(irr490_qc):
    irr490 = []
    irr490_mode = '-'
if not check_irradiance_qc(par_qc):
    par = []
    par_mode = '-'
```

---

### Step 5: Valid Indicesで抽出（DOXYをコピー）
**File:** `convert_raw_data.py`, line 542

```python
# DOXY (existing - keep as is)
doxy = [doxy[i] for i in valid_indices] if doxy else []

# Copy for all BGC params
chla = [chla[i] for i in valid_indices] if chla else []
nitrate = [nitrate[i] for i in valid_indices] if nitrate else []
bbp700 = [bbp700[i] for i in valid_indices] if bbp700 else []
ph = [ph[i] for i in valid_indices] if ph else []
irr490 = [irr490[i] for i in valid_indices] if irr490 else []
par = [par[i] for i in valid_indices] if par else []
```

---

### Step 6: NaN補間（DOXYをコピー、照度系は修正）
**File:** `convert_raw_data.py`, lines 553-555

**6.1 既存のinterpolate_and_fill_nans()をそのまま使用（DOXY以外）:**
```python
# DOXY: bio_mode ではなく doxy_mode を使う（個別管理に統一）
if doxy:
    doxy, doxy_mode = interpolate_and_fill_nans(doxy, doxy_mode, output_dir)

# Other BGC params: 各パラメータの個別 mode を渡し、戻り値も個別 mode に受ける
# （bio_mode を渡したり _ で捨てたりすると個別管理が崩れる）
if chla:
    chla, chla_mode = interpolate_and_fill_nans(chla, chla_mode, output_dir)
if nitrate:
    nitrate, nitrate_mode = interpolate_and_fill_nans(nitrate, nitrate_mode, output_dir)
if bbp700:
    bbp700, bbp700_mode = interpolate_and_fill_nans(bbp700, bbp700_mode, output_dir)
if ph:
    ph, ph_mode = interpolate_and_fill_nans(ph, ph_mode, output_dir)
```

**6.2 照度系用の新関数を追加:**
```python
def interpolate_nans_no_extrap(arr: list[float]) -> list[float]:
    """Interpolate internal NaN gaps only — no extrapolation at edges.
    
    Unlike interpolate_and_fill_nans(), leading/trailing NaN values are left
    as NaN (not filled via ffill/bfill). This is required for irradiance data
    because deep-water NaN values are physically meaningful (no light penetration)
    and surface NaN values may indicate nighttime — both should not be inferred.
    
    Edge NaN values returned by this function should be converted to None by the
    caller, so that each irradiance array keeps the same length as pres and outputs
    JSON null at those positions.
    """
    if not arr:
        return []
    
    arr_np = np.array(arr, dtype=float)
    nans = np.isnan(arr_np)
    
    if np.all(nans):
        return []
    if not np.any(nans):
        return arr
    
    not_nans_idx = np.flatnonzero(~nans)
    first_valid = not_nans_idx[0]
    last_valid = not_nans_idx[-1]
    
    # Only fill NaN values that lie strictly between the first and last valid index.
    # np.interp would fill edge NaNs by clamping to the nearest value, which IS
    # extrapolation — so we restrict the mask to the interior region first.
    internal_nans = nans.copy()
    internal_nans[:first_valid] = False
    internal_nans[last_valid + 1:] = False
    
    if np.any(internal_nans):
        arr_np[internal_nans] = np.interp(
            np.flatnonzero(internal_nans),
            not_nans_idx,
            arr_np[not_nans_idx]
        )
    
    return arr_np.tolist()

# **設計方針: 全BGCパラメータは core と同じ pressure 軸を維持する。**
# irr490/par も pres と同じ長さを保ち、per-param のインデックスフィルタリングは行わない。
# （独自フィルタをかけると Step 7 の zip で長さ不整合が生じ末尾データが欠落する）
#
# 端部の NaN（例: 光が届かない深層）は物理的に意味のある欠測として None に変換し、
# JSON の null として出力する（フロントエンドは null を「この圧力層でデータなし」と解釈する）。
if irr490:
    irr490 = interpolate_nans_no_extrap(irr490)
    irr490 = [None if (isinstance(v, float) and math.isnan(v)) else v for v in irr490]
    if all(v is None for v in irr490):
        irr490 = []
        irr490_mode = '-'
if par:
    par = interpolate_nans_no_extrap(par)
    par = [None if (isinstance(v, float) and math.isnan(v)) else v for v in par]
    if all(v is None for v in par):
        par = []
        par_mode = '-'
```

---

### Step 7: 重複除去（DOXYをコピー）
**File:** `convert_raw_data.py`, lines 557-583

```python
# Remember original state
original_doxy_was_empty = (len(doxy) == 0)
original_chla_was_empty = (len(chla) == 0)
original_nitrate_was_empty = (len(nitrate) == 0)
original_bbp700_was_empty = (len(bbp700) == 0)
original_ph_was_empty = (len(ph) == 0)
original_irr490_was_empty = (len(irr490) == 0)
original_par_was_empty = (len(par) == 0)

# Combine all data
combined_data = list(zip(
    pres, temp, psal, 
    doxy if doxy else [None] * len(pres),
    chla if chla else [None] * len(pres),
    nitrate if nitrate else [None] * len(pres),
    bbp700 if bbp700 else [None] * len(pres),
    ph if ph else [None] * len(pres),
    irr490 if irr490 else [None] * len(pres),
    par if par else [None] * len(pres),
))

# ... (existing deduplication logic)

# Reconstruct
pres = [data[0] for data in unique_data]
temp = [data[1] for data in unique_data]
psal = [data[2] for data in unique_data]
doxy = [] if original_doxy_was_empty else [data[3] for data in unique_data]
chla = [] if original_chla_was_empty else [data[4] for data in unique_data]
nitrate = [] if original_nitrate_was_empty else [data[5] for data in unique_data]
bbp700 = [] if original_bbp700_was_empty else [data[6] for data in unique_data]
ph = [] if original_ph_was_empty else [data[7] for data in unique_data]
irr490 = [] if original_irr490_was_empty else [data[8] for data in unique_data]
par = [] if original_par_was_empty else [data[9] for data in unique_data]
```

---

### Step 8: 丸め処理
**File:** `convert_raw_data.py`, line 640

```python
# DOXY (existing - keep as is)
doxy = [float(decimal.Decimal(d).quantize(decimal.Decimal('0.001'))) for d in doxy] if doxy else []

# Copy for all BGC params with appropriate precision
chla = [float(decimal.Decimal(c).quantize(decimal.Decimal('0.001'))) for c in chla] if chla else []
nitrate = [float(decimal.Decimal(n).quantize(decimal.Decimal('0.01'))) for n in nitrate] if nitrate else []
bbp700 = [float(decimal.Decimal(b).quantize(decimal.Decimal('0.000001'))) for b in bbp700] if bbp700 else []
ph = [float(decimal.Decimal(p).quantize(decimal.Decimal('0.001'))) for p in ph] if ph else []
# irr490/par は None（= JSON null）を含む可能性があるためスキップ処理を追加
irr490 = [float(decimal.Decimal(v).quantize(decimal.Decimal('0.001'))) if v is not None else None for v in irr490] if irr490 else []
par = [float(decimal.Decimal(v).quantize(decimal.Decimal('0.1'))) if v is not None else None for v in par] if par else []
```

---

### Step 9: JSON出力
**File:** `convert_raw_data.py`, line 689

```python
data = {
    "wmo_id": wmo_id,
    "cycle_number": cycle_number,
    "date_utc": date_utc,
    "latitude": lat,
    "longitude": lng,
    "pressure": pres,
    "potential_temperature": theta,
    "absolute_salinity": sa,
    "oxygen": doxy,
    "chlorophyll": chla,
    "nitrate": nitrate,
    "bbp700": bbp700,
    "ph": ph,
    "irradiance490": irr490,
    "par": par,
}
```

---

### Step 10: メタデータCSV
**File:** `convert_raw_data.py`, lines 765-788 & main()

**metadataオブジェクトに追加（各パラメータのmodeを含む）:**
```python
metadata = {
    # ... (existing fields)
    'has_oxygen': bool(doxy),
    'has_chlorophyll': bool(chla),
    'has_nitrate': bool(nitrate),
    'has_bbp700': bool(bbp700),
    'has_ph': bool(ph),
    'has_irradiance490': bool(irr490),
    'has_par': bool(par),
    'ts_mode': ts_mode,
    'doxy_mode': doxy_mode,      # 個別管理
    'chla_mode': chla_mode,
    'nitrate_mode': nitrate_mode,
    'bbp700_mode': bbp700_mode,
    'ph_mode': ph_mode,
    'irr490_mode': irr490_mode,
    'par_mode': par_mode,
    # ...
}
```

**CSV fieldnamesを更新（`main.py`の`metadata_fields`リスト）:**

`has_phosphate`を削除し、`bio_mode`を各パラメータの個別modeに置き換える：

> **⚠️ 破壊的変更（既存との互換性に注意）:**
> - `has_phosphate` の削除: 確認済み（データが観測されないため削除OK）
> - `bio_mode` の削除: README.md line 100 で公開仕様として記載されているため、**README.md も合わせて更新し`bio_mode`の廃止を明記すること**。

```python
metadata_fields = [
    "wmo_id",
    "cycle_number",
    "date_utc",
    "updated_at",
    "latitude",
    "longitude",
    "min_pressure",
    "max_pressure",
    "mixed_layer_depth",
    "mld_color",
    "som_depth",
    "som_value",
    "som_depth_color",
    "som_value_color",
    "object_key",
    "has_temperature",
    "has_salinity",
    "has_oxygen",
    "has_chlorophyll",
    "has_nitrate",
    "has_bbp700",        # 追加
    "has_ph",            # 追加
    "has_irradiance490", # 追加
    "has_par",           # 追加
    # has_phosphate は削除（観測データなし）
    "ts_mode",
    "doxy_mode",         # 追加（bio_mode を置き換え）
    "chla_mode",         # 追加
    "nitrate_mode",      # 追加
    "bbp700_mode",       # 追加
    "ph_mode",           # 追加
    "irr490_mode",       # 追加
    "par_mode",          # 追加
]
```

---

## 実装チェックリスト

各ステップは独立しており、共通関数化とDOXYパターンのコピーで実装。

- [ ] **Step 1:** `validate_bio_nc_file()`修正
- [ ] **Step 2a:** `load_bgc_parameter()`共通関数追加
- [ ] **Step 2b:** データ読み込み（共通関数を7パラメータに適用）
- [ ] **Step 3:** 圧力フィルタリング（DOXYを6回コピー）
- [ ] **Step 4a:** `check_bgc_qc()`共通関数追加
- [ ] **Step 4b:** 80%QCチェック（`check_bgc_qc()`を使用）
- [ ] **Step 5:** Valid Indices抽出（DOXYを6回コピー）
- [ ] **Step 6:** NaN補間（DOXYを4回コピー、照度用新関数2個）
- [ ] **Step 7:** 重複除去（combined_dataに6パラメータ追加）
- [ ] **Step 8:** 丸め処理（DOXYを6回コピー、精度変更）
- [ ] **Step 9:** JSON出力（dataオブジェクトに6キー追加）
- [ ] **Step 10:** メタデータCSV（6フラグ追加）
- [ ] **Test:** 既存DOXY処理の後方互換性確認
- [ ] **Test:** 新パラメータの動作確認

---

## パラメータ仕様

| パラメータ | NetCDF変数名 | JSON key | 単位 | 精度 | 典型的範囲 |
|-----------|------------|----------|------|------|-----------|
| 酸素 | DOXY | oxygen | μmol/kg | 0.001 | 0-500 |
| クロロフィル | CHLA | chlorophyll | mg/m³ | 0.001 | 0-30 |
| 硝酸塩 | NITRATE | nitrate | μmol/kg | 0.01 | 0-50 |
| 後方散乱 | BBP700 | bbp700 | m⁻¹ | 0.000001 | 0-0.01 |
| pH | PH_IN_SITU_TOTAL | ph | pH | 0.001 | 7.5-8.5 |
| 照度490 | DOWN_IRRADIANCE490 | irradiance490 | W/m²/nm | 0.001 | 0-5 |
| PAR | DOWNWELLING_PAR | par | μmol/m²/s | 0.1 | 0-2000 |

---

## 特記事項

### 照度パラメータ（IRR490, PAR）の特殊処理
- **内挿のみ実行、外挿はスキップ**
- 理由: 表層（日中のみ）と深層（光が届かない）では本質的にNaNであるべき
- 実装: 新関数 `interpolate_nans_no_extrap()` を使用
- **pressure軸**: core と同じ pressure 軸を維持（pres と同じ長さの配列）
- **端部NaNの扱い**: 補間後に残る端部NaN（深層の欠測）は `None` に変換し、JSONでは `null` として出力。全要素が `None` の場合は `[]` として扱い `irr490_mode = '-'` に設定

### BGC Modeの扱い
- **各BGCパラメータごとに個別のmodeを管理**（doxy_mode, chla_mode, etc.）
- 理由: BGCパラメータは独立しており、同一プロファイル内でもADJUSTED/unadjustedが混在する可能性がある
- Mode値: 大文字（'R', 'D'）= ADJUSTED使用、小文字（'r', 'd'）= unadjusted使用、'-' = データなし
- 後方互換性: 既存の`bio_mode`は削除し、パラメータごとのmodeに置き換える（README.mdの更新も必要）

### 後方互換性
- 既存のDOXY処理は完全に保持
- 新パラメータがない場合は空リスト `[]` として処理
- 既存JSONフォーマットに6キーを追加するのみ

---

## 推定作業量

- **ステップ1 (Validation):** 10分
- **ステップ2 (共通関数+読み込み):** 20分
- **ステップ3-5 (DOXY×6コピー):** 25分
- **ステップ6 (NaN補間+新関数):** 20分
- **ステップ7-10 (残り):** 30分
- **テストとデバッグ:** 30分

**合計:** 約2時間15分
