# UI改修計画: add_all_bgc_for_ui

## 概要

バックエンド改修（`add_all_bgc_for_api`）に合わせてフロントエンド（Flutter）を改修する。

**主な目的:**
1. APIリクエスト・レスポンスの変更に追従する（`only_with_oxygen` → `only_with_bgc`、フィールド追加・削除）
2. `GraphType` 列挙型を表示対象 BGC パラメータに拡張する
3. パラメータ選択 UI を略称ボタン × tooltip 形式 の segment control に変更する
4. 鉛直断面図（Section Chart）を表示対象 BGC パラメータに対応させる
5. Filter Data の表示を `Only profiles with BGC` に変更する

**irradiance490（DOWN_IRRADIANCE490）の扱い:**
`has_irradiance490` / `irr490Mode` は `ArgoFloat` に、`irradiance490` データは `ArgoProfile` に保持するが、
UI（`GraphType`、パラメータ選択ボタン、断面図）には**表示しない**。将来の内部計算用途に備えてモデルに持たせるのみとする。

**方針:** 後方互換性は考慮しない。クリーンで理想的な設計を保つ。

---

## 新旧対照: バックエンド API

### `/v1/argo/search` レスポンス (`ArgoOut`)

| フィールド | 変更 |
|---|---|
| `has_phosphate` | **削除** |
| `has_bbp700` | **追加** (bool) |
| `has_ph` | **追加** (bool) |
| `has_irradiance490` | **追加** (bool) |
| `has_par` | **追加** (bool) |
| `ts_mode` | **追加** (str: `R`/`D`/`-`) |
| `doxy_mode` | **追加** (str) |
| `chla_mode` | **追加** (str) |
| `nitrate_mode` | **追加** (str) |
| `bbp700_mode` | **追加** (str) |
| `ph_mode` | **追加** (str) |
| `irr490_mode` | **追加** (str) |
| `par_mode` | **追加** (str) |

### `/v1/argo/search` クエリパラメータ

| パラメータ | 変更 |
|---|---|
| `only_with_oxygen` | → `only_with_bgc` にリネーム |

### プロファイル JSON（S3から直接取得: `/v1/argo/profile`）

| フィールド | 変更 |
|---|---|
| `oxygen` | 既存（変更なし） |
| `chlorophyll` | **追加** (List\<double?>) |
| `nitrate` | **追加** (List\<double?>) |
| `bbp700` | **追加** (List\<double?>) |
| `ph` | **追加** (List\<double?>) |
| `irradiance490` | **追加** (List\<double?>)、null含む（端部欠測） |
| `par` | **追加** (List\<double?>)、null含む（端部欠測） |

### section `availability.json`（S3から直接取得）

| フィールド | 変更 |
|---|---|
| `chlorophyll` | **追加** (bool) |
| `nitrate` | **追加** (bool) |
| `bbp700` | **追加** (bool) |
| `ph` | **追加** (bool) |
| `irradiance490` | **追加** (bool) |
| `par` | **追加** (bool) |

---

## 新 GraphType 仕様

`GraphType` enum に含めるのは UI に表示する 8 パラメータのみ。`irradiance490` は enum に含めない。

| enum 値 | ボタン表記 | tooltip |
|---|---|---|
| `temperature` | θ | Potential Temperature (°C) |
| `salinity` | S | Absolute Salinity (g/kg) |
| `oxygen` | DOXY | Dissolved Oxygen (μmol/kg) |
| `chlorophyll` | CHLA | Chlorophyll-a (mg m⁻³) |
| `nitrate` | NO3 | Nitrate (μmol/kg) |
| `bbp700` | BBP | Particle backscattering at 700 nm (m⁻¹) |
| `ph` | pH | pH (total scale, in situ) |
| `par` | PAR | Photosynthetically Active Radiation (μmol m⁻² s⁻¹) |

---

## 変更対象ファイル一覧

### 1. `lib/enums/graph_type_enum.dart`

**変更内容:** 3値 → 8値に拡張する（`irradiance490` は UI 非表示のため含めない）。

```dart
enum GraphType {
  temperature,
  salinity,
  oxygen,
  chlorophyll,
  nitrate,
  bbp700,
  ph,
  par,
}
```

この変更により波及する全 switch 文・if 文を確認・修正する（後述）。

---

### 2. `lib/models/argo_float.dart`

**変更内容:**
- `hasPhosphate` フィールドを削除
- 新フィールドを追加:
  - `hasBbp700`, `hasPh`, `hasIrradiance490`, `hasPar` (bool)
  - `tsMode`, `doxyMode`, `chlaMode`, `nitrateMode`, `bbp700Mode`, `phMode`, `irr490Mode`, `parMode` (String、デフォルト `"-"`)
- `constructor`, `copyWith`, `fromJson` をすべて更新する

```dart
// 追加フィールド（has系）
final bool hasBbp700;        // json: 'has_bbp700'
final bool hasPh;            // json: 'has_ph'
final bool hasIrradiance490; // json: 'has_irradiance490'（UI非表示、将来計算用）
final bool hasPar;           // json: 'has_par'

// 追加フィールド（mode系）
final String tsMode;         // json: 'ts_mode'
final String doxyMode;       // json: 'doxy_mode'
final String chlaMode;       // json: 'chla_mode'
final String nitrateMode;    // json: 'nitrate_mode'
final String bbp700Mode;     // json: 'bbp700_mode'
final String phMode;         // json: 'ph_mode'
final String irr490Mode;     // json: 'irr490_mode'（UI非表示、将来計算用）
final String parMode;        // json: 'par_mode'
```

