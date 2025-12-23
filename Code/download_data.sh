#!/bin/bash
# Script to download economic data files
# Run this script from the repository root directory

# Create Data directory if it doesn't exist
mkdir -p Data

echo "Downloading economic data files..."

# 1. BLS PCE Concordance 2012
echo "1. Downloading BLS PCE Concordance 2012..."
curl -L -o Data/pce_concordance_2012.xlsx \
  "https://www.bls.gov/cex/pce_concordance_2012.xlsx"

# 2. BEA 2007 Input-Output Tables
# Note: These files need to be downloaded from BEA's website
# Visit: https://www.bea.gov/industry/historical-benchmark-input-output-tables

echo ""
echo "2. For BEA 2007 Input-Output Tables, please visit:"
echo "   https://www.bea.gov/industry/historical-benchmark-input-output-tables"
echo ""
echo "   Download the following files to the Data/ directory:"
echo "   - 2007 Commodity-by-Industry Direct Requirements table"
echo "   - 2007 PCE Bridge file (I-O to NIPA PCE mapping)"
echo "   - 2007 PCS-IO Bridge"

# 3. BLS CPI Detailed Data
echo ""
echo "3. For BLS CPI Detailed Data (December 2000-2012):"
echo "   Visit: https://www.bls.gov/cpi/tables/supplemental-files/"
echo ""
echo "   You'll need to download December reports for years 2000-2012"
echo "   Look for files containing detailed expenditure category data"

echo ""
echo "Download complete for automated files!"
echo "Please follow the instructions above for manual downloads."
