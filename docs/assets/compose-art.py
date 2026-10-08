#!/usr/bin/env python3
"""Composes pictures from pieces of the Ninja Adventure pack: the ground and the monsters of the shipwreck coast and the
woods, the ground of the mountain and of the cave, the props every area shares, and the icons of the two bows.

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


# The wreck. The sheet is 13 columns by 5 rows of 16 by 16 frames and src/adapter/terrain-plan.ts knows which is which:
#   row 0      the deck in the thirteen pieces of an edge (the order of KEY_PIECES)
#   row 1      frame 13 and 14 plain deck, 15 a hole in the deck, 16 to 20 the cargo (barrel, sack, rope, bones, planks)
#   rows 2-4   the mast, three by three frames at columns 0-2 (frame 26 + 13 * row + column)
#   row 2      frame 30 and 31, the two halves of a broken mast lying on the sand (a picture of 32 by 16)
LIGHT, PLANK, SEAM, WALL, DARK, OUTLINE = (hexrgb(text) for text in ('#ffad5d', '#f38c4c', '#e66a3a', '#965746', '#7d3e24', '#141b1b'))
DECK_PIECES = [name for name, _, _ in KEY_PIECES]
PIECE_OUTSIDE = {
    'C': set(), 'T': {'n'}, 'B': {'s'}, 'L': {'w'}, 'R': {'e'},
    'TL': {'n', 'w'}, 'TR': {'n', 'e'}, 'BL': {'s', 'w'}, 'BR': {'s', 'e'},
    'INW': {'nw'}, 'INE': {'ne'}, 'ISW': {'sw'}, 'ISE': {'se'},
}
# The pack's dock turned on its side has seams on rows 3, 9 and 14, so a deck tile is three bands of planks.
SEAM_ROWS = (3, 9, 14)
BAND_ROWS = ((15, 0, 1, 2, 3), (4, 5, 6, 7, 8, 9), (10, 11, 12, 13, 14))
BAND_OF = {row: band for band, rows in enumerate(BAND_ROWS) for row in rows}
# Where the hull is broken off at the west and the east end, each band of planks reaches this far in.
BREAK_WEST = (1, 3, 0)
BREAK_EAST = (2, 0, 3)
JOINTS = {'a': {1: 4}, 'b': {0: 11, 2: 2}}
GRAIN = {'a': [(2, 1), (3, 1), (12, 6), (13, 6), (6, 12), (7, 12)], 'b': [(10, 0), (11, 0), (2, 7), (3, 7), (13, 11), (12, 11)]}


def weathered_deck(pack, variant):
    """The dock planks of the pack, on their side, weathered: darker seams, the joints of the planks and some grain."""
    deck = recolour(cut(pack.tileset('TilesetWater'), 1, 13).rotate(90), {LIGHT: PLANK, SEAM: WALL})
    pixels = deck.load()
    for y in range(TILE):
        if y not in SEAM_ROWS and BAND_OF[y] in JOINTS[variant]:
            pixels[JOINTS[variant][BAND_OF[y]], y] = (*WALL, 255)
    for x, y in GRAIN[variant]:
        pixels[x, y] = (*SEAM, 255)
    return deck


def deck_frame(deck, outside):
    """One piece of the deck. `outside` names the neighbours (n, e, s, w, nw, ne, se, sw) that are not wreck.

    Every quarter of the frame is made from the three neighbours that touch it, as the plan takes its quarters, so quarters
    of different frames fit together: the north side is the far bulwark, the south side the hull with its portholes, the west
    and east sides the broken ends of the planks."""
    base = deck.load()
    colour = {(x, y): base[x, y][:3] for x in range(TILE) for y in range(TILE)}
    inside = {(x, y): True for x in range(TILE) for y in range(TILE)}
    quarter = {}
    for y in range(TILE):
        for x in range(TILE):
            top, left = y < TILE // 2, x < TILE // 2
            vertical, horizontal = 'n' if top else 's', 'w' if left else 'e'
            v, h, d = vertical in outside, horizontal in outside, vertical + horizontal in outside
            quarter[x, y] = (v, h)
            dx, dy = (x if left else TILE - 1 - x), (y if top else TILE - 1 - y)
            if h and dx < (BREAK_WEST if left else BREAK_EAST)[BAND_OF[y]]:
                inside[x, y] = False
            if v and h and dx + dy < 3:
                inside[x, y] = False
            if v and top:
                colour[x, y] = {1: LIGHT, 2: WALL, 3: WALL, 4: DARK}.get(y, colour[x, y])
                if y in (2, 3) and x % 4 == 0:
                    colour[x, y] = DARK
            if v and not top:
                colour[x, y] = {9: DARK, 10: LIGHT, 11: PLANK, 12: PLANK, 13: SEAM, 14: WALL}.get(y, colour[x, y])
                if y in (11, 12) and x % 8 in (2, 3, 4):
                    colour[x, y] = OUTLINE
            if d and not v and not h and dx + dy == 0:
                colour[x, y] = OUTLINE
            if d and not v and not h and dx + dy == 1:
                colour[x, y] = WALL
    out = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
    pixels = out.load()
    for (x, y), here in inside.items():
        if not here:
            continue
        v, h = quarter[x, y]
        beyond = [(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))]
        edge = any(
            (not (0 <= nx < TILE and 0 <= ny < TILE) and ((h if nx != x else v)))
            or ((0 <= nx < TILE and 0 <= ny < TILE) and not inside[nx, ny])
            for nx, ny in beyond
        )
        pixels[x, y] = (*(OUTLINE if edge else colour[x, y]), 255)
    return out


def deck_hole(deck):
    """Planks with a ragged hole in them; the ground shows through."""
    tile = deck.copy()
    pixels = tile.load()
    rows = {4: (5, 10), 5: (4, 11), 6: (3, 12), 7: (3, 12), 8: (4, 11), 9: (6, 10)}
    hole = {(x, y) for y, (a, b) in rows.items() for x in range(a, b + 1)}
    for x, y in hole:
        pixels[x, y] = (0, 0, 0, 0)
    for x in range(TILE):
        for y in range(TILE):
            if (x, y) not in hole and any((x + dx, y + dy) in hole for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                pixels[x, y] = (*OUTLINE, 255)
    for x, y in ((6, 3), (9, 3), (2, 6), (13, 7), (7, 10)):
        pixels[x, y] = (*DARK, 255)
    return tile


def on_deck(deck, *pieces):
    """Pieces of the pack laid on a plain deck tile: (image, x, y)."""
    tile = deck.copy()
    for piece, x, y in pieces:
        tile.alpha_composite(piece, (x, y))
    return tile


def terrain_wreckage(pack):
    deck_a, deck_b = weathered_deck(pack, 'a'), weathered_deck(pack, 'b')
    camp = pack.tileset('tileset_camp')
    detail = pack.tileset('TilesetFloorDetail')
    sheet = Image.new('RGBA', (KEY_COUNT * TILE, 5 * TILE), (0, 0, 0, 0))
    row0 = [deck_frame(deck_a, PIECE_OUTSIDE[name]) for name in DECK_PIECES]
    row1 = [
        row0[0], deck_frame(deck_b, set()), deck_hole(deck_a),
        on_deck(deck_a, (cut(camp, 9, 7), 0, 0)),
        on_deck(deck_a, (cut(camp, 5, 5), 0, 0)),
        on_deck(deck_a, (cut(camp, 11, 8), 0, 1)),
        on_deck(deck_a, (cut(detail, 13, 0), 2, 2), (cut(detail, 14, 0), 3, 9)),
        on_deck(deck_a, (cut(camp, 12, 8), 1, 3)),
    ]
    for index, frame in enumerate(row0 + row1):
        sheet.paste(frame, ((index % KEY_COUNT) * TILE, (index // KEY_COUNT) * TILE))
    sheet.paste(mast_picture(pack), (0, 2 * TILE))
    sheet.paste(broken_mast_picture(pack), (4 * TILE, 2 * TILE))
    return sheet


# The mountain and the cave. Their cliffs are the grey face of the pack's relief (the same nine pieces as terrain-rock, in
# the order of its rows and columns) with its colours swapped: slate for the mountain, and for the cave a darker, bluer
# stone. The boulders are the pack's small rocks in the slate. The cave's sand and grass are the sheets of the coast and
# the woods with every colour darkened, so the cave is dim in the ground itself, with nothing laid over what stands on it.
# src/adapter/terrain-plan.ts has the looks that name these sheets.
GREY_STONE = ('#5f7160', '#56634d', '#46402e', '#8d977f', '#f2eaf1', '#b6beb0')
SLATE = ('#6c7a8e', '#586579', '#3c4256', '#a3afc0', '#e4e9f1', '#c4ccd8')
CAVE_STONE = ('#454a63', '#383c53', '#262a3f', '#6b7191', '#8a90b0', '#7f86a6')
CAVE_FLOOR = {
    '#ffcb8d': '#a58459', '#fce2ca': '#c4a688', '#ffbc75': '#8f6f47',  # the sand, its light pebbles, its darker twigs
    '#adbc3a': '#5e7a38', '#a8a129': '#566e32',  # the grass
}


def stone(names):
    return {hexrgb(old): hexrgb(new) for old, new in zip(GREY_STONE, names)}


def stone_cliff(pack, names):
    """The face of a cliff in grey stone recoloured, three rows (the lip, the middle, the foot) by three columns (left,
    middle, right), as terrain-rock has them."""
    relief = pack.tileset('TilesetRelief')
    return frames_sheet([recolour(cut(relief, c, r), stone(names)) for r in (0, 1, 2) for c in (4, 5, 6)], 3)


def mountain_boulders(pack):
    """Four boulders, each on a tile of its own: the three small rocks of the nature set, and the round one of the relief's
    details."""
    nature, detail = pack.tileset('TilesetNature'), pack.tileset('TilesetReliefDetail')
    rocks = [cut(nature, col, 17) for col in (17, 18, 19)] + [cut(detail, 4, 0)]
    return frames_sheet([recolour(rock, stone(SLATE)) for rock in rocks], len(rocks))


def cave_floor(pack, make):
    """The ground of the coast or of the woods, in the dim colours of the cave: every colour of the sheet is in CAVE_FLOOR."""
    return recolour(make(pack), {hexrgb(old): hexrgb(new) for old, new in CAVE_FLOOR.items()})


def paint(img, pixels, colour):
    surface = img.load()
    for x, y in pixels:
        if 0 <= x < img.width and 0 <= y < img.height:
            surface[x, y] = (*colour, 255)


def outlined(img):
    """The picture with a dark outline drawn one pixel out around its shape."""
    out = img.copy()
    src, dst = img.load(), out.load()
    for y in range(img.height):
        for x in range(img.width):
            near = [(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))]
            if src[x, y][3] == 0 and any(0 <= nx < img.width and 0 <= ny < img.height and src[nx, ny][3] > 0 for nx, ny in near):
                dst[x, y] = (*OUTLINE, 255)
    return out


def torn_sail(img, x0, top, heights):
    """A rag of sail hanging from `top`: white, a little cream at its foot, a ragged lower edge (one height per column)."""
    for index, height in enumerate(heights):
        for row in range(height):
            colour = hexrgb('#eecf9b') if row >= height - 2 or index == len(heights) - 1 else (255, 255, 255)
            paint(img, [(x0 + index, top + row)], colour)


def mast_picture(pack):
    """A mast with a yard and a torn sail, three tiles by three. The foot is at the bottom of the middle tile; the top, the
    yard and the sail are over the tiles above and beside it. The pole is a small touch; the colours are the pack's."""
    art = Image.new('RGBA', (3 * TILE, 3 * TILE), (0, 0, 0, 0))
    for x, (first, colour) in {22: (3, LIGHT), 23: (5, PLANK), 24: (4, PLANK), 25: (6, WALL)}.items():
        paint(art, [(x, y) for y in range(first, 3 * TILE)], colour)
    for x in range(20, 28):
        colour = WALL if x in (20, 27) else LIGHT if x == 21 else PLANK
        paint(art, [(x, y) for y in range(41, 46)], colour)
    for x in range(9, 40):
        y = 9 + (x - 24) // 8
        paint(art, [(x, y)], LIGHT)
        paint(art, [(x, y + 1)], PLANK)
        paint(art, [(x, y + 2)], WALL)
    torn_sail(art, 27, 13, [17, 18, 16, 19, 17, 15, 16, 13, 14, 11, 12, 9, 10])
    torn_sail(art, 10, 11, [5, 6, 4, 7, 6, 8, 7, 9, 8, 10, 9])
    surface = art.load()
    for x in (33, 34, 35):
        for y in (21, 22):
            surface[x, y] = (0, 0, 0, 0)
    return outlined(art)


