@echo off
echo Setting up server environment...

:: Check if virtual environment exists and create if necessary
if not exist "venv\" (
    echo Creating virtual environment...
    python -m venv venv
    
    :: Activate the virtual environment
    echo Activating virtual environment...
    call venv\Scripts\activate.bat
    
    :: Install required packages
    echo Installing required packages...
    pip install -r requirements.txt
    
    :: Create a marker file with requirements.txt timestamp to indicate dependencies are installed
    copy requirements.txt venv\requirements_installed.txt > nul
    echo %DATE% %TIME% > venv\dependencies_installed.marker
) else (
    :: Check if the marker file exists or if requirements.txt has changed
    if not exist "venv\dependencies_installed.marker" (
        echo Marker file not found. Installing dependencies...
        call venv\Scripts\activate.bat
        pip install -r requirements.txt
        copy requirements.txt venv\requirements_installed.txt > nul
        echo %DATE% %TIME% > venv\dependencies_installed.marker
    ) else (
        :: Check if requirements.txt has changed by comparing with the saved copy
        fc /b requirements.txt venv\requirements_installed.txt > nul
        if errorlevel 1 (
            echo Requirements file has changed. Updating dependencies...
            call venv\Scripts\activate.bat
            pip install -r requirements.txt
            copy requirements.txt venv\requirements_installed.txt > nul
            echo %DATE% %TIME% > venv\dependencies_installed.marker
        ) else (
            echo Dependencies already installed. Skipping installation.
            :: Just activate the virtual environment
            call venv\Scripts\activate.bat
        )
    )
)

echo Server setup complete! 