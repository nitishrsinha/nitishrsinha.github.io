# Economic Data Download Instructions

This directory contains economic data files needed for analysis. Below are detailed instructions for obtaining each dataset.

## 1. Consumer Price Index - Detailed (BLS)

**Purpose:** Price changes by expenditure category
**What's needed:** Detailed CPI for 61 expenditure categories, December reports for 2000-2012

### Download Instructions:
1. Visit the BLS CPI Supplemental Files page:
   **URL:** https://www.bls.gov/cpi/tables/supplemental-files/

2. For each year from 2000 to 2012:
   - Locate the December release
   - Download Table 2 (Detailed expenditure category data)
   - Save as: `cpi_detailed_december_YYYY.xlsx` (replace YYYY with year)

3. Alternative approach - Use BLS Database:
   - Visit: https://www.bls.gov/cpi/data.htm
   - Access "CPI Databases" for historical data
   - Download detailed category data for December of each year

**Expected Files:**
```
Data/CPI/
├── cpi_detailed_december_2000.xlsx
├── cpi_detailed_december_2001.xlsx
├── cpi_detailed_december_2002.xlsx
├── ...
└── cpi_detailed_december_2012.xlsx
```

**Note:** The BLS uses 70 expenditure classes, but you can filter to your specific 61 categories of interest.

---

## 2. BEA Input-Output Tables (2007)

**Purpose:** Map consumer products → industries → regulations

### 2a. Commodity-by-Industry Direct Requirements Table

**Download Instructions:**
1. Visit BEA Historical Benchmark I-O Tables:
   **URL:** https://www.bea.gov/industry/historical-benchmark-input-output-tables

2. Locate the 2007 Benchmark I-O Tables section

3. Download: "Direct Requirements - Commodity-by-Industry"
   - File format: Excel (.xlsx) or CSV
   - Save as: `2007_Commodity_by_Industry_Direct_Requirements.xlsx`

**Alternative - Interactive Tool:**
1. Visit: https://www.bea.gov/itable/input-output
2. Select "After Redefinitions" tables
3. Select year: 2007
4. Select table type: Direct Requirements
5. Choose: Commodity-by-Industry
6. Download data

### 2b. PCE Bridge File (NIPA to I-O codes)

**Download Instructions:**
1. Same URL as above: https://www.bea.gov/industry/historical-benchmark-input-output-tables

2. Look for: "Bridge Table to PCE: I-O commodity composition of NIPA PCE"
   - Should be available for 2007 benchmark year
   - File may be in ZIP format containing Excel files

3. Save as: `2007_PCE_Bridge_NIPA_to_IO.xlsx`

**File Description:**
This file shows the mapping between:
- Input-Output (I-O) commodity codes
- NIPA Personal Consumption Expenditures (PCE) categories
- Values at both producers' prices and purchasers' prices

### 2c. PCS-IO Bridge (2007)

**Download Instructions:**
1. Visit the same BEA Historical Benchmark page
2. Look for bridge tables related to Personal Consumption categories
3. File may be labeled as:
   - "PCS to I-O Bridge"
   - "Personal Consumption to Input-Output Bridge"
   - Part of the PCE bridge files package

4. Save as: `2007_PCS_IO_Bridge.xlsx`

**Expected Files:**
```
Data/BEA_IO/
├── 2007_Commodity_by_Industry_Direct_Requirements.xlsx
├── 2007_PCE_Bridge_NIPA_to_IO.xlsx
└── 2007_PCS_IO_Bridge.xlsx
```

---

## 3. BLS PCE Concordance

**Purpose:** Match Consumer Expenditure Survey categories to PCE categories

**Download Instructions:**
1. Direct download link:
   **URL:** https://www.bls.gov/cex/pce_concordance_2012.xlsx

2. Or visit the concordance information page:
   **URL:** https://www.bls.gov/cex/cepceconcordance.htm

3. Save as: `pce_concordance_2012.xlsx`

**File Description:**
This concordance matches CE item categories (UCCs) to PCE categories from the Bureau of Economic Analysis.

**Expected File:**
```
Data/
└── pce_concordance_2012.xlsx
```

---

## Summary of Required Files

| Dataset | Source | Files | Location |
|---------|--------|-------|----------|
| CPI Detailed | BLS | 13 files (Dec 2000-2012) | Data/CPI/ |
| I-O Direct Requirements | BEA | 1 file (2007) | Data/BEA_IO/ |
| PCE Bridge (NIPA→I-O) | BEA | 1 file (2007) | Data/BEA_IO/ |
| PCS-IO Bridge | BEA | 1 file (2007) | Data/BEA_IO/ |
| PCE Concordance | BLS | 1 file (2012) | Data/ |

**Total:** ~17 files

---

## Automated Download

A download script is available in `Code/download_data.sh` that will attempt to download files automatically where possible. Run it from the repository root:

```bash
chmod +x Code/download_data.sh
./Code/download_data.sh
```

Note: Some files may require manual download from the BEA website due to their interactive data interface.

---

## Data Sources

- **BLS CPI Data:** [Consumer Price Index Supplemental Files](https://www.bls.gov/cpi/tables/supplemental-files/)
- **BLS CPI Database:** [CPI Databases](https://www.bls.gov/cpi/data.htm)
- **BEA I-O Tables:** [Historical Benchmark Input-Output Tables](https://www.bea.gov/industry/historical-benchmark-input-output-tables)
- **BEA Interactive Data:** [Input-Output Tables](https://www.bea.gov/itable/input-output)
- **BLS PCE Concordance:** [CE/PCE Concordance](https://www.bls.gov/cex/cepceconcordance.htm)
- **Direct PCE Concordance Download:** [pce_concordance_2012.xlsx](https://www.bls.gov/cex/pce_concordance_2012.xlsx)

---

## Additional Resources

- **BEA I-O Methodology:** [Input-Output Accounts Guide](https://www.bea.gov/resources/guide-interactive-industry-input-output-accounts-tables)
- **CPI Methodology:** [CPI Handbook](https://www.bls.gov/cpi/)
- **CE/PCE Comparison:** [Understanding the Relationship: CE Survey and PCE](https://www.bls.gov/osmr/research-papers/2013/ec130020.htm)

---

*Last updated: December 2025*