def broken_mast_picture(pack):
    """The two halves of a mast lying on the sand with its yard across it and a rag of its sail: 32 by 16."""
    art = Image.new('RGBA', (2 * TILE, TILE), (0, 0, 0, 0))
    for y, (first, colour) in {5: (3, LIGHT), 6: (2, PLANK), 7: (4, PLANK), 8: (2, WALL)}.items():
        paint(art, [(x, y) for x in range(first, 31)], colour)
    for x, colour in {18: LIGHT, 19: PLANK, 20: PLANK, 21: WALL}.items():
        paint(art, [(x, y) for y in range(1, 14)], colour)
    torn_sail(art, 22, 9, [5, 6, 4, 5, 6, 3, 4, 5, 2])
    return outlined(art)


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


def monster_four_ways(pack, folder, name, colours=None):
    sprite = pack.image('Actor', 'Monster', folder, name)
    if colours:
        sprite = recolour(sprite, {hexrgb(old): hexrgb(new) for old, new in colours.items()})
    return monster_sheet([[cut(sprite, d, f) for d in range(4)] for f in range(4)])


# The pack's mushroom has a red cap, as red as the crab and as the flash of a wind-up, so its cap is made purple: the red
# flash then shows on it, and the spitter has the colour its orbs have.
SPITTER_CAP = {'#e0394c': '#a15fd8', '#8f3e56': '#5e3a8c'}


