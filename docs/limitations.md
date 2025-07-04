## Limitations & Usage Notes

### 1. Missing Values in Vertical Section Charts

1. Masked Areas Without Original Data

    When generating time-series vertical section charts of Argo float data, interpolation (e.g., using scipy.interpolate.griddata) is used to transform irregularly spaced profile data into a regular grid. Some areas may remain unfilled where original profile data are missing. To address this, we apply a mask after gridding to exclude regions without valid observations, setting those values to NaN.

    In the example image below, these masked areas appear as uncolored gaps in the vertical section.

2. Sparse Data Due to Quality Control

    After applying quality control, some profiles may be excluded, resulting in a sparser time series. Even if valid profiles are present at certain time steps, the interpolation process may not be able to generate a continuous vertical section. This leads to sections where observation points exist (trajectory figure) but the interpolated chart shows gray or missing areas (vertical section figure), indicating insufficient data density for interpolation.

    This can be seen in the same image where gray regions appear in the section chart, even though observation points are visible in the trajectory chart above.

![Missing section example](../imgs/section_missing_values.png)

Please keep this in mind when interpreting the charts.

### 2. Clustering (Beta)

OceanGraph provides a beta feature that clusters Argo profiles based on their vertical structure using machine learning. This functionality is experimental and comes with the following limitations and processing steps:

1. Profile Limit

   - To reduce server load and memory usage, clustering accepts a maximum of 500 valid profiles per job.

2. Depth Range & Interpolation

   - Only the range between 200 and 1000 dbar is used.
   - Profiles are linearly interpolated every 100 dbar within this range to align them on a common vertical grid.
   - The upper 200 dbar is omitted to suppress the effects of seasonal thermocline and surface forcing.

3. Required Variables

   - Only profiles containing valid temperature and salinity data are considered.
   - Profiles missing these variables or lacking coverage in the specified depth range are excluded.

4. Clustering Feature Vector

   - Clustering is based on a feature vector composed of interpolated temperature and salinity values, combined with location data.
   - Temperature and salinity vectors are standardized using z-score normalization at each depth level to ensure that variations at all depths contribute equally to the clustering process.
   - Latitude is included as an additional feature, normalized by linear scaling from -90 to 90 degrees into a range of -1 to 1.
   - Longitude is transformed into two features using its sine and cosine values (i.e., sin(λ), cos(λ)), allowing for circular continuity around the ±180° meridian without further normalization.

5. Automatic K Determination

   - The number of clusters (K) is selected automatically using a simplified elbow method (with a maximum of 8 clusters).

This feature is available to **signed-in users only**. While we are actively improving this system, unexpected results or limitations may occur. We appreciate your understanding during this beta period.

![Clustering example](../imgs/clustering.png)
**Note:** Gray markers indicate profiles that were excluded from clustering.

### 3. Mixed Layer Depth (MLD)

OceanGraph calculates the mixed layer depth (MLD) from individual Argo float profiles based on potential temperature (θ), using the Gibbs SeaWater (GSW) Oceanographic Toolbox for accurate thermodynamic calculations. This method follows a temperature threshold approach, which is commonly used in oceanographic studies.

1. Potential Temperature Calculation

   - MLD is determined from the vertical profile of potential temperature (θ), which is calculated using the GSW toolbox based on practical salinity, in-situ temperature, pressure, and latitude.
   - This ensures high accuracy and consistency in the estimation of temperature-related stratification and mixed layer properties.

2. MLD Definition and Threshold

   - The MLD is defined as the shallowest depth at which the potential temperature (θ) differs by more than 0.1°C from its value at 10 dbar.
   - This threshold-based method is widely adopted in oceanographic literature and provides a straightforward and robust way to estimate the depth of the surface mixed layer based on thermal structure.
   - If no such depth is found in the profile, the MLD is considered undefined for that observation.

3. Data Quality Requirements

   - **Reference Depth Coverage**: The reference depth (10 dbar) must be within the measured pressure range of the profile. If the reference depth falls outside the available data range, MLD calculation is skipped for that profile.
   - **Shallow Data Availability**: A minimum of 3 data points at or above 50 dbar is required for reliable MLD calculation. Profiles with insufficient shallow measurements are excluded from MLD computation to ensure accuracy.

4. Conversion to Depth

   - The estimated MLD (in decibars) is converted into physical depth (in meters) using a latitude-dependent algorithm from the UNESCO 1983 standard.
   - This conversion allows MLD values to be spatially visualized or regionally compared using consistent units.

5. Color Representation

   - For visualizations such as maps, MLD values are mapped to colors using the reversed Viridis colormap (viridis_r in matplotlib), where shallow layers appear bright and deeper layers appear dark.
   - Profiles with missing or undefined MLD values are rendered in gray.

This approach provides an accurate and consistent estimation of mixed layer depth across a wide range of Argo float profiles. It is particularly well-suited for visual analysis and regional comparisons based on temperature stratification.

### 4. Subsurface Oxygen Maximum (SOM)

OceanGraph calculates the subsurface oxygen maximum (SOM) for individual Argo float profiles using dissolved oxygen and pressure (or depth) data. This metric is widely used in oceanography to characterize the vertical structure of oxygen, especially in subtropical and tropical regions, where a local maximum often appears just below the surface mixed layer.

1. Definition and Search Range

    - The SOM is defined as the local maximum of dissolved oxygen concentration found within the subsurface layer, typically between 50 dbar and 300 dbar.
    - The very shallow layers (e.g., 0–10 dbar) are excluded to avoid the influence of transient surface processes and ensure the detected maximum is truly subsurface.

2. Identification of Local Maximum

    - Within the specified pressure range, the oxygen profile is scanned for local maxima, defined as points where the dissolved oxygen concentration is greater than at both adjacent pressure levels.
    - If multiple local maxima are present, the one with the highest oxygen concentration is selected as the SOM.

3. Fallback if No Local Maximum Exists

   - If no local maximum exists within the subsurface layer (e.g., if the profile is monotonic), the single highest dissolved oxygen concentration within this range is selected as the SOM.

4. Output

   - The pressure (or depth) and the corresponding dissolved oxygen concentration of the SOM are recorded for each profile.
   - If no valid SOM can be identified (e.g., due to insufficient data points), the SOM is considered undefined for that observation.
