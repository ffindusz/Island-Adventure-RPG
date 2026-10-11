#!/usr/bin/env python3
"""Composes pictures from pieces of the Ninja Adventure pack: the ground and the monsters of the shipwreck coast and the
woods, the ground and the monsters of the mountain and of the cave, the ground (the masonry, the flagstones, the moss, the
pillars, the fountain, the harbor and its quay) and the undead and the Guardian of the castle, the old vessel of its harbor
(the pack's boat and sail), the props every area shares, the icons of the two bows, and the backdrops of the title screen and of
the ending (pictures of the size of the canvas, put together from the coast's own sea, sand and wreck, and from the quay of
the castle's harbor).

The pack (CC0, Pixel-Boy and AAA) is not in the repository. Pass the folder that holds `Backgrounds`, `Actor`, `Items`
and `FX` as --pack; the pictures are written under public/art/ and are committed with it. Run it again to remake them:

    python docs/assets/compose-art.py --pack "<path to Ninja Adventure - Asset Pack>"
    python docs/assets/compose-art.py --pack "<path>" terrain-water monster-crab    (only these)

Every picture is cut from named pieces of the pack and put together here; what is drawn by the recipe instead (a glint, the
pillars and the fountain of the castle, the courses of its walls, the mast and the post of the vessel, the sky, the sun, the
clouds, the gulls, the far castle and the far vessel of a backdrop) is said so by its function and by
docs/assets/licences.md, which lists each result and the pieces it was made from.
"""
import argparse
import math
import os
import sys
from typing import NamedTuple, Optional

from PIL import Image

TILE = 16
# The four tiles, or pixels, that lie beside one: east, west, south, north.
NEIGHBOURS = ((1, 0), (-1, 0), (0, 1), (0, -1))

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


def cut(img, col, row):
    return img.crop((col * TILE, row * TILE, (col + 1) * TILE, (row + 1) * TILE))


