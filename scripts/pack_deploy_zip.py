import os
import zipfile
import sys
import time
import shutil

root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
zip_path = os.path.join(root_dir, 'project-hostinger-deploy.zip')
alt_zip_path = os.path.join(root_dir, 'hetex-courier-deploy.zip')

# Specific files and directories to include for Hostinger public_html
includes = [
    'index.html',
    'login.html',
    'register.html',
    'forgot-password.html',
    'dashboard.html',
    'admin.html',
    'track-public.html',
    'courier_brand.js',
    'notification_manager.js',
    'platform_settings.json',
    'platform_addresses.json',
    'serve.js',
    'package.json',
    'logo.jpeg',
    'hero-delivery.jpg',
    'favicon.ico',
    'favicon.png',
    '.htaccess',
    'images',
    'api',
    '_next',
    'scripts'
]

print(f"Creating Linux-compatible deployment package: {zip_path}")

# Remove existing zips if present
for p in [zip_path, alt_zip_path]:
    if os.path.exists(p):
        try:
            os.remove(p)
        except Exception as e:
            print(f"Note: Could not remove old {p}: {e}")

added_dirs = set()

def to_unix_path(path_str):
    """Normalize any path to strictly forward-slash Linux format without leading slash."""
    clean = path_str.replace('\\', '/').strip('/')
    return clean

def add_dir(zipf, dir_arcname, mtime_tuple=None):
    """Explicitly create a Unix directory entry (drwxr-xr-x)."""
    clean_dir = to_unix_path(dir_arcname)
    if not clean_dir:
        return
    if not clean_dir.endswith('/'):
        clean_dir += '/'

    # Ensure parent directories exist first
    parts = clean_dir.strip('/').split('/')
    accum = ''
    for part in parts:
        accum += part + '/'
        if accum not in added_dirs:
            dinfo = zipfile.ZipInfo(accum, date_time=mtime_tuple or (2026, 1, 1, 0, 0, 0))
            dinfo.create_system = 3  # 3 = UNIX
            dinfo.external_attr = 0o040755 << 16  # drwxr-xr-x
            zipf.writestr(dinfo, b'')
            added_dirs.add(accum)
            print(f"  [DIR]  {accum}")

def add_file(zipf, file_full_path, file_arcname):
    """Explicitly create a Unix file entry (-rw-r--r--)."""
    clean_arcname = to_unix_path(file_arcname)
    
    # Ensure parent directory entry exists first
    parent_dir = os.path.dirname(clean_arcname).replace('\\', '/')
    if parent_dir:
        add_dir(zipf, parent_dir)

    mtime = time.localtime(os.path.getmtime(file_full_path))[:6]
    finfo = zipfile.ZipInfo(clean_arcname, date_time=mtime)
    finfo.compress_type = zipfile.ZIP_DEFLATED
    finfo.create_system = 3  # 3 = UNIX
    finfo.external_attr = 0o100644 << 16  # -rw-r--r--

    with open(file_full_path, 'rb') as f:
        zipf.writestr(finfo, f.read())
    print(f"  [FILE] {clean_arcname}")

with zipfile.ZipFile(zip_path, 'w', compression=zipfile.ZIP_DEFLATED) as zipf:
    for item in includes:
        full_item_path = os.path.join(root_dir, item)
        if not os.path.exists(full_item_path):
            print(f"Warning: {item} not found, skipping.")
            continue

        if os.path.isfile(full_item_path):
            add_file(zipf, full_item_path, item)

        elif os.path.isdir(full_item_path):
            add_dir(zipf, item)
            for dirpath, dirnames, filenames in os.walk(full_item_path):
                # Filter out hidden or build cache directories
                dirnames[:] = [d for d in dirnames if not d.startswith('.')]

                rel_dir = os.path.relpath(dirpath, root_dir)
                add_dir(zipf, rel_dir)

                for filename in filenames:
                    if filename.startswith('.') and filename != '.htaccess':
                        continue
                    file_full = os.path.join(dirpath, filename)
                    rel_file = os.path.relpath(file_full, root_dir)
                    add_file(zipf, file_full, rel_file)

# Also duplicate to hetex-courier-deploy.zip so both names work seamlessly
shutil.copyfile(zip_path, alt_zip_path)

size = os.path.getsize(zip_path)
print(f"\n========================================================")
print(f"SUCCESS: Linux-native Unix ZIP archive generated!")
print(f"Primary zip:     {zip_path} ({size / 1024:.1f} KB)")
print(f"Alternative zip: {alt_zip_path} ({size / 1024:.1f} KB)")
print(f"Total directory entries: {len(added_dirs)}")
print(f"Target system:   UNIX (create_system=3, permissions 755/644)")
print(f"========================================================")
