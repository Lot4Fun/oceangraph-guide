# Vertical Profilesページ改修計画

## 背景・課題

| # | 課題 | 現状 |
|---|------|------|
| 1 | ページ全体が左詰めで、ブラウザ幅を広げると右側に余白が出る | グラフ群が固定幅でレンダリングされている |
| 2 | グラフ1枚あたりの横幅が狭い | `SizedBox(width: 200)` の固定値 |
| 3 | 横スクロールの存在に気づきにくい | `SingleChildScrollView` にスクロールバーが表示されない |

---

## 改修タスク

### Task 1: グラフ幅の可変対応とスクロールバー表示

**対象ファイル:** `lib/pages/vertical_profiles/vertical_profiles.dart`

**変更内容:**

グラフ群を `LayoutBuilder` でラップし、利用可能幅に応じてグラフ幅を動的に決定する。
また `SingleChildScrollView` を `Scrollbar` でラップしてスクロールバーを常時表示する。

```
// 変更前
Expanded(
  child: SingleChildScrollView(
    scrollDirection: Axis.horizontal,
    child: Row(
      children: List.generate(GraphType.values.length, (index) {
        ...
        child: SizedBox(
          width: 200,
          child: VerticalProfileColumn(...),
        ),
      }),
    ),
  ),
),

// 変更後
Expanded(
  child: LayoutBuilder(
    builder: (context, constraints) {
      const double minChartWidth = 200.0;
      const double columnGap = 8.0;
      final chartCount = GraphType.values.length;
      final totalGap = columnGap * (chartCount - 1);
      // ギャップ分を差し引いてから1列幅を計算し、最低幅で切り上げる
      final chartWidth = ((constraints.maxWidth - totalGap) / chartCount)
          .clamp(minChartWidth, double.infinity)
          .toDouble();
      // ギャップを含めた合計幅が利用可能幅を超えるかどうかでスクロール要否を判定
      final needsScroll = chartWidth * chartCount + totalGap > constraints.maxWidth;

      final row = Row(
        children: List.generate(chartCount, (index) {
          final type = GraphType.values[index];
          return Padding(
            padding: EdgeInsets.only(
              right: index == chartCount - 1 ? 0 : columnGap,
            ),
            child: SizedBox(
              width: chartWidth,
              child: VerticalProfileColumn(...),
            ),
          );
        }),
      );

      return Scrollbar(
        controller: _scrollController,
        thumbVisibility: needsScroll,   // スクロール不要なら非表示
        child: SingleChildScrollView(
          controller: _scrollController,
          scrollDirection: Axis.horizontal,
          child: row,
        ),
      );
    },
  ),
),
```

**挙動:**
- ブラウザ幅が十分広い場合：グラフが均等幅で画面いっぱいに広がる（余白なし）。
- ブラウザ幅が狭く `minChartWidth × chartCount + totalGap` が利用可能幅を超える場合：横スクロールが発生し、スクロールバーを表示する。

**注意点:**
- `ScrollController` は `State` のフィールドで管理し、`dispose()` 内で必ず `_scrollController.dispose()` を呼ぶこと。`build()` 内で毎回 `ScrollController()` を生成すると `dispose()` が呼ばれずリークが生じる。  
  現在 `VerticalProfilesPage` が `ConsumerWidget` のため、`ConsumerStatefulWidget` への変更が必要。
- `ConsumerStatefulWidget` 化に合わせて、`build()` 内で毎フレーム再生成されている `legendKeyShared` と `chartKeys` も `State` のフィールドに移動すること。  
  さらに現行実装では `legendKeyShared` はダウンロード処理（`_captureAndDownloadCharts`）に渡されているが、`LegendDraggablePanel` 側には接続されていない。legend のキャプチャを正しく動作させるには、`LegendDraggablePanel` の `RepaintBoundary` に `legendKeyShared` を渡す対応も合わせて行うこと。
- `clamp()` の戻り値は `num` 型のため、`SizedBox(width:)` に渡す前に `.toDouble()` で明示的にキャストする。

---

## 実装順序

1. `VerticalProfilesPage` を `ConsumerWidget` → `ConsumerStatefulWidget` に変更し、`ScrollController`・`legendKeyShared`・`chartKeys` を `State` のフィールドで管理する。`dispose()` で `_scrollController.dispose()` を呼ぶ。
2. `LegendDraggablePanel` に `legendKeyShared` を渡し、内部の `RepaintBoundary` に接続して legend キャプチャが正しく動作するようにする。
3. グラフ群部分を `LayoutBuilder` でラップし、`totalGap` と `chartWidth` を動的計算するロジックを追加する。
4. `SizedBox(width: 200)` を `SizedBox(width: chartWidth)` に変更する。
5. `SingleChildScrollView` を `Scrollbar` でラップして `_scrollController` を紐付ける。
6. widget test を追加する：ブラウザ幅が閾値（`minChartWidth * chartCount + totalGap`）を上回る・下回るケースそれぞれで、Scrollbar の `thumbVisibility` と各列幅が期待値を満たすことを検証する。
7. 動作確認：ブラウザ幅を変化させてグラフ幅の変化・スクロールバー表示を検証する。
