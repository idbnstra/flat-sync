import re

def parse_google_maps_url(url):
    data = {}
    
    # Extract Pano ID
    # Pattern: !1s([^!]+)
    pano_match = re.search(r"!1s([^!]+)", url)
    if pano_match:
        data['pano_id'] = pano_match.group(1)
    
    # Extract Coordinates (lat, lng)
    # Pattern: @(-?\d+\.\d+),(-?\d+\.\d+)
    coords_match = re.search(r"@(-?\d+\.\d+),(-?\d+\.\d+)", url)
    if coords_match:
        data['lat'] = coords_match.group(1)
        data['lng'] = coords_match.group(2)
        
    # Extract View Parameters (zoom/fov, heading, pitch)
    # Pattern: (\d+\.?\d*)a,(\d+\.?\d*)y,(\d+\.?\d*)h,(\d+\.?\d*)t
    # Note: Sometimes it's just 3a,33.1y,260.96h,96.36t
    view_match = re.search(r"(\d+\.?\d*)a,(\d+\.?\d*)y,(\d+\.?\d*)h,(\d+\.?\d*)t", url)
    if view_match:
        data['fov'] = view_match.group(1)
        data['heading'] = view_match.group(2)
        data['pitch'] = view_match.group(3)
        # 4th is tilt/roll? usually ignored or 90t/0t
        
    # Extract Place Name
    # Pattern: /place/([^/@]+)
    place_match = re.search(r"/place/([^/@]+)", url)
    if place_match:
        data['place'] = place_match.group(1).replace('+', ' ')
        
    return data

url = "https://www.google.com/maps/place/Fort+Dodge,+IA+50501/@42.5052692,-94.1860801,3a,33.1y,260.96h,96.36t/data=!3m7!1e1!3m5!1sF6pUEV2NwnYcO3CWvRUuWQ!2e0!6shttps:%2F%2Fstreetviewpixels-pa.googleapis.com%2Fv1%2Fthumbnail%3Fcb_client%3Dmaps_sv.tactile%26w%3D900%26h%3D600%26pitch%3D-6.359679790340607%26panoid%3DF6pUEV2NwnYcO3CWvRUuWQ%26yaw%3D260.96212042308775!7i16384!8i8192!4m7!3m6!1s0x87ed8835c00b036f:0x7b4a9a8e03adc42d!8m2!3d42.4974694!4d-94.1680158!10e5!16zL20vMHQ0YzE?entry=ttu&g_ep=EgoyMDI2MDQyMi4wIKXMDSoASAFQAw%3D%3D"

print(parse_google_maps_url(url))
