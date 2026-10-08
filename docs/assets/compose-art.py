#!/usr/bin/env python3
"""Composes the pictures of the shipwreck coast and the woods from pieces of the Ninja Adventure pack.

The pack (CC0, Pixel-Boy and AAA) is not in the repository. Pass the folder that holds `Backgrounds`, `Actor`, `Items`
and `FX` as --pack; the pictures are written under public/art/ and are committed with it. Run it again to remake them:

    python docs/assets/compose-art.py --pack "<path to Ninja Adventure - Asset Pack>"
    python docs/assets/compose-art.py --pack "<path>" terrain-water monster-crab    (only these)

Every picture is cut from named pieces of the pack and put together here; nothing is drawn by hand except where a
function says "small touch". docs/assets/licences.md lists each result and the pieces it was made from.
"""
import argparse
import os
import sys

from PIL import Image

TILE = 16

# The thirteen pieces of an autotile family, as (name, column, row) from the top-left tile of the family: the middle, the
# four edges, the four outer corners, and the four inner corners (the neighbour across the corner is the only one that
# is outside). "Outside" is the terrain that the family borders (sand or grass); "inside" is the terrain it is drawn for.
KEY_PIECES = [
    ('C', 1, 1), ('T', 1, 0), ('B', 1, 2), ('L', 0, 1), ('R', 2, 1),
    ('TL', 0, 0), ('TR', 2, 0), ('BL', 0, 2), ('BR', 2, 2),
    ('INW', 6, 2), ('INE', 5, 2), ('ISW', 6, 1), ('ISE', 5, 1),
]
KEY_COUNT = len(KEY_PIECES)


class Pack:
    def __init__(self, root):
        self.root = root

    def image(self, *parts):
        return Image.open(os.path.join(self.root, *parts)).convert('RGBA')

    def tileset(self, name):
        return self.image('Backgrounds', 'Tilesets', name + '.png')


def cut(img, col, row, cols=1, rows=1, size=TILE):
    return img.crop((col * size, row * size, (col + cols) * size, (row + rows) * size))


