# API改修計画: add_all_bgc

## 概要

前処理（`add_bgc_params`）の対応として、APIを新しい `metadata.csv` スキーマに合わせて改修する。

**主な目的**:
1. `only_with_oxygen` → `only_with_bgc` へのリネーム（BGC系データを1つでも持つ観測を対象にする）
2. `has_phosphate` の削除（新 metadata.csv に存在しない）
3. 新 BGC パラメータの追加: `has_bbp700`, `has_ph`, `has_irradiance490`, `has_par`
4. モードフィールドの追加: `ts_mode`, `doxy_mode`, `chla_mode`, `nitrate_mode`, `bbp700_mode`, `ph_mode`, `irr490_mode`, `par_mode`

---

## 新 metadata.csv スキーマ（参照）

```
wmo_id, cycle_number, date_utc, updated_at, latitude, longitude,
min_pressure, max_pressure, mixed_layer_depth, mld_color,
som_depth, som_value, som_depth_color, som_value_color, object_key,
has_temperature, has_salinity, has_oxygen, has_chlorophyll, has_nitrate,
has_bbp700, has_ph, has_irradiance490, has_par,
ts_mode, doxy_mode, chla_mode, nitrate_mode, bbp700_mode, ph_mode, irr490_mode, par_mode
```

---

## 変更対象ファイル一覧

### 1. `app/models/argo.py`

**変更内容:**
- `has_phosphate` カラムを削除
- 新 `has_*` カラムを追加: `has_bbp700`, `has_ph`, `has_irradiance490`, `has_par`
  - NOT NULL, `server_default=False`
- モードカラムを追加（全て `String(4)`, NOT NULL, `server_default='-'`）:
  `ts_mode`, `doxy_mode`, `chla_mode`, `nitrate_mode`, `bbp700_mode`, `ph_mode`, `irr490_mode`, `par_mode`

> **前提**: argoテーブルはメンテナンス時間を設けて一度削除・再作成する運用が可能なため、
> 全列を NOT NULL で定義する。既存行の NULL 残留問題は発生しない。

---

### 2. `app/schemas/argo.py`

**`ArgoCreateDB`, `ArgoUpdateDB`, `ArgoOut` — 共通の変更:**
- `has_phosphate` フィールドを削除
- `has_bbp700`, `has_ph`, `has_irradiance490`, `has_par` を追加
- モードフィールドを追加:
  `ts_mode`, `doxy_mode`, `chla_mode`, `nitrate_mode`, `bbp700_mode`, `ph_mode`, `irr490_mode`, `par_mode`
  - `ArgoCreateDB` / `ArgoOut`: `str = "-"` をデフォルトに
  - `ArgoUpdateDB`: `str | None = None`

**`ArgoSearchQuery` — 変更:**
- `only_with_oxygen: bool` → `only_with_bgc: bool`
- description を更新: `"If True, only return floats that have at least one BGC parameter"`

---

### 3. `app/crud/argo.py`

**変更内容:**
- `user_in.only_with_oxygen` → `user_in.only_with_bgc`
- WHERE 条件を変更:
  - 変更前: `has_oxygen.is_(True)`
  - 変更後: 各列に個別に `.is_(True)` を付けて `or_()` で結合する
    ```python
    or_(
        Argo.has_oxygen.is_(True),
        Argo.has_chlorophyll.is_(True),
        Argo.has_nitrate.is_(True),
        Argo.has_bbp700.is_(True),
        Argo.has_ph.is_(True),
        Argo.has_irradiance490.is_(True),
        Argo.has_par.is_(True),
    )
    ```
  - `or_(col1, col2).is_(True)` のように `or_()` 全体に `.is_(True)` を付ける書き方は、
    NULL 列が含まれる場合に三値論理で意図しない結果になるため使用しない

---

### 4. `app/services/argo/profile.py`

**変更内容:**
- `ArgoSearchQuery(...)` の生成箇所で `only_with_oxygen` → `only_with_bgc` にリネーム

---

### 5. `app/models/saved_search.py`

**変更内容:**
- `only_with_oxygen` カラムを `only_with_bgc` にリネーム

---

### 6. `app/schemas/saved_search.py`

**変更内容（`SavedSearchCreateDB`, `SavedSearchIn`, `SavedSearchOut` の全クラス）:**
- `only_with_oxygen` フィールドを `only_with_bgc` にリネーム

---

### 7. `app/services/bookmark/saved_search.py`

**変更内容:**
- `SavedSearchCreateDB(...)` 生成箇所で `only_with_oxygen` → `only_with_bgc` にリネーム

---

### 8. Alembic マイグレーション（新規作成）

2つの変更を1マイグレーションにまとめる。

**`argo` テーブル（テーブル再作成）:**

argoテーブルはシステム運用者が定期更新するテーブルであり、ユーザー入力データを含まない。
そのため、メンテナンス時間を設けてテーブルを DROP & CREATE し直す方針とする。これにより NOT NULL 制約を安全に付与でき、NULL 残留問題が発生しない。

