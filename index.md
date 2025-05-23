# App Guide for OceanGraph

## 1. Introduction to OceanGraph

OceanGraph is a web platform that enables visualization and analysis of Argo float oceanographic data. It provides interactive data visualization tools and profile information for oceanography researchers, students, and anyone interested in oceanography.

## 2. Main Features

- Search for Argo floats worldwide by specifying geographic regions and time periods
- Visualize vertical profiles of temperature, salinity and oxygen
- Explore the trajectories of individual floats over time
- Download selected observation profile data for advanced custom analysis
- Save screenshots of search results and visualizations for your records

## 3. Data Source

These data were collected and made freely available by the International Argo Program and the national programs that contribute to it (http://www.argo.ucsd.edu, http://argo.jcommops.org).
The Argo Program is part of the Global Ocean Observing System.

DOI: Argo (2000). Argo float data and metadata from Global Data Assembly Centre (Argo GDAC). SEANOE. http://doi.org/10.17882/42182

## 4. Data Filtering Policy

In OceanGraph, only carefully selected Argo float profiles are used according to the following conditions:

1. Selection of Profiles

    - Only profiles in delayed mode (files starting with D or BD) are used.
    - Drift profiles (those with a D at the end of CYCLE_NUMBER) are excluded.

2. Required Variables

    Only profiles that include all of the following variables are retained:

    - PLATFORM_NUMBER
    - CYCLE_NUMBER
    - DATE_CREATION
    - LATITUDE
    - LONGITUDE
    - PRES_ADJUSTED
    - PRES_ADJUSTED_QC
    - TEMP_ADJUSTED
    - TEMP_ADJUSTED_QC
    - PSAL_ADJUSTED
    - PSAL_ADJUSTED_QC

3. Sorting of Data

    The profiles are sorted in ascending order of PRES_ADJUSTED, and the following variables are reordered accordingly:

    - PRES_ADJUSTED_QC
    - TEMP_ADJUSTED
    - TEMP_ADJUSTED_QC
    - PSAL_ADJUSTED
    - PSAL_ADJUSTED_QC
    - DOXY_ADJUSTED (if available)
    - DOXY_ADJUSTED_QC (if available)

4. Depth Range Restriction

    Only data from depths shallower than 1000 dbar are retained.

5. Profile Quality Filtering

    Only profiles where at least 80% of PRES_ADJUSTED_QC, TEMP_ADJUSTED_QC, and PSAL_ADJUSTED_QC flags are either 1 or 2 (indicating good or probably good quality) are retained.

6. Layer-by-Layer Filtering

    - Only layers where the QC flags for pressure, temperature, and salinity are all 1 or 2 are kept.
    - For dissolved oxygen (DOXY_ADJUSTED):
    - Data are retained if the corresponding pressure, temperature, and salinity flags are all 1 or 2.
        - The QC flag of DOXY itself is not used for filtering, because oxygen sensor quality can vary and applying its QC flag strictly may severely limit available data.
        - Users should carefully interpret dissolved oxygen data due to potential sensor uncertainties.

    | pres_qc | temp_qc | psal_qc | doxy_qc | judgement |
    |---------|---------|---------|---------|-----------|
    | 1 or 2  | 1 or 2  | 1 or 2  | 1 or 2  | PASS      |
    | 0       | 1 or 2  | 1 or 2  | 1 or 2  | NG        |
    | 1 or 2  | 0       | 1 or 2  | 1 or 2  | NG        |
    | 1 or 2  | 1 or 2  | 0       | 1 or 2  | NG        |
    | 1 or 2  | 1 or 2  | 1 or 2  | 0 (*)   | PASS      |

    ***: DOXY quality flag not assigned**
