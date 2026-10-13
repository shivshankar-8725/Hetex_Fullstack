import os
import zipfile
import sys

root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
zip_path = os.path.join(root_dir, 'project-hostinger-deploy.zip')

# Specific files and directories to include in public_html
includes = [
    'index.html',
    'login.html',
    'register.html',
    'forgot-password.html',
    'dashboard.html',
    'admin.html',
    'track-public.html',
    'logo.jpeg',
    'favicon.ico',
    '.htaccess',
    'api',
    '_next'
]

print(f"Creating Linux-compatible deployment package: {zip_path}")

# Remove existing zip if present
if os.path.exists(zip_path):
    os.remove(zip_path)

with zipfile.ZipFile(zip_path, 'w', compression=zipfile.ZIP_DEFLATED) as zipf:
    for item in includes:
        full_item_path = os.path.join(root_dir, item)
        if not os.path.exists(full_item_path):
            print(f"Warning: {item} not found, skipping.")
            continue
        
        if os.path.isfile(full_item_path):
            # Crucial: Must use forward slash '/' for Linux Hostinger extract
            arcname = item.replace('\\', '/')
            zipf.write(full_item_path, arcname)
            print(f"  + Added file: {arcname}")
        elif os.path.isdir(full_item_path):
            for dirpath, dirnames, filenames in os.walk(full_item_path):
                # Filter out unwanted items like .git, cache, etc.
                dirnames[:] = [d for d in dirnames if not d.startswith('.')]
                for filename in filenames:
                    if filename.startswith('.') and filename != '.htaccess':
                        continue
                    file_full_path = os.path.join(dirpath, filename)
                    rel_path = os.path.relpath(file_full_path, root_dir)
                    # Convert ALL backslashes to forward slashes for Linux compatibility
                    arcname = rel_path.replace('\\', '/')
                    zipf.write(file_full_path, arcname)

size = os.path.getsize(zip_path)
print(f"\nSUCCESS: Linux-compatible ZIP created!")
print(f"File size: {size:,} bytes ({size / 1024:.1f} KB)")