def frames_sheet(frames, columns, cell=(TILE, TILE)):
    """The frames side by side, `columns` to a row, row by row, as the manifest's `sheet` numbers them."""
    rows = -(-len(frames) // columns)
    out = Image.new('RGBA', (columns * cell[0], rows * cell[1]), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        out.paste(frame, ((index % columns) * cell[0], (index // columns) * cell[1]))
    return out


def recolour(img, mapping):
    """Swaps exact colours, `{(r, g, b): (r, g, b)}`; alpha stays."""
    out = img.copy()
    pixels = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = pixels[x, y]
            if (r, g, b) in mapping:
                pixels[x, y] = (*mapping[(r, g, b)], a)
    return out


def hexrgb(text):
    return tuple(int(text[i:i + 2], 16) for i in (1, 3, 5))


def key_pieces(tileset, base_row):
    return [cut(tileset, col, base_row + row) for _, col, row in KEY_PIECES]


# ---------------------------------------------------------------------------------------------------------------------
# Terrain. Every sheet is made of 16 by 16 frames; the adapter (src/adapter/terrain-baker.ts) knows which is which.


def terrain_water(pack):
    """Water with a shore: the thirteen pieces against sand, the thirteen against grass, then plain water."""
    water = pack.tileset('TilesetWater')
    plain = [cut(water, 1, 1), cut(water, 11, 2)]
    return frames_sheet(key_pieces(water, 0) + key_pieces(water, 6) + plain, KEY_COUNT)


def terrain_sand(pack):
    """Sand: the thirteen pieces of its edge against grass, then the plain ground."""
    floor = pack.tileset('TilesetFloor')
    to_sand = {hexrgb('#d3865f'): hexrgb('#ffcb8d'), hexrgb('#bd7959'): hexrgb('#ffcb8d')}
    edge = [recolour(piece, to_sand) for piece in key_pieces(floor, 7)]
    ground = [cut(floor, 1, 1), cut(floor, 0, 4), cut(floor, 1, 4)]
    return frames_sheet(edge + ground, KEY_COUNT)


def terrain_grass(pack):
    floor = pack.tileset('TilesetFloor')
    ground = [cut(floor, c, 12) for c in range(5)] + [cut(floor, 2, 11), cut(floor, 3, 11)]
    return frames_sheet(ground, 7)


def terrain_rock(pack):
    """The face of a cliff, three rows (the lip, the middle, the foot) by three columns (left, middle, right)."""
    relief = pack.tileset('TilesetRelief')
    return frames_sheet([cut(relief, c, r) for r in (5, 6, 7) for c in (4, 5, 6)], 3)


def forest_floor(seed):
    """A flat dark green tile in the pack's greens with a few darker and lighter flecks (a small touch, no pack file)."""
    tile = Image.new('RGBA', (TILE, TILE), (*hexrgb('#345a52'), 255))
    pixels = tile.load()
    state = seed
    for colour, count, width in (('#2a4a44', 8, 2), ('#4a7f4b', 5, 1)):
        for _ in range(count):
            state = (state * 1103515245 + 12345) & 0x7FFFFFFF
            x, y = (state >> 8) % (TILE - width), (state >> 16) % TILE
            for dx in range(width):
                pixels[x + dx, y] = (*hexrgb(colour), 255)
    return tile


def mini_tree(nature, shade=None):
    """A tree for one tile: the canopy of the thin tree without its middle rows, on the top of its trunk."""
    canopy, trunk = cut(nature, 13, 16), cut(nature, 13, 17)
    if shade:
        canopy = recolour(canopy, shade)
    tree = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
    tree.alpha_composite(canopy.crop((0, 0, TILE, 6)), (0, 0))
    tree.alpha_composite(canopy.crop((0, 9, TILE, TILE)), (0, 6))
    tree.alpha_composite(trunk.crop((0, 0, TILE, 3)), (0, 13))
    return tree


def terrain_tree(pack):
    """Woodland: dark forest floor, one-tile trees, and the four quarters of four two-by-two trees."""
    nature = pack.tileset('TilesetNature')
    green = {hexrgb('#adbc3a'): hexrgb('#74a334'), hexrgb('#74a334'): hexrgb('#4a7f4b'), hexrgb('#4a7f4b'): hexrgb('#345a52')}
    out = Image.new('RGBA', (8 * TILE, 3 * TILE), (0, 0, 0, 0))
    row0 = [forest_floor(7), forest_floor(31), mini_tree(nature), mini_tree(nature, green)]
    for index, frame in enumerate(row0):
        out.paste(frame, (index * TILE, 0))
    for variant, (col, row) in enumerate([(0, 0), (2, 0), (6, 0), (16, 0)]):
        for dy in (0, 1):
            for dx in (0, 1):
                out.paste(cut(nature, col + dx, row + dy), ((variant * 2 + dx) * TILE, (1 + dy) * TILE))
    return out


def terrain_wreckage(pack):
    boat = pack.image('Backgrounds', 'Vehicles', 'Boat.png')
    return frames_sheet([cut(boat, c, r) for r in (0, 1) for c in range(5)], 5)


# ---------------------------------------------------------------------------------------------------------------------
# Monsters. Every sheet has four columns, the way it faces (down, up, left, right), and these rows: the frames of the walk,
# then one row of the hurt flash (a white shape) and one of the wind-up (tinted red). The pack's animals are drawn from the
# side with two frames: left is the mirror of right, and down and up repeat right.


def white_shape(frame):
    out = frame.copy()
    pixels = out.load()
    for y in range(out.height):
        for x in range(out.width):
            if pixels[x, y][3] > 0:
                pixels[x, y] = (255, 255, 255, pixels[x, y][3])
    return out


def red_shape(frame):
    out = frame.copy()
    pixels = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = pixels[x, y]
            if a > 0 and (r, g, b) != hexrgb('#141b1b'):
                pixels[x, y] = (min(255, r // 2 + 150), g // 3 + 20, b // 3 + 15, a)
    return out


def monster_sheet(walk):
    """`walk[frame][direction]` as images of one size; returns the sheet with the hurt and the wind-up rows added."""
    rows = walk + [[white_shape(f) for f in walk[0]], [red_shape(f) for f in walk[0]]]
    cell = rows[0][0].size
    return frames_sheet([f for row in rows for f in row], 4, cell)


def monster_four_ways(pack, folder, name):
    sprite = pack.image('Actor', 'Monster', folder, name)
    return monster_sheet([[cut(sprite, d, f) for d in range(4)] for f in range(4)])


def monster_side(pack, folder, name):
    sprite = pack.image('Actor', 'Animal', folder, name)
    width = sprite.width // 2
    right = [sprite.crop((i * width, 0, (i + 1) * width, sprite.height)) for i in range(2)]
    left = [frame.transpose(Image.FLIP_LEFT_RIGHT) for frame in right]
    return monster_sheet([[right[i], right[i], left[i], right[i]] for i in range(2)])


BUILDERS = {
    'terrain-water': terrain_water,
    'terrain-sand': terrain_sand,
    'terrain-grass': terrain_grass,
    'terrain-rock': terrain_rock,
    'terrain-tree': terrain_tree,
    'terrain-wreckage': terrain_wreckage,
    'monster-crab': lambda pack: monster_four_ways(pack, 'Mollusc', 'Mollusc.png'),
    'monster-slime': lambda pack: monster_four_ways(pack, 'Slime', 'Slime.png'),
    'monster-spitter': lambda pack: monster_four_ways(pack, 'Mushroom', 'mushroom.png'),
    'monster-wolf': lambda pack: monster_side(pack, 'DogBlack', 'SpriteSheet.png'),
    'monster-boar': lambda pack: monster_side(pack, 'WildBoar', 'SpriteSheet.png'),
}


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--pack', required=True, help='the folder "Ninja Adventure - Asset Pack"')
    parser.add_argument('--out', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'art'))
    parser.add_argument('names', nargs='*', help='the pictures to make (default: all)')
    args = parser.parse_args()
    pack = Pack(args.pack)
    names = args.names or list(BUILDERS)
    unknown = [name for name in names if name not in BUILDERS]
    if unknown:
        sys.exit('unknown picture: ' + ', '.join(unknown))
    os.makedirs(args.out, exist_ok=True)
    for name in names:
        picture = BUILDERS[name](pack)
        picture.save(os.path.join(args.out, name + '.png'))
        print(f'{name}.png {picture.width}x{picture.height}')


if __name__ == '__main__':
    main()
