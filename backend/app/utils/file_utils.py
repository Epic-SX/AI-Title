import os
import re
from typing import List, Dict, Tuple

def is_image_file(filename: str) -> bool:
    """Check if file is an image based on extension."""
    allowed_extensions = {'jpg', 'jpeg', 'png', 'webp'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions

def extract_product_id(filename: str) -> Tuple[bool, str]:
    """
    Extract product ID from filename.
    Returns a tuple with:
    - Success flag (True if ID was found, False otherwise)
    - Product ID string if found, filename without extension otherwise
    
    Pattern examples:
    - 1503050030649.jpg -> 1503050030649 (13-digit management number)
    - 1503050030649_1.jpg -> 1503050030649 (13-digit management number)
    - 1503050030649_2.jpg -> 1503050030649 (13-digit management number)
    - any_other_name.jpg -> any_other_name (fallback)
    """
    # Try the 13-digit pattern first (priority for management numbers)
    # This pattern captures the base 13-digit number before any underscore and suffix
    match = re.match(r'(\d{13})(?:_\d+)?\.(?:jpg|jpeg|png|webp)', filename, re.IGNORECASE)
    if match:
        return True, match.group(1)
    
    # Try any digit pattern as fallback
    match = re.match(r'(\d+)(?:_\d+)?\.(?:jpg|jpeg|png|webp)', filename, re.IGNORECASE)
    if match:
        return True, match.group(1)
    
    # Fallback: use the filename without extension as the product ID
    name_without_ext = os.path.splitext(filename)[0]
    # Remove any underscore suffix from the fallback name
    base_name = re.sub(r'_\d+$', '', name_without_ext)
    return True, base_name

def scan_directory_for_product_images(directory_path: str) -> List[str]:
    """
    Scan a directory for image files.
    Returns a list of full image paths.
    """
    if not os.path.exists(directory_path):
        raise FileNotFoundError(f"Directory not found: {directory_path}")
    
    image_paths = []
    
    # Walk through directory
    for root, _, files in os.walk(directory_path):
        for file in files:
            if is_image_file(file):
                image_paths.append(os.path.join(root, file))
    
    return image_paths

def group_images_by_product_id(image_paths: List[str]) -> Dict[str, List[str]]:
    """
    Group image paths by product ID extracted from filenames.
    Returns a dictionary with product IDs as keys and lists of image paths as values.
    """
    product_groups = {}
    
    for image_path in image_paths:
        filename = os.path.basename(image_path)
        success, product_id = extract_product_id(filename)
        
        if success:
            if product_id not in product_groups:
                product_groups[product_id] = []
            product_groups[product_id].append(image_path)
        
    return product_groups 