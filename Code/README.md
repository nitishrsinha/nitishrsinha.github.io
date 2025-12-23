# Code Directory

This directory contains scripts for downloading and processing economic data.

## Download Scripts

### Python Script (Recommended)
```bash
# Install dependencies first
pip install requests pandas openpyxl

# Run the download script
python Code/download_economic_data.py
```

### Bash Script (Alternative)
```bash
# Make executable (if not already)
chmod +x Code/download_data.sh

# Run the script
./Code/download_data.sh
```

## What These Scripts Do

Both scripts will:
1. **Automatically download** files where direct URLs are available:
   - BLS PCE Concordance 2012 (pce_concordance_2012.xlsx)

2. **Provide instructions** for manual downloads:
   - BLS CPI Detailed Data (December 2000-2012, ~13 files)
   - BEA 2007 Input-Output Tables (3 files)

## Why Manual Downloads Are Needed

Some data sources require manual download because:
- **BLS CPI Data**: Historical files are in an archive requiring navigation by date
- **BEA I-O Tables**: Available through an interactive data tool that requires user selection

## Directory Structure

After running the download scripts and completing manual downloads, your structure should look like:

```
nitishrsinha.github.io/
├── Data/
│   ├── README.md                          # Detailed download instructions
│   ├── pce_concordance_2012.xlsx         # Downloaded automatically
│   ├── CPI/
│   │   ├── cpi_detailed_december_2000.xlsx
│   │   ├── cpi_detailed_december_2001.xlsx
│   │   ├── ...
│   │   └── cpi_detailed_december_2012.xlsx
│   └── BEA_IO/
│       ├── 2007_Commodity_by_Industry_Direct_Requirements.xlsx
│       ├── 2007_PCE_Bridge_NIPA_to_IO.xlsx
│       └── 2007_PCS_IO_Bridge.xlsx
└── Code/
    ├── README.md                          # This file
    ├── download_data.sh                   # Bash download script
    └── download_economic_data.py          # Python download script
```

## Next Steps

1. **Run the download script** (Python or Bash version)
2. **Follow the instructions** displayed for manual downloads
3. **Verify downloads** - Check that files are in the correct directories
4. **See Data/README.md** for detailed information about each dataset

## Troubleshooting

### Download Failures
If automated downloads fail:
- Check your internet connection
- Try the manual download URLs provided in Data/README.md
- Some files may have been moved - check the BLS/BEA websites

### File Format Issues
Expected formats:
- All files should be Excel format (.xlsx)
- If you download CSV or other formats, you may need to convert them

### Missing Files
Refer to `Data/README.md` for:
- Direct download links
- Alternative download methods
- Expected file names and locations

## Data Sources

All data comes from official U.S. government sources:
- **Bureau of Labor Statistics (BLS)**: CPI data and concordances
- **Bureau of Economic Analysis (BEA)**: Input-Output tables and bridges

See `Data/README.md` for full source URLs and documentation.
