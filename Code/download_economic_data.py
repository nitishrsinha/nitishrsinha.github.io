#!/usr/bin/env python3
"""
Download script for economic data files
Requires: requests, pandas (optional for data validation)
Install: pip install requests pandas openpyxl
"""

import os
import requests
from pathlib import Path
import sys

# Base directories
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "Data"
CPI_DIR = DATA_DIR / "CPI"
BEA_DIR = DATA_DIR / "BEA_IO"

# Create directories
CPI_DIR.mkdir(parents=True, exist_ok=True)
BEA_DIR.mkdir(parents=True, exist_ok=True)


def download_file(url, filepath, description=""):
    """Download a file from URL to filepath"""
    print(f"Downloading: {description or url}")
    try:
        response = requests.get(url, timeout=30, allow_redirects=True)
        response.raise_for_status()

        with open(filepath, 'wb') as f:
            f.write(response.content)

        file_size = os.path.getsize(filepath) / 1024  # Size in KB
        print(f"  ✓ Downloaded successfully ({file_size:.1f} KB)")
        return True
    except requests.exceptions.RequestException as e:
        print(f"  ✗ Failed: {e}")
        return False


def download_bls_pce_concordance():
    """Download BLS PCE Concordance 2012"""
    url = "https://www.bls.gov/cex/pce_concordance_2012.xlsx"
    filepath = DATA_DIR / "pce_concordance_2012.xlsx"
    return download_file(url, filepath, "BLS PCE Concordance 2012")


def download_cpi_data():
    """
    Download CPI detailed data for December 2000-2012

    Note: BLS archived data may require navigating their website.
    This function provides URLs to try, but manual download may be needed.
    """
    print("\n" + "="*60)
    print("CPI DETAILED DATA (2000-2012 December Reports)")
    print("="*60)

    # BLS archived files follow a pattern, but URLs change
    # This is a best-effort attempt
    base_url = "https://www.bls.gov/news.release/archives/cpi_"

    # December release dates (approximate - may need adjustment)
    # Format: https://www.bls.gov/news.release/archives/cpi_01162013.htm (for Dec 2012)

    print("\nCPI data typically requires manual download from:")
    print("https://www.bls.gov/cpi/tables/supplemental-files/")
    print("\nFor each year 2000-2012:")
    print("  1. Navigate to the December release")
    print("  2. Download Table 2 (detailed expenditure categories)")
    print("  3. Save to: Data/CPI/cpi_detailed_december_YYYY.xlsx")

    # Could attempt automated download if exact URLs are known
    # For now, provide manual instructions

    return False  # Indicates manual download needed


def download_bea_io_tables():
    """
    Download BEA 2007 Input-Output Tables

    Note: BEA data often requires using their interactive tool.
    Manual download may be necessary.
    """
    print("\n" + "="*60)
    print("BEA 2007 INPUT-OUTPUT TABLES")
    print("="*60)

    print("\nBEA I-O tables require download from:")
    print("https://www.bea.gov/industry/historical-benchmark-input-output-tables")

    print("\nRequired files:")
    print("  1. 2007 Commodity-by-Industry Direct Requirements table")
    print("     → Save to: Data/BEA_IO/2007_Commodity_by_Industry_Direct_Requirements.xlsx")

    print("  2. 2007 PCE Bridge file (NIPA to I-O codes)")
    print("     → Save to: Data/BEA_IO/2007_PCE_Bridge_NIPA_to_IO.xlsx")

    print("  3. 2007 PCS-IO Bridge")
    print("     → Save to: Data/BEA_IO/2007_PCS_IO_Bridge.xlsx")

    print("\nAlternatively, use BEA's interactive tool:")
    print("https://www.bea.gov/itable/input-output")

    return False  # Indicates manual download needed


def main():
    """Main download function"""
    print("="*60)
    print("ECONOMIC DATA DOWNLOAD SCRIPT")
    print("="*60)

    success_count = 0
    total_count = 0

    # 1. Download BLS PCE Concordance
    print("\n" + "-"*60)
    print("1. BLS PCE CONCORDANCE 2012")
    print("-"*60)
    total_count += 1
    if download_bls_pce_concordance():
        success_count += 1

    # 2. CPI Data (manual download needed)
    total_count += 1
    if download_cpi_data():
        success_count += 1

    # 3. BEA I-O Tables (manual download needed)
    total_count += 1
    if download_bea_io_tables():
        success_count += 1

    # Summary
    print("\n" + "="*60)
    print("DOWNLOAD SUMMARY")
    print("="*60)
    print(f"Automated downloads completed: {success_count}/1")
    print(f"Manual downloads required: 2")
    print(f"\nData directory: {DATA_DIR.absolute()}")
    print("\nSee Data/README.md for detailed download instructions.")
    print("="*60)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nDownload interrupted by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n\nError: {e}")
        sys.exit(1)
