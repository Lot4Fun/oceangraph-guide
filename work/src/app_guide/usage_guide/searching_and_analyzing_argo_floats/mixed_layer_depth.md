# Mixed Layer Depth (MLD)

OceanGraph calculates the mixed layer depth (MLD) from individual Argo float profiles based on potential temperature (θ), using the Gibbs SeaWater (GSW) Oceanographic Toolbox for accurate thermodynamic calculations. This method follows a temperature threshold approach, which is commonly used in oceanographic studies.

1. Multi-Parameter Calculation

   - MLD is determined using three different oceanographic parameters: potential temperature (θ), absolute salinity, and potential density (σθ).
   - Potential temperature and density are calculated using the GSW toolbox based on practical salinity, in-situ temperature, pressure, and latitude.
   - This ensures high accuracy and consistency in the estimation of stratification and mixed layer properties across different oceanographic conditions.

2. MLD Definition and Threshold

   - The MLD is calculated using three different threshold criteria and defined as the shallowest depth among the three methods:
     - **Temperature threshold (Δθ)**: Depth where potential temperature (θ) differs by more than 0.5°C from its value at 10 dbar
     - **Salinity threshold (ΔSA)**: Depth where absolute salinity differs by more than 0.05 g/kg from its value at 10 dbar
     - **Density threshold (Δσθ)**: Depth where potential density (σθ) differs by more than 0.125 kg/m³ from its value at 10 dbar
   - This multi-parameter approach provides a more robust estimation of the mixed layer depth by considering both thermal and haline stratification.
   - If no depth is found using any of the three criteria, the MLD is considered undefined for that observation.

3. Data Quality Requirements

   - **Reference Depth Coverage**: The reference depth (10 dbar) must be within the measured pressure range of the profile. If the reference depth falls outside the available data range, MLD calculation is skipped for that profile.
   - **Shallow Data Availability**: A minimum of 3 data points at or above 50 dbar is required for reliable MLD calculation. Profiles with insufficient shallow measurements are excluded from MLD computation to ensure accuracy.

4. Conversion to Depth

   - The estimated MLD (in decibars) is converted into physical depth (in meters) using a latitude-dependent algorithm from the UNESCO 1983 standard.
   - This conversion allows MLD values to be spatially visualized or regionally compared using consistent units.

5. Color Representation

   - For visualizations such as maps, MLD values are mapped to colors using the reversed Viridis colormap (viridis_r in matplotlib), where shallow layers appear bright and deeper layers appear dark.
   - Profiles with missing or undefined MLD values are rendered in gray.

This approach provides an accurate and robust estimation of mixed layer depth across a wide range of Argo float profiles by utilizing multiple oceanographic parameters. The multi-threshold method ensures that the MLD estimation captures both thermal and haline stratification effects, making it particularly well-suited for visual analysis and regional comparisons in diverse oceanographic environments.
