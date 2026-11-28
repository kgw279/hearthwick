"""Tag icons (12x12, sheet "tags"): a small colour-coded badge for each course and trait, so what a thing
is reads at a glance wherever it's listed (the recipe book, guests' orders, item details). Each is a
rounded badge in the tag's colour with a little white symbol."""
from core import Sprite

# tag: (badge colour, dark edge, symbol as rows of 6 over a 6x6 grid: '#' = light)
TAGS = {
    'drink':   ('c', 'u', ['.####.', '#....#', '#....##', '#....##', '#....#', '.####.']),
    'snack':   ('t', 'B', ['..##..', '.#..#.', '#.##.#', '#.##.#', '.#..#.', '..##..']),
    'main':    ('R', 'b', ['......', '.####.', '#....#', '######', '.####.', '......']),
    'dessert': ('m', 'v', ['..#...', '.###..', '#####.', '######', '######', '......']),
    'baked':   ('H', 'b', ['......', '.####.', '######', '#.#.##', '######', '......']),
    'fried':   ('T', 'g', ['......', '#####.', '#####.', '.###.#', '......', '......']),
    'grilled': ('d', 'K', ['......', '######', '......', '######', '......', '######']),
    'boiled':  ('U', 'n', ['.#..#.', '..#...', '#..#..', '.#...#', '..#.#.', '......']),
    'brewed':  ('v', 'n', ['.####.', '######', '#.##.#', '######', '#.##.#', '.####.']),
    'meaty':   ('P', 'R', ['..###.', '.#####', '.#####', '..###.', '.#....', '#.....']),
    'fishy':   ('C', 'u', ['......', '.###.#', '######', '.###.#', '......', '......']),
    'sweet':   ('y', 'H', ['.#..#.', '######', '######', '.####.', '..##..', '......']),
    'savory':  ('h', 'o', ['..#...', '.###..', '#####.', '.#.#.#', '#.#.#.', '......']),
    'fresh':   ('G', 'g', ['....##', '..####', '.####.', '####..', '.#....', '#.....']),
    'hearty':  ('S', 'e', ['#..#..', '.#.#.#', '..###.', '..#...', '..#...', '......']),
    'warm':    ('r', 'R', ['..#...', '..##..', '.###..', '.####.', '######', '.####.']),
}


def badge(colour, edge, rows):
    s = Sprite(12, 12)
    s.rect(1, 0, 10, 11, colour); s.rect(0, 1, 11, 10, colour)
    for x, y in ((1, 0), (10, 0), (0, 1), (11, 1), (0, 10), (11, 10), (1, 11), (10, 11)): s.set(x, y, edge)
    s.rect(1, 11, 10, 11, edge); s.rect(11, 1, 11, 10, edge)
    for y, row in enumerate(rows):
        for x, c in enumerate(row[:6]):
            if c == '#': s.set(3 + x, 3 + y, 'W')
    return s


ICONS = [(f'tag_{t}', (lambda v=v: badge(*v))) for t, v in TAGS.items()]
