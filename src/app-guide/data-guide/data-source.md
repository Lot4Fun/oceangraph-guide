# Data source

OceanGraph uses Argo float data and associated metadata provided by the **International Argo Program** and the **national programs** that contribute to it. These data are made freely available through the **Argo Global Data Assembly Centre (Argo GDAC)** and are a core component of the **Global Ocean Observing System (GOOS)**.

For data access, OceanGraph retrieves Argo GDAC files via the public **AWS S3 distribution (Open Data on AWS)**, which is synchronized with the GDAC holdings and updated on a daily basis. This S3-based access method is used to improve download reliability and performance, while preserving the original GDAC directory structure and dataset contents.

References:

- International Argo Program: [http://www.argo.ucsd.edu](http://www.argo.ucsd.edu)
- JCOMMOPS Argo Information Centre: [http://argo.jcommops.org](http://argo.jcommops.org)

**Acknowledgement**
"These data were collected and made freely available by the International Argo Program and the national
programs that contribute to it. ([https://argo.ucsd.edu](https://argo.ucsd.edu), [https://www.ocean-ops.org](https://www.ocean-ops.org)). The Argo Program is
part of the Global Ocean Observing System."

**DOI / Citation**
Argo (2000). *Argo float data and metadata from Global Data Assembly Centre (Argo GDAC).* SEANOE. [http://doi.org/10.17882/42182](http://doi.org/10.17882/42182)
