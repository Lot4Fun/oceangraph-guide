## 1. Introduction

OceanGraph is a web platform for visualizing and analyzing Argo float oceanographic data. It offers interactive tools and profile information for researchers, students, and ocean enthusiasts.

## 2. Main features

### For everyone

- Search Argo floats worldwide by region and time (up to a 30-day date range)
- Search only profiles that include dissolved oxygen data
- Search by WMO ID for direct access to specific floats
- Track individual float trajectories
- Visualize time-series vertical sections of Argo float data

### For signed-in users

All free features, plus:

- Search Argo floats with an extended date range (up to 90 days)
- Visualize vertical profiles of temperature, salinity, and oxygen
- View mixed layer depth from profile data
- View SOM (subsurface oxygen maximum) depth and its corresponding values
- Analyze T-S diagrams to explore water mass characteristics
- Download observation profile data for custom analysis
- Save screenshots of search results and visualizations
- Store up to 3 saved search conditions for repeated use (*)
- Bookmark up to 5 float profiles for later reference or comparison (*)
- Cluster Argo float profiles for pattern analysis
- Explore and compare ocean profiles with customizable tools — [learn more](./docs/visual_lab/vertical_profiles.md)

**(*) Titles can contain up to 64 characters, and notes up to 200 characters.**

## 3. Data source

These data were collected and made freely available by the International Argo Program and the national programs that contribute to it ([http://www.argo.ucsd.edu](http://www.argo.ucsd.edu), [http://argo.jcommops.org](http://argo.jcommops.org)).
The Argo Program is part of the Global Ocean Observing System.

DOI: Argo (2000). Argo float data and metadata from Global Data Assembly Centre (Argo GDAC). SEANOE. [http://doi.org/10.17882/42182](http://doi.org/10.17882/42182)

## 4. Data filtering policy

In OceanGraph, only carefully selected Argo float profiles are used according to the following conditions:

### 4-1. Selection of profiles

- Only real-time (`R`, `BR`) and delayed-mode (`D`, `BD`) profiles are used.
- If both real-time and delayed-mode profiles exist for the same cycle, the delayed-mode profile (D or BD) is preferred.
- Drift profiles (those with a `D` at the end of `CYCLE_NUMBER`) are excluded.

### 4-2. Required variables

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

### 4-3. Date and position quality control

- Only profiles with `JULD_QC` values of 1 or 2 are used.
- Only profiles with `POSITION_QC` values of 1 or 2 are used.
- Even if a profile passes the `POSITION_QC` check, some data may still be unreliable. For example, as shown in the red circle below, caution is advised when interpreting such data.

    ![Position QC Check](./imgs/position_qc.png)

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

### 4-4. Sorting of data

The profiles are sorted in ascending order of `PRES_ADJUSTED`, and the following variables are reordered accordingly:

- `PRES_ADJUSTED_QC`
- `TEMP_ADJUSTED`
- `TEMP_ADJUSTED_QC`
- `PSAL_ADJUSTED`
- `PSAL_ADJUSTED_QC`
- `DOXY_ADJUSTED` (if available)
- `DOXY_ADJUSTED_QC` (if available)

### 4-5. Depth range restriction

Only data from depths shallower than **2000 dbar** are retained. Additionally, layers with negative pressure values are removed along with their corresponding data (temperature, salinity, dissolved oxygen, etc.).

### 4-6. Profile quality filtering

Only profiles where at least **80%** of `PRES_ADJUSTED_QC`, `TEMP_ADJUSTED_QC`, and `PSAL_ADJUSTED_QC` flags are either 1 or 2 are kept.

### 4-7. Interpolation of missing values for dissolved oxygen

For dissolved oxygen concentrations, which often contain missing (`NaN`) values, the following interpolation procedure is applied:

1. Linear interpolation is used for internal (non-endpoint) missing values.
2. Remaining missing values at the beginning or end of the profile are filled using backward-fill and forward-fill, respectively.

### 4-8. Layer-by-Layer filtering

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

### 4-9. NaN value detection

After the layer-by-layer filtering, the system checks for any remaining NaN (Not a Number) values in the core variables:

- Pressure (`PRES_ADJUSTED`)
- Temperature (`TEMP_ADJUSTED`)
- Salinity (`PSAL_ADJUSTED`)

If any NaN values are detected in these critical variables, the entire profile is rejected and removed from the dataset. This ensures data integrity and prevents computational errors in downstream analysis.

### 4-10. Pressure gap filtering

Profiles with excessively large gaps in pressure measurements are rejected and removed from the dataset to ensure data continuity. The filtering uses depth-dependent gap thresholds that become more permissive with increasing depth:

- **0-100 dbar**: Maximum gap of 33.33 dbar
- **100-200 dbar**: Maximum gap of 66.67 dbar
- **200-300 dbar**: Maximum gap of 100 dbar
- **300-1000 dbar**: Maximum gap increases proportionally (depth/3)
- **>1000 dbar**: Maximum gap of 500 dbar

This ensures that profiles maintain adequate vertical resolution throughout the water column, with stricter requirements in shallower waters where oceanographic gradients are typically steeper.

### 4-11. Decimal precision

To reduce data size, the values are rounded to the nearest values shown below:

| Variable                       | Precision |
|--------------------------------|-----------|
| Pressure                       | 0.01      |
| Temperature                    | 0.001     |
| Salinity                       | 0.001     |
| Dissolved oxygen concentration | 0.001     |

## 5. Legal information

For details regarding the terms of use and privacy policy, please refer to the following documents:

- [Terms of Service (English)](./docs/terms_of_use_en.md)
- [Privacy Policy (English)](./docs/privacy_policy_en.md)

For documents in Japanese:

- [利用規約（日本語）](./docs/terms_of_use_ja.md)
- [プライバシーポリシー（日本語）](./docs/privacy_policy_ja.md)

## 6. Contact information

- If you encounter any bugs or have feature requests, please submit them via [Issues](https://github.com/Lot4Fun/oceangraph-guide/issues).
- For other inquiries, feel free to contact us at support(at)unvelyze.com.

## 7. Limitations & Usage Notes

For known limitations and important usage notes, please refer to:

- [Limitations & Usage Notes](./docs/limitations.md)
