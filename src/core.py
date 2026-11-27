"""Core helpers for the Hearthwick pixel-art pack.

Every sprite is a 32x32 grid of palette keys (or None for transparent).
Palette = DawnBringer-32, the same palette used in the hand-drawn Aseprite sprites.
"""
from PIL import Image

PAL = {
    'K': '#222034',  # near-black (shadows, eyes)
    'O': '#45283c',  # plum outline
    'b': '#663931',  # dark brown
    'B': '#8f563b',  # brown
    'r': '#df7126',  # orange
    't': '#d9a066',  # tan
    'k': '#eec39a',  # cream / skin
    'y': '#fbf236',  # yellow
    'L': '#99e550',  # light green
    'G': '#6abe30',  # green
    'T': '#37946e',  # teal green
    'g': '#4b692f',  # dark green
    'o': '#524b24',  # dark olive
    'D': '#323c39',  # very dark green-grey
    'n': '#3f3f74',  # navy
    'u': '#306082',  # deep blue
    'U': '#5b6ee1',  # blue
    'c': '#639bff',  # light blue
    'C': '#5fcde4',  # cyan
    'p': '#cbdbfc',  # pale blue
    'W': '#ffffff',  # white
    's': '#9badb7',  # light grey
    'S': '#847e87',  # grey
    'd': '#696a6a',  # dark grey
    'e': '#595652',  # darker grey
    'v': '#76428a',  # violet
    'R': '#ac3232',  # red
    'P': '#d95763',  # pink
    'm': '#d77bba',  # magenta
    'h': '#8f974a',  # olive
    'H': '#8a6f30',  # mustard brown
}
RGB = {k: tuple(int(v[i:i + 2], 16) for i in (1, 3, 5)) for k, v in PAL.items()}

SIZE = 32


class Sprite:
    def __init__(self, w=SIZE, h=SIZE):
        self.w, self.h = w, h
        self.px = [[None] * w for _ in range(h)]

    # --- primitives -------------------------------------------------
    def set(self, x, y, c):
        x, y = int(x), int(y)
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[y][x] = c

    def get(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            return self.px[y][x]
        return None

    def rect(self, x0, y0, x1, y1, c):
        """Filled rect, inclusive corners (same semantics as Aseprite's filled rectangle drag)."""
        for y in range(min(y0, y1), max(y0, y1) + 1):
            for x in range(min(x0, x1), max(x0, x1) + 1):
                self.set(x, y, c)

    def ellipse(self, cx, cy, rx, ry, c):
        for y in range(self.h):
            for x in range(self.w):
                if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0:
                    self.set(x, y, c)

    def stamp(self, rows, ox=None, oy=None, legend=None):
        """Paste an ASCII map. '.' = skip. Centred if ox/oy omitted (oy: bottom-aligned helper via negative)."""
        h, w = len(rows), max(len(r) for r in rows)
        if ox is None:
            ox = (self.w - w) // 2
        if oy is None:
            oy = (self.h - h) // 2
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                if ch == '.':
                    continue
                if legend and ch in legend:
                    ch = legend[ch]
                self.set(ox + i, oy + j, ch)
        return ox, oy

    def outline(self, c='O', diag=False):
        """Add a 1px outline around every opaque pixel."""
        add = []
        nb = [(1, 0), (-1, 0), (0, 1), (0, -1)]
        if diag:
            nb += [(1, 1), (1, -1), (-1, 1), (-1, -1)]
        for y in range(self.h):
            for x in range(self.w):
                if self.px[y][x] is None and any(self.get(x + dx, y + dy) not in (None, c) for dx, dy in nb):
                    add.append((x, y))
        for x, y in add:
            self.px[y][x] = c

    def remap(self, mapping):
        out = self.copy()
        for y in range(self.h):
            for x in range(self.w):
                v = out.px[y][x]
                if v in mapping:
                    out.px[y][x] = mapping[v]
        return out

    def copy(self):
        s = Sprite(self.w, self.h)
        s.px = [row[:] for row in self.px]
        return s

    def image(self):
        im = Image.new('RGBA', (self.w, self.h), (0, 0, 0, 0))
        for y in range(self.h):
            for x in range(self.w):
                v = self.px[y][x]
                if v is not None:
                    im.putpixel((x, y), RGB[v] + (255,))
        return im


def check_rows(name, rows):
    w = len(rows[0])
    for i, r in enumerate(rows):
        if len(r) != w:
            raise ValueError(f'{name}: row {i} is {len(r)} wide, expected {w}: {r!r}')
        for ch in r:
            if ch != '.' and ch not in PAL:
                raise ValueError(f'{name}: unknown colour key {ch!r} in row {i}')
    return rows
