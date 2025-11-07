@echo off
echo ======================================
echo HTML to PPT Converter Setup
echo ======================================
echo.

echo [1/4] Installing Python packages...
pip install -r requirements.txt

echo.
echo [2/4] Installing Playwright browsers...
playwright install chromium

echo.
echo [3/4] Setup complete!
echo.
echo [4/4] Running conversion script...
python html_to_ppt.py

echo.
echo ======================================
echo Conversion complete!
echo Check Tractrix_Presentation.pptx
echo ======================================
pause
