# Data filtering policy

In OceanGraph, only carefully selected Argo float profiles are used according to the following conditions:

## 1. Selection of profiles

- Only real-time (`R`, `BR`) and delayed-mode (`D`, `BD`) profiles are used.
- If both real-time and delayed-mode profiles exist for the same cycle, the delayed-mode profile (D or BD) is preferred.
- Drift profiles (those with a `D` at the end of `CYCLE_NUMBER`) are excluded.

## 2. Required variables

Only profiles that include all of the following variables are used:

- `PLATFORM_NUMBER`
- `CYCLE_NUMBER`
- `JULD`
- `JULD_QC`
- `LATITUDE`
- `LONGITUDE`
- `PRES_ADJUSTED`
- `PRES_ADJUSTED_QC`
- `TEMP_ADJUSTED`
- `TEMP_ADJUSTED_QC`
- `PSAL_ADJUSTED`
- `PSAL_ADJUSTED_QC`

**Note:** If all `_ADJUSTED` data values are NaN, the system automatically falls back to the corresponding non-adjusted data (see section 4 for details).

## 3. Date and position quality control

- Only profiles with `JULD_QC` values of 1 or 2 are used.
- Only profiles with `POSITION_QC` values of 1 or 2 are used.
- Even if a profile passes the `POSITION_QC` check, some data may still be unreliable. For example, as shown in the red circle below, caution is advised when interpreting such data.

    ![Position QC Check](../../imgs/position_qc.png)

**Note:** In some NetCDF files, multiple profiles can be present in a single file. In such cases, only the first profile (i.e., index 0) is used for further analysis, as illustrated in the example below:

```python
# NetCDF file:
D5906026_128.nc

# JULD_QC:
[b'1' b'1']

# POSITION_QC:
[b'1' b'1']

# TEMP_QC:
[[b'1' b'1' b'1' ... b'1' b'1' b'1']
 [b'1' b'1' b'1' ... nan nan nan]]

# TEMP:
[[7.743  7.745  7.745  ... 2.0353 1.9964 1.9618]
 [7.7466 7.7459 7.7462 ...    nan    nan    nan]]
```

## 4. Fallback to non-adjusted data

If all values in an `_ADJUSTED` variable (e.g., `PRES_ADJUSTED`, `TEMP_ADJUSTED`, `PSAL_ADJUSTED`) are NaN, the system automatically falls back to the corresponding non-adjusted variable (e.g., `PRES`, `TEMP`, `PSAL`).

This fallback mechanism ensures that real-time profiles or profiles that have not yet undergone delayed-mode quality control can still be utilized, maximizing data availability while maintaining quality standards.

**Fallback pairs:**

- `PRES_ADJUSTED` → `PRES`
- `TEMP_ADJUSTED` → `TEMP`
- `PSAL_ADJUSTED` → `PSAL`
- `DOXY_ADJUSTED` → `DOXY` (if applicable)

The corresponding QC flags also follow the same fallback logic (e.g., `PRES_ADJUSTED_QC` → `PRES_QC`).

## 5. Depth range restriction

Only data from depths shallower than **2000 dbar** are retained. Additionally, layers with negative pressure values are removed along with their corresponding data (temperature, salinity, dissolved oxygen, etc.).

## 6. Profile quality filtering

Only profiles where at least **80%** of `PRES_ADJUSTED_QC`, `TEMP_ADJUSTED_QC`, and `PSAL_ADJUSTED_QC` flags are either 1 or 2 are kept.

## 7. Layer-by-Layer filtering

- Only layers where the QC flags for pressure, temperature, and salinity are all 1 or 2 are kept.
- For dissolved oxygen (`DOXY_ADJUSTED`):
  - Data are kept if the corresponding pressure, temperature, and salinity flags are all 1 or 2.
  - The QC flag of DOXY itself is not used for filtering. This is because oxygen sensor quality can vary significantly, and applying its QC flag strictly may severely limit the available data.
  - Users should carefully interpret dissolved oxygen data due to potential sensor uncertainties.

