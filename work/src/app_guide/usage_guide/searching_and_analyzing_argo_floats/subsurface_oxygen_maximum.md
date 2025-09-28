# Subsurface Oxygen Maximum (SOM)

OceanGraph calculates the subsurface oxygen maximum (SOM) for individual Argo float profiles using dissolved oxygen and pressure (or depth) data. This metric is widely used in oceanography to characterize the vertical structure of oxygen, especially in subtropical and tropical regions, where a local maximum often appears just below the surface mixed layer.

1. Definition and Search Range

    - The SOM is defined as the local maximum of dissolved oxygen concentration found within the subsurface layer, between the mixed layer depth + 5 dbar and 300 dbar.
    - The very shallow layers (e.g., 0–10 dbar) are excluded to avoid the influence of transient surface processes and ensure the detected maximum is truly subsurface.

2. Identification of Local Maximum

    - Within the specified pressure range, the oxygen profile is scanned for local maxima, defined as points where the dissolved oxygen concentration is greater than at both adjacent pressure levels.
    - If multiple local maxima are present, the one with the highest oxygen concentration is selected as the SOM.

3. Fallback if No Local Maximum Exists

   - If no local maximum exists within the subsurface layer (e.g., if the profile is monotonic), the single highest dissolved oxygen concentration within this range is selected as the SOM.

4. Output

   - The pressure (or depth) and the corresponding dissolved oxygen concentration of the SOM are recorded for each profile.
   - If no valid SOM can be identified (e.g., due to insufficient data points), the SOM is considered undefined for that observation.