`fromJson` では mode フィールドをフォールバック付きで読む:
```dart
tsMode: json['ts_mode'] as String? ?? '-',
// ... 他も同様
```

---

### 3. `lib/models/argo_profile.dart`

**変更内容:** BGC パラメータを追加する。`irradiance490` / `par` は null を含む可能性があるため `List<double?>` にする。

```dart
final List<double?> chlorophyll;   // json: 'chlorophyll'
final List<double?> nitrate;       // json: 'nitrate'
final List<double?> bbp700;        // json: 'bbp700'
final List<double?> ph;            // json: 'ph'
final List<double?> irradiance490; // json: 'irradiance490'（null含む、UI非表示・将来計算用）
final List<double?> par;           // json: 'par'（null含む）
```

> `oxygen` も null を含む可能性があるため `List<double?>` への統一を検討する。ただし、既存の chart 描画コードへの影響が大きいため、今回は既存の `oxygen`（`List<double>`）を維持し、新 BGC フィールドのみ `List<double?>` とする方針でよい。chart 描画側では null 値のスポットを除外するよう「null スキップ」処理を追加する。

`fromJson` の実装例:
```dart
static List<double?> parseNullableDoubleList(dynamic jsonArray) {
  return List<double?>.from(jsonArray.map((x) => x?.toDouble()));
}

chlorophyll: parseNullableDoubleList(json['chlorophyll'] ?? []),
```

**`toJson()` も同時に更新する。** 現行の `toJson()` は旧 4 配列しか出力しないため、`fromJson` だけ更新するとダウンロード機能（`download_profile.dart` が `profile.toJson()` を使用）の出力 JSON から新 BGC フィールドが欠落する。

```dart
// 変更前（4 フィールドのみ）
Map<String, dynamic> toJson() => {
  'pressure': pressure,
  'potential_temperature': temperature,
  'absolute_salinity': salinity,
  'oxygen': oxygen,
  if (wmoId != null) 'wmo_id': wmoId,
  if (cycleNumber != null) 'cycle_number': cycleNumber,
};

// 変更後（BGC フィールドを追加）
Map<String, dynamic> toJson() => {
  'pressure': pressure,
  'potential_temperature': temperature,
  'absolute_salinity': salinity,
  'oxygen': oxygen,
  if (chlorophyll.isNotEmpty) 'chlorophyll': chlorophyll,
  if (nitrate.isNotEmpty) 'nitrate': nitrate,
  if (bbp700.isNotEmpty) 'bbp700': bbp700,
  if (ph.isNotEmpty) 'ph': ph,
  if (irradiance490.isNotEmpty) 'irradiance490': irradiance490,
  if (par.isNotEmpty) 'par': par,
  if (wmoId != null) 'wmo_id': wmoId,
  if (cycleNumber != null) 'cycle_number': cycleNumber,
};
```

---

### 4. `lib/models/argo_section.dart`

**変更内容:** `ArgoSectionAvailability` に 6 フィールドを追加する。
`irradiance490` は SVG 生成側から提供されるフラグのため保持するが、UI での section 表示には使用しない。

```dart
class ArgoSectionAvailability {
  final bool temperature;
  final bool salinity;
  final bool oxygen;
  final bool chlorophyll;
  final bool nitrate;
  final bool bbp700;
  final bool ph;
  final bool irradiance490; // 保持のみ（UI非表示）
  final bool par;
}
```

`fromJson` も同様に更新する（デフォルト `false`）:
```dart
chlorophyll: json['chlorophyll'] == true,
// ... 他も同様
```

---

### 5. `lib/models/saved_search_condition.dart`

**変更内容:**
- `onlyWithOxygen` → `onlyWithBgc` にリネーム
- `toCreateJson()` の `'only_with_oxygen'` → `'only_with_bgc'` にリネーム
- `fromJson()` の `json['only_with_oxygen']` → `json['only_with_bgc']` にリネーム
- `copyWith()` のパラメータも同様に更新

---

### 6. `lib/providers/search/only_with_oxygen.dart`

**変更内容:** ファイルごとリネーム・内容更新。

- ファイル名: `only_with_oxygen.dart` → `only_with_bgc.dart`
- Provider 名: `onlyWithOxygenProvider` → `onlyWithBgcProvider`

```dart
final onlyWithBgcProvider = NotifierProvider<BooleanNotifier, bool>(
  () => BooleanNotifier(),
);
```

---

### 7. `lib/repositories/argo_repository.dart`

**変更内容:**
- クエリパラメータ名 `only_with_oxygen` → `only_with_bgc` にリネーム
- `fetchFloats()` の引数 `onlyWithOxygen` → `onlyWithBgc` にリネーム（query map のキーも変更）

変更前:
```dart
final queryParametersOnlyWithOxygen =
    'only_with_oxygen=${query['onlyWithOxygen'] ?? false}';
```

変更後:
```dart
final queryParametersOnlyWithBgc =
    'only_with_bgc=${query['onlyWithBgc'] ?? false}';
```

---

### 8. `lib/repositories/argo_section_repository.dart`

**変更内容:**
- `filenameForType()` を 8 値に拡張する（`irradiance490` は `GraphType` に存在しないため不要）

```dart
static String filenameForType(GraphType type) {
  return switch (type) {
    GraphType.temperature => 'temperature.svg',
    GraphType.salinity    => 'salinity.svg',
    GraphType.oxygen      => 'oxygen.svg',
    GraphType.chlorophyll => 'chlorophyll.svg',
    GraphType.nitrate     => 'nitrate.svg',
    GraphType.bbp700      => 'bbp700.svg',
    GraphType.ph          => 'ph.svg',
    GraphType.par         => 'par.svg',
  };
}
```

