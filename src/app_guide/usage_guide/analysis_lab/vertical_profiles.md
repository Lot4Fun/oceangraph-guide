# Vertical Profiles

The Vertical Profile Viewer is a feature of OceanGraph that allows you to visualize and compare vertical profiles of oceanographic data.

![Vertical Profiles](../../../../imgs/vertical_profiles.png)

With this tool, you can:

- Upload one or more JSON files containing vertical profile data.
- Visualize temperature, salinity, and dissolved oxygen by depth.
- Add brief notes for each uploaded profile.
- Download the annotated charts as images for sharing or further analysis.

This feature is designed for researchers, students, and ocean enthusiasts who wish to analyze and compare their own custom oceanographic data — especially data that follows the variable structure commonly used in Argo float observations.

## Supported JSON Format

The JSON structure used in this tool is based on the variable naming conventions of Argo float profiles. Each uploaded file must be a JSON file with the following keys:

```json
{
  "pressure": [ ... ],
  "potential_temperature": [ ... ],
  "absolute_salinity": [ ... ],
  "oxygen": [ ... ],
  "chlorophyll": [ ... ],
  "nitrate": [ ... ],
  "bbp700": [ ... ],
  "ph": [ ... ],
  "irradiance490": [ ... ],
  "par": [ ... ],
  "wmo_id": "2902447",
  "cycle_number": 17
}
```

- `"pressure"`: array of numbers (required, must not be empty)
- `"potential_temperature"`: array of numbers (same length as `pressure`, if present)
- `"absolute_salinity"`: array of numbers (same length as `pressure`, if present)
- `"oxygen"`: array of numbers — dissolved oxygen concentration (μmol/kg) (same length as `pressure`, if present)
- `"chlorophyll"`: array of numbers — chlorophyll-a (mg/m³) (same length as `pressure`, if present)
- `"nitrate"`: array of numbers — nitrate (μmol/kg) (same length as `pressure`, if present)
- `"bbp700"`: array of numbers — particulate backscattering at 700 nm (m⁻¹) (same length as `pressure`, if present)
- `"ph"`: array of numbers — in-situ pH (same length as `pressure`, if present)
- `"irradiance490"`: array of numbers or nulls — downwelling irradiance at 490 nm (W/m²/nm); `null` values indicate physically absent data (e.g., no light at depth) (same length as `pressure`, if present)
- `"par"`: array of numbers or nulls — photosynthetically available radiation (μmol/m²/s); `null` values are treated the same as for `irradiance490` (same length as `pressure`, if present)
- `"wmo_id"`: string (required)
- `"cycle_number"`: number (required)

Any additional keys will be ignored. Files that do not follow the required structure or fail validation will be skipped during upload.