def sheet_of(frames, columns, cell=(TILE, TILE)):
    """The frames side by side, `columns` to a row, row by row, as the manifest's `sheet` numbers them."""
    rows = -(-len(frames) // columns)
    out = Image.new('RGBA', (columns * cell[0], rows * cell[1]), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        out.paste(frame, ((index % columns) * cell[0], (index // columns) * cell[1]))
    return out


def frames_in(sheet, columns, count):
    """The first `count` frames of a sheet of tiles, `columns` to a row: what `sheet_of` put together, taken apart."""
    return [cut(sheet, index % columns, index // columns) for index in range(count)]


def recolour(img, mapping):
    """Swaps exact colours, `{old: new}`, each one a '#rrggbb' or an (r, g, b); alpha stays."""
    swaps = {as_rgb(old): as_rgb(new) for old, new in mapping.items()}
    out = img.copy()
    pixels = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = pixels[x, y]
            if (r, g, b) in swaps:
                pixels[x, y] = (*swaps[(r, g, b)], a)
    return out


def hexrgb(text):
    return tuple(int(text[i:i + 2], 16) for i in (1, 3, 5))


def as_rgb(colour):
    return colour if isinstance(colour, tuple) else hexrgb(colour)


# Two colours of the pack that many pictures share: the near-black of its outlines and its white, a warm one (not #ffffff).
OUTLINE = hexrgb('#141b1b')
PACK_WHITE = hexrgb('#f2eaf1')


def key_pieces(tileset, base_row):
    return [cut(tileset, col, base_row + row) for _, col, row in KEY_PIECES]


# ---------------------------------------------------------------------------------------------------------------------
# Terrain. Every sheet is made of 16 by 16 frames; the adapter (src/adapter/terrain-baker.ts) knows which is which.


def terrain_water(pack):
    """Water with a shore: the thirteen pieces against sand, the thirteen against grass, then plain water."""
    water = pack.tileset('TilesetWater')
    plain = [cut(water, 1, 1), cut(water, 11, 2)]
    return sheet_of(key_pieces(water, 0) + key_pieces(water, 6) + plain, KEY_COUNT)


def terrain_sand(pack):
    """Sand: the thirteen pieces of its edge against grass, then the plain ground."""
    floor = pack.tileset('TilesetFloor')
    to_sand = {'#d3865f': '#ffcb8d', '#bd7959': '#ffcb8d'}
    edge = [recolour(piece, to_sand) for piece in key_pieces(floor, 7)]
    ground = [cut(floor, 1, 1), cut(floor, 0, 4), cut(floor, 1, 4)]
    return sheet_of(edge + ground, KEY_COUNT)


def terrain_grass(pack):
    floor = pack.tileset('TilesetFloor')
    ground = [cut(floor, c, 12) for c in range(5)] + [cut(floor, 2, 11), cut(floor, 3, 11)]
    return sheet_of(ground, 7)


def terrain_rock(pack):
    """The face of a cliff, three rows (the lip, the middle, the foot) by three columns (left, middle, right)."""
    relief = pack.tileset('TilesetRelief')
    return sheet_of([cut(relief, c, r) for r in (5, 6, 7) for c in (4, 5, 6)], 3)


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
    green = {'#adbc3a': '#74a334', '#74a334': '#4a7f4b', '#4a7f4b': '#345a52'}
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

# The five tones of the wreck's wood, light to dark. LIGHT and SEAM are the two colours of the pack's dock (its planks and the
# seams between them), PLANK lies between them, WALL is the shade of the hull's sides and of the mast, DARK the deepest. The
# same tone plays different parts in different pictures (the hull, the mast, the joints of the deck, the gold of a padlock,
# the key of the quay's recolour), so the tones are named by their place in the ramp and not by one of those parts.
LIGHT, PLANK, SEAM, WALL, DARK = (hexrgb(text) for text in ('#ffad5d', '#f38c4c', '#e66a3a', '#965746', '#7d3e24'))
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
        beyond = [(x + dx, y + dy) for dx, dy in NEIGHBOURS]
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
            if (x, y) not in hole and any((x + dx, y + dy) in hole for dx, dy in NEIGHBOURS):
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
    return dict(zip(GREY_STONE, names))


def stone_cliff(pack, names):
    """The face of a cliff in grey stone recoloured, three rows (the lip, the middle, the foot) by three columns (left,
    middle, right), as terrain-rock has them."""
    relief = pack.tileset('TilesetRelief')
    return sheet_of([recolour(cut(relief, c, r), stone(names)) for r in (0, 1, 2) for c in (4, 5, 6)], 3)


def mountain_boulders(pack):
    """Four boulders, each on a tile of its own: the three small rocks of the nature set, and the round one of the relief's
    details."""
    nature, detail = pack.tileset('TilesetNature'), pack.tileset('TilesetReliefDetail')
    rocks = [cut(nature, col, 17) for col in (17, 18, 19)] + [cut(detail, 4, 0)]
    return sheet_of([recolour(rock, stone(SLATE)) for rock in rocks], len(rocks))


def cave_floor(pack, make):
    """The ground of the coast or of the woods, in the dim colours of the cave: every colour of the sheet is in CAVE_FLOOR."""
    return recolour(make(pack), CAVE_FLOOR)


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
            near = [(x + dx, y + dy) for dx, dy in NEIGHBOURS]
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
            if a > 0 and (r, g, b) != OUTLINE:
                pixels[x, y] = (min(255, r // 2 + 150), g // 3 + 20, b // 3 + 15, a)
    return out


def monster_sheet(walk):
    """`walk[frame][direction]` as images of one size; returns the sheet with the hurt and the wind-up rows added."""
    rows = walk + [[white_shape(f) for f in walk[0]], [red_shape(f) for f in walk[0]]]
    cell = rows[0][0].size
    return sheet_of([f for row in rows for f in row], 4, cell)


class MonsterSource(NamedTuple):
    """Where a monster is cut from: the pack's `Actor/<kind>/<folder>/<file>`, and the colours swapped on it, if any."""
    kind: str
    folder: str
    file: str
    colours: Optional[dict] = None


def monster_picture(pack, source):
    """A monster sheet cut from `source`: the pack's animals from the side, every other creature four ways with four frames
    of a walk (a character's first four rows)."""
    sprite = pack.image('Actor', source.kind, source.folder, source.file)
    if source.colours:
        sprite = recolour(sprite, source.colours)
    if source.kind == 'Animal':
        width = sprite.width // 2
        right = [sprite.crop((i * width, 0, (i + 1) * width, sprite.height)) for i in range(2)]
        left = [frame.transpose(Image.FLIP_LEFT_RIGHT) for frame in right]
        return monster_sheet([[right[i], right[i], left[i], right[i]] for i in range(2)])
    return monster_sheet([[cut(sprite, d, f) for d in range(4)] for f in range(4)])


def monster_builder(source):
    return lambda pack: monster_picture(pack, source)


# The pack's mushroom has a red cap, as red as the crab and as the flash of a wind-up, so its cap is made purple: the red
# flash then shows on it, and the spitter has the colour its orbs have.
SPITTER_CAP = {'#e0394c': '#a15fd8', '#8f3e56': '#5e3a8c'}

# The raiders of the mountain are the pack's ninjas and its knight, drawn four ways like its monsters. The knight, the
# veteran, is the grey-green of the dark ninja, the raider, so its steel is made a navy blue to tell the two apart. The
# pack's bear is red too, so the cave's bear is made brown.
VETERAN_STEEL = {'#8d977f': '#8aa0d0', '#5f7160': '#4c62a4', '#4e484a': '#3c4478', '#3b3643': '#2a2e5a'}
CAVE_BEAR = {'#d14b34': '#8a6246', '#8f3e56': '#523a2c'}

# The undead of the castle are the pack's creatures, drawn four ways like the others. The skeleton is the pack's, as it
# is. The ghoul is the pack's red beast, a squat thing with a scowl, made the yellow-green of something long dead (it is
# paler than the floors, so that it shows on them). The wraith is the pack's spirit made violet, the colour of the orb it
# shoots. The knight is the pack's golden knight, tarnished: a gold, horned thing that no raider of the mountain is.
GHOUL_FLESH = {'#d14b34': '#b9c28e', '#8f3e56': '#7c8650', '#ef914f': '#e8e6a8'}
WRAITH_VIOLET = {'#79b8ce': '#a77ee0', '#9ba7aa': '#7c60b8'}
KNIGHT_TARNISHED = {'#f1c471': '#d1a64e', '#d78b4a': '#9a6e36', '#d14b34': '#c0392b', '#8f3e56': '#5a2d4a'}

# Where each monster is cut from, in the order of the pictures. The pack's `Monster` and `Character` creatures are drawn
# four ways, its `Animal`s from the side.
MONSTERS = {
    'monster-crab': MonsterSource('Monster', 'Mollusc', 'Mollusc.png'),
    'monster-slime': MonsterSource('Monster', 'Slime', 'Slime.png'),
    'monster-spitter': MonsterSource('Monster', 'Mushroom', 'mushroom.png', SPITTER_CAP),
    'monster-wolf': MonsterSource('Animal', 'DogBlack', 'SpriteSheet.png'),
    'monster-boar': MonsterSource('Animal', 'WildBoar', 'SpriteSheet.png'),
    'monster-raider': MonsterSource('Character', 'NinjaDark', 'SpriteSheet.png'),
    'monster-raider-charger': MonsterSource('Character', 'NinjaYellow', 'SpriteSheet.png'),
    'monster-raider-archer': MonsterSource('Character', 'NinjaBlue', 'SpriteSheet.png'),
    'monster-raider-veteran': MonsterSource('Character', 'Knight', 'SpriteSheet.png', VETERAN_STEEL),
    'monster-cave-bat': MonsterSource('Monster', 'BlueBat', 'SpriteSheet.png'),
    'monster-cave-lizard': MonsterSource('Monster', 'Lizard', 'Lizard.png'),
    'monster-cave-eye': MonsterSource('Monster', 'Eye', 'Eye.png'),
    'monster-cave-bear': MonsterSource('Monster', 'Bear', 'SpriteSheet.png', CAVE_BEAR),
    'monster-castle-skeleton': MonsterSource('Character', 'Skeleton', 'SpriteSheet.png'),
    'monster-castle-ghoul': MonsterSource('Monster', 'Beast', 'Beast.png', GHOUL_FLESH),
    'monster-castle-wraith': MonsterSource('Character', 'Spirit', 'SpriteSheet.png', WRAITH_VIOLET),
    'monster-castle-knight': MonsterSource('Character', 'KnightGold', 'SpriteSheet.png', KNIGHT_TARNISHED),
}


def projectile_orb(pack):
    """The pack's energy ball in the colours of the spitter's cap, with the dark outline of the pack's creatures."""
    ball = pack.image('FX', 'Projectile', 'EnergyBall.png')
    ball = recolour(ball, {'#8feff1': '#e3a6ff', '#79b8ce': '#a15fd8'})
    return outlined(ball)


# The Guardian of the castle is the pack's Giant Blue Samurai, a boss as wide as four tiles and a half, so its cells are
# 96 by 96 pixels. The pack draws it from the front only, with the strips of its idle and walk 48 pixels tall and those of
# its lunge 96 tall, so each frame is set in its cell so that the middle of the body is the middle of the cell, which is
# where the monster stands. Its blue is made a pale teal, its gold crescent ivory and its orange and red knots the glow of
# a lit lamp: the Guardian is armour with nothing in it. The pack has no back or side view, so up is the mirror of down,
# and left and right lean three pixels each way. The wind-up row is the lunge of the pack, the blade raised high.
GUARDIAN_PALE = {
    '#79b8ce': '#b6e6d9', '#5f7160': '#5aa59b', '#3b3643': '#2b5560', '#f1c471': '#eef7e3',
    '#ef914f': '#5ff0d6', '#d3a2c0': '#cfeee6', '#d14b34': '#3fd8c8',
}
BOSS_CELL = 96
BOSS_WALK_FRAMES = 6
BOSS_LIFT = 24
BOSS_LUNGE_LIFT = {'ChargeLeft': -2, 'ChargeRight': -10}
BOSS_LEAN = 3


def boss_frame(strip, index, lift, lean=0):
    """Frame `index` of a strip of the pack's boss, set in a cell of 96 by 96, `lift` pixels down and `lean` to the right."""
    cell = Image.new('RGBA', (BOSS_CELL, BOSS_CELL), (0, 0, 0, 0))
    cell.paste(strip.crop((index * BOSS_CELL, 0, (index + 1) * BOSS_CELL, strip.height)), (lean, lift))
    return cell


def guardian_sheet(pack):
    strip = {
        name: recolour(pack.image('Actor', 'Boss', 'GiantBlueSamurai', name + '.png'), GUARDIAN_PALE)
        for name in ('Walk', 'ChargeLeft', 'ChargeRight')
    }
    ways = [
        [boss_frame(strip['Walk'], f, BOSS_LIFT) for f in range(BOSS_WALK_FRAMES)],
        [boss_frame(strip['Walk'], f, BOSS_LIFT).transpose(Image.FLIP_LEFT_RIGHT) for f in range(BOSS_WALK_FRAMES)],
        [boss_frame(strip['Walk'], f, BOSS_LIFT, -BOSS_LEAN) for f in range(BOSS_WALK_FRAMES)],
        [boss_frame(strip['Walk'], f, BOSS_LIFT, BOSS_LEAN).transpose(Image.FLIP_LEFT_RIGHT) for f in range(BOSS_WALK_FRAMES)],
    ]
    rows = [[way[f] for way in ways] for f in range(BOSS_WALK_FRAMES)]
    lunge_left = boss_frame(strip['ChargeLeft'], 1, BOSS_LUNGE_LIFT['ChargeLeft'])
    lunge_right = boss_frame(strip['ChargeRight'], 1, BOSS_LUNGE_LIFT['ChargeRight'])
    rows.append([white_shape(frame) for frame in rows[0]])
    rows.append([red_shape(frame) for frame in (lunge_right, lunge_left, lunge_left, lunge_right)])
    return sheet_of([frame for row in rows for frame in row], 4, (BOSS_CELL, BOSS_CELL))


# ---------------------------------------------------------------------------------------------------------------------
# What every area shares (src/adapter/prop-sprites.ts): chests and caches, pickups, Checkpoints, exits, signs, doors, gates
# and levers. The cell of each is one tile with the picture standing at the foot of it; the Checkpoint's cell is taller,
# and a gate's is taller and wider, for its arch stands over the way and on the rock beside it.

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
    return sheet_of([*gear, arrows, empty, potions, empty], 6)


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
    return sheet_of([pot, twinkle(pot, 12, 3), arrows, twinkle(arrows, 8, 2), key, twinkle(key, 13, 3)], 6)


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
    return sheet_of([still, *waving], 5, (TILE, CHECKPOINT_HEIGHT))


def exit_sheet(pack):
    """Four frames, an exit mark pointing up, down, left and right: two arrowheads painted on the ground, a small touch of
    code, white with the pack's dark outline. The adapter shows it see-through."""
    right = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
    for x in (2, 7):
        stamp(right, CHEVRON_ROWS, {'X': PACK_WHITE}, x, 3)
    right = outlined(right)
    return sheet_of([right.transpose(Image.ROTATE_90), right.transpose(Image.ROTATE_270),
                     right.transpose(Image.FLIP_LEFT_RIGHT), right], 4)


def door_sheet(pack):
    """Two frames: the pack's arched door of planks with a gold padlock on it, the colour of the key, and the same arch
    with the doorway open and dark."""
    house = pack.tileset('TilesetHouse')
    shut = cut(house, 8, 3)
    stamp(shut, LOCK_ROWS, GOLD_LOCK, 5, 7)
    return sheet_of([shut, cut(house, 9, 3)], 2)


# The pack's iron arch (TilesetHouse) is 24 by 25 pixels: legs of four pixels, nine rows of arch, and an opening of exactly
# one tile. Its fence is 14 rows high, so a strip of it is made two rows taller by repeating a row of its stem.
GATE_ARCH = (172, 183, 196, 208)
GATE_WAY = (4, 9)
FENCE_TOP, FENCE_STEM, FENCE_FOOT = 194, 200, 208
FENCE_STRIPS = ((155, 159), (159, 161), (155, 159), (159, 161), (155, 159))
IRON, IRON_SHADE = PACK_WHITE, hexrgb('#abc2bc')
REST_KNOB = (hexrgb('#d14b34'), hexrgb('#ffcba9'))
PULLED_KNOB = (hexrgb('#79b8ce'), IRON)
KNOB_ROUND = [(dx, dy) for dx in range(-2, 2) for dy in range(-3, 1) if dx in (-1, 0) or dy in (-2, -1)]


def fence_strip(house, x0, x1):
    """The strip of the pack's iron fence between x0 and x1, a tile high: the stem of its pickets is stretched by two rows."""
    rows = [*range(FENCE_TOP, FENCE_STEM), FENCE_STEM, FENCE_STEM, *range(FENCE_STEM, FENCE_FOOT)]
    out = Image.new('RGBA', (x1 - x0, TILE), (0, 0, 0, 0))
    for y, source in enumerate(rows):
        out.paste(house.crop((x0, source, x1, source + 1)), (0, y))
    return out


def gate_sheet(pack):
    """Two frames, the gate shut and the gate open: the pack's iron arch, which stands over the way and on the rock on each
    side of it, and, shut, the pack's fence of three pickets between its legs, a small touch (the fence is stretched two
    rows to fill the opening). Open, it is the arch alone, and the way through it is clear."""
    house = pack.tileset('TilesetHouse')
    arch = house.crop(GATE_ARCH)
    fence = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
    x = 0
    for x0, x1 in FENCE_STRIPS:
        strip = fence_strip(house, x0, x1)
        fence.paste(strip, (x, 0))
        x += strip.width
    shut = arch.copy()
    shut.alpha_composite(fence, GATE_WAY)
    return sheet_of([shut, arch], 2, arch.size)


def line(start, end):
    """The pixels of a straight line from start to end."""
    (x0, y0), (x1, y1) = start, end
    steps = max(abs(x1 - x0), abs(y1 - y0))
    return [(round(x0 + (x1 - x0) * i / steps), round(y0 + (y1 - y0) * i / steps)) for i in range(steps + 1)]


def lever_frame(dungeon, lean, knob):
    """A lever set in the rock, filling its tile: a near-black niche, the lower rows of the pack's stone block that the
    dungeon tileset uses as a socket, and a white stick that stands on it leaning `lean` (-1 left, 1 right) with a ball of
    colour on its end. The stick and the ball are a small touch: the pack has no lever."""
    colour, glint = knob
    out = Image.new('RGBA', (TILE, TILE), (*OUTLINE, 255))
    out.alpha_composite(cut(dungeon, 2, 3).crop((0, 9, TILE, TILE)), (0, 9))
    layer = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
    stick = line((8, 9), (8 + lean * 4, 4))
    paint(layer, [*stick, *((x + 1, y) for x, y in stick)], IRON)
    paint(layer, [(x + 1, y) for x, y in stick], IRON_SHADE)
    tip_x, tip_y = stick[-1]
    paint(layer, [(tip_x + dx, tip_y + dy) for dx, dy in KNOB_ROUND], colour)
    paint(layer, [(tip_x - 1, tip_y - 2)], glint)
    out.alpha_composite(outlined(layer))
    return out


def lever_sheet(pack):
    """Two frames, the lever at rest, its stick leaning left with a red ball, and the lever pulled, leaning right with a blue one."""
    dungeon = pack.tileset('TilesetDungeon')
    return sheet_of([lever_frame(dungeon, -1, REST_KNOB), lever_frame(dungeon, 1, PULLED_KNOB)], 2)


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


# ---------------------------------------------------------------------------------------------------------------------
# The castle. Its ground has sheets of its own (the look of the castle in src/adapter/terrain-plan.ts names them): the
# masonry of its walls, the flagstones of its halls, the moss of its courtyards and the grey-green water of its harbor,
# each in the frames of the standard sheet of its kind; and three that no other look has: the pillars (four frames, one
# tile each), the fountain (a picture of three tiles by three) and the planks of the quay (six frames).

CASTLE_STONE = ('#8a8071', '#6f665a', '#3f3933', '#b0a695', '#ebe3d2', '#c4baa8')
MORTAR = hexrgb('#4b443b')
# A wall is courses of blocks. The pack's face is seven rows of stone and a joint of mortar under them (rows 4 and 12 of a
# tile), so a tile is two courses; each block is eight pixels long and a course starts half a block along from the one
# above, so the pattern is the same on every tile and the tiles of a long or a tall wall join. The blocks are shaded by
# course and by place in the course, and a few pixels of each tile are lighter or darker.
BLOCK_SHADES = (('#978d7c', '#857b6c'), ('#8a8071', '#9a907f'))
BLOCK_SPECKS = ((3, 7, -16), (6, 14, 14), (11, 8, -16), (13, 1, 14), (9, 6, 14), (2, 2, -14))
# The columns of a tile of the wall (left, middle, right) that are face; the rest is the side of the wall, shaded as the pack has it.
WALL_FACE = {0: (5, 15), 1: (0, 15), 2: (0, 9)}
# The grass of the coast and of the woods, as moss: darker and a little blue.
CASTLE_MOSS = {'#adbc3a': '#6a9a3b', '#a8a129': '#477c48'}
MOSS, MOSS_DARK = hexrgb('#74a334'), hexrgb('#4a7f4b')
CRACK_COLOUR = hexrgb('#2a2630')
# Chips of the stone of the wall, for the grass and the flagstones: a letter picture, light on top and dark below.
CHIP_COLOURS = {'L': hexrgb('#b0a695'), 'M': hexrgb('#8a8071'), 'D': hexrgb('#3f3933')}
CHIP = ['.LL.', 'LMMD', '.DDD']
SMALL_CHIP = ['LM', '.D']


def shifted(colour, amount):
    """A colour lighter by `amount`, or darker when it is negative."""
    return tuple(max(0, min(255, value + amount)) for value in colour)


def wall_block(x, y):
    """The colour of the masonry at x, y of a tile of wall."""
    course = 0 if 5 <= y <= 11 else 1
    along = x - 4 * course
    if y in (4, 12) or along % 8 == 0:
        return MORTAR
    colour = hexrgb(BLOCK_SHADES[course][(along % 16) // 8])
    for sx, sy, amount in BLOCK_SPECKS:
        if (x, y) == (sx, sy):
            return shifted(colour, amount)
    if y == (5, 13)[course]:
        return shifted(colour, 16)
    if y == (11, 3)[course]:
        return shifted(colour, -18)
    return colour


def castle_wall_tile(tile, column, row):
    """A tile of the pack's relief in the stone of the castle, with the courses of blocks laid over its face."""
    out = recolour(tile, stone(CASTLE_STONE))
    face = {hexrgb(GREY_STONE[0]), hexrgb(GREY_STONE[1])}
    first, last = WALL_FACE[column]
    src, dst = tile.load(), out.load()
    for y in range(5 if row == 0 else 0, TILE):
        for x in range(TILE):
            r, g, b, a = src[x, y]
            if a == 0 or (r, g, b) not in face:
                continue
            if first <= x <= last:
                dst[x, y] = (*wall_block(x, y), 255)
            elif y in (4, 12):
                dst[x, y] = (*shifted(MORTAR, -10), 255)
    return out


def castle_wall(pack):
    """The face of a wall of masonry, three rows (the lip, the middle, the foot) by three columns (left, middle, right)."""
    relief = pack.tileset('TilesetRelief')
    return sheet_of([castle_wall_tile(cut(relief, c, r), c - 4, r) for r in (0, 1, 2) for c in (4, 5, 6)], 3)


def cobbles(pack):
    """The dark cobbles of the pack's interior floor: the one tile of them that joins with itself on every side."""
    return cut(pack.image('Backgrounds', 'Tilesets', 'Interior', 'TilesetInteriorFloor.png'), 12, 13)


def weedy_cobbles(stones):
    """The cobbles with a crack between two of them and grass growing out of it."""
    out = stones.copy()
    paint(out, [(3, 9), (4, 9), (5, 9), (6, 10), (7, 10), (8, 10), (9, 9), (10, 9)], CRACK_COLOUR)
    paint(out, [(4, 8), (4, 7), (5, 8), (7, 9), (7, 8), (7, 7), (8, 9), (9, 8), (10, 8), (10, 7)], MOSS_DARK)
    paint(out, [(4, 6), (7, 6), (8, 8), (10, 6), (5, 7)], MOSS)
    return out


def loose_cobbles(stones):
    out = stones.copy()
    for x, y, rows in ((9, 2, CHIP), (3, 9, CHIP), (12, 11, SMALL_CHIP), (6, 5, SMALL_CHIP)):
        stamp(out, rows, CHIP_COLOURS, x, y)
    return out


def castle_floor(pack):
    """Flagstones: the thirteen pieces of their edge against moss, then the plain ground, with weeds in a crack and with chips.
    The edge is the pack's edge of dirt against grass with the cobbles in place of the dirt, each pixel of them the pixel of the
    plain flagstones at the same place, so that edge and plain tiles join."""
    stones = cobbles(pack)
    under = stones.load()
    dirt = {hexrgb('#d3865f'), hexrgb('#bd7959')}
    edge = []
    for piece in key_pieces(pack.tileset('TilesetFloor'), 7):
        piece = recolour(piece, CASTLE_MOSS)
        pixels = piece.load()
        for y in range(TILE):
            for x in range(TILE):
                if pixels[x, y][:3] in dirt:
                    pixels[x, y] = under[x, y]
        edge.append(piece)
    return sheet_of(edge + [stones, weedy_cobbles(stones), loose_cobbles(stones)], KEY_COUNT)


def castle_grass(pack):
    """The grass of the woods as moss, with a few chips of stone on the two frames that have flecks."""
    mossy = recolour(terrain_grass(pack), CASTLE_MOSS)
    for frame, chips in ((4, ((9, 9, CHIP), (3, 3, SMALL_CHIP))), (6, ((3, 10, CHIP), (11, 3, SMALL_CHIP)))):
        for x, y, rows in chips:
            stamp(mossy, rows, CHIP_COLOURS, frame * TILE + x, y)
    return mossy


# The water of the harbor: the sheet of the sea with its colours swapped, grey-green for the water and its foam, worn stone for
# the bank where the sand of the coast was (the edge of the quay), and the stone of the walls for the bank where there is grass.
CASTLE_WATER = {
    '#71ddee': '#4a9aa6', '#8feff1': '#6fb8bd', '#79b8ce': '#3a7a88', '#ffffff': '#d4e6e2',
    '#ffcb8d': '#a39886', '#ffad5d': '#8a7f6e', '#d78b4a': '#6b6254', '#965340': '#3f3933',
    '#adbc3a': '#6f665a', '#a8a129': '#5a5348',
}


def castle_water(pack):
    return recolour(terrain_water(pack), CASTLE_WATER)


# The planks of the quay are the pack's dock on its side, weathered as the deck of the wreck is, with the colours of old brown wood.
DOCK_WOOD = {PLANK: hexrgb('#9a7b5c'), WALL: hexrgb('#4d3b2a'), SEAM: hexrgb('#6e553e')}


def dock_planks(pack, variant):
    return recolour(weathered_deck(pack, variant), DOCK_WOOD)


def castle_dock(pack):
    """The planks of the quay, six frames and not one with a gap in it: two plain, two with moss in the seams, one with weeds
    growing through a seam and one with a board split."""
    plain_a, plain_b = dock_planks(pack, 'a'), dock_planks(pack, 'b')
    moss_a, moss_b, weeds, split = plain_a.copy(), plain_b.copy(), plain_a.copy(), plain_b.copy()
    paint(moss_a, [(2, 3), (3, 3), (4, 3), (5, 3), (3, 4), (4, 4), (10, 9), (11, 9), (12, 9), (13, 9), (12, 10), (13, 10), (14, 10)], MOSS_DARK)
    paint(moss_a, [(3, 2), (4, 2), (11, 8), (13, 8), (12, 11)], MOSS)
    paint(moss_b, [(5, 14), (6, 14), (7, 14), (8, 14), (6, 13), (7, 13), (11, 3), (12, 3), (13, 3), (12, 4), (13, 4), (14, 4)], MOSS_DARK)
    paint(moss_b, [(6, 12), (8, 13), (12, 2), (14, 3)], MOSS)
    paint(weeds, [(9, 9), (9, 8), (10, 8), (10, 7), (8, 7), (9, 6), (11, 9)], MOSS_DARK)
    paint(weeds, [(9, 7), (10, 6)], MOSS)
    paint(split, [(4, 4), (5, 5), (5, 6), (6, 7), (7, 8), (8, 8)], CRACK_COLOUR)
    paint(split, [(6, 5), (7, 7), (4, 5)], hexrgb('#b39878'))
    return sheet_of([plain_a, plain_b, moss_a, moss_b, weeds, split], 6)


# Three tones of the castle's stone, light to dark, that the pillars, the plinth and the rim of the fountain are drawn in.
STONE_LIGHT, STONE_MID, STONE_DARK = hexrgb('#c4baa8'), hexrgb('#a59b8a'), hexrgb('#8a8071')
# The pillars stand where a rock stands alone: a column with a cap and a foot wider than its shaft, in the stone of the wall.
PILLAR_COLOURS = {
    'O': OUTLINE, 'h': hexrgb('#ebe3d2'), 'l': STONE_LIGHT, 'm': STONE_MID, 'd': hexrgb('#7c7367'),
}
PILLAR_ROWS = [
    '................',
    '..OOOOOOOOOOOO..',
    '..OhhhhhhhhhlO..',
    '..OhlllllllmdO..',
    '..OlmmmmmmmddO..',
    '..OOOOOOOOOOOO..',
    '...OmmmmddddO...',
    '...OhhllmmddO...',
    '...OhhllmmddO...',
    '...OhhllmmddO...',
    '...OhhllmmddO...',
    '...OhhllmmddO...',
    '...OhhllmmddO...',
    '..OOOOOOOOOOOO..',
    '..OlllllmmmddO..',
    '..OOOOOOOOOOOO..',
]
# Where the shaft of the broken pillar ends, column by column from x = 3 to 12.
STUMP_TOPS = (8, 8, 9, 9, 9, 10, 10, 10, 11, 11)


def pillar_intact():
    out = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
    stamp(out, PILLAR_ROWS, PILLAR_COLOURS, 0, 0)
    return out


def pillar_mossy():
    out = pillar_intact()
    paint(out, [(4, 12), (5, 12), (4, 11), (10, 12), (11, 11), (11, 12), (3, 14), (4, 14), (12, 14), (9, 14)], MOSS_DARK)
    paint(out, [(5, 11), (10, 11), (4, 14), (6, 12)], MOSS)
    return out


def pillar_cracked():
    out = pillar_intact()
    paint(out, [(9, 2), (9, 3), (10, 4), (8, 7), (8, 8), (7, 9), (7, 10), (8, 11)], CRACK_COLOUR)
    return out


def pillar_broken():
    """The shaft broken off ragged at about the middle, rubble at its foot."""
    whole = pillar_intact()
    src = whole.load()
    out = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
    dst = out.load()
    for x in range(TILE):
        top = dict(zip(range(3, 13), STUMP_TOPS)).get(x)
        for y in range(13, TILE):
            dst[x, y] = src[x, y]
        if top is None:
            continue
        for y in range(top, 13):
            dst[x, y] = src[x, y]
        dst[x, top - 1] = (*OUTLINE, 255)
        if x not in (3, 12):
            dst[x, top] = (*PILLAR_COLOURS['l'], 255)
    for x, y in ((0, 11), (13, 11)):
        stamp(out, SMALL_CHIP, CHIP_COLOURS, x, y)
    return out


def castle_pillars(pack):
    return sheet_of([pillar_intact(), pillar_mossy(), pillar_broken(), pillar_cracked()], 4)


class FountainWater(NamedTuple):
    """The three tones of the water of the fountain: the surface, the glint on it, the shade."""
    base: tuple
    glint: tuple
    deep: tuple


# The fountain is a round basin of the stone of the castle, mossy on its rim, with water in it, a round plinth of stone
# standing in the middle with a jet of water rising from it. The picture is three tiles by three, drawn on the grass of the
# courtyard, with nothing in the corners; the plan cuts it into its nine tiles. The water is the water of the harbor.
FOUNTAIN_WATER = FountainWater(hexrgb('#71ddee'), hexrgb('#8feff1'), hexrgb('#3da6bd'))
FOUNTAIN_JET = {'F': PACK_WHITE, 'W': FOUNTAIN_WATER.glint, 'D': FOUNTAIN_WATER.deep, 'B': FOUNTAIN_WATER.base}
FOUNTAIN_JET_ROWS = [
    '....FF....',
    '..F.FF.F..',
    '.F..FF..F.',
    '.F.WFFD.F.',
    'F..WFFD..F',
    'W..WFFD..W',
    '...WFFD...',
    '..WWFFDD..',
    '..WBFFDB..',
]


def fountain_plinth():
    """The plinth: a squat round block of stone seen from a little above, its top lit from the upper left, with a bowl of water in it."""
    layer = Image.new('RGBA', (3 * TILE, 3 * TILE), (0, 0, 0, 0))
    pixels = layer.load()
    centre = 23.5
    for y in range(14, 36):
        for x in range(3 * TILE):
            across = ((x - centre) / 6.0) ** 2
            on_top = across + ((y - 22.0) / 4.4) ** 2 <= 1
            in_body = across + ((y - 25.0) / 4.4) ** 2 <= 1
            if on_top:
                colour = STONE_LIGHT if x - centre < 2.5 else STONE_MID
                if across + ((y - 22.0) / 2.4) ** 2 <= 0.6:
                    colour = FOUNTAIN_WATER.deep if y < 22 and x < centre else FOUNTAIN_WATER.base
            elif in_body:
                colour = STONE_MID if x < centre else STONE_DARK
                if y > 27:
                    colour = shifted(colour, -14)
            else:
                continue
            pixels[x, y] = (*colour, 255)
    return outlined(layer)


def castle_fountain(pack):
    size = 3 * TILE
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    pixels = out.load()
    centre_x, centre_y = size / 2 - 0.5, size / 2 + 1
    base, glint, deep = FOUNTAIN_WATER
    for y in range(size):
        for x in range(size):
            dx, dy = x - centre_x, y - centre_y
            d = math.hypot(dx, dy)
            light = (-dx - dy) / (d * math.sqrt(2) + 1e-9)
            turn = ((math.atan2(dy, dx) + math.pi) / (2 * math.pi) * 20) % 1
            if d > 23:
                continue
            if d > 22:
                colour = OUTLINE
            elif d > 17.5:
                colour = STONE_MID
                if light > 0.35:
                    colour = STONE_LIGHT
                elif light < -0.35:
                    colour = STONE_DARK
                if d > 21:
                    colour = shifted(colour, 18)
                if min(turn, 1 - turn) * (2 * math.pi * d / 20) < 0.7:
                    colour = shifted(colour, -28)
            elif d > 16.5:
                colour = MORTAR
            else:
                colour = deep if d > 14.5 and light > 0 else base
                if (11.5 < d < 12.5 or 7.5 < d < 8.5) and int((math.atan2(dy, dx) + math.pi) * 3) % 2 == 0:
                    colour = glint
            pixels[x, y] = (*colour, 255)
    paint(out, [(5, 31), (6, 32), (7, 33), (6, 31), (5, 32), (38, 30), (39, 31), (40, 32), (39, 30)], MOSS_DARK)
    paint(out, [(6, 30), (40, 31)], MOSS)
    out.alpha_composite(fountain_plinth())
    stamp(out, FOUNTAIN_JET_ROWS, FOUNTAIN_JET, 19, 12)
    return out


# The old vessel lies in the water at the end of the quay with its bow to the north and its side against the planks: the
# pack's boat, a tile shorter so that water shows round it, turned and weathered, with a mast and the pack's sail. The
# picture is three tiles wide and seven tall (src/adapter/prop-sprites.ts stands it so that the left tile of its fifth row
# is the vessel's own, the last of the quay): that tile holds the post the vessel is moored to, the hull lies in the water of
# the two columns beside it, which is five rows tall (two above the tile and two below), and the two tiles of rock above that
# water are where the mast and the sail stand. Frame 0 is the vessel as it is found, its sail furled on the mast; frame 1 is
# the vessel prepared, its sail hoisted.
VESSEL_CELL = (3 * TILE, 7 * TILE)
VESSEL_HULL_AT = (17, 40)
VESSEL_MAST_AT = (30, 30)
VESSEL_SAIL_REACH = 17
VESSEL_COLOURS = {
    'O': OUTLINE, 'L': hexrgb('#a98563'), 'M': hexrgb('#7d5f45'), 'S': hexrgb('#cdb892'), 'W': PACK_WHITE,
}
VESSEL_WOOD = {
    hexrgb('#ffad5d'): VESSEL_COLOURS['L'], hexrgb('#f38c4c'): VESSEL_COLOURS['M'],
    hexrgb('#eecf9b'): VESSEL_COLOURS['S'], hexrgb('#ffffff'): VESSEL_COLOURS['W'],
}
MAST_TOP = ['..OO..', '.OLLO.', '.OLLO.']
MAST_SHAFT = '.OLMO.'
FURLED_SAIL = [
    '..OOOO..', '.OWSSSO.', 'OWWSSSSO', 'OWSSSSSO', 'OMMMMMMO', 'OWSSSSSO', 'OWSSSSSO', 'OWSSSSSO', 'OWSSSSSO', 'OMMMMMMO',
    'OWSSSSSO', 'OWSSSSSO', 'OWSSSSSO', 'OWSSSSSO', 'OMMMMMMO', 'OWSSSSSO', 'OWSSSSSO', 'OWSSSSSO', '.OSSSSO.', '..OOOO..',
]
POST = ['.OOO.', 'OLLMO', 'OLLMO', '.OLMO', '.OLMO', 'OLLMO', 'OOOOO']
PATCH = {'M': VESSEL_COLOURS['M'], 'P': hexrgb('#c4a074'), 'n': hexrgb('#4d3b2a')}
PATCH_ROWS = ['MMMMMM', 'MPPPnM', 'MnPPPM', 'MMMMMM']
HULL_MOSS = [(40, 63), (40, 64), (41, 64), (40, 75), (41, 75), (41, 76), (40, 76), (40, 77), (40, 88), (41, 88)]


def vessel_hull(pack):
    """The pack's boat, a tile of plain planking shorter, turned bow to the north, in old brown wood: a board of the stern
    mended, and moss on the gunwale where the water splashes it."""
    boat = pack.image('Backgrounds', 'Vehicles', 'Boat.png').crop((0, 0, 80, 30))
    shorter = Image.new('RGBA', (64, 30), (0, 0, 0, 0))
    shorter.paste(boat.crop((0, 0, 32, 30)), (0, 0))
    shorter.paste(boat.crop((48, 0, 80, 30)), (32, 0))
    hull = recolour(shorter, VESSEL_WOOD).rotate(90, expand=True)
    stamp(hull, PATCH_ROWS, PATCH, 10, 53)
    paint(hull, [(x - VESSEL_HULL_AT[0], y - VESSEL_HULL_AT[1]) for x, y in HULL_MOSS], MOSS_DARK)
    return hull


def vessel_sail(pack):
    """The pack's sail in old canvas, without the thin spar that reaches out from it, outlined to stand out from the rock."""
    sail = recolour(pack.image('Backgrounds', 'Vehicles', 'Sail.png'), VESSEL_WOOD).crop((0, 0, VESSEL_SAIL_REACH, 43))
    padded = Image.new('RGBA', (sail.width + 2, sail.height + 2), (0, 0, 0, 0))
    padded.paste(sail, (1, 1))
    return outlined(padded)


def vessel_frame(pack, hoisted):
    out = Image.new('RGBA', VESSEL_CELL, (0, 0, 0, 0))
    out.alpha_composite(vessel_hull(pack), VESSEL_HULL_AT)
    mast_x, mast_y = VESSEL_MAST_AT
    foot = VESSEL_HULL_AT[1] + 32
    if hoisted:
        sail = vessel_sail(pack)
        out.alpha_composite(sail, (mast_x - 2, foot - sail.height + 1))
    else:
        stamp(out, MAST_TOP + [MAST_SHAFT] * (foot - mast_y - len(MAST_TOP)), VESSEL_COLOURS, mast_x - 1, mast_y)
        stamp(out, FURLED_SAIL, VESSEL_COLOURS, mast_x - 3, foot - len(FURLED_SAIL) - 2)
    stamp(out, POST, VESSEL_COLOURS, 9, 68)
    paint(out, [(14, 70), (15, 70), (16, 70), (14, 71), (15, 71), (16, 71)], VESSEL_COLOURS['S'])
    return out


def vessel_sheet(pack):
    return sheet_of([vessel_frame(pack, False), vessel_frame(pack, True)], 2, VESSEL_CELL)


# The backdrops of the screens. The title and the ending each have a picture of the size of the canvas (20 by 12 tiles,
# src/adapter/config.ts) behind their window or their cards: a sky laid in bands of the pack's colours and, under it, the sea and
# the sand of the coast in the tiles of terrain-water.png and terrain-sand.png, joined as src/adapter/terrain-plan.ts joins them.
# Every pixel is a canvas pixel, so the screens show a backdrop as it is and never scale it. The window of the title and the cards
# of the ending cover the middle of it, so what there is to see is the sky, the two sides and the foot, and the things of the
# picture stand there.
CANVAS = (20 * TILE, 12 * TILE)
HORIZON = 4 * TILE
BAYER = ((0, 8, 2, 10), (12, 4, 14, 6), (3, 11, 1, 9), (15, 7, 13, 5))
BLEND_ROWS = 4
PIECE_NAMES = DECK_PIECES
# The four quarters of a tile as the planner takes them: where the quarter is, which neighbours it looks at (across, and up or
# down), and its pieces when the one above or below, the one beside, both, or only the one across the corner is outside.
QUARTERS = (
    ((0, 0), -1, -1, 'T', 'L', 'TL', 'INW'),
    ((8, 0), 1, -1, 'T', 'R', 'TR', 'INE'),
    ((0, 8), -1, 1, 'B', 'L', 'BL', 'ISW'),
    ((8, 8), 1, 1, 'B', 'R', 'BR', 'ISE'),
)


def scatter(x, y, salt):
    """A number that depends only on where it is asked for: the planner's own (`scatter` in src/adapter/terrain-plan.ts, the same
    formula in TypeScript), so the sand is dressed the way the coast's is."""
    h = (((x + 1) * 374761393) ^ ((y + 1) * 668265263) ^ ((salt + 1) * 1103515245)) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    return h ^ (h >> 16)


# What the planner's `scatter` gives for a few places, the same numbers as in tests/terrain-plan.test.ts: if the formula changes
# in one language only, the check there or the one here fails.
SCATTER_PINS = (
    ((0, 0, 0), 1003020413),
    ((1, 0, 0), 597366888),
    ((0, 1, 0), 4041187058),
    ((0, 0, 1), 2280609883),
    ((5, 7, 2), 4145784892),
    ((63, 42, 11), 3497004711),
    ((120, 95, 6), 2176068382),
)
assert all(scatter(*place) == number for place, number in SCATTER_PINS), (
    'scatter no longer gives what src/adapter/terrain-plan.ts gives: change both, and the pins here and in tests/terrain-plan.test.ts')


def sky(bands, height=HORIZON):
    """A sky from the top of the picture down: `bands` are (colour, first row), and each blends into the next over its last
    BLEND_ROWS rows by an ordered dither, so that there is no smooth gradient, which the pack's pictures do not have."""
    out = Image.new('RGBA', (CANVAS[0], height), (0, 0, 0, 255))
    pixels = out.load()
    colours = [(hexrgb(colour), row) for colour, row in bands]
    for y in range(height):
        index = max(i for i, (_, row) in enumerate(colours) if row <= y)
        here = colours[index][0]
        ahead = colours[index + 1][1] - y if index + 1 < len(colours) else BLEND_ROWS + 1
        for x in range(CANVAS[0]):
            blended = ahead <= BLEND_ROWS and BAYER[y % 4][x % 4] / 16 < (BLEND_ROWS - ahead + 0.5) / BLEND_ROWS
            pixels[x, y] = (*(colours[index + 1][0] if blended else here), 255)
    return out


def corner_pieces(x, y, outside):
    """The piece each quarter of the tile at x, y is cut from, by which of the neighbours it looks at are outside the tile's own
    ground: the planner's choice, `outside(x, y)` saying it of a neighbour."""
    pieces = []
    for _, dx, dy, vertical, horizontal, both, inner in QUARTERS:
        across, beside = outside(x, y + dy), outside(x + dx, y)
        if across and beside:
            pieces.append(both)
        elif across:
            pieces.append(vertical)
        elif beside:
            pieces.append(horizontal)
        else:
            pieces.append(inner if outside(x + dx, y + dy) else 'C')
    return pieces


def put_quarters(img, frames, x, y):
    """Paints the tile at pixel x, y a quarter at a time, each cut from the same quarter of its own frame."""
    for ((qx, qy), *_), frame in zip(QUARTERS, frames):
        img.alpha_composite(frame.crop((qx, qy, qx + 8, qy + 8)), (x + qx, y + qy))


def paint_coast(img, pack, kinds, top):
    """The sea and the sand of rows of letters (`~` water, `.` sand) from the pixel row `top`, the shore pieced together as the
    planner does and the sand dressed by the planner's own scatter."""
    water = frames_in(terrain_water(pack), KEY_COUNT, 2 * KEY_COUNT + 2)
    sand = frames_in(terrain_sand(pack), KEY_COUNT, KEY_COUNT + 3)

    def kind(x, y):
        return kinds[y][x] if 0 <= y < len(kinds) and 0 <= x < len(kinds[y]) else None

    for y, row in enumerate(kinds):
        for x, letter in enumerate(row):
            at = (x * TILE, top + y * TILE)
            if letter == '.':
                roll = scatter(x, y, 2) % 20
                img.alpha_composite(sand[KEY_COUNT + (1 if roll == 0 else 2 if roll < 3 else 0)], at)
                continue
            pieces = corner_pieces(x, y, lambda nx, ny: kind(nx, ny) == '.')
            if all(piece == 'C' for piece in pieces):
                img.alpha_composite(water[2 * KEY_COUNT + (1 if scatter(x, y, 1) % 7 == 0 else 0)], at)
            else:
                put_quarters(img, [water[2 * KEY_COUNT] if piece == 'C' else water[PIECE_NAMES.index(piece)] for piece in pieces], *at)


def paint_wreck(img, pack, left, top, columns, rows, mast, cargo):
    """A hull of `columns` by `rows` tiles with its corner at left, top, its deck laid over what is under it as the planner lays
    a wreck's, the cargo (`{(column, row): frame}`) on its deck and the mast standing on the tile `mast` (column, row)."""
    sheet = terrain_wreckage(pack)
    frames = frames_in(sheet, KEY_COUNT, 2 * KEY_COUNT)

    def inside(column, row):
        return 0 <= column < columns and 0 <= row < rows

    for row in range(rows):
        for column in range(columns):
            pieces = corner_pieces(column, row, lambda nx, ny: not inside(nx, ny))
            at = (left + column * TILE, top + row * TILE)
            if all(piece == 'C' for piece in pieces):
                img.alpha_composite(frames[cargo.get((column, row), KEY_COUNT)], at)
            else:
                put_quarters(img, [frames[PIECE_NAMES.index(piece)] for piece in pieces], *at)
    foot_column, foot_row = mast
    for row in range(3):
        for column in range(3):
            tile = cut(sheet, column, 2 + row)
            img.alpha_composite(tile, (left + (foot_column - 1 + column) * TILE, top + (foot_row - 2 + row) * TILE))


CLOUD_COLOURS = {'W': hexrgb('#ffffff'), 'S': hexrgb('#d3a2c0')}
CLOUD_LONG = [
    '.......WWWW.........', '...WWWWWWWWWW.WWW...', '.WWWWWWWWWWWWWWWWWW.', 'WWWWWWWWWWWWWWWWWWWW', '.SSSSSSSSSSSSSSSSSS.',
]
CLOUD_MEDIUM = ['...WWW......', '.WWWWWWWW...', 'WWWWWWWWWWW.', '.SSSSSSSSS..']
CLOUD_SMALL = ['..WWW..', 'WWWWWWW', '.SSSSS.']
GULL = ['XX.XX', '..X..']
SHADOW_ROWS = ['..XXXXXX..', '.XXXXXXXX.']
NATURE_COLUMNS = 24


def far_island(img, left, base, width, height, colour):
    """A low island on the horizon, a dome of `width` pixels that rises `height` pixels above `base`."""
    paint(img, [(left + x, base - 1 - y) for x in range(width) for y in range(round(height * math.sin(math.pi * (x + 0.5) / width) ** 0.7))], colour)


def far_castle(stone, shade, window):
    """A castle seen from far away, a few blocks and no more: a keep between a low tower and a tall one under a pointed roof
    and a pennant, the tops of the others notched, a gate, a few slits for windows."""
    out = Image.new('RGBA', (34, 22), (0, 0, 0, 0))

    def block(first, last, top, notched):
        paint(out, [(x, y) for x in range(first, last + 1) for y in range(top, 22) if not (notched and y == top and (x - first) % 2)], stone)

    block(0, 7, 5, True)
    block(8, 25, 10, True)
    block(26, 33, 8, False)
    for index, width in enumerate((2, 4, 6, 8)):
        paint(out, [(26 + (8 - width) // 2 + dx, 4 + index) for dx in range(width)], shade)
    paint(out, [(29, 0), (29, 1), (29, 2), (29, 3), (30, 0), (31, 0), (30, 1)], shade)
    paint(out, [(x, y) for x in range(13, 21) for y in range(16, 22)] + [(x, 15) for x in range(14, 20)], shade)
    paint(out, [(3, 9), (3, 10), (29, 12), (29, 13), (11, 13), (22, 13)], window)
    return out


# The title: a morning on the coast. The wreck lies in the shallows at the right, the Hunter stands on the sand with his back
# to the viewer looking out to sea, and on the horizon at the left there is a low island with a castle on it.
TITLE_SKY = (('#548789', 0), ('#79b8ce', 12), ('#b8dce5', 26), ('#fce2ca', 40), ('#ffcba9', 54))
TITLE_COAST = [
    '~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~',
    '..~~~~~~~~~~~~~~~~~~',
    '....................',
    '....................',
    '....................',
]
# What lies on the sand: pieces of the pack's nature tileset (small rocks and tufts), by their frame in it and the pixel they are put at.
TITLE_SAND_PROPS = ((329, (8, 172)), (331, (44, 178)), (244, (100, 170)), (246, (196, 176)), (330, (280, 150)))


def title_backdrop(pack):
    out = Image.new('RGBA', CANVAS, (0, 0, 0, 255))
    out.alpha_composite(sky(TITLE_SKY), (0, 0))
    for at, rows in (((92, 42), CLOUD_LONG), ((190, 46), CLOUD_MEDIUM), ((226, 40), CLOUD_SMALL)):
        stamp(out, rows, CLOUD_COLOURS, *at)
    for at in ((136, 50), (150, 45), (166, 53)):
        stamp(out, GULL, {'X': hexrgb('#2d697b')}, *at)
    far_island(out, 8, HORIZON, 50, 7, hexrgb('#548789'))
    out.alpha_composite(far_castle(hexrgb('#b8dce5'), hexrgb('#79b8ce'), hexrgb('#2d697b')), (16, HORIZON - 25))
    paint_coast(out, pack, TITLE_COAST, HORIZON)
    paint_wreck(out, pack, 236, 96, 5, 3, (3, 1), {(1, 1): 17, (2, 1): 16})
    nature = pack.tileset('TilesetNature')
    for index, at in TITLE_SAND_PROPS:
        out.alpha_composite(cut(nature, index % NATURE_COLUMNS, index // NATURE_COLUMNS), at)
    out.alpha_composite(broken_mast_picture(pack), (230, 166))
    out.alpha_composite(cut(monster_picture(pack, MONSTERS['monster-crab']), 0, 0), (150, 164))
    stamp(out, SHADOW_ROWS, {'X': hexrgb('#d2b37d')}, 29, 160)
    out.alpha_composite(cut(pack.image('Actor', 'Character', 'Hunter', 'SpriteSheet.png'), 1, 0), (26, 146))
    return out


# The ending: the evening the hero sails home. The sun is low over the sea at the left and the old vessel crosses it under sail;
# the island, with its castle, is a dark shape on the horizon at the right; the quay of the harbor runs along the foot. The cards
# of the ending cover the middle of the picture, as the title's window does, so the horizon is high (the tallest card, the
# credits, starts at row 29): the sky and the vessel stand in the strip above the cards, and the sea and the quay show at the
# foot and at the two sides.
ENDING_HORIZON = 25
ENDING_SKY = (('#543c52', 0), ('#8f3e56', 5), ('#cf736d', 10), ('#ef914f', 15), ('#ffad5d', 20))
ENDING_SEA = (('#ef914f', 0), ('#cf736d', 7), ('#8f3e56', 17), ('#543c52', 40), ('#4a5270', 80), ('#3b3643', 130))
ENDING_QUAY = 164
ENDING_CLOUDS = {'W': hexrgb('#ef9597'), 'S': hexrgb('#a5608b')}
ENDING_DARK = hexrgb('#3b3643')
# The light of the sun from its middle outwards: its core, its disc and the halo round it. The glitter on the sea is the
# colour of the disc and of the halo.
SUN_CORE, SUN_DISC, SUN_HALO = hexrgb('#fce2ca'), hexrgb('#ffe18d'), hexrgb('#ffbc75')
GLITTER = ((0.78, SUN_DISC), (0.0, SUN_HALO))
VESSEL_AFAR_AT = (64, 5)
VESSEL_AFAR_CANVAS = {'W': hexrgb('#fce2ca'), 'S': hexrgb('#d3a2c0')}


class Sun(NamedTuple):
    """The sun half set on the horizon: where its middle is, its radius, and how far its halo reaches beyond (in pixels)."""
    centre_x: int
    radius: int
    glow: int


ENDING_SUN = Sun(centre_x=66, radius=12, glow=9)


def sun(img, centre_x, radius, glow):
    """A sun half set on the horizon: a disc with a lighter core and a halo of dithered light in the sky round it."""
    surface = img.load()
    for y in range(ENDING_HORIZON - radius - glow, ENDING_HORIZON):
        for x in range(centre_x - radius - glow, centre_x + radius + glow + 1):
            distance = math.hypot(x - centre_x, y + 0.5 - ENDING_HORIZON)
            if distance <= radius * 0.55:
                surface[x, y] = (*SUN_CORE, 255)
            elif distance <= radius:
                surface[x, y] = (*SUN_DISC, 255)
            elif distance < radius + glow and BAYER[y % 4][x % 4] / 16 < 0.75 * (1 - (distance - radius) / glow):
                surface[x, y] = (*SUN_HALO, 255)


def ending_sea(height):
    """The sea under the sunset: bands from the orange of the horizon down to the dark of the foot, a ripple on it here and
    there in the colour of the band above, and the sun's path, a stripe of dashes of light that widens towards the viewer."""
    out = sky(ENDING_SEA, height)
    surface = out.load()
    centre = ENDING_SUN.centre_x
    for y in range(height):
        band = max(i for i, (_, first) in enumerate(ENDING_SEA) if first <= y)
        ripple = hexrgb(ENDING_SEA[max(band - 1, 0)][0])
        half = 6 + y * 0.28
        for segment in range(CANVAS[0] // 4):
            x = segment * 4
            reach = max(0.0, 1 - abs(x + 2 - centre) / half)
            roll = scatter(segment, y, 7) % 100
            length = 2 + scatter(segment, y, 9) % 3
            if roll < 55 * reach:
                colour = next(colour for floor, colour in GLITTER if reach >= floor)
                paint(out, [(x + dx, y) for dx in range(length)], colour)
            elif reach < 0.5 and roll < 55 * reach + 14:
                paint(out, [(x + dx, y) for dx in range(length)], ripple)
    return out


def vessel_afar():
    """The old vessel seen from far away, under sail, bow to the left: the wood and the canvas of the vessel of the harbor in
    the evening light, one square sail on one mast with a pennant, a hull with a raised bow. 28 by 24."""
    art = Image.new('RGBA', (28, 24), (0, 0, 0, 0))
    wood, light = VESSEL_COLOURS['M'], VESSEL_COLOURS['L']
    canvas, shade = VESSEL_AFAR_CANVAS['W'], VESSEL_AFAR_CANVAS['S']
    paint(art, [(14, y) for y in range(1, 18)], wood)
    paint(art, [(15, 1), (16, 1), (17, 1), (15, 2), (16, 2), (15, 3)], hexrgb('#cf736d'))
    paint(art, [(x, y) for x in range(7, 22) for y in range(4, 14)], canvas)
    paint(art, [(x, y) for x in range(16, 22) for y in range(4, 14)], shade)
    paint(art, [(x, 14) for x in range(7, 22)], wood)
    paint(art, [(x, y) for y, (first, last) in {17: (2, 26), 18: (3, 25), 19: (4, 23), 20: (6, 21)}.items() for x in range(first, last + 1)], wood)
    paint(art, [(x, 17) for x in range(3, 26)], light)
    paint(art, [(1, 16), (2, 16), (2, 17)], light)
    return outlined(art)


def ending_backdrop(pack):
    out = Image.new('RGBA', CANVAS, (0, 0, 0, 255))
    out.alpha_composite(sky(ENDING_SKY, ENDING_HORIZON), (0, 0))
    sun(out, *ENDING_SUN)
    for at, rows in (((22, 7), CLOUD_SMALL), ((112, 5), CLOUD_LONG), ((176, 12), CLOUD_MEDIUM), ((218, 4), CLOUD_SMALL)):
        stamp(out, rows, ENDING_CLOUDS, *at)
    for at in ((132, 17), (148, 12), (160, 18)):
        stamp(out, GULL, {'X': ENDING_DARK}, *at)
    far_island(out, 262, ENDING_HORIZON, 56, 6, ENDING_DARK)
    out.alpha_composite(far_castle(ENDING_DARK, OUTLINE, hexrgb('#ffbc75')), (272, ENDING_HORIZON - 24))
    out.alpha_composite(ending_sea(CANVAS[1] - ENDING_HORIZON), (0, ENDING_HORIZON))
    out.alpha_composite(vessel_afar(), VESSEL_AFAR_AT)
    paint(out, [(x, ENDING_HORIZON + 2) for x in range(92, 102)] + [(x, ENDING_HORIZON + 4) for x in range(95, 103)], hexrgb('#fce2ca'))
    planks = frames_in(castle_dock(pack), 6, 6)
    for row in range(2):
        for column in range(CANVAS[0] // TILE):
            roll = scatter(column, row, 5) % 8
            frame = planks[column % 2 if roll < 5 else 2 + (roll - 5) + (column % 2 if roll == 5 else 0)]
            out.alpha_composite(frame, (column * TILE, ENDING_QUAY + row * TILE))
    for x in (34, 148, 268):
        stamp(out, POST, VESSEL_COLOURS, x, ENDING_QUAY - 5)
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
    'castle-wall': castle_wall,
    'castle-floor': castle_floor,
    'castle-grass': castle_grass,
    'castle-pillars': castle_pillars,
    'castle-fountain': castle_fountain,
    'castle-water': castle_water,
    'castle-dock': castle_dock,
    **{name: monster_builder(source) for name, source in MONSTERS.items()},
    'projectile-orb': projectile_orb,
    'fx-puff': lambda pack: pack.image('FX', 'Smoke', 'Smoke', 'SpriteSheet.png'),
    'monster-castle-guardian': guardian_sheet,
    'prop-chest': chest_sheet,
    'prop-pickup': pickup_sheet,
    'prop-checkpoint': checkpoint_sheet,
    'prop-exit': exit_sheet,
    'prop-door': door_sheet,
    'prop-gate': gate_sheet,
    'prop-lever': lever_sheet,
    'prop-sign': lambda pack: cut(pack.tileset('TilesetElement'), 0, 2),
    'prop-vessel': vessel_sheet,
    'backdrop-title': title_backdrop,
    'backdrop-ending': ending_backdrop,
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