- `fetchAllSvgs()` を全 8 タイプに対応させる（`Future.wait` で並列取得）

---

### 9. `lib/providers/argo/argo_provider.dart`

**変更内容:**
- `fetchBySearch()` の引数 `onlyWithOxygen` → `onlyWithBgc` にリネーム
- `buildQuery()` 内のキー `'onlyWithOxygen'` → `'onlyWithBgc'` にリネーム

---

### 10. `lib/widgets/saved_cards/search/saved_search_actions.dart`

**変更内容（`only_with_bgc` リネームの追従）:**
- `only_with_oxygen.dart` のインポートを `only_with_bgc.dart` に更新
- `condition.onlyWithOxygen` → `condition.onlyWithBgc` にリネーム
- `onlyWithOxygenProvider` → `onlyWithBgcProvider` にリネーム（`set()` 呼び出しも含む）

```dart
// 変更前
onlyWithOxygen: condition.onlyWithOxygen,
...
ref.read(onlyWithOxygenProvider.notifier).set(condition.onlyWithOxygen);

// 変更後
onlyWithBgc: condition.onlyWithBgc,
...
ref.read(onlyWithBgcProvider.notifier).set(condition.onlyWithBgc);
```

---

### 11. `lib/pages/home/components/search/actions/search_panel_saved_search_actions.dart`

**変更内容（`only_with_bgc` リネームの追従）:**
- `only_with_oxygen.dart` のインポートを `only_with_bgc.dart` に更新
- `ref.read(onlyWithOxygenProvider)` → `ref.read(onlyWithBgcProvider)` にリネーム
- `SavedSearchCondition(onlyWithOxygen: onlyWithOxygen, ...)` → `SavedSearchCondition(onlyWithBgc: onlyWithBgc, ...)` にリネーム

---

### 12. `lib/pages/home/home_page.dart`（初回検索）

**変更内容（`only_with_bgc` リネームの追従）:**
- `fetchBySearch()` の引数 `onlyWithOxygen: false`（ハードコード）→ `onlyWithBgc: false` にリネーム

```dart
// 変更前
onlyWithOxygen: false, // 初期検索では酸素の有無は考慮しない

// 変更後
onlyWithBgc: false, // 初期検索では BGC の有無は考慮しない
```

---

### 13. `lib/providers/argo/argo_section_chart_provider.dart`

**変更内容:**
- `selectedSectionTypeProvider` の初期値は `GraphType.temperature` のまま変更不要
- ただし、`GraphType.values[index]` でアクセスしている箇所があれば enum の順序変更に注意（変更なし）

---

### 14. `lib/providers/ui/ui_state_provider.dart`

**変更内容:**
- `selectedGraphTypeProvider` の初期値は `GraphType.temperature` のまま変更不要
- ただし `GraphType.values[index]` を使用している箇所は enum 追加後も正しく動くことを確認する

---

### 15. `lib/providers/argo/argo_section_notifier.dart`

**変更内容:** `ArgoSectionState` に 8 フィールドを追加し、`copyWithCachedSvg()` も全フィールドを含む形で更新する。

```dart
class ArgoSectionState {
  final String wmoId;
  final bool hasTemperature;
  final bool hasSalinity;
  final bool hasOxygen;
  final bool hasChlorophyll; // 追加
  final bool hasNitrate;     // 追加
  final bool hasBbp700;      // 追加
  final bool hasPh;          // 追加
  final bool hasPar;         // 追加
  final int minCycleNumber;
  final int maxCycleNumber;
  final Map<GraphType, String?> svgCache;
  ...
}
```

`ArgoSectionNotifier.loadSection()` 内で `ArgoSectionAvailability` の新フィールドを読み取って `ArgoSectionState` に渡す:

```dart
ArgoSectionState(
  ...
  hasChlorophyll: availability.chlorophyll,
  hasNitrate: availability.nitrate,
  hasBbp700: availability.bbp700,
  hasPh: availability.ph,
  hasPar: availability.par,
  ...
)
```

`copyWithCachedSvg()` は全フィールドを含む形で再定義する（フィールド追加後にコンパイルエラーが出るため）。

---

### 16. `lib/widgets/graph_type_selector.dart`

**変更内容:** ハードコードされた 3 要素のラベル・tooltip を動的に削除し、設定を外部から受け取る構造に変更する。

#### 変更方針

現状は `labels` と `tooltips` がウィジェット内にハードコードされている。
8 パラメータに対応するため、**設定を外部から受け取る**方式に変更する。

```dart
class GraphTypeSelector extends StatelessWidget {
  final int selectedIndex;
  final void Function(int index) onPressed;
  final List<String> labels;       // 追加: ボタン表記（略称）
  final List<String> tooltips;     // 追加: tooltip 文字列
  final List<bool> enabledList;
  final bool useFixedWidth;
  final double? fixedWidth;
  final MainAxisSize mainAxisSize;

  const GraphTypeSelector({
    required this.selectedIndex,
    required this.onPressed,
    required this.labels,
    required this.tooltips,
    super.key,
    this.enabledList = const [],
    this.useFixedWidth = false,
    this.fixedWidth = 100.0,
    this.mainAxisSize = MainAxisSize.max,
  });
```

ボタンサイズは `labels` の要素数に合わせて自動的にスケールする。

#### ラベル・tooltip の定義場所

