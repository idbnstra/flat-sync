import os
import subprocess
import re
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="FlatSync Backend")

# Define the base directory (assume we are in the project root)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
IMAGES_DIR = os.path.join(BASE_DIR, "images")

# Ensure images directory exists
if not os.path.exists(IMAGES_DIR):
    os.makedirs(IMAGES_DIR)

class DownloadRequest(BaseModel):
    url: str
    quality: Optional[str] = "medium" # high, medium, low
    fov: Optional[int] = None

def parse_google_maps_url(url: str):
    """Extracts metadata from a Google Maps Street View URL."""
    data = {
        "pano_id": None,
        "lat": None,
        "lng": None,
        "heading": None,
        "pitch": None,
        "fov": None,
        "place_name": None,
        "is_short_link": False
    }
    
    # Check for short links
    if "maps.app.goo.gl" in url or "goo.gl/maps" in url:
        data["is_short_link"] = True
        return data

    # 1. Extract Pano ID
    # Look for !1s followed by exactly 22 chars (standard pano ID length)
    # We prioritize the !3m5!1s pattern which is most common for the primary pano
    pano_match = re.search(r"!1s([a-zA-Z0-9_-]{22})", url)
    if not pano_match:
        pano_match = re.search(r"panoid=([a-zA-Z0-9_-]{22})", url)
    if not pano_match:
        # Fallback to any !1s if 22-char check fails
        pano_match = re.search(r"!1s([^!&/]+)", url)
        
    if pano_match:
        data["pano_id"] = pano_match.group(1)
    
    # 2. Extract Coordinates
    coords_match = re.search(r"@(-?\d+\.\d+),(-?\d+\.\d+)", url)
    if coords_match:
        data["lat"] = coords_match.group(1)
        data["lng"] = coords_match.group(2)
        
    # 3. Extract View Parameters (FOV, Heading, Pitch)
    # Pattern: 3a,33.1y,260.96h,96.36t
    view_match = re.search(r"(\d+\.?\d*)a,(\d+\.?\d*)y,(\d+\.?\d*)h,(\d+\.?\d*)t", url)
    if view_match:
        data["fov"] = view_match.group(2) # 'y' is FOV/Zoom
        data["heading"] = view_match.group(3) # 'h' is Heading
        data["pitch"] = view_match.group(4) # 't' is Tilt/Pitch
        
    # 4. Extract Place Name
    place_match = re.search(r"/place/([^/@]+)", url)
    if place_match:
        data["place_name"] = place_match.group(1).replace('+', ' ')
        
    return data

@app.post("/api/download")
@app.post("/api/download/")
async def download_pano(request: DownloadRequest):
    metadata = parse_google_maps_url(request.url)
    
    if metadata["is_short_link"]:
        raise HTTPException(
            status_code=400, 
            detail="Short links (maps.app.goo.gl) are not supported. Please paste the full URL from your browser's address bar after the Street View has loaded."
        )

    pano_id = metadata["pano_id"]
    if not pano_id:
        raise HTTPException(
            status_code=400, 
            detail="Unexpected URL pattern: Could not extract a valid Pano ID. Please ensure you are copying the full URL while in Street View mode."
        )

    quality = request.quality.lower()
    if quality not in ["high", "medium", "low"]:
        quality = "medium"

    # Define a predictable filename
    filename = f"sv_{pano_id}_{quality}"
    if request.fov:
        filename += f"_fov{request.fov}"
    filename += ".jpg"
    
    file_path = os.path.join(IMAGES_DIR, filename)

    # Use the absolute path to the venv python and the script
    python_path = os.path.join(BASE_DIR, ".venv/bin/python3")
    sv_dl_path = os.path.join(BASE_DIR, ".venv/bin/streetview-dl")
    
    # Construct the command
    # Running the script via the venv python is more reliable than executing the script directly
    cmd = [python_path, sv_dl_path, "--output", filename]
    
    if quality != "medium":
        cmd.extend(["--quality", quality])
        
    if request.fov:
        cmd.extend(["--fov", str(request.fov)])

    cmd.append(request.url)

    try:
        print(f"Executing: {' '.join(cmd)} in {IMAGES_DIR}")
        # Use a longer timeout for high-quality downloads
        timeout = 120 if quality == "high" else 60
        
        result = subprocess.run(
            cmd, 
            cwd=IMAGES_DIR, 
            capture_output=True, 
            text=True,
            timeout=timeout
        )
        
        if result.returncode != 0:
            error_msg = result.stderr or result.stdout
            print(f"Download Error: {error_msg}")
            
            # Check for specific known errors
            if "Could not extract panorama ID" in error_msg:
                raise HTTPException(status_code=400, detail="Downloader failed to find Pano ID in this URL format.")
            
            raise HTTPException(status_code=500, detail=f"Download failed: {error_msg}")

        # Check if it actually exists
        if not os.path.exists(file_path):
            raise HTTPException(status_code=500, detail=f"Download completed but file was not saved.")

        # Return the metadata for the frontend
        name = metadata["place_name"] or f"SV: {metadata['lat'] or 'Unknown'}, {metadata['lng'] or 'Unknown'}"
        description = f"Imported from Google Street View"
        if metadata["place_name"]:
            description += f" ({metadata['place_name']})"
        if metadata["lat"] and metadata["lng"]:
            description += f" at {metadata['lat']}, {metadata['lng']}"

        return {
            "success": True,
            "panoId": pano_id,
            "filename": filename,
            "imageUrl": f"images/{filename}",
            "name": name,
            "description": description,
            "metadata": metadata
        }

    except subprocess.TimeoutExpired:
        print(f"Download timed out after {timeout} seconds")
        raise HTTPException(status_code=504, detail=f"Download timed out. Please try a lower quality setting or try again later.")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Exception during download: {str(e)}")
        # Ensure we always return JSON even on internal errors
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

# Serve static files
app.mount("/", StaticFiles(directory=BASE_DIR, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