| pres_qc | temp_qc | psal_qc | doxy_qc | Judgment |
|---------|---------|---------|---------|----------|
| 1 or 2  | 1 or 2  | 1 or 2  | 1 or 2  | PASS     |
| 0       | 1 or 2  | 1 or 2  | 1 or 2  | FAIL     |
| 1 or 2  | 0       | 1 or 2  | 1 or 2  | FAIL     |
| 1 or 2  | 1 or 2  | 0       | 1 or 2  | FAIL     |
| 1 or 2  | 1 or 2  | 1 or 2  | 0 (*)   | **PASS** |

**(*) DOXY quality flag is not used in filtering.**

## 8. NaN value detection

After the layer-by-layer filtering, the system checks for any remaining NaN (Not a Number) values in the core variables:

- Pressure (`PRES_ADJUSTED`)
- Temperature (`TEMP_ADJUSTED`)
- Salinity (`PSAL_ADJUSTED`)

If any NaN values are detected in these critical variables, the entire profile is rejected and removed from the dataset. This ensures data integrity and prevents computational errors in downstream analysis.

## 9. Interpolation of missing values for dissolved oxygen

For dissolved oxygen concentrations, which often contain missing (`NaN`) values, the following interpolation procedure is applied:

1. Linear interpolation is used for internal (non-endpoint) missing values.
2. Remaining missing values at the beginning or end of the profile are filled using backward-fill and forward-fill, respectively.

## 10. Duplicate pressure value removal

To ensure data integrity and maintain strictly increasing pressure sequences, duplicate pressure values are removed using a deterministic sorting approach:

1. **Pressure grouping**: Data points are grouped by rounded pressure values (to 0.01 dbar precision).
2. **Deterministic selection**: When multiple data points exist at the same pressure level, they are sorted by:
   - Original pressure value
   - Temperature value
   - Salinity value
3. **First entry retention**: The first entry from the sorted group is kept, while duplicates are discarded.

This process ensures that each profile has a unique, monotonically increasing pressure sequence, which is essential for accurate oceanographic analysis and prevents computational issues in downstream processing.

## 11. Pressure gap filtering

Profiles with excessively large gaps in pressure measurements are rejected and removed from the dataset to ensure data continuity. The filtering uses depth-dependent gap thresholds that become more permissive with increasing depth:

- **0-100 dbar**: Maximum gap of 33.33 dbar
- **100-200 dbar**: Maximum gap of 66.67 dbar
- **200-300 dbar**: Maximum gap of 100 dbar
- **300-1000 dbar**: Maximum gap increases proportionally (depth/3)
- **>1000 dbar**: Maximum gap of 500 dbar

This ensures that profiles maintain adequate vertical resolution throughout the water column, with stricter requirements in shallower waters where oceanographic gradients are typically steeper.

## 12. Oceanographic parameter conversion

To ensure consistency with oceanographic standards, the following parameter conversions are applied:

1. **Temperature to potential temperature (θ)**: In-situ temperature is converted to potential temperature using the TEOS-10 Gibbs Seawater (GSW) oceanographic toolbox.
2. **Practical salinity to absolute salinity (SA)**: Practical salinity is converted to absolute salinity using the GSW toolbox, taking into account the geographic location (latitude/longitude) and pressure.

These conversions provide more accurate representations of water mass properties by removing the effects of pressure and enabling precise oceanographic calculations. Profiles that encounter computational errors during these conversions are rejected to maintain data quality.

## 13. Decimal precision

To reduce data size, the values are rounded to the nearest values shown below:

| Variable                       | Precision |
|--------------------------------|-----------|
| Pressure                       | 0.01      |
| Temperature                    | 0.001     |
| Salinity                       | 0.001     |
| Dissolved oxygen concentration | 0.001     |