`GraphType` 拡張メソッドとして定義し、一元管理する:

```dart
// lib/enums/graph_type_enum.dart に追加
extension GraphTypeDisplay on GraphType {
  String get label => switch (this) {
    GraphType.temperature => 'θ',
    GraphType.salinity    => 'S',
    GraphType.oxygen      => 'DOXY',
    GraphType.chlorophyll => 'CHLA',
    GraphType.nitrate     => 'NO3',
    GraphType.bbp700      => 'BBP',
    GraphType.ph          => 'pH',
    GraphType.par         => 'PAR',
  };

  String get tooltip => switch (this) {
    GraphType.temperature => 'Potential Temperature (°C)',
    GraphType.salinity    => 'Absolute Salinity (g/kg)',
    GraphType.oxygen      => 'Dissolved Oxygen (μmol/kg)',
    GraphType.chlorophyll => 'Chlorophyll-a (mg m⁻³)',
    GraphType.nitrate     => 'Nitrate (μmol/kg)',
    GraphType.bbp700      => 'Particle backscattering at 700 nm (m⁻¹)',
    GraphType.ph          => 'pH (total scale, in situ)',
    GraphType.par         => 'Photosynthetically Active Radiation (μmol m⁻² s⁻¹)',
  };
}
```

---

### 17. `lib/widgets/argo_section_selector.dart`

**変更内容:**
- `enabledList` を 8 要素（`GraphType.values`）に対応させる
- `section` は `argoSectionDataProvider` が返す `ArgoSectionState?` 型であることに注意（`ArgoSectionAvailability` ではない）。§15 で `ArgoSectionState` に `hasChlorophyll` 等を追加した後、`section?.hasXxx` の形でアクセスする
- `fixedWidth: 100.0` → 8 ボタン配置に合わせて縮小する（目安: `80.0`、実際のレイアウトに合わせて調整）

```dart
final enabledList = GraphType.values.map((type) {
  return switch (type) {
    GraphType.temperature => section?.hasTemperature == true,
    GraphType.salinity    => section?.hasSalinity == true,
    GraphType.oxygen      => section?.hasOxygen == true,
    GraphType.chlorophyll => section?.hasChlorophyll == true,
    GraphType.nitrate     => section?.hasNitrate == true,
    GraphType.bbp700      => section?.hasBbp700 == true,
    GraphType.ph          => section?.hasPh == true,
    GraphType.par         => section?.hasPar == true,
  };
}).toList();
```

`GraphTypeSelector` には `labels` / `tooltips` を渡し、`fixedWidth` を縮小する:
```dart
return GraphTypeSelector(
  selectedIndex: selectedIndex,
  labels: GraphType.values.map((t) => t.label).toList(),
  tooltips: GraphType.values.map((t) => t.tooltip).toList(),
  onPressed: (index) {
    ref.read(selectedSectionTypeProvider.notifier).set(GraphType.values[index]);
  },
  enabledList: enabledList,
  useFixedWidth: true,
  fixedWidth: 80.0, // 100.0 から縮小。8 ボタン配置に合わせて調整
  mainAxisSize: MainAxisSize.min,
);
```

---

### 18. `lib/widgets/argo_section_chart.dart`

**変更内容:** `GraphType` の switch 文（無効値フォールバック）を 8 case に拡張する。

現状は 3 case 固定の switch で選択中 `graphType` が対象フロートで有効かを判定し、無効ならば `GraphType.temperature` に戻している。5 つの新 case が exhaustive でないとコンパイルエラーになるため、全 case を明示的に記述する:

```dart
// 変更前（3 case 固定）
final isValid = switch (graphType) {
  GraphType.temperature => section.hasTemperature,
  GraphType.salinity    => section.hasSalinity,
  GraphType.oxygen      => section.hasOxygen,
};

// 変更後（8 case）
final isValid = switch (graphType) {
  GraphType.temperature => section.hasTemperature,
  GraphType.salinity    => section.hasSalinity,
  GraphType.oxygen      => section.hasOxygen,
  GraphType.chlorophyll => section.hasChlorophyll,
  GraphType.nitrate     => section.hasNitrate,
  GraphType.bbp700      => section.hasBbp700,
  GraphType.ph          => section.hasPh,
  GraphType.par         => section.hasPar,
};
```

---

### 19. `lib/pages/home/components/graph/graph_panel.dart`

**変更内容:**
- `GraphTypeSelector` に `labels` / `tooltips` を渡す
- `enabledList` を 8 タイプに拡張する（`irradiance490` は UI 非表示のため含めない）

```dart
GraphTypeSelector(
  selectedIndex: GraphType.values.indexOf(selectedGraphType),
  labels: GraphType.values.map((t) => t.label).toList(),
  tooltips: GraphType.values.map((t) => t.tooltip).toList(),
  onPressed: (index) {
    ref.read(selectedGraphTypeProvider.notifier).set(GraphType.values[index]);
  },
  enabledList: [
    selectedFloat?.hasTemperature ?? false,
    selectedFloat?.hasSalinity ?? false,
    selectedFloat?.hasOxygen ?? false,
    selectedFloat?.hasChlorophyll ?? false,
    selectedFloat?.hasNitrate ?? false,
    selectedFloat?.hasBbp700 ?? false,
    selectedFloat?.hasPh ?? false,
    selectedFloat?.hasPar ?? false,
  ],
),
```

また、`_buildSpots()` 内の `GraphType` switch 文に新 case を追加する（`chlorophyll`, `nitrate`, `bbp700`, `ph`, `par` → `profile.chlorophyll` 等から `FlSpot` を生成、null をスキップ）。