def projectile_orb(pack):
    """The pack's energy ball in the colours of the spitter's cap, with the dark outline of the pack's creatures."""
    ball = pack.image('FX', 'Projectile', 'EnergyBall.png')
    ball = recolour(ball, {hexrgb('#8feff1'): hexrgb('#e3a6ff'), hexrgb('#79b8ce'): hexrgb('#a15fd8')})
    return outlined(ball)


def monster_side(pack, folder, name):
    sprite = pack.image('Actor', 'Animal', folder, name)
    width = sprite.width // 2
    right = [sprite.crop((i * width, 0, (i + 1) * width, sprite.height)) for i in range(2)]
    left = [frame.transpose(Image.FLIP_LEFT_RIGHT) for frame in right]
    return monster_sheet([[right[i], right[i], left[i], right[i]] for i in range(2)])


# ---------------------------------------------------------------------------------------------------------------------
# What every area shares (src/adapter/prop-sprites.ts): chests and caches, pickups, Checkpoints, exits, signs and doors.
# The cell of each is one tile with the picture standing at the foot of it; the Checkpoint's cell is taller.

POLE = hexrgb('#8f3e56')
CHECKPOINT_HEIGHT = 26
GOLD_LOCK = {'A': OUTLINE, 'L': LIGHT, 'o': SEAM}
LOCK_ROWS = ['.AAAA.', '.A..A.', 'AAAAAA', 'ALLLLA', 'ALAALA', 'AoAAoA', 'AAAAAA']
CHEVRON_ROWS = ['XX.....', '.XX....', '..XX...', '...XX..', '....XX.', '...XX..', '..XX...', '.XX....', 'XX.....']


