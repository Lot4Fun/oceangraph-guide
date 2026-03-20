# このリポジトリの改修計画: add_all_bgc

## 概要

前処理スクリプト（[add_all_bgc_for_ui.md](add_all_bgc_for_ui.md)）の対応として、メタデータ CSV の構造が変更された。
この変更を受けて、`upsert_argo.sh` のカラム定義を更新する。

---

## メタデータ CSV カラム差分

| カラム | 旧 | 新 |
|---|---|---|
| `has_phosphate` | あり | **削除** |
| `bio_mode` | あり | **削除** |
| `has_bbp700` | なし | **追加** (bool) |
| `has_ph` | なし | **追加** (bool) |
| `has_irradiance490` | なし | **追加** (bool) |
| `has_par` | なし | **追加** (bool) |
| `ts_mode` | なし | **追加** (text) |
| `doxy_mode` | なし | **追加** (text) |
| `chla_mode` | なし | **追加** (text) |
| `nitrate_mode` | なし | **追加** (text) |
| `bbp700_mode` | なし | **追加** (text) |
| `ph_mode` | なし | **追加** (text) |
| `irr490_mode` | なし | **追加** (text) |
| `par_mode` | なし | **追加** (text) |

---

## 変更が必要なファイル

### 対象: `scripts/upsert_argo.sh`（唯一の変更対象）

以下の3箇所をまとめて修正する。

#### 1. TEMP TABLE 定義

```sql
-- 削除
has_phosphate BOOLEAN,
bio_mode TEXT

-- 追加
has_bbp700 BOOLEAN,
has_ph BOOLEAN,
has_irradiance490 BOOLEAN,
has_par BOOLEAN,
doxy_mode TEXT,
chla_mode TEXT,
nitrate_mode TEXT,
bbp700_mode TEXT,
ph_mode TEXT,
irr490_mode TEXT,
par_mode TEXT
```

#### 2. `INSERT INTO argo (...) SELECT ...`

```sql
-- 削除
has_phosphate

-- 追加（INSERT カラムリストと SELECT リストの両方）
has_bbp700, has_ph, has_irradiance490, has_par,
ts_mode, doxy_mode, chla_mode, nitrate_mode,
bbp700_mode, ph_mode, irr490_mode, par_mode
```

#### 3. `ON CONFLICT DO UPDATE SET`

```sql
-- 削除
has_phosphate = EXCLUDED.has_phosphate

-- 追加
has_bbp700 = EXCLUDED.has_bbp700,
has_ph = EXCLUDED.has_ph,
has_irradiance490 = EXCLUDED.has_irradiance490,
has_par = EXCLUDED.has_par,
ts_mode = EXCLUDED.ts_mode,
doxy_mode = EXCLUDED.doxy_mode,
chla_mode = EXCLUDED.chla_mode,
nitrate_mode = EXCLUDED.nitrate_mode,
bbp700_mode = EXCLUDED.bbp700_mode,
ph_mode = EXCLUDED.ph_mode,
irr490_mode = EXCLUDED.irr490_mode,
par_mode = EXCLUDED.par_mode
```

---

## 変更不要なファイル

| ファイル | 理由 |
|---|---|
| `scripts/upload_argo.sh` | `object_key`（列 15）の位置は旧新で変わらないため影響なし |
| `scripts/upload_section.sh` | セクション JSON のアップロードのみ、メタデータ CSV に依存しない |
| `scripts/upsert_plan.sh` | `subscription_plans` テーブル向けで argo とは無関係 |

---

## 前提

- バックエンドリポジトリ側の `argo` テーブルへのマイグレーション（新列追加・`has_phosphate` 削除）は完了済み。

---

## 想定する新形式 CSV ヘッダー順

`\copy` は列順依存のため、以下のヘッダー順を前提とする。

```
wmo_id,cycle_number,date_utc,updated_at,latitude,longitude,min_pressure,max_pressure,mixed_layer_depth,mld_color,som_depth,som_value,som_depth_color,som_value_color,object_key,has_temperature,has_salinity,has_oxygen,has_chlorophyll,has_nitrate,has_bbp700,has_ph,has_irradiance490,has_par,ts_mode,doxy_mode,chla_mode,nitrate_mode,bbp700_mode,ph_mode,irr490_mode,par_mode
```

---

## 実施手順

1. `scripts/upsert_argo.sh` を上記の差分に従い修正
2. 新形式の CSV（`metadata.csv`）で `init` モードを使って動作確認
3. `add` モードで `diff_metadata.csv` が新形式で生成され、正常にインポートされることを確認
   - 改修後の初回 `add` 実行時は、旧形式の `diff_metadata.csv` が残っていないことを手動で確認すること