`_buildChart()` 内の `minX`/`maxX` 算出は現状 3 値の三項演算子チェインになっているため、switch 式に書き直して 8 case を追加する（§20 参照）。

---
### 19a. `lib/pages/home/components/map/map_widget_state.dart`

**変更内容:** フロート切替時の `enabledList` ガードを 8 要素に拡張する。

現状は `selectedFloat` の `hasTemperature/hasSalinity/hasOxygen` の 3 要素リストで `enabledList[currentGraphType.index]` を評価しているため、`GraphType` が 8 値に増えると BGC 系（index 3〜7）を選択したまま別フロートへ切り替えた瞬間に `RangeError` が発生する。

```dart
// 変更前（3 要素固定）
final enabledList = [
  selected.hasTemperature,
  selected.hasSalinity,
  selected.hasOxygen,
];

// 変更後（8 要素、GraphType.values 順と一致させる）
final enabledList = [
  selected.hasTemperature,
  selected.hasSalinity,
  selected.hasOxygen,
  selected.hasChlorophyll,
  selected.hasNitrate,
  selected.hasBbp700,
  selected.hasPh,
  selected.hasPar,
];
```

または `GraphType.values` を map して `switch` で分岐する方式に統一しても良い（`graph_panel.dart` と一貫性を持たせる）。

---
### 20. `lib/utils/chart/chart_axis_constants.dart` および軸設定依存ファイル

**変更内容:** BGC 5 パラメータ分の軸定数を追加し、各 chart ファイルの switch 分岐を拡張する。

#### `chart_axis_constants.dart`（定数追加）

```dart
// 追加: BGC パラメータ軸設定（初期値は目安、実データを確認して調整すること）
static const double chlorophyllStep = 0.1;
static const double chlorophyllMin = 0.0;
static const double chlorophyllMax = 1.0;
static const double chlorophyllGridInterval = 0.1;

static const double nitrateStep = 5.0;
static const double nitrateMin = 0.0;
static const double nitrateMax = 50.0;
static const double nitrateGridInterval = 5.0;

static const double bbp700Step = 0.001;
static const double bbp700Min = 0.0;
static const double bbp700Max = 0.01;
static const double bbp700GridInterval = 0.001;

static const double phStep = 0.1;
static const double phMin = 7.5;
static const double phMax = 8.5;
static const double phGridInterval = 0.1;

static const double parStep = 50.0;
static const double parMin = 0.0;
static const double parMax = 500.0;
static const double parGridInterval = 50.0;
```

#### 軸設定依存ファイル（switch 文の追加が必要）

| ファイル | 変更箇所 |
|---|---|
| `lib/pages/home/components/graph/graph_panel.dart` | `_buildChart()` の `minX`/`maxX` 三項演算子チェインを switch 式に書き直し、BGC 5 case 追加 |
| `lib/pages/vertical_profiles/components/vertical_profile_chart.dart` | switch 文に BGC 5 case 追加（`adjustedMinX`/`adjustedMaxX` の計算） |
| `lib/pages/vertical_profiles/components/vertical_profile_chart_list.dart` | switch 文に BGC 5 case 追加（`FlSpot` 生成） |

---

### 21. `lib/pages/vertical_profiles/vertical_profiles.dart`

**変更内容:**
- 固定 3 列 → 動的 8 列に変更する
- すべての `GraphType` に対して `VerticalProfileColumn` を生成する（`irradiance490` は含めない）

8 列は横スクロール対応が必須。`Row` + `Expanded` にすると Upload パネル (320px) を除いた残り幅を 8 等分することになり、1 列あたり約 140px しか確保できず軸ラベル・タイトルが潰れる。グラフエリアを `SingleChildScrollView(scrollDirection: Axis.horizontal)` で囲み、各列は `SizedBox(width: 200)` 等の固定幅にする。

列ヘッダは短い表記と単位のみとする（例: `'θ (°C)'`）。`type.tooltip` の長い文言をそのままヘッダに入れると 200px 幅で複数行折り返しが発生し、列ごとにヘッダ高さがズレてグラフの比較がしづらくなる。詳細説明は tooltip のまま残す。

```dart
// chartKeys を全GraphTypeに対応させる
final chartKeys = {
  for (final type in GraphType.values)
    type: GlobalKey(),
};

// グラフエリアを横スクロール可能にし、各列は固定幅で並べる
SingleChildScrollView(
  scrollDirection: Axis.horizontal,
  child: Row(
    children: GraphType.values.map((type) => SizedBox(
      width: 200,
      child: VerticalProfileColumn(
        chartKey: chartKeys[type]!,
        title: type.columnTitle, // 短い表記 + 単位のみ（例: 'θ (°C)'）
        graphType: type,
      ),
    )).toList(),
  ),
)
```

`columnTitle` は `GraphType` の拡張メソッドとして定義し、一元管理する（`label` / `tooltip` と同様に `graph_type_enum.dart` に追加）:

```dart
String get columnTitle => switch (this) {
  GraphType.temperature => 'θ (°C)',
  GraphType.salinity    => 'SA (g/kg)',
  GraphType.oxygen      => 'DOXY (μmol/kg)',
  GraphType.chlorophyll => 'CHLA (mg m⁻³)',
  GraphType.nitrate     => 'NO3 (μmol/kg)',
  GraphType.bbp700      => 'BBP (m⁻¹)',
  GraphType.ph          => 'pH',
  GraphType.par         => 'PAR (μmol m⁻² s⁻¹)',
};
```