def in_cell(frame, x, y, cell=(TILE, TILE)):
    out = Image.new('RGBA', cell, (0, 0, 0, 0))
    out.alpha_composite(frame, (x, y))
    return out


def stamp(img, rows, colours, x, y):
    """Sets the pixels of a picture of letters, one colour per letter and `.` for none, with its corner at x, y."""
    surface = img.load()
    for dy, row in enumerate(rows):
        for dx, letter in enumerate(row):
            if letter != '.':
                surface[x + dx, y + dy] = (*colours[letter], 255)


def stocked_crate(crate, things):
    """The crate with `things`, as (picture, x, y), standing in it: its near wall is drawn over their feet."""
    out = crate.copy()
    for picture, x, y in things:
        out.alpha_composite(picture, (x, y))
    out.alpha_composite(crate.crop((0, 10, TILE, TILE)), (0, 10))
    return out


def chest_sheet(pack):
    """Six frames: the chest of Gear, the cache of ammunition and the cache of potions, each closed and then open. A cache
    is the pack's empty crate with what it holds standing in it; opened, it is empty (G5 of the inventory)."""
    big = pack.image('Items', 'Treasure', 'BigTreasureChest.png')
    gear = [in_cell(big.crop((i * TILE, 0, (i + 1) * TILE, 14)), 0, 2) for i in range(2)]
    empty = in_cell(pack.image('Items', 'Object', 'CrateEmpty.png'), 0, 1)
    arrow = pack.image('Items', 'Weapons', 'Bow', 'Arrow.png').transpose(Image.ROTATE_90).crop((0, 0, 5, 10))
    pot = pack.image('Items', 'Potion', 'LifePot.png')
    arrows = stocked_crate(empty, [(arrow, 1, 2), (arrow, 5, 0), (arrow, 10, 2)])
    potions = stocked_crate(empty, [(pot, 0, 1), (pot, 7, 0)])
    return frames_sheet([*gear, arrows, empty, potions, empty], 6)


