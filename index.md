## 1. Introduction

OceanGraph is a web platform for visualizing and analyzing Argo float oceanographic data. It offers interactive tools and profile information for researchers, students, and ocean enthusiasts.

**Note: On iOS devices, you can browse the site without logging in, but login functionality is currently not supported.**

## 2. Main features

### For everyone

- Search Argo floats worldwide by region and time (up to a 30-day date range)
- Track individual float trajectories
- Visualize time-series vertical sections of Argo float data

### For signed-in users

All free features, plus:

- Search Argo floats with an extended date range (up to 90 days)
- Visualize vertical profiles of temperature, salinity, and oxygen
- Download observation profile data for custom analysis
- Save screenshots of search results and visualizations
- Cluster Argo float profiles for pattern analysis

## 3. Data source

These data were collected and made freely available by the International Argo Program and the national programs that contribute to it ([http://www.argo.ucsd.edu](http://www.argo.ucsd.edu), [http://argo.jcommops.org](http://argo.jcommops.org)).
The Argo Program is part of the Global Ocean Observing System.

DOI: Argo (2000). Argo float data and metadata from Global Data Assembly Centre (Argo GDAC). SEANOE. [http://doi.org/10.17882/42182](http://doi.org/10.17882/42182)

## 4. Data filtering policy

In OceanGraph, only carefully selected Argo float profiles are used according to the following conditions:

### 4-1. Selection of profiles

- Only profiles in delayed mode (files starting with `D` or `BD`) are used.
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

Only data from depths shallower than **2000 dbar** are retained.

### 4-6. Profile quality filtering

Only profiles where at least **80%** of `PRES_ADJUSTED_QC`, `TEMP_ADJUSTED_QC`, and `PSAL_ADJUSTED_QC` flags are either 1 or 2 are kept.

### 4-7. Interpolation of missing values

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

***: DOXY quality flag is not used in filtering.**

### 4-9. Decimal precision

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

- If you encounter any bugs or have feature requests, please submit them via [Issues](https://github.com/Unvelyze/oceangraph-guide/issues).
- For other inquiries, feel free to contact us at support(at)unvelyze.com.

## 7. Limitations & Usage Notes

For known limitations and important usage notes, please refer to:

- [Limitations & Usage Notes](./docs/limitations.md)