---

### 22. `lib/pages/vertical_profiles/components/vertical_profile_column.dart`

**変更内容:**
- `switch (graphType)` に新 case を追加する

> **注意: `whereType<double>()` による null 除去は使用しない。**
> 現行の描画コードは `x[i]` と `pressure[i]` を同じ index で対にしている。
> `whereType<double>()` で BGC リストを圧縮すると x の長さが pressure より短くなり、
> 異なる深度の値を結ぶ座標ズレが発生する。

`temperature` / `salinity` は `List<double>` のまま従来通り。BGC パラメータ（`List<double?>`）は `(pressure, value)` ペアで走査し、`value == null` の点だけスキップして `FlSpot` を生成する:

```dart
// temperature / salinity: 従来通り List<double> を x に代入
final List<double> x;
switch (graphType) {
  case GraphType.temperature:
    x = profile.temperature;
    // ... 深度対応スポット生成（既存通り）
    break;
  case GraphType.salinity:
    x = profile.salinity;
    break;
  default:
    break; // BGC は下記のペア走査ルートへ
}

// BGC パラメータ: pressure と value を index で対応づけ、null をスキップ
List<double?> getBgcData(GraphType type, ArgoProfile profile) {
  return switch (type) {
    GraphType.oxygen      => profile.oxygen.cast<double?>(),
    GraphType.chlorophyll => profile.chlorophyll,
    GraphType.nitrate     => profile.nitrate,
    GraphType.bbp700      => profile.bbp700,
    GraphType.ph          => profile.ph,
    GraphType.par         => profile.par,
    _ => [],
  };
}

final bgcData = getBgcData(graphType, profile);
final spots = <FlSpot>[];
final length = min(bgcData.length, profile.pressure.length);
for (int i = 0; i < length; i++) {
  final val = bgcData[i];
  if (val != null) {
    spots.add(FlSpot(
      val,
      (ChartAxisConstants.depthMax - profile.pressure[i]).toDouble(),
    ));
  }
}
```

同様のペア走査パターンを `vertical_profile_chart_list.dart` および `graph_panel.dart` の `_buildSpots()` にも適用する（§20 参照）。

---

### 23. `lib/pages/home/components/search/search_options_panel.dart`

**変更内容:**
- `onlyWithOxygenProvider` → `onlyWithBgcProvider` に変更
- 表示テキスト: `'Only profiles with DO :'` → `'Only profiles with BGC :'`
- tooltip: `'Search only profiles with dissolved oxygen data.'` → `'Search only profiles with at least one BGC parameter (DOXY, CHLA, NO3, BBP, pH, PAR).'`
- `fetchBySearch()` の引数 `onlyWithOxygen` → `onlyWithBgc` に変更

---

### 24. `lib/widgets/saved_cards/search/saved_search_details_table.dart`

**変更内容:**
- テーブルラベル: `'DO Only'` → `'BGC Only'`
- 表示値: `condition.onlyWithOxygen` → `condition.onlyWithBgc`
- tooltip: `'Only include profiles with dissolved oxygen (DO) data.'` → `'Only include profiles with at least one BGC parameter.'`

---

### 25. `lib/providers/argo/argo_cache_provider.dart`

**変更内容:** `get()` メソッドが `ArgoProfile` のコピーを返す際、BGC フィールドも含めてコピーする。

現状は `pressure`, `temperature`, `salinity`, `oxygen` の 4 配列しか複製しておらず、キャッシュヒット時に BGC データが失われる:

```dart
// 変更前（4 配列のみ）
return ArgoProfile(
  pressure: List<double>.from(profile.pressure),
  temperature: List<double>.from(profile.temperature),
  salinity: List<double>.from(profile.salinity),
  oxygen: List<double>.from(profile.oxygen),
  wmoId: profile.wmoId,
  cycleNumber: profile.cycleNumber,
);

// 変更後（BGC フィールドを追加）
return ArgoProfile(
  pressure: List<double>.from(profile.pressure),
  temperature: List<double>.from(profile.temperature),
  salinity: List<double>.from(profile.salinity),
  oxygen: List<double>.from(profile.oxygen),
  chlorophyll: List<double?>.from(profile.chlorophyll),
  nitrate: List<double?>.from(profile.nitrate),
  bbp700: List<double?>.from(profile.bbp700),
  ph: List<double?>.from(profile.ph),
  irradiance490: List<double?>.from(profile.irradiance490), // 保持のみ
  par: List<double?>.from(profile.par),
  wmoId: profile.wmoId,
  cycleNumber: profile.cycleNumber,
);
```

---

### 26. アップロード関連ファイル

アップロード機能（Vertical Profiles ページのファイル読み込み）は BGC パラメータをオプションとして扱う。バリデーションでは必須としないが、存在する場合は正しくパース・長さ検証を行う。

#### `lib/utils/validation/profile_validator.dart`

**変更内容:**
- `isValidDataLength()` の引数型を `List<double>` → `List` に変更（または `List<double?>` オーバーロードを追加）し、BGC フィールドの長さ検証にも対応する
- `oxygen` の必須チェックは維持。BGC フィールド（`chlorophyll` 等）はキーが存在する場合のみ長さチェック対象とする

#### `lib/pages/vertical_profiles/components/upload/upload_file_processor.dart`

**変更内容:** JSON に BGC フィールドが含まれている場合のみパースし、`ArgoProfile` に渡す。

