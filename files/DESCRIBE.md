# Local Projection Analysis: Unemployment Response to Bank Lending Standards

## Overview

This project implements local projections (Jordà, 2005) to estimate the impulse response of the U.S. unemployment rate to shocks in bank lending standards, with bias correction from Herbst and Johannsen (2020).

## Data Sources

From FRED (Federal Reserve Economic Data):
- **UNRATE**: U.S. Unemployment Rate (monthly, converted to quarterly)
- **DRTSCILM**: Net Percentage of Domestic Banks Tightening Standards for Commercial and Industrial Loans to Large and Middle-Market Firms (quarterly)

## Project Structure

```
FRED/
├── Claude.md           # API key and task description
├── DESCRIBE.md         # This file
├── code/
│   └── local_projection.py    # Main analysis script
├── data/
│   ├── fred_data.csv          # Raw FRED data
│   └── lp_results.csv         # LP estimation results
├── analysis/
│   ├── data_series.png        # Time series plots
│   └── impulse_response.png   # Impulse response function
└── documentation/
    └── biasinlocalproj.pdf    # Herbst-Johannsen (2020) paper
```

## Replication Instructions

### Step 1: Environment Setup

Ensure Python is available with the following packages:
```bash
pip install fredapi pandas numpy statsmodels matplotlib scipy
```

### Step 2: Verify API Key

The FRED API key is stored in `Claude.md`:
```
API Key: 
```

### Step 3: Run the Analysis

```bash
python code/local_projection.py
```

This will:
1. Fetch UNRATE and DRTSCILM from FRED
2. Align the data (quarterly frequency)
3. Estimate local projections for horizons h = 0, 1, ..., 20
4. Apply Herbst-Johannsen bias correction
5. Save results to `data/` and plots to `analysis/`

## Methodology

### Local Projection Model

For each horizon h = 0, 1, ..., H:

```
UNRATE_{t+h} = α_h + β_h × DRTSCILM_t + γ_h' × controls_t + u_{t,h}
```

Where:
- `β_h` is the impulse response at horizon h
- Controls include 4 lags of both UNRATE and DRTSCILM
- Standard errors use Newey-West HAC correction (lags = h)

### Bias Correction (Herbst-Johannsen, 2020)

The paper shows LP estimates are biased in small samples. The bias at horizon h depends on the entire impulse response:

```
E[θ̂_h] - θ_h ≈ -1/(T-h-1) × Σ(1 - j/(T-h)) × (θ_{h+j} + θ_{h-j})
```

The bias-corrected estimator:
```
θ̂_BC = (I - M_{T,H})^{-1} × θ̂_LS
```

Where M_{T,H} is the bias matrix defined in the paper.

## Key Results

| Horizon (Quarters) | OLS Estimate | Bias-Corrected | p-value |
|--------------------|--------------|----------------|---------|
| 0 | 0.022 | 0.026 | 0.162 |
| 2 | 0.026 | 0.030 | 0.009** |
| 5 | 0.044 | 0.048 | 0.006** |
| 6 | 0.039 | 0.042 | 0.019* |
| 10 | 0.022 | 0.025 | 0.170 |
| 20 | -0.007 | -0.003 | 0.704 |

**Interpretation**: A 1 percentage point increase in the net percentage of banks tightening lending standards is associated with a 0.03-0.05 percentage point increase in unemployment, peaking around quarters 4-6 (1-1.5 years).

## References

1. Jordà, Ò. (2005). "Estimation and Inference of Impulse Responses by Local Projections." *American Economic Review*, 95(1), 161-182.

2. Herbst, E. P., & Johannsen, B. K. (2020). "Bias in Local Projections." *Finance and Economics Discussion Series* 2020-010. Federal Reserve Board.

## Notes for Replication

- Sample period: 1990Q2 - 2025Q3 (143 observations)
- The DRTSCILM series uses quarter-start dates (Jan, Apr, Jul, Oct)
- Unemployment is resampled to quarterly using `resample('QS').last()`
- Maximum horizon H=20 (5 years) with 4 lags as controls

## Important: Shock Identification (TODO)

**Current limitation**: The current implementation uses the raw DRTSCILM series on the right-hand side. This is problematic because it conflates:
1. Anticipated changes in lending standards (endogenous response to economic conditions)
2. Unanticipated shocks (true exogenous variation)

**Recommended improvement**: Extract the *shock* to lending standards rather than using the raw series. Options include:

1. **AR residuals (preferred)**: Regress DRTSCILM on its own lags and use residuals as the shock:
   ```
   DRTSCILM_t = α + Σ φ_j × DRTSCILM_{t-j} + ε_t
   ```
   Use ε̂_t as the shock in the LP.

2. **VAR residuals**: Estimate a VAR with UNRATE and DRTSCILM, use Cholesky ordering to identify structural shocks.

3. **Purging macro conditions**: Regress DRTSCILM on contemporaneous/lagged macro variables (GDP growth, inflation, Fed funds rate) and use residuals.

4. **First difference**: Use ΔDRTSCILM (simple but doesn't fully address endogeneity).

The LP literature (including Herbst-Johannsen) typically assumes the RHS variable is an identified shock (often iid). Using raw series can lead to biased impulse response estimates due to endogeneity.
