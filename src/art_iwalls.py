"""Interior walls: the thin walls that divide rooms inside a building (top-down 3/4).

  V      a wall running north-south between two floors: a narrow cap seen from above
  V_end  its southern end, where it stops above open floor: the cap ends in a short front face
  V_top  its northern end, where it starts below open floor
  H      a wall running east-west between two floors: a cap along the top and its face below
  H_end_L / H_end_R  an H wall stopping at a doorway on its right / left
Wood caps go with plaster faces, stone caps with stone faces (the same pairing as the outer walls)."""
from core import Sprite
from sprites5 import _cap_fill
from sprites6 import face, STONE_MAP, _clear

X0, X1 = 12, 19          # the cap of a V wall (8px, centred)


def _v(s, y0=0, y1=31):
    _cap_fill(s, X0, y0, X1, y1)
    s.rect(X0 - 1, y0, X0 - 1, y1, 'O'); s.rect(X1 + 1, y0, X1 + 1, y1, 'O')
    s.rect(X0, y0, X0, y1, 't'); s.rect(X1, y0, X1, y1, 'B')


def iwall(kind, mat):
    s = Sprite()
    if kind == 'V':
        _v(s)
    elif kind == 'V_top':
        _v(s, 9)
        s.rect(X0 - 1, 8, X1 + 1, 8, 'O'); s.rect(X0, 9, X1, 9, 't')
    elif kind == 'V_end':
        _v(s, 0, 20)
        s.rect(X0, 21, X1, 27, 'B'); s.rect(X0, 21, X1, 21, 't'); s.rect(X0, 27, X1, 27, 'b')   # short front face
        for x in range(X0 + 2, X1, 3): s.rect(x, 22, x, 26, 'b')
        s.rect(X0 - 1, 21, X0 - 1, 28, 'O'); s.rect(X1 + 1, 21, X1 + 1, 28, 'O'); s.rect(X0 - 1, 28, X1 + 1, 28, 'O')
        s.rect(X0, 29, X1, 29, 'K')
    else:  # H and its doorway ends
        f = face('plain', 'plaster' if mat == 'wood' else 'stone')
        for y in range(8, 32):
            for x in range(32):
                s.px[y][x] = f.px[y - 4][x]
        _cap_fill(s, 0, 0, 31, 6)
        s.rect(0, 0, 31, 0, 'O'); s.rect(0, 1, 31, 1, 't'); s.rect(0, 7, 31, 7, 'O')
        if kind == 'H_end_L':     # wall continues left; doorway to the right
            _clear(s, 24, 0, 31, 31); s.rect(23, 0, 23, 31, 'O'); s.rect(22, 2, 22, 31, 'b')
        elif kind == 'H_end_R':   # wall continues right; doorway to the left
            _clear(s, 0, 0, 7, 31); s.rect(8, 0, 8, 31, 'O'); s.rect(9, 2, 9, 31, 't')
        if mat == 'stone':        # only the cap is recoloured; the face already is stone
            cap = s.copy().remap(STONE_MAP)
            for y in range(8):
                s.px[y] = cap.px[y][:]
        return s
    return s.remap(STONE_MAP) if mat == 'stone' else s


IWALL_KINDS = ['V', 'V_top', 'V_end', 'H', 'H_end_L', 'H_end_R']
IWALLS = [(f'iwall_{m}_{k}', (lambda k=k, m=m: iwall(k, m))) for m in ('wood', 'stone') for k in IWALL_KINDS]