```dart
final chlorophyll = json.containsKey('chlorophyll')
    ? ArgoProfile.parseNullableDoubleList(json['chlorophyll'])
    : <double?>[];
// ... 他の BGC フィールドも同様（nitrate, bbp700, ph, irradiance490, par）

// 長さ検証（存在する場合のみ）
if (chlorophyll.isNotEmpty &&
    !ProfileValidator.isValidDataLength(chlorophyll, pressure.length)) {
  return null;
}
```

#### `lib/pages/vertical_profiles/components/upload/uploaded_file_preview.dart`

**変更内容:** tooltip テキストに BGC フィールドがオプションである旨を追記する。

```dart
// 追記
'  - Optional BGC keys: "chlorophyll", "nitrate", "bbp700", "ph", "irradiance490", "par"\n'
'    (array of numbers or nulls, must match "pressure" length if provided)\n'
```

> `irradiance490` はモデルに保持するだけで UI には表示しないが、アップロードされたファイルにデータが含まれる場合はパースして `ArgoProfile` に格納する。そのため tooltip にも列挙し、入力仕様として明示する。

---

## テスト修正

### `test/helpers/mock_data.dart`

- `hasPhosphate` 削除
- `hasBbp700`, `hasPh`, `hasIrradiance490`, `hasPar` を追加（デフォルト `false`）
- mode 系フィールドを追加（デフォルト `'-'`）
- BGC プロファイルフィールド（`chlorophyll` 等）の空リストをデフォルト追加

### `test/repositories/argo_section_repository_test.dart`（既存ファイルに追記）

- `filenameForType` のテストに 5 case を追加（`irradiance490` は `GraphType` に含まれないため除外）:
  ```dart
  expect(ArgoSectionRepository.filenameForType(GraphType.chlorophyll), 'chlorophyll.svg');
  expect(ArgoSectionRepository.filenameForType(GraphType.nitrate), 'nitrate.svg');
  expect(ArgoSectionRepository.filenameForType(GraphType.bbp700), 'bbp700.svg');
  expect(ArgoSectionRepository.filenameForType(GraphType.ph), 'ph.svg');
  expect(ArgoSectionRepository.filenameForType(GraphType.par), 'par.svg');
  ```

### `test/providers/argo/argo_provider_test.dart`

- `MockData.createArgoFloat()` の引数変更に追従する（`hasPhosphate` 除去）

### `test/pages/home/components/graph/graph_panel_test.dart`

- `enabledList` が 8 要素になったことへの追従

### `test/providers/argo/argo_section_notifier_test.dart`（新規または既存拡張）

- `ArgoSectionNotifier.loadSection()` を呼び出したとき、`ArgoSectionState` の新フィールド（`hasChlorophyll`, `hasNitrate`, `hasBbp700`, `hasPh`, `hasPar`）が `ArgoSectionAvailability` の値に従って正しく設定されることを確認
- 既存の `test/repositories/argo_section_repository_test.dart` とは別ファイルにする（repository の単体テストと notifier の結合テストは責務が異なる）

### `test/widgets/saved_cards/saved_cards_integration_test.dart`

- `SavedSearchCondition(onlyWithOxygen: true, ...)` を `onlyWithBgc: true` にリネーム（line 115 付近）

### `test/utils/state/state_cleanup_test.dart`

- `MockData.createArgoFloat(hasPhosphate: false, ...)` を BGC フィールドのリネームに追従させる（`hasPhosphate` 除去、新フィールド追加。line 33 付近）

---

## 実装順序（推奨）

依存関係の順に実装することで、コンパイルエラーを最小化する。

| # | 対象 | 理由 |
|---|---|---|
| 1 | `lib/enums/graph_type_enum.dart` + 拡張メソッド | 他全ファイルが依存する |
| 2 | `lib/models/argo_float.dart` | repository/provider が依存 |
| 3 | `lib/models/argo_profile.dart` | column/chart/cache が依存 |
| 4 | `lib/models/argo_section.dart` | section notifier が依存 |
| 5 | `lib/models/saved_search_condition.dart` | saved_search 系が依存 |
| 6 | `lib/providers/search/only_with_oxygen.dart` → `only_with_bgc.dart` | search panel 他 3 ファイルが依存 |
| 7 | `lib/repositories/argo_repository.dart` | provider が依存 |
| 8 | `lib/repositories/argo_section_repository.dart` | section notifier が依存 |
| 9 | `lib/providers/argo/argo_provider.dart` | 各ページが依存 |
| 10 | `lib/widgets/saved_cards/search/saved_search_actions.dart` | §6 の provider 変更に依存 |
| 11 | `lib/pages/home/components/search/actions/search_panel_saved_search_actions.dart` | §6 の provider 変更に依存 |
| 12 | `lib/pages/home/home_page.dart` | §9 の引数変更に依存 |
| 13 | `lib/utils/chart/chart_axis_constants.dart` | chart ファイルが依存 |
| 14 | `lib/widgets/graph_type_selector.dart` | graph_panel, section_selector が依存 |
| 15 | `lib/providers/argo/argo_section_notifier.dart` | section_selector, section_chart が依存 |
| 16 | `lib/widgets/argo_section_selector.dart` | section ページが依存 |
| 17 | `lib/widgets/argo_section_chart.dart` | |
| 18 | `lib/pages/home/components/graph/graph_panel.dart` | |
| 18a | `lib/pages/home/components/map/map_widget_state.dart` | §18 の `GraphType` 拡張に依存 |
| 19 | `lib/pages/vertical_profiles/components/vertical_profile_chart.dart` | |
| 20 | `lib/pages/vertical_profiles/components/vertical_profile_chart_list.dart` | |
| 21 | `lib/pages/vertical_profiles/vertical_profiles.dart` | |
| 22 | `lib/pages/vertical_profiles/components/vertical_profile_column.dart` | |
| 23 | `lib/utils/validation/profile_validator.dart` | |
| 24 | `lib/pages/vertical_profiles/components/upload/upload_file_processor.dart` | |
| 25 | `lib/pages/vertical_profiles/components/upload/uploaded_file_preview.dart` | |
| 26 | `lib/providers/argo/argo_cache_provider.dart` | |
| 27 | `lib/pages/home/components/search/search_options_panel.dart` | |
| 28 | `lib/widgets/saved_cards/search/saved_search_details_table.dart` | |
| 29 | テスト修正（`saved_cards_integration_test.dart`, `state_cleanup_test.dart` 含む） | |