マイグレーションでやること:
- `op.drop_table('argo')`
- テーブルを最新定義（下記）で再作成
  - `has_phosphate` は含めない
  - `has_bbp700`, `has_ph`, `has_irradiance490`, `has_par`: `Boolean, NOT NULL, server_default=False`
  - モードフィールド × 8 (`ts_mode` 等): `String(4), NOT NULL, server_default='-'`
  - その他の既存カラムは定義を維持
- 再作成時に以下の制約・インデックスも必ず再定義する（列定義だけでは復元されない）:
  - **PK**: `PrimaryKeyConstraint("wmo_id", "cycle_number", name="pk_wmo_cycle_number")`
  - **Unique**: `object_key` カラムに `unique=True`
  - **複合インデックス**: `Index("ix_argo_date_lat_lon", "date_utc", "latitude", "longitude")`
  - **単一インデックス**: `wmo_id`（`index=True`）、`cycle_number`（`index=True`）、`date_utc`（`index=True`）

**`saved_search` テーブル:**
- `op.alter_column('saved_search', 'only_with_oxygen', new_column_name='only_with_bgc')`
  - 既存レコードの値は引き継ぎ（`True` だったものは BGC フィルターとしてそのまま有効）

---

### 9. テスト修正

#### `tests/crud/test_argo_crud.py`
- `test_search_only_with_oxygen_true` → `test_search_only_with_bgc_true`
- `only_with_oxygen=True` → `only_with_bgc=True`

#### `tests/services/argo/test_profile_argo_service.py`
- `test_search_service_only_with_oxygen_true` → `test_search_service_only_with_bgc_true`
- `ArgoSearchQuery(only_with_oxygen=True, ...)` → `ArgoSearchQuery(only_with_bgc=True, ...)`
- `called_args.only_with_oxygen` → `called_args.only_with_bgc`
- `ArgoOut(...)` 内の `has_phosphate=False` を削除し、新フィールドを追加（必要な箇所のみ）

#### `tests/schemas/test_argo_schema.py`
- `test_argo_create_db_defaults` のパラメータから `has_oxygen`/`has_phosphate` 系を整理（新フィールド追加）
- `test_argo_out_serialization`: `ArgoOut` の初期化に問題はないか確認（デフォルト値で十分）

#### `tests/services/bookmark/test_saved_search_bookmark_service.py`
- `test_save_search_service_with_only_with_oxygen` → `test_save_search_service_with_only_with_bgc`
- `SavedSearchIn(only_with_oxygen=True, ...)` → `SavedSearchIn(only_with_bgc=True, ...)`
- `kwargs["obj_in"].only_with_oxygen` → `kwargs["obj_in"].only_with_bgc`

---

## UI側の対応について

UI側（`oceangraph-ui`）には `has_phosphate` の参照や `only_with_oxygen` の使用箇所が存在するが、
**UI改修は本タスクのスコープ外とし、後続の別タスクとして計画・実施する。**

主な影響箇所（UI側、参考）:
- `lib/models/argo_float.dart`: `has_phosphate` フィールド削除、新 BGC フィールド・モードフィールド追加
- `lib/repositories/argo_repository.dart`: `only_with_oxygen` → `only_with_bgc` リネーム
- `lib/models/saved_search_condition.dart`: `only_with_oxygen` → `only_with_bgc` リネーム

---

## 変更対象ファイルまとめ

| ファイル | 変更の種類 |
|---|---|
| `app/models/argo.py` | カラム追加・削除 |
| `app/schemas/argo.py` | フィールド追加・削除・リネーム |
| `app/crud/argo.py` | クエリ修正・リネーム |
| `app/services/argo/profile.py` | リネーム |
| `app/models/saved_search.py` | カラムリネーム |
| `app/schemas/saved_search.py` | フィールドリネーム |
| `app/services/bookmark/saved_search.py` | リネーム |
| `alembic/versions/xxxx_add_all_bgc.py` | 新規マイグレーション |
| `tests/crud/test_argo_crud.py` | テスト修正 |
| `tests/services/argo/test_profile_argo_service.py` | テスト修正 |
| `tests/schemas/test_argo_schema.py` | テスト修正 |
| `tests/services/bookmark/test_saved_search_bookmark_service.py` | テスト修正 |

---

## ユーザーが挙げた変更点との対応確認

| ユーザーの指摘 | 計画での対応 | 備考 |
|---|---|---|
| `only_with_oxygen` → `only_with_bgc` | §3,4,5,6,7,8,9 | CRUD・サービス・モデル・スキーマ・SavedSearch・テスト全てに波及 |
| `/v1/argo/search` レスポンススキーマ変更 | §2 (`ArgoOut`) | `has_phosphate` 削除、新 `has_*` 追加、モードフィールド追加 |
| `/v1/argo/search/{wmo_id}` レスポンススキーマ変更 | §2 (`ArgoOut`) | 同上（同じ `ArgoOut` スキーマを使用） |

## ユーザーが挙げなかった追加変更点

| 追加変更点 | 理由 |
|---|---|
| `has_phosphate` の削除 | 新 metadata.csv に存在しない |
| モードフィールド追加（`ts_mode` など 8 フィールド） | 新 metadata.csv に含まれる。UIでのデータ品質表示に必要 |
| `saved_search` テーブルの `only_with_oxygen` リネーム | `only_with_bgc` と整合させるために必要 |