def twinkle(frame, x, y):
    """The frame with a small glint at x, y: a plus of five white pixels."""
    out = frame.copy()
    paint(out, [(x, y), (x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)], (255, 255, 255))
    return out


def pickup_sheet(pack):
    """Six frames, a Healing Potion, a bundle of arrows and a key, each plain and then with a glint: what lies on the ground."""
    pot = in_cell(pack.image('Items', 'Potion', 'LifePot.png'), 3, 3)
    arrow = pack.image('Items', 'Projectile', 'Arrow.png')
    arrows = in_cell(arrow, 0, 0)
    arrows.alpha_composite(arrow.transpose(Image.FLIP_LEFT_RIGHT), (0, 0))
    key = in_cell(pack.image('Items', 'Treasure', 'GoldKey.png'), 2, 4)
    return frames_sheet([pot, twinkle(pot, 12, 3), arrows, twinkle(arrows, 8, 2), key, twinkle(key, 13, 3)], 6)


def flagpole(flag, drop):
    """A Checkpoint: a pole as tall as the cell (a small touch: four columns of colour and its caps), with the pack's flag
    hung on it `drop` pixels lower than the pack hung it."""
    art = Image.new('RGBA', (TILE, CHECKPOINT_HEIGHT), (0, 0, 0, 0))
    last = CHECKPOINT_HEIGHT - 1
    paint(art, [(x, y) for y in range(4, last) for x in (3, 6)], OUTLINE)
    paint(art, [(x, y) for y in range(5, last) for x in (4, 5)], POLE)
    paint(art, [(x, y) for y in (4, last) for x in range(3, 7)], OUTLINE)
    art.alpha_composite(flag.crop((0, 0, TILE, 11)), (0, drop))
    return art


def checkpoint_sheet(pack):
    """Five frames: the grey flag of a Checkpoint the hero has not touched, half way down its pole and still, then the
    four of the red flag of the active one, waving at the top. Both are the same size."""
    flags = lambda colour: pack.image('Backgrounds', 'Animated', 'Flag', f'Flag{colour}16x16.png')
    grey = flags('Gray')
    red = flags('Red')
    still = flagpole(grey.crop((0, 0, TILE, TILE)), 10)
    waving = [flagpole(red.crop((i * TILE, 0, (i + 1) * TILE, TILE)), 0) for i in range(4)]
    return frames_sheet([still, *waving], 5, (TILE, CHECKPOINT_HEIGHT))


