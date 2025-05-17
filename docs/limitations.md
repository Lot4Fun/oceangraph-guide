## Limitations & Usage Notes

### Missing Values in Vertical Section Charts

When generating time-series vertical section charts of Argo float data, interpolation (e.g., using `scipy.interpolate.griddata`) is applied to convert irregular profile data into a regular grid. In some cases, this process may leave certain areas in the chart unfilled, resulting in visibly missing regions.

The example below illustrates such missing areas highlighted in red:

![Missing section example](../imgs/section_missing_values.png)

Please be aware of this when viewing the charts.
