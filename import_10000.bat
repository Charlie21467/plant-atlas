@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "EXIT_CODE=0"

echo ================================================
echo Plant Atlas - 10,000 species data import
echo ================================================
echo.

python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python 3 was not found on PATH.
    set "EXIT_CODE=1"
    goto :finish
)

if not exist source-downloads mkdir source-downloads

echo --- Download WCVP + WGSRPD sources ---
python scripts\download_sources.py --all --dir source-downloads --map-out data\level3.geojson
if errorlevel 1 (
    echo ERROR: Source download failed. The pipeline has stopped.
    set "EXIT_CODE=1"
    goto :finish
)

echo.
echo --- Import WCVP accepted species ---
python scripts\import_wcvp.py --zip source-downloads\wcvp_dwca.zip --limit 10000 --out data\catalog
if errorlevel 1 (
    echo ERROR: WCVP import failed. The pipeline has stopped.
    set "EXIT_CODE=1"
    goto :finish
)

if not exist data\catalog\index.json (
    echo ERROR: WCVP import did not create data\catalog\index.json. The pipeline has stopped.
    set "EXIT_CODE=1"
    goto :finish
)

echo.
echo --- Match species to GBIF COL XR ---
python scripts\match_gbif.py --catalog data\catalog --max 10000 --delay 0.2
if errorlevel 1 (
    echo ERROR: GBIF matching failed. The pipeline has stopped.
    set "EXIT_CODE=1"
    goto :finish
)

echo.
echo --- Apply curated invasive records ---
python scripts\apply_invasive.py --catalog data\catalog --csv data\sources\invasive.csv
if errorlevel 1 (
    echo ERROR: Invasive-data step failed. The pipeline has stopped.
    set "EXIT_CODE=1"
    goto :finish
)

echo.
echo --- Build client-side search index ---
python scripts\build_search_index.py data\catalog
if errorlevel 1 (
    echo ERROR: Search-index build failed. The pipeline has stopped.
    set "EXIT_CODE=1"
    goto :finish
)

echo.
echo --- Validate generated catalog ---
python scripts\validate_catalog.py data\catalog
if errorlevel 1 (
    echo ERROR: Catalog validation failed. The pipeline has stopped.
    set "EXIT_CODE=1"
    goto :finish
)

echo.
echo ================================================
echo SUCCESS: Plant Atlas 10,000-species import completed.
echo ================================================
goto :finish

:finish
echo.
if "%EXIT_CODE%"=="1" (
    echo The import failed. Copy the error text above if you need help diagnosing it.
) else (
    echo The import finished successfully.
)
echo.
echo The window will stay open so you can copy the output.
pause
exit /b %EXIT_CODE%