def exit_sheet(pack):
    """Four frames, an exit mark pointing up, down, left and right: two arrowheads painted on the ground, a small touch of
    code, white with the pack's dark outline. The adapter shows it see-through."""
    right = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
    for x in (2, 7):
        stamp(right, CHEVRON_ROWS, {'X': (242, 234, 241)}, x, 3)
    right = outlined(right)
    return frames_sheet([right.transpose(Image.ROTATE_90), right.transpose(Image.ROTATE_270),
                         right.transpose(Image.FLIP_LEFT_RIGHT), right], 4)


def door_sheet(pack):
    """Two frames: the pack's arched door of planks with a gold padlock on it, the colour of the key, and the same arch
    with the doorway open and dark."""
    house = pack.tileset('TilesetHouse')
    shut = cut(house, 8, 3)
    stamp(shut, LOCK_ROWS, GOLD_LOCK, 5, 7)
    return frames_sheet([shut, cut(house, 9, 3)], 2)


def bow_icon(pack, folder, shorter_by=0):
    """A bow of the pack turned a quarter, to stand upright like the icons of the swords: its string on the left, its belly
    on the right. Lying down, as the hero holds it, it reads as a bowl in the HUD and the inventory. A shorter bow has that
    many rows cut out of its middle, where the belly is straight, so that its tips and its curve stay whole."""
    bow = pack.image('Items', 'Weapons', folder, 'Sprite.png').transpose(Image.ROTATE_90)
    first = (bow.height - shorter_by) // 2
    out = Image.new('RGBA', (bow.width, bow.height - shorter_by), (0, 0, 0, 0))
    out.paste(bow.crop((0, 0, bow.width, first)), (0, 0))
    out.paste(bow.crop((0, first + shorter_by, bow.width, bow.height)), (0, first))
    return out


BUILDERS = {
    'gear-short-bow': lambda pack: bow_icon(pack, 'Bow', shorter_by=2),
    'gear-long-bow': lambda pack: bow_icon(pack, 'Bow2'),
    'terrain-water': terrain_water,
    'terrain-sand': terrain_sand,
    'terrain-grass': terrain_grass,
    'terrain-rock': terrain_rock,
    'terrain-tree': terrain_tree,
    'terrain-wreckage': terrain_wreckage,
    'mountain-cliff': lambda pack: stone_cliff(pack, SLATE),
    'mountain-boulders': mountain_boulders,
    'cave-cliff': lambda pack: stone_cliff(pack, CAVE_STONE),
    'cave-sand': lambda pack: cave_floor(pack, terrain_sand),
    'cave-grass': lambda pack: cave_floor(pack, terrain_grass),
    'monster-crab': lambda pack: monster_four_ways(pack, 'Mollusc', 'Mollusc.png'),
    'monster-slime': lambda pack: monster_four_ways(pack, 'Slime', 'Slime.png'),
    'monster-spitter': lambda pack: monster_four_ways(pack, 'Mushroom', 'mushroom.png', SPITTER_CAP),
    'projectile-orb': projectile_orb,
    'fx-puff': lambda pack: pack.image('FX', 'Smoke', 'Smoke', 'SpriteSheet.png'),
    'monster-wolf': lambda pack: monster_side(pack, 'DogBlack', 'SpriteSheet.png'),
    'monster-boar': lambda pack: monster_side(pack, 'WildBoar', 'SpriteSheet.png'),
    'prop-chest': chest_sheet,
    'prop-pickup': pickup_sheet,
    'prop-checkpoint': checkpoint_sheet,
    'prop-exit': exit_sheet,
    'prop-door': door_sheet,
    'prop-sign': lambda pack: cut(pack.tileset('TilesetElement'), 0, 2),
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
