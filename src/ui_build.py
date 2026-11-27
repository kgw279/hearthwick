"""Pack the UI kit into sheets and render two mock screens (called from build.py)."""
import os
from PIL import Image, ImageDraw, ImageFont
from xbox import XBOX, DEFAULT_BINDINGS
from ui2 import FRAMES2, PORTRAIT, CONTROLS, CURSOR_HOTSPOTS, ICONS2, KEYS, KEYS_WIDE, DEFAULT_KEY_BINDINGS, LOADING, INK, INK_MAP, ink
import ui as _ui
from ui import FRAMES, SMALL, PILLS, ICONS, EMOTES, FONT, FONT_CHARS, LETTERS, LETTER_CHARS, LOWERCASE, LOWER_CHARS, selection_bracket, bubble_tail


def pack(entries, cell_w, cell_h, cols, path):
    rows = (len(entries) + cols - 1) // cols
    im = Image.new('RGBA', (cols * cell_w, rows * cell_h))
    frames = {}
    for i, (key, spr, *rest) in enumerate(entries):
        x, y = (i % cols) * cell_w, (i // cols) * cell_h
        im.paste(spr.image(), (x, y))
        frames[key] = {'x': x, 'y': y, 'w': spr.w, 'h': spr.h}
        if rest and rest[0] is not None:
            frames[key]['slice'] = rest[0]
    im.save(path)
    return frames, im


def nine(img, b, w, h):
    """9-slice by repeating (never stretching) the edges and centre, so pixels stay crisp.
    b = one border for all sides, or (left, top, right, bottom)."""
    W, H = img.size
    l, t, r, bt = (b, b, b, b) if isinstance(b, int) else b
    out = Image.new('RGBA', (w, h))
    def tile(src_box, dst_box):
        x0, y0, x1, y1 = dst_box
        if src_box[2] <= src_box[0] or src_box[3] <= src_box[1] or x1 <= x0 or y1 <= y0:
            return                                     # zero-width border on this side
        piece = img.crop(src_box); pw, ph = piece.size
        for yy in range(y0, y1, ph):
            for xx in range(x0, x1, pw):
                out.paste(piece.crop((0, 0, min(pw, x1 - xx), min(ph, y1 - yy))), (xx, yy))
    tile((0, 0, l, t), (0, 0, l, t)); tile((W - r, 0, W, t), (w - r, 0, w, t))
    tile((0, H - bt, l, H), (0, h - bt, l, h)); tile((W - r, H - bt, W, H), (w - r, h - bt, w, h))
    tile((l, 0, W - r, t), (l, 0, w - r, t)); tile((l, H - bt, W - r, H), (l, h - bt, w - r, h))
    tile((0, t, l, H - bt), (0, t, l, h - bt)); tile((W - r, t, W, H - bt), (w - r, t, w, h - bt))
    tile((l, t, W - r, H - bt), (l, t, w - r, h - bt))
    return out


def build_ui(out_dir):
    ui = {}
    frames_entries = [(n, f(), b) for n, f, b in FRAMES] + [(n, f(), None) for n, f in SMALL] + \
                     [(n, f(), 4) for n, f in PILLS] + [('selection_bracket', selection_bracket(), None)]
    big = [e for e in frames_entries if e[1].w > 24]
    small = [e for e in frames_entries if e[1].w <= 24]
    f1, _ = pack(small, 24, 24, 8, os.path.join(out_dir, 'ui_frames.png'))
    f2, _ = pack(big, 32, 32, 4, os.path.join(out_dir, 'ui_cursor.png'))
    f3, _ = pack([(n, f()) for n, f in ICONS], 16, 16, 12, os.path.join(out_dir, 'ui_icons.png'))
    f4, _ = pack([(n, f()) for n, f in EMOTES], 20, 20, 10, os.path.join(out_dir, 'ui_emotes.png'))
    f5, _ = pack([(n, f()) for n, f in FONT], 7, 9, 17, os.path.join(out_dir, 'ui_font_digits.png'))
    ui['ui_frames'] = {'image': 'ui_frames.png', 'frames': f1,
                       'note': "'slice' = 9-slice border in px: one number for all sides or [left, top, right, bottom]; repeat edges/centre rather than stretching"}
    ui['ui_cursor'] = {'image': 'ui_cursor.png', 'frames': f2}
    ui['ui_icons'] = {'image': 'ui_icons.png', 'cell': [16, 16], 'frames': f3}
    ui['ui_emotes'] = {'image': 'ui_emotes.png', 'cell': [20, 20], 'frames': f4,
                       'note': 'emote_request is empty: draw a food sprite inside it'}
    ui['ui_font_digits'] = {'image': 'ui_font_digits.png', 'cell': [7, 9], 'frames': f5, 'chars': ''.join(FONT_CHARS),
                            'advance': 6, 'note': '5x7 glyphs with 1px outline; draw 6px apart so outlines overlap'}
    f7, _ = pack([(n, f()) for n, f in LETTERS], 7, 9, 17, os.path.join(out_dir, 'ui_font_letters.png'))
    ui['ui_font_letters'] = {'image': 'ui_font_letters.png', 'cell': [7, 9], 'frames': f7, 'chars': ''.join(LETTER_CHARS),
                             'advance': 6, 'note': 'capitals and punctuation, same style as ui_font_digits; use both sheets together; space = 4px'}
    f8, _ = pack([(n, f()) for n, f in LOWERCASE], 7, 10, 13, os.path.join(out_dir, 'ui_font_lower.png'))
    ui['ui_font_lower'] = {'image': 'ui_font_lower.png', 'cell': [7, 10], 'frames': f8, 'chars': ''.join(LOWER_CHARS),
                           'advance': 6, 'note': 'lowercase a-z; draw at the same y as capitals and digits (shared baseline), the extra bottom row is for descenders'}
    g1, _ = pack([(n, f(), b) for n, f, b in FRAMES2], 32, 24, 7, os.path.join(out_dir, 'ui_frames2.png'))
    ui['ui_frames2'] = {'image': 'ui_frames2.png', 'frames': g1,
                        'note': "more 9-slice pieces (tabs, text fields, dropdown, tooltip, toast, ribbon banner, slider/scroll tracks, card, divider); 'slice' as in ui_frames"}
    g2, _ = pack([(n, f()) for n, f in PORTRAIT], 40, 40, 1, os.path.join(out_dir, 'ui_portrait_frame.png'))
    ui['ui_portrait_frame'] = {'image': 'ui_portrait_frame.png', 'frames': g2, 'note': 'not 9-slice; the 32x32 opening starts at (4, 4)'}
    g3, _ = pack([(n, f()) for n, f in CONTROLS], 16, 16, 12, os.path.join(out_dir, 'ui_controls.png'))
    ui['ui_controls'] = {'image': 'ui_controls.png', 'cell': [16, 16], 'frames': g3, 'cursor_hotspots': CURSOR_HOTSPOTS,
                         'note': 'slider: draw slider_track (9-slice), slider_fill up to the value, then slider_knob; scroll: scroll_track + scroll_thumb + scroll_up/down'}
    g4, _ = pack([(n, f()) for n, f in ICONS2], 16, 16, 14, os.path.join(out_dir, 'ui_icons2.png'))
    ui['ui_icons2'] = {'image': 'ui_icons2.png', 'cell': [16, 16], 'frames': g4, 'note': 'system icons; same grid and style as ui_icons'}
    g5, _ = pack([(n, f()) for n, f in KEYS], 16, 16, 22, os.path.join(out_dir, 'ui_keys.png'))
    g6, _ = pack([(n, f()) for n, f in KEYS_WIDE], 32, 16, 8, os.path.join(out_dir, 'ui_keys_wide.png'))
    ui['ui_keys'] = {'image': 'ui_keys.png', 'cell': [16, 16], 'frames': g5,
                     'animation': 'alternate <name> and <name>_pressed at ~3 fps to make a prompt pulse', 'suggested_bindings': DEFAULT_KEY_BINDINGS}
    ui['ui_keys_wide'] = {'image': 'ui_keys_wide.png', 'cell': [32, 16], 'frames': g6}
    g7, _ = pack([(n, f()) for n, f in LOADING], 16, 16, 9, os.path.join(out_dir, 'ui_loading.png'))
    ui['ui_loading'] = {'image': 'ui_loading.png', 'cell': [16, 16], 'frames': g7,
                        'animations': {'spinner': [f'spinner_f{i}' for i in range(8)]},
                        'note': 'spinner ~10 fps; timer_ring_0..8 = empty..full (pick by progress)'}
    g8, _ = pack([(n, f()) for n, f in INK], 7, 10, 20, os.path.join(out_dir, 'ui_font_ink.png'))
    ui['ui_font_ink'] = {'image': 'ui_font_ink.png', 'cell': [7, 10], 'frames': g8, 'chars': INK_MAP, 'advance': 6,
                         'note': 'all characters in dark brown ink with no outline, for light panels (parchment, cards, text fields); same baseline and spacing as the outlined fonts'}
    f6, _ = pack([(n, f()) for n, f in XBOX], 16, 16, 14, os.path.join(out_dir, 'ui_xbox.png'))
    ui['ui_xbox'] = {'image': 'ui_xbox.png', 'cell': [16, 16], 'frames': f6,
                     'animation': 'alternate <name> and <name>_pressed at ~3 fps to make a prompt pulse',
                     'suggested_bindings': DEFAULT_BINDINGS}
    return ui


def _chip(F, X, btn, label, pressed=False):
    """A prompt chip: dark pill + button glyph + label. Returns an RGBA image."""
    tw = len(label) * 6
    w = 24 + tw
    chip = nine(F['panel_dark'], 8, w, 20)
    chip.alpha_composite(X[btn + ('_pressed' if pressed else '')], (3, 2))
    ImageDraw.Draw(chip).text((21, 4), label, fill=(255, 243, 224), font=ImageFont.load_default())
    return chip


def mock_prompts(out_dir, town_png, floors_png):
    F = _imgs([(n, f, b) for n, f, b in FRAMES] + list(SMALL) + list(PILLS))
    X = {n: f().image() for n, f in XBOX}
    town = Image.open(town_png)
    town = town.resize((town.width // 2, town.height // 2), Image.NEAREST).convert('RGBA')
    floors = Image.open(floors_png).convert('RGBA')
    kitchen = floors.crop((16 + 9 * 64, 32 + 2 * 64, 16 + 14 * 64, 32 + 8 * 64))
    kitchen = kitchen.resize((kitchen.width // 2, kitchen.height // 2), Image.NEAREST)

    def scene(pressed):
        sc = Image.new('RGBA', (400 + 160, 262), (42, 27, 45, 255))
        sc.alpha_composite(town.crop((0, 192, 400, 192 + 192)), (0, 0))
        sc.alpha_composite(kitchen, (400, 0))
        sc.alpha_composite(_chip(F, X, 'xb_a', 'Harvest', pressed), (52, 64))        # over the berry bush
        sc.alpha_composite(_chip(F, X, 'xb_a', 'Fish', pressed), (330, 104))          # by the pond
        sc.alpha_composite(_chip(F, X, 'xb_a', 'Talk', pressed), (278, 74))           # frog guest
        sc.alpha_composite(_chip(F, X, 'xb_x', 'Cook', pressed), (424, 6))            # kitchen station
        sc.alpha_composite(_chip(F, X, 'xb_y', 'Recipes', False), (430, 168))
        # controls hint bar
        bar = nine(F['panel_wood'], 8, 560, 30)
        sc.alpha_composite(bar, (0, 196))
        d = ImageDraw.Draw(sc)
        x = 10
        for btn, label in (('xb_a', 'Interact'), ('xb_b', 'Back'), ('xb_x', 'Cook'), ('xb_y', 'Recipes'),
                           ('xb_lb', ''), ('xb_rb', 'Tabs'), ('xb_ls_move', 'Move'), ('xb_menu', 'Menu')):
            sc.alpha_composite(X[btn], (x, 203)); x += 18
            if label:
                d.text((x, 205), label, fill=(255, 243, 224), font=ImageFont.load_default()); x += len(label) * 6 + 12
        # full glyph gallery
        gx, gy = 10, 236
        names = [n for n, _ in XBOX if not n.endswith('_pressed')]
        for i, n in enumerate(names):
            sc.alpha_composite(X[n + ('_pressed' if pressed else '')], (gx + (i % 21) * 26, gy + (i // 21) * 22))
        return sc

    a, b = scene(False), scene(True)
    a.resize((a.width * 2, a.height * 2), Image.NEAREST).save(os.path.join(out_dir, 'mock_prompts.png'))
    frames = [im.resize((im.width * 2, im.height * 2), Image.NEAREST).convert('P', palette=Image.ADAPTIVE) for im in (a, b)]
    frames[0].save(os.path.join(out_dir, 'mock_prompts_pulse.gif'), save_all=True, append_images=frames[1:], duration=330, loop=0)


# ---------------------------------------------------------------------
# Mock screens
# ---------------------------------------------------------------------

def _imgs(entries):
    return {n: (f() if callable(f) else f).image() for n, f, *_ in entries}


def _digits(canvas, text, x, y):
    font = {c: f().image() for c, (n, f) in zip(FONT_CHARS, FONT)}
    for ch in text:
        if ch == ' ':
            x += 4; continue
        canvas.alpha_composite(font[ch], (x, y)); x += 6
    return x


def _label(d, xy, text, fill=(42, 27, 45)):
    d.text(xy, text, fill=fill, font=ImageFont.load_default())


def mock_hud(out_dir, town_png, food_sheet, food_frames):
    F = _imgs([(n, f, b) for n, f, b in FRAMES] + list(SMALL) + list(PILLS))
    I = _imgs(ICONS); E = _imgs(EMOTES)
    town = Image.open(town_png)
    town = town.resize((town.width // 2, town.height // 2), Image.NEAREST)          # back to 1x
    sc = town.crop((0, 64, 400, 64 + 300)).convert('RGBA')
    d = ImageDraw.Draw(sc)
    # top-left: coins pill
    sc.alpha_composite(nine(F['panel_dark'], 8, 70, 22), (6, 6))
    sc.alpha_composite(I['coin'], (10, 9)); _digits(sc, '1250', 28, 12)
    # friendship meter
    sc.alpha_composite(nine(F['panel_dark'], 8, 86, 22), (80, 6))
    sc.alpha_composite(I['friendship'], (83, 9))
    sc.alpha_composite(nine(F['bar_frame'], 3, 58, 8), (102, 13))
    fill = F['bar_fill_pink']
    for x in range(104, 104 + 36, 4): sc.alpha_composite(fill, (x, 15))
    # top-right: day/time + weather
    sc.alpha_composite(nine(F['panel_dark'], 8, 96, 22), (298, 6))
    sc.alpha_composite(I['sun'], (301, 9)); _digits(sc, '8:30', 318, 12); sc.alpha_composite(I['rain'], (374, 9))
    # bell with badge
    sc.alpha_composite(F['button_secondary'], (370, 34)); sc.alpha_composite(I['bell'], (374, 34))
    # NPC request bubble over the frog guest
    bub = E['emote_request'].copy()
    food = food_sheet.crop((food_frames['bread_loaf']['x'] + 8, food_frames['bread_loaf']['y'] + 9,
                            food_frames['bread_loaf']['x'] + 24, food_frames['bread_loaf']['y'] + 21))
    bub.alpha_composite(food, (2, 3))
    sc.alpha_composite(bub, (289, 196 - 64))
    # speech bubble from the baker
    sp = nine(F['speech_bubble'], 6, 118, 26)
    sc.alpha_composite(sp, (150, 166))
    sc.alpha_composite(bubble_tail().image(), (166, 191))
    _label(d, (158, 173), 'Fresh loaves today!')
    # selection on a forage node + tap hand
    sc.alpha_composite(selection_bracket().image(), (64, 224))
    sc.alpha_composite(I['hand'], (86, 244))
    # toast
    sc.alpha_composite(nine(F['panel_parchment'], 8, 92, 22), (154, 36))
    sc.alpha_composite(I['sparkle'], (158, 39)); _label(d, (176, 41), '+1 Wheat')
    # bottom tab bar
    bar_y = 300 - 34
    sc.alpha_composite(nine(F['panel_wood'], 8, 400, 34), (0, bar_y))
    for i, (icon, style) in enumerate((('map', 'secondary'), ('bag', 'secondary'), ('kitchen', 'primary'), ('inn', 'secondary'))):
        bx = 40 + i * 88
        sc.alpha_composite(nine(F[f'button_{style}'], (6, 5, 6, 7), 64, 24), (bx, bar_y + 5))
        sc.alpha_composite(I[icon], (bx + 24, bar_y + 8 + (0 if style == 'secondary' else 0)))
    sc = sc.resize((sc.width * 3, sc.height * 3), Image.NEAREST)
    sc.save(os.path.join(out_dir, 'mock_hud.png'))


def mock_menus(out_dir, bg_png, food_sheet, food_frames):
    F = _imgs([(n, f, b) for n, f, b in FRAMES] + list(SMALL) + list(PILLS))
    I = _imgs(ICONS)
    bg = Image.open(bg_png)
    room = bg.resize((bg.width // 2, bg.height // 2), Image.NEAREST).convert('RGBA')
    bg = Image.new('RGBA', (400, 300), (34, 32, 52, 255)); bg.alpha_composite(room, ((400 - room.width) // 2, (300 - room.height) // 2))
    dim = Image.new('RGBA', bg.size, (26, 15, 28, 150)); bg.alpha_composite(dim)
    sc = bg; d = ImageDraw.Draw(sc)

    def food(name):
        fr = food_frames[name]
        return food_sheet.crop((fr['x'] + 4, fr['y'] + 4, fr['x'] + 28, fr['y'] + 28))

    # pantry / inventory
    sc.alpha_composite(nine(F['panel_parchment'], 8, 164, 196), (10, 12))
    sc.alpha_composite(nine(F['panel_wood'], 8, 100, 20), (42, 4)); _label(d, (68, 8), 'PANTRY', (255, 243, 224))
    items = ['egg', 'wheat', 'flour', 'milk', 'bread_loaf', 'trout', 'beef', 'honey', 'apple', 'berries', 'cheese', 'onion',
             'mushroom', 'herbs', 'potato', 'carrot', None, None, None, None]
    counts = ['6', '12', '3', '2', '1', '4', '2', '5', '7', '9', '1', '3', '2', '8', '4', '6']
    for i, it in enumerate(items):
        x, y = 22 + (i % 5) * 28, 34 + (i // 5) * 30
        key = 'slot_selected' if i == 4 else 'slot_locked' if i >= 18 else 'slot'
        sc.alpha_composite(F[key], (x, y))
        if it:
            sc.alpha_composite(food(it), (x, y))
            if i < len(counts): _digits(sc, counts[i], x + 24 - 6 * len(counts[i]) - 1, y + 16)
    sc.alpha_composite(nine(F['bar_frame'], 3, 120, 8), (30, 162))
    for x in range(32, 32 + 84, 4): sc.alpha_composite(F['bar_fill_green'], (x, 164))
    _label(d, (30, 174), 'Pantry 46 / 64')
    # recipe card
    rx, ry = 186, 20
    sc.alpha_composite(nine(F['panel_parchment'], 8, 204, 172), (rx, ry))
    sc.alpha_composite(nine(F['panel_wood'], 8, 140, 20), (rx + 32, ry - 8)); _label(d, (rx + 52, ry - 4), 'TOAST', (255, 243, 224))
    sc.alpha_composite(nine(F['panel_inset'], 3, 180, 44), (rx + 12, ry + 20))
    sc.alpha_composite(F['slot'], (rx + 20, ry + 30)); sc.alpha_composite(food('bread_loaf'), (rx + 20, ry + 30))
    sc.alpha_composite(I['plus'], (rx + 48, ry + 34))
    sc.alpha_composite(F['slot'], (rx + 66, ry + 30)); sc.alpha_composite(food('cheese'), (rx + 66, ry + 30))
    sc.alpha_composite(I['arrow_right'], (rx + 94, ry + 34)); sc.alpha_composite(I['method_grill'], (rx + 112, ry + 34))
    sc.alpha_composite(I['arrow_right'], (rx + 130, ry + 34))
    sc.alpha_composite(F['slot_selected'], (rx + 150, ry + 30)); sc.alpha_composite(food('dish_cheese_toast'), (rx + 150, ry + 30))
    # tags
    for i, t in enumerate(('hearty', 'savory', 'warm')):
        px = rx + 16 + i * 58
        sc.alpha_composite(nine(F[f'tag_pill_{t}'], 4, 52, 16), (px, ry + 72))
        sc.alpha_composite(I[f'tag_{t}'], (px + 1, ry + 72))
        _label(d, (px + 18, ry + 74), t, (255, 255, 255))
    # rating + value
    for i in range(5): sc.alpha_composite(I['star' if i < 4 else 'star_empty'], (rx + 16 + i * 16, ry + 96))
    sc.alpha_composite(I['coin'], (rx + 120, ry + 96)); _digits(sc, '15', rx + 138, ry + 99)
    # buttons
    sc.alpha_composite(nine(F['button_primary'], (6, 5, 6, 7), 84, 24), (rx + 14, ry + 132)); _label(d, (rx + 40, ry + 137), 'COOK')
    sc.alpha_composite(nine(F['button_secondary'], (6, 5, 6, 7), 84, 24), (rx + 106, ry + 132)); _label(d, (rx + 128, ry + 137), 'CLOSE')
    sc.alpha_composite(I['close'], (rx + 190, ry - 6))
    # method strip
    sc.alpha_composite(nine(F['panel_dark'], 8, 380, 30), (10, 216))
    for i, m in enumerate(('grind', 'mix', 'chop', 'fry', 'grill', 'bake', 'boil')):
        key = 'button_primary' if m == 'grill' else 'button_secondary'
        sc.alpha_composite(nine(F[key], (6, 5, 6, 7), 44, 22), (22 + i * 52, 220))
        sc.alpha_composite(I[f'method_{m}'], (36 + i * 52, 222))
    # icon gallery row
    for i, n in enumerate(('heart', 'heart', 'heart', 'heart_empty', 'heart_empty')):
        sc.alpha_composite(I[n], (14 + i * 15, 256))
    for i, n in enumerate(('settings', 'map', 'recipe_book', 'bag', 'person', 'lock', 'clock', 'moon', 'snow', 'cloud')):
        sc.alpha_composite(I[n], (110 + i * 20, 256))
    sc = sc.resize((sc.width * 3, sc.height * 3), Image.NEAREST)
    sc.save(os.path.join(out_dir, 'mock_menus.png'))


# ---------------------------------------------------------------- pixel-font text + UI kit showcase
def text(t, ink_font=False):
    """Render a string with the game's own pixel fonts (digits, capitals, lowercase); ink_font for light panels."""
    w = sum(4 if c == ' ' else 6 for c in t) + 2
    im = Image.new('RGBA', (max(w, 1), 11))
    x = 0
    for c in t:
        if c == ' ': x += 4; continue
        if ink_font:
            im.alpha_composite(ink(c).image(), (x, 0)); x += 6; continue
        if c in _ui.LOWER_GLYPHS: g = _ui.lower(c)
        elif c in _ui.LETTER_GLYPHS: g = _ui.letter(c)
        elif c.upper() in _ui.LETTER_GLYPHS: g = _ui.letter(c.upper())
        else: g = _ui.glyph(c)
        im.alpha_composite(g.image(), (x, 0)); x += 6
    return im


def mock_ui_kit(out_dir):
    F = {n: f().image() for n, f, b in FRAMES}
    F2 = {n: f().image() for n, f, b in FRAMES2}
    C = {n: f().image() for n, f in CONTROLS}
    I = {n: f().image() for n, f in ICONS2}
    I1 = {n: f().image() for n, f in ICONS}
    K = {n: f().image() for n, f in KEYS + KEYS_WIDE}
    L = {n: f().image() for n, f in LOADING}
    P = {n: f().image() for n, f in PORTRAIT}
    sc = Image.new('RGBA', (360, 240), (58, 44, 58, 255))
    put = lambda img, x, y: sc.alpha_composite(img, (x, y))
    # settings window
    put(nine(F['panel_parchment'], 6, 220, 200), 8, 30)
    put(nine(F2['ribbon_banner'], (10, 4, 10, 6), 120, 16), 58, 22); put(text('Settings'), 94, 25)
    put(C['close_button'], 210, 36)
    tabs = [('Game', True), ('Sound', False), ('Keys', False)]
    x = 16
    for name, act in tabs:
        tw = len(name) * 6 + 12
        put(nine(F2['tab_active' if act else 'tab_inactive'], (4, 4, 4, 3), tw, 16), x, 46); put(text(name, True), x + 6, 50); x += tw + 2
    put(nine(F['panel_inset'], 3, 204, 134), 16, 62)
    rows = [('Music', 'slider', 0.7), ('Sounds', 'slider', 0.4), ('Show tips', 'toggle', True), ('Big text', 'check', False),
            ('Auto save', 'check', True), ('Language', 'dropdown', 'English')]
    for i, (label, kind, val) in enumerate(rows):
        y = 70 + i * 20
        put(text(label, True), 22, y + 3)
        if kind == 'slider':
            put(nine(F2['slider_track'], (3, 0, 3, 0), 80, 8), 104, y + 4)
            put(nine(F2['slider_fill'], (1, 0, 1, 0), int(80 * val), 8), 104, y + 4)
            put(C['slider_knob'], 104 + int(80 * val) - 8, y)
            put(I['music_on' if label == 'Music' else 'sound_on'], 190, y)
        elif kind == 'toggle':
            put(C['toggle_on' if val else 'toggle_off'], 104, y)
        elif kind == 'check':
            put(C['checkbox_on' if val else 'checkbox_off'], 104, y)
        else:
            put(nine(F2['dropdown_field'], (3, 3, 10, 3), 90, 16), 104, y); put(text(val, True), 108, y + 3)
    # buttons
    put(nine(F['button_secondary'], (6, 5, 6, 7), 70, 16), 30, 204); put(text('Back'), 50, 207)
    put(nine(F['button_success'], (6, 5, 6, 7), 70, 16), 140, 204); put(text('Save'), 160, 207)
    # key hints
    yk = 34
    for k, label in (('key_e', 'Talk'), ('key_esc', 'Back'), ('key_i', 'Bag'), ('mouse_left', 'Use')):
        img = K[k]; put(img, 244, yk); put(text(label), 244 + img.width + 4, yk + 3); yk += 20
    # toast + tooltip
    put(nine(F2['toast'], (6, 4, 4, 4), 112, 28), 240, 118); put(I1['recipe_book'], 250, 124); put(text('New recipe', True), 268, 122); put(text('learned!', True), 268, 132)
    put(nine(F2['tooltip'], 4, 86, 18), 248, 152); put(text('Honey mead'), 252, 156)
    # portrait, badge, spinner, ring, cursors
    put(P['portrait_frame'], 244, 180); put(C['badge'], 276, 176)
    put(L['spinner_f2'], 300, 186); put(L['timer_ring_5'], 320, 186)
    put(C['cursor_hand'], 186, 108)
    for i, n in enumerate(('season_spring', 'season_summer', 'season_autumn', 'season_winter')): put(I[n], 296 + (i % 2) * 18, 204 + (i // 2) * 16)
    sc.resize((sc.width * 3, sc.height * 3), Image.NEAREST).save(os.path.join(out_dir, 'mock_ui_kit.png'))
