#!/usr/bin/env python3
"""Makes the source picture of the desktop app's icon (ADR 0006): the first frame of the hero (public/art/hero.png, the
hero facing down) scaled up without smoothing onto a rounded square of the sea. It needs only Pillow and the repository;
the pack is not needed. Run it again to remake src-tauri/app-icon.png, then let Tauri cut the icon files from it:

    python docs/assets/make-app-icon.py
    npx tauri icon src-tauri/app-icon.png

The sea's colour is drawn here, not cut from the pack; docs/assets/licences.md lists the result under A1.
"""
import os

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FRAME = 16
SIZE = 1024
SCALE = 48  # 16 px times 48 is 768 px: the hero fills three quarters of the icon.
SEA = (46, 124, 168, 255)


def main():
    sheet = Image.open(os.path.join(ROOT, 'public', 'art', 'hero.png')).convert('RGBA')
    hero = sheet.crop((0, 0, FRAME, FRAME)).resize((FRAME * SCALE, FRAME * SCALE), Image.NEAREST)
    icon = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    ImageDraw.Draw(icon).rounded_rectangle((0, 0, SIZE - 1, SIZE - 1), radius=SIZE // 6, fill=SEA)
    offset = (SIZE - hero.width) // 2
    icon.alpha_composite(hero, (offset, offset))
    out = os.path.join(ROOT, 'src-tauri', 'app-icon.png')
    icon.save(out)
    print('wrote', os.path.relpath(out, ROOT))


if __name__ == '__main__':
    main()
