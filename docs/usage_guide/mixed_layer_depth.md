## Mixed Layer Depth (MLD)

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
