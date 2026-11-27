"""Town pieces for the new Hearthwick layout: the chapel, Willowmill's water wheel, and the stone
bridge's parapets (the bridge deck itself is cobblestone ground laid across the river)."""
import math
from core import Sprite


def chapel():
    """Small stone chapel, 64x64: steep slate roof, bell tower with a round window, arched door."""
    s = Sprite(64, 64)
    # bell tower (left), in front of the roof line
    s.rect(10, 4, 23, 40, 'S')
    s.rect(10, 4, 23, 4, 'p')
    for y in range(8, 40, 4):
        s.rect(10, y, 23, y, 'e')
        for x in range(10 + (y // 4) % 2 * 3, 24, 6): s.rect(x, y + 1, x, y + 3, 'e')
    for i in range(7): s.rect(10 + i, 3 - i // 2, 23 - i, 3 - i // 2, 'n')   # spire cap
    s.rect(16, 0, 17, 1, 'y')                                                # bell finial
    s.rect(14, 10, 19, 17, 'b'); s.rect(15, 11, 18, 16, 'K'); s.rect(16, 12, 17, 15, 'y')  # belfry opening + bell
    # nave roof (slate)
    for i in range(16):
        s.rect(22 + i // 3, 16 + i, 60 - i // 3, 16 + i, 'n' if i % 3 else 'v')
    s.rect(22, 16, 60, 16, 'p')
    # nave walls
    s.rect(10, 32, 59, 57, 's')
    for y in range(35, 57, 4):
        s.rect(10, y, 59, y, 'S')
        for x in range(10 + (y // 4) % 2 * 4, 60, 8): s.rect(x, y + 1, x, y + 3, 'S')
    s.rect(10, 32, 59, 33, 'd')                                              # eave shadow
    # arched windows with coloured glass
    for wx in (36, 48):
        s.rect(wx, 37, wx + 6, 49, 'b'); s.rect(wx + 1, 36, wx + 5, 36, 'b')
        s.rect(wx + 1, 38, wx + 5, 48, 'u'); s.rect(wx + 1, 38, wx + 5, 40, 'm'); s.rect(wx + 3, 38, wx + 3, 48, 'b')
        s.set(wx + 2, 43, 'y'); s.set(wx + 4, 45, 'R')
    # arched door under the tower
    s.rect(12, 44, 21, 57, 'b'); s.rect(13, 42, 20, 43, 'b')
    s.rect(13, 45, 20, 57, 'B'); s.rect(14, 43, 19, 44, 'B'); s.rect(16, 45, 17, 57, 'b')
    s.set(15, 51, 'y'); s.set(18, 51, 'y')
    s.rect(11, 58, 22, 59, 'S'); s.rect(12, 60, 21, 60, 'd')                # step
    s.rect(10, 57, 59, 57, 'e')                                              # footing
    s.outline()
    for y in range(61, 64):
        for x in range(8, 62):
            if s.px[y][x] is None and (y < 63 or 11 < x < 58): s.px[y][x] = 'K'
    return s


def water_wheel(frame):
    """Wooden water wheel, 32x32, side-on; 4 frames turn it through one paddle step."""
    s = Sprite()
    cx, cy, r = 15.5, 15.5, 13
    ang0 = frame * (math.pi / 16)
    for y in range(32):
        for x in range(32):
            d = math.hypot(x - cx, y - cy)
            if r - 2 <= d <= r: s.set(x, y, 'B')
            elif 4 <= d <= 5: s.set(x, y, 'B')
            elif d < 4: s.set(x, y, 'b')
    for k in range(8):                                         # spokes and paddles
        a = ang0 + k * math.pi / 4
        for t in range(5, r - 1):
            s.set(round(cx + math.cos(a) * t), round(cy + math.sin(a) * t), 't')
        px, py = cx + math.cos(a) * (r + 1), cy + math.sin(a) * (r + 1)
        for t in (-2, -1, 0, 1, 2):
            x = round(px + math.cos(a + math.pi / 2) * t * 0.6)
            y = round(py + math.sin(a + math.pi / 2) * t * 0.6)
            if 0 <= x < 32 and 0 <= y < 32: s.set(x, y, 'k')
    for x in range(4, 28):                                     # splash where it meets the water
        if (x + frame) % 3 == 0: s.set(x, 30, 'p'); s.set(x, 31, 'c')
    s.outline()
    return s


def bridge_rail(side):
    """Low stone parapet along one side of the bridge, 32x32: 'n' runs along the north edge of the deck
    (drawn as a wall face), 's' along the south edge (seen from above, a capped low wall)."""
    s = Sprite()
    if side == 'n':
        y0 = 18
        s.rect(0, y0, 31, y0 + 2, 'p')                        # cap stones
        s.rect(0, y0 + 3, 31, 30, 'S')
        for y in range(y0 + 5, 31, 4):
            s.rect(0, y, 31, y, 'e')
            for x in range((y // 4) % 2 * 4, 32, 8): s.rect(x, y + 1, x, y + 3, 'e')
        s.rect(0, 31, 31, 31, 'd')
    else:
        s.rect(0, 0, 31, 3, 'p'); s.rect(0, 4, 31, 9, 'S'); s.rect(0, 10, 31, 10, 'd')
        for x in range(0, 32, 8): s.rect(x, 4, x, 9, 'e')
    s.outline()
    return s


TOWN_BUILDINGS = [('chapel', chapel)]
TOWN_PROPS = [(f'water_wheel_f{i}', lambda i=i: water_wheel(i)) for i in range(4)] + [
    ('bridge_rail_n', lambda: bridge_rail('n')), ('bridge_rail_s', lambda: bridge_rail('s'))]
TOWN_ANIMATIONS = {'water_wheel': [f'water_wheel_f{i}' for i in range(4)]}