---

## 変更対象ファイルまとめ

| ファイル | 変更の種類 |
|---|---|
| `lib/enums/graph_type_enum.dart` | 値追加（8値）、拡張メソッド追加 |
| `lib/models/argo_float.dart` | `hasPhosphate` 削除、BGC 4 フィールド・mode 8 フィールド追加 |
| `lib/models/argo_profile.dart` | BGC 6 フィールド追加（`List<double?>`）、`fromJson`・`toJson` 両方更新 |
| `lib/models/argo_section.dart` | `ArgoSectionAvailability` に 6 フラグ追加 |
| `lib/models/saved_search_condition.dart` | `onlyWithOxygen` → `onlyWithBgc` リネーム |
| `lib/providers/search/only_with_oxygen.dart` | ファイルリネーム、provider リネーム |
| `lib/repositories/argo_repository.dart` | `only_with_bgc` クエリパラメータ対応 |
| `lib/repositories/argo_section_repository.dart` | 8 タイプ対応（irradiance490 除く） |
| `lib/providers/argo/argo_provider.dart` | `onlyWithBgc` 引数リネーム |
| `lib/widgets/saved_cards/search/saved_search_actions.dart` | `onlyWithBgc` リネーム追従 |
| `lib/pages/home/components/search/actions/search_panel_saved_search_actions.dart` | `onlyWithBgc` リネーム追従 |
| `lib/pages/home/home_page.dart` | 初回検索引数 `onlyWithBgc: false` に変更 |
| `lib/utils/chart/chart_axis_constants.dart` | BGC 5 パラメータ分の定数追加 |
| `lib/widgets/graph_type_selector.dart` | labels/tooltips を外部受け取りに変更 |
| `lib/providers/argo/argo_section_notifier.dart` | `ArgoSectionState` に 5 フィールド追加、`copyWithCachedSvg` 更新 |
| `lib/widgets/argo_section_selector.dart` | `ArgoSectionState` フィールド参照修正、`fixedWidth` 縮小 |
| `lib/widgets/argo_section_chart.dart` | switch 文（無効値フォールバック）を 8 case に拡張 |
| `lib/pages/home/components/graph/graph_panel.dart` | 8 タイプ対応、`_buildChart()` axis switch 拡張 |
| `lib/pages/home/components/map/map_widget_state.dart` | `enabledList` を 8 要素に拡張（`RangeError` 防止） |
| `lib/pages/vertical_profiles/components/vertical_profile_chart.dart` | switch 文に 5 case 追加（軸計算） |
| `lib/pages/vertical_profiles/components/vertical_profile_chart_list.dart` | switch 文に 5 case 追加（FlSpot 生成） |
| `lib/pages/vertical_profiles/vertical_profiles.dart` | 3 列 → 8 列（横スクロール対応） |
| `lib/pages/vertical_profiles/components/vertical_profile_column.dart` | BGC null 対応（ペア走査）、switch 5 case 追加 |
| `lib/utils/validation/profile_validator.dart` | BGC フィールドのオプション長さ検証対応 |
| `lib/pages/vertical_profiles/components/upload/upload_file_processor.dart` | BGC フィールドのオプションパース追加 |
| `lib/pages/vertical_profiles/components/upload/uploaded_file_preview.dart` | tooltip に BGC オプションフィールド追記 |
| `lib/providers/argo/argo_cache_provider.dart` | BGC フィールドのコピー追加 |
| `lib/pages/home/components/search/search_options_panel.dart` | BGC 表示・provider 変更 |
| `lib/widgets/saved_cards/search/saved_search_details_table.dart` | BGC 表示変更 |
| `test/helpers/mock_data.dart` | フィールド追加・削除 |
| `test/repositories/argo_section_repository_test.dart` | 5 case 追加 |
| `test/providers/argo/argo_section_notifier_test.dart` | 新規: `loadSection()` で BGC フィールドが正しく設定されることを確認 |
| `test/providers/argo/argo_provider_test.dart` | mock 修正 |
| `test/pages/home/components/graph/graph_panel_test.dart` | enabledList 修正 |
| `test/widgets/saved_cards/saved_cards_integration_test.dart` | `onlyWithOxygen` → `onlyWithBgc` リネーム |
| `test/utils/state/state_cleanup_test.dart` | `hasPhosphate` 除去・新フィールド追従 |

---

## 検討事項・未決事項

### mode フィールドの UI 活用

`ts_mode`, `doxy_mode` 等のモードフィールド (`R`/`D`/`-`) はデータ品質の指標であり、
将来的に凡例表示やマーカー色分けへ活用できる。本タスクでは `ArgoFloat` に保持するだけに留め、
UI への表示は後続タスクとする。
