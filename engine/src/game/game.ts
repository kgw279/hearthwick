/**
 * The game: owns the scenes, the player and the UI, and runs one fixed update + one render per frame.
 * Scenes (the town, the inn's floors) are built on first visit and kept, so changes like harvested
 * forage persist while you come and go. Moving between scenes fades out, swaps, and fades back in.
 */
import type { Assets } from '../core/assets';
import { Camera } from '../core/camera';
import { overlaps, type Rect } from '../core/geom';
import { Input } from '../core/input';
import type { LoopStats } from '../core/loop';
import { Renderer, VIEW_W, VIEW_H } from '../core/renderer';
import type { Entity } from '../world/entity';
import type { Scene } from '../world/scene';
import { drawText, measure } from '../ui/text';
import { hint } from '../ui/buttons';
import { RoomMap } from '../world/room';
import { DialogBox, drawPrompt, Emotes, FloatTexts } from '../ui/widgets';
import { loadLayouts, type Layout } from '../world/layout';
import { artRect, buildScene, layoutSpawns, propFrames, titleOf, type SceneHooks } from './build';
import { Content } from './data';
import { Editor } from '../editor/editor';
import { Bag } from '../state/inventory';
import { Storage } from '../state/storage';
import { Furnish } from './furnish';
import { StorageScreen } from '../ui/storageScreen';
import { Shops } from '../state/shops';
import { InventoryScreen } from '../ui/inventoryScreen';
import { PrepScreen } from '../ui/prepScreen';
import { PlatingScreen } from '../ui/platingScreen';
import { accepts, InnStores, isInn, Kitchen } from '../state/kitchen';
import { isSetting, Service, type Guest, type Outcome } from '../state/service';
import { Clock } from '../state/clock';
import { Rooms } from '../state/rooms';
import { talk } from '../state/gossip';
import type { PlacedProp } from '../world/layout';
import { Cookbook } from '../state/cookbook';
import { JournalScreen } from '../ui/journalScreen';
import { Reputation } from '../state/reputation';
import { Pops } from '../ui/fx';
import { Washing } from '../state/washing';
import { WashScreen } from '../ui/washScreen';
import { barKey, hearthKey, isHearth, platingStations, seating, type Seat } from './seating';
import { newSeed, seeded, type Rng } from '../core/rng';
import { NameScreen } from '../ui/nameScreen';
import { HearthScreen } from '../ui/hearthScreen';
import { drawClockFace } from '../ui/clockFace';
import { GuestEntity, ReadyEntity, TopEntity, WalkerEntity } from './serviceView';
import { TableScreen } from '../ui/tableScreen';
import { containerOf } from '../world/containers';
import { drawCoins } from '../ui/items';
import type { Screen } from '../ui/screen';
import { ShopScreen } from '../ui/shopScreen';
import { Player } from './player';

const GUEST_SPEED = 18; // px per second guests walk at: an unhurried amble
const FADE = 0.22; // seconds for each half of a scene transition

interface Transition { phase: 'out' | 'in'; t: number; to: string; spawn: string }

/** How far (px) the player walks from where they arrived before exits work again while still walking. */
const ARM_DISTANCE = 48;

export class Game {
  readonly input = new Input();
  readonly content: Content;
  /** Every map, by id. The editor changes these in place and asks for the scene to be rebuilt. */
  readonly layouts: Map<string, Layout>;
  private readonly scenes = new Map<string, Scene>();
  scene!: Scene;
  private entities: Entity[] = [];
  readonly player: Player;
  readonly camera: Camera;
  private readonly hooks: SceneHooks;
  readonly editor: Editor;
  private readonly dialog = new DialogBox();
  private readonly emotes = new Emotes();
  private readonly floats = new FloatTexts();
  private transition: Transition | null = null;
  /**
   * Where the player arrived, until exits are armed again: they stay off until the player lets go of the
   * controls or walks away, so arriving beside stairs or a door while still walking doesn't go straight back.
   */
  private arrivedAt: { x: number; y: number } | null = null;
  /** The player's bag and purse, and the shops' shelves: the state a save game will hold. */
  readonly bag: Bag;
  readonly shops: Shops;
  /** What's in every storage container, by its id. */
  readonly storage: Storage;
  /** The inn's containers as one store, the dishes waiting on the counter, and cooking with them. */
  readonly kitchen: Kitchen;
  /** What's ready to serve, and the guests at the tables. */
  readonly service: Service;
  /** The inn's reputation: filled by serving guests, it brings more of them. */
  readonly reputation: Reputation;
  /** This game's seed: everything random in it comes from it (a new game, a new seed). */
  readonly seed = newSeed();
  private readonly rng: Rng = seeded(this.seed);
  /** The time of day. */
  readonly clock = new Clock();
  /** Whether the inn's open: closed, no new guests come in (those inside stay till they're done). */
  innOpen = true;
  private day = this.clock.day;
  /** The inn's guest rooms. */
  readonly rooms: Rooms;
  /** Pops (see ui/fx.ts) out in the world, and over the HUD. */
  private readonly worldPops = new Pops();
  private readonly hudPops = new Pops();
  private seenTimer = 0;
  /** The recipes the player knows. */
  readonly cookbook: Cookbook;
  /** The wash station's tub and drying rack. */
  readonly washing: Washing;
  /** Picking furniture up and setting it down in play. */
  readonly furnish: Furnish;
  /** A full-screen UI (bag, shop) that has the input while it's open. */
  private screen: Screen | null = null;
  private target: Entity | null = null;
  private time = 0;
  private debug = false;
  stats: LoopStats = { fps: 0 };

  constructor(readonly assets: Assets, readonly renderer: Renderer) {
    const game = this; // eslint-disable-line @typescript-eslint/no-this-alias
    this.content = new Content(assets.data);
    this.player = new Player(assets, 0, 0);
    this.camera = new Camera(VIEW_W, VIEW_H);
    this.hooks = {
      say: (text, speaker = '') => this.dialog.show(text, speaker, this.time),
      emote: (name) => this.emotes.pop(name, this.player.center.x, this.player.y, this.time),
      float: (text) => this.floats.pop(text, this.player.center.x, this.player.y, this.time),
      go: (to, spawn) => this.goTo(to, spawn),
      give: (item, n) => {
        const got = this.bag.add(item, n);
        const name = this.content.itemName(item);
        // what was picked up pops out over the player's head
        if (got) this.worldPops.pop(this.player.center.x, this.player.y + 2, this.time, { item, text: `+${got > 1 ? `${got} ` : ''}${name}` });
        else this.floats.pop(this.bag.why(item) ?? 'Your bag is full', this.player.center.x, this.player.y, this.time);
        return got === n;
      },
      openShop: (shop) => {
        if (!this.shops.open(shop)) return this.dialog.show(`Closed. ${this.shops.hoursText(shop)}.`, this.content.shop(shop).name, this.time);
        this.shops.visit(shop);
        this.screen = new ShopScreen(shop, this.shops, this.bag, this.content, assets);
      },
      openStorage: (box, art) => {
        const spec = containerOf(art);
        const inv = this.storage.get(box.id, box.slots, box.contents, accepts(spec, this.content));
        this.screen = new StorageScreen(titleOf(art), inv, this.bag, this.content, assets);
      },
      openStation: (station) => (this.screen = new PrepScreen(station, this.kitchen, this.cookbook, this.content, assets)),
      openPlating: () => (this.screen = new PlatingScreen(this.service.ready, this.kitchen, this.cookbook, () => this.service.changed(), this.content, assets)),
      openBar: () => this.openTable(barKey(this.scene.id), 'The bar'),
      openTable: (key) => this.openTable(`${this.scene.id}:${key}`, 'Table'),
      hearth: () => {
        const key = hearthKey(this.scene.id);
        const waiting = [...this.service.guests.entries()].filter(([k]) => k.startsWith(key)).length;
        this.screen = new HearthScreen(this.clock.hour, waiting, (h) => this.passTime(h), () => this.openTable(key, 'By the hearth'), assets);
      },
      nameRoom: (plaque) => {
        this.screen = new NameScreen(`Name ${this.rooms.name(plaque.room)}`, plaque.name ?? '', (name) => {
          plaque.name = name;
          this.editor.markChanged(this.scene.id);
          this.rebuildScene(false);
        }, assets);
      },
      doorAlt: (to) => (to === 'inn_ground' ? {
        get label() { return game.innOpen ? 'Close the inn' : 'Open the inn'; }, // eslint-disable-line
        use: () => {
          this.innOpen = !this.innOpen;
          this.floats.pop(this.innOpen ? 'The inn is open' : 'The inn is closed: no new guests', this.player.center.x, this.player.y, this.time);
        },
      } : undefined),
      wash: () => (this.screen = new WashScreen(this.washing, this.kitchen,
        { count: (item) => this.service.dirtyReady(item), take: (item) => this.service.takeDirty(item) }, this.content, assets)),
    };
    const e = this.content.economy;
    this.bag = new Bag(e.bag_slots, e.stack_size, e.starting_coins, e.bag_weight, (item) => this.content.items[item]?.weight ?? 1);
    this.shops = new Shops(this.content, this.clock, this.rng);
    this.storage = new Storage(e.stack_size);
    this.furnish = new Furnish({
      assets, content: this.content, player: this.player,
      scene: () => this.scene,
      layout: () => this.layouts.get(this.scene.id)!,
      rebuild: () => this.rebuildScene(false),
      changed: (id) => this.editor.markChanged(id),
      say: (text) => this.floats.pop(text, this.player.center.x, this.player.y, this.time),
      pack: (prop) => this.pack(prop),
      unpack: (item) => void this.bag.add(item, 1),
    });
    this.listenMouse(renderer.ctx.canvas);
    this.layouts = loadLayouts();
    this.kitchen = new Kitchen(new InnStores(this.storage, this.layouts, this.content), this.bag, this.content);
    this.rooms = new Rooms(this.layouts, this.storage, this.content);
    const looks = (assets.sheets.find((sh) => sh.name === 'guests')?.frames ?? []).filter((f) => f.endsWith('_down_idle')).map((f) => f.replace(/_down_idle$/, ''));
    this.reputation = new Reputation();
    this.service = new Service(this.content, looks, this.reputation, this.rng);
    this.cookbook = new Cookbook(this.content);
    this.washing = new Washing(this.content);
    this.editor = new Editor(this);
    this.enter('town', 'start');
  }

  /** The reputation meter, under the purse: the level, and the meter filling towards the next. */
  private drawReputation(r: Renderer): void {
    const rep = this.reputation;
    const label = `Inn renown ${rep.level}`;
    const w = 112;
    r.nine('panel_dark', 4, 30, w, 24);
    drawText(r, this.assets, label, 10, 34);
    // the meter: a row of notches that fill with gold
    const bx = 10;
    const by = 46;
    const bw = w - 12;
    r.rect(bx, by, bw, 4, '#45283c', true);
    r.rect(bx, by, Math.round(bw * rep.fill), 4, '#fbf236', true);
    for (let i = 1; i < 10; i++) r.rect(bx + Math.round((bw * i) / 10), by, 1, 4, '#45283c', true);
  }

  /** Every seat in the inn, with how long a guest takes to walk there from the door. */
  private seats(): Array<Seat & { walk: number; stairs: number }> {
    // guests walk up or down, then across (see WalkerEntity)
    const far = (a: { x: number; y: number }, b: { x: number; y: number }) => (Math.abs(a.x - b.x) + Math.abs(a.y - b.y)) / GUEST_SPEED;
    return [...this.layouts.values()].filter((l) => isInn(l.id)).flatMap((l) => {
      const door = this.doorOf(l.id);
      const stairs = this.stairsOf(l.id) ?? door;
      return seating(l, this.assets, this.content).seats.map((s) => ({ ...s, walk: far(this.seatSpot(s), door), stairs: far(this.seatSpot(s), stairs) }));
    });
  }

  /** Where guests come in and go out of a map: its front door (its first spawn), at their feet. */
  private doorOf(layout: string): { x: number; y: number } {
    const sp = layoutSpawns(this.layouts.get(layout)!, this.assets, this.content);
    const s = sp.front ?? Object.values(sp)[0] ?? { x: 0, y: 0 };
    return { x: s.x + 16, y: s.y + 28 };
  }

  /** The foot of the stairs up, in a map (where guests go up to bed), if it has some. */
  private stairsOf(layout: string): { x: number; y: number } | null {
    const p = this.layouts.get(layout)!.props.find((q) => q.behavior?.type === 'stairs' && typeof q.sprite === 'string' && q.sprite.includes('up'));
    return p ? { x: p.x, y: p.y + 4 } : null;
  }

  /** Where a guest sitting in a seat has their feet. */
  private seatSpot(s: Seat): { x: number; y: number } {
    return { x: s.art.x + s.art.w / 2, y: s.art.y + s.art.h - 6 };
  }

  /** Coins and renown from a guest: paid into the purse, and the inn's reputation. */
  private earn(o: Outcome): void {
    this.bag.coins += o.coins;
    const levels = o.renown ? this.reputation.add(o.renown) : 0;
    if (levels) this.hudPops.pop(VIEW_W / 2, 70, this.time, { text: `The inn's reputation grows! Renown ${this.reputation.level}`, big: true });
    else if (o.renown) this.hudPops.pop(70, 34, this.time, { text: `${o.renown > 0 ? '+' : ''}${o.renown} renown` });
  }

  /**
   * A guest has finished a round, or left: their coins and the renown they earn the inn, and how they
   * feel. Staying on (another round, or asking for a room), what they say shows over their seat; leaving,
   * it goes out the door with them.
   */
  private guestLeft(g: Guest, o: Outcome): void {
    this.earn(o);
    const s = this.seats().find((x) => x.key === g.seat);
    if (!s || s.layout !== this.scene.id) return;
    const x = s.art.x + s.art.w / 2;
    if (o.coins) this.worldPops.pop(x, s.art.y + 12, this.time, { text: `+${o.coins} coins` });
    if (g.state !== 'gone') this.floats.pop(`"${o.remark}"`, x, s.art.y - 6, this.time);
    this.emotes.pop(o.mood >= 0.8 ? 'emote_happy' : o.mood > 0 ? 'emote_sweat' : 'emote_sleep', x, s.art.y - 4, this.time, 1.6);
  }

  /**
   * Sit by the hearth and let the time pass till an hour (the next time it comes round): only while the
   * inn's quiet (nobody in but guests asleep upstairs). Why not, or null.
   */
  private passTime(hour: number): string | null {
    if (this.service.guests.size) return 'Not while guests are in';
    const now = this.clock.minutes;
    let to = Math.floor(now / 1440) * 1440 + hour * 60;
    if (to <= now) to += 1440;
    this.clock.minutes = to;
    this.service.leavers.length = 0;
    this.transition = { phase: 'in', t: 0, to: this.scene.id, spawn: '' }; // fade back in
    return null;
  }

  /** Morning: guests who stayed the night get up, and come down to the hearth to settle up. */
  private morning(): void {
    this.hudPops.pop(VIEW_W / 2, 70, this.time, { text: `Day ${this.clock.day}`, big: true });
    this.service.morning(this.rooms);
  }

  /** Pack a piece of furniture up into the bag: why not, or null once it's in. */
  private pack(prop: PlacedProp): string | null {
    const sprite = typeof prop.sprite === 'string' ? prop.sprite : '';
    const item = this.content.furnitureOf(sprite);
    if (!item) return "That can't be packed up";
    const b = prop.behavior;
    const spec = containerOf(sprite);
    if (b?.type === 'storage' && this.storage.get(b.id, b.slots, b.contents, accepts(spec, this.content)).contents().length) {
      return 'Empty it out first';
    }
    if (this.service.lodgers.some((g) => g.stayingIn === this.scene.id) && item === 'bed') return 'Someone is sleeping in it!';
    // guests wait by the hearth: the inn always keeps one
    const hearths = [...this.layouts.values()].filter((l) => isInn(l.id)).flatMap((l) => l.props.filter(isHearth)).length;
    if (isHearth(prop) && hearths <= 1) return 'The inn needs its hearth';
    if (this.bag.add(item, 1) !== 1) return this.bag.why(item) ?? 'Your bag is full';
    return null;
  }

  /** Take a piece of furniture out of the bag to set down here (a container gets its own storage). */
  private placeFromBag(item: string): string | null {
    const it = this.content.item(item);
    if (!it.prop) return "That isn't furniture";
    if (!isInn(this.scene.id)) return 'Furniture goes in the inn';
    const { sprite, ...rest } = it.prop;
    const prop: PlacedProp = { sprite, x: 0, y: 0, ...rest };
    const spec = containerOf(sprite);
    if (spec) prop.behavior = { type: 'storage', id: this.newStorageId(sprite), slots: spec.slots };
    const why = this.furnish.place(item, prop);
    if (!why) this.bag.remove(item, 1);
    return why;
  }

  /** A storage id no container has yet: "inn_ground_upstairs_room_bed_2". */
  private newStorageId(sprite: string): string {
    const used = new Set([...this.layouts.values()].flatMap((l) => l.props.map((p) => (p.behavior?.type === 'storage' ? p.behavior.id : ''))));
    const base = `${this.scene.id}_${sprite.replace(/^anim:/, '')}`;
    let n = 1;
    while (used.has(`${base}_${n}`) || this.storage.has(`${base}_${n}`)) n++;
    return `${base}_${n}`;
  }

  /** Serving a table (key: map and position), or the bar: its seats, from what's ready at the plating station. */
  private openTable(key: string, title: string): void {
    const seats = seating(this.layouts.get(this.scene.id)!, this.assets, this.content).seats.filter((s) => s.table === key);
    const rooms = () => this.rooms.list().map((id) => ({
      id, name: this.rooms.name(id), why: this.rooms.notReady(id), has: (c: string) => this.rooms.has(id, c),
    }));
    const chat = (g: Guest) => {
      const said = talk(g, this.content, this.cookbook, this.rooms.list().length > 0, this.rng);
      this.service.talked(g, said.then);
      return said.line;
    };
    const collect = (seat: Seat) => this.service.collect(seat, (g, o) => this.guestLeft(g, o));
    this.screen = new TableScreen(title, seats, this.service, () => this.kitchen.takeCutlery(), (g, o) => this.guestLeft(g, o),
      chat, collect, rooms, this.content, this.assets);
  }

  /** Guests eat, pay and leave, and new ones arrive (wherever the player is). */
  /** Note everything to hand (bag, the inn's stores, what's ready to serve) as come across, for the recipe book. */
  private noteSeen(): void {
    for (const s of this.bag.slots) if (s) this.cookbook.see(s.item);
    for (const b of this.kitchen.stores.boxes()) for (const s of b.inv.slots) if (s) this.cookbook.see(s.item);
    for (const s of this.service.ready) if (!isSetting(s)) this.cookbook.see(s.dish);
  }

  private tickService(dt: number): void {
    if ((this.seenTimer -= dt) <= 0) {
      this.seenTimer = 1;
      this.noteSeen();
    }
    const c = this.clock;
    this.service.update(dt, this.seats(), (bar) => this.kitchen.menu(bar), (g, o) => this.guestLeft(g, o),
      { busy: c.busy, open: this.innOpen, evening: c.evening, lodging: c.lodging, rooms: this.rooms.list().length > 0 });
  }

  /** Serving as seen in this map: what's ready on the plating station, seated guests, what's on the tables and bar. */
  private serviceEntities(): Entity[] {
    const l = this.layouts.get(this.scene.id);
    if (!l || !isInn(l.id)) return [];
    const props = this.scene.props;
    const { seats, tables } = seating(l, this.assets, this.content);
    const out: Entity[] = [];
    // guests: walking in from the door, sat down, or walking out
    const door = this.doorOf(l.id);
    for (const seat of seats) {
      const g = this.service.guests.get(seat.key);
      if (!g || !props[seat.chair]) continue;
      // walking in from the door (or down the stairs from their room), or there
      const from = g.stayingIn ? this.stairsOf(l.id) ?? door : door;
      if (g.state === 'arriving') out.push(new WalkerEntity(g.look, from, this.seatSpot(seat), 1 - g.walk / g.walkTotal, this.assets, this.time));
      else out.push(new GuestEntity(g, seat, props[seat.chair], this.assets, seat.hearth ? () => this.openTable(hearthKey(l.id), 'By the hearth') : undefined));
    }
    const stairs = this.stairsOf(l.id) ?? door;
    for (const w of this.service.leavers) {
      const seat = seats.find((s) => s.key === w.seat);
      // what they said about it goes out the door with them (or up the stairs, to bed)
      const to = w.guest.stayingIn ? stairs : door;
      if (w.layout === l.id && seat) out.push(new WalkerEntity(w.guest.look, this.seatSpot(seat), to, w.t / w.total, this.assets, this.time, w.says));
    }
    // on each table and along the bar: each guest's meal in front of them while they eat, and the
    // dishes left at each seat once they've gone
    const barPieces = l.props.filter((p) => !p.behavior && typeof p.sprite === 'string' && /^bar_counter/.test(p.sprite))
      .map((p) => artRect(p, propFrames(p, this.assets, this.content)[0], this.assets));
    const barRight = Math.max(...barPieces.map((a) => a.x + a.w));
    const place = (seat: (typeof seats)[number]): { x: number; y: number } => {
      if (seat.bar) {
        // on the counter beside their head (they sit in front of the bar)
        const cx = seat.art.x + seat.art.w / 2;
        return { x: cx + 16 < barRight ? cx + 6 : cx - 18, y: seat.art.y - 10 };
      }
      const a = tables.find((t) => t.key === seat.table)!.art;
      return {
        x: seat.facing === 'right' ? a.x + 2 : seat.facing === 'left' ? a.x + a.w - 12 : a.x + a.w / 2 - 5,
        y: a.y + (seat.facing === 'down' ? 6 : seat.facing === 'up' ? 14 : 10),
      };
    };
    const setting = (group: typeof seats) => {
      const meals = group.filter((s) => this.service.guests.get(s.key)?.state === 'eating')
        .map((s) => ({ meal: this.service.guests.get(s.key)!.got, ...place(s) }));
      // dishes left at a seat, and the empty dishes in front of a guest sitting back after their meal
      const piles = group.map((s) => {
        const g = this.service.guests.get(s.key);
        return { items: g?.state === 'relaxing' ? this.service.emptied(g) : this.service.dirty.get(s.key) ?? [], ...place(s) };
      }).filter((p) => p.items.length);
      return { meals, piles };
    };
    for (const t of tables) {
      const { meals, piles } = setting(seats.filter((s) => s.table === t.key));
      if ((meals.length || piles.length) && props[t.prop]) out.push(new TopEntity(props[t.prop], meals, piles, this.content));
    }
    const counter = l.props.findIndex((p) => !p.behavior && typeof p.sprite === 'string' && /^bar_counter/.test(p.sprite));
    if (counter >= 0 && props[counter]) {
      const barSeats = seats.filter((s) => s.bar);
      const { meals, piles } = setting(barSeats);
      // drawn in front of the guests at the bar
      const front = Math.max(props[counter].sortY, ...barSeats.map((s) => (props[s.chair]?.sortY ?? 0) + 0.2));
      if (meals.length || piles.length) out.push(new TopEntity({ sortY: front }, meals, piles, this.content));
    }
    // what's ready to serve, on top of the plating station
    const station = platingStations(l, this.assets, this.content)[0];
    if (station && this.service.ready.length && props[station.prop]) {
      out.push(new ReadyEntity(this.service.ready, station.art, props[station.prop], this.content));
    }
    return out;
  }

  /** Forget a scene so it's rebuilt from its layout on the next visit (after the editor changes it). */
  forgetScene(id: string): void {
    this.scenes.delete(id);
  }

  private getScene(id: string): Scene {
    let s = this.scenes.get(id);
    if (!s) {
      const layout = this.layouts.get(id);
      if (!layout) throw new Error(`Unknown scene "${id}"`);
      s = buildScene(layout, this.assets, this.content, this.hooks);
      this.scenes.set(id, s);
    }
    return s;
  }

  /** Switch scenes immediately (used under the fade, and by the editor to open a map). */
  enter(id: string, spawnId: string): void {
    const scene = this.getScene(id);
    const spawn = scene.spawns[spawnId];
    if (!spawn) throw new Error(`Scene "${id}" has no spawn "${spawnId}"`);
    this.scene = scene;
    this.entities = [...scene.props, this.player];
    this.player.place(spawn);
    this.arrivedAt = { x: this.player.x, y: this.player.y };
    this.camera.setWorld(scene.ground.pixelW, scene.ground.pixelH);
    this.camera.centerOn(this.player.center.x, this.player.center.y);
    this.target = null;
  }

  /**
   * Rebuild the current scene from its (edited) layout, keeping the player where they stand. The ground
   * is kept unless it changed (rebuilding a big outdoor map takes a moment).
   */
  rebuildScene(groundChanged = true): void {
    const id = this.scene.id;
    const layout = this.layouts.get(id)!;
    const scene = buildScene(layout, this.assets, this.content, this.hooks, groundChanged ? undefined : this.scene.ground);
    this.scenes.set(id, scene);
    this.scene = scene;
    this.entities = [...scene.props, this.player];
    this.camera.setWorld(scene.ground.pixelW, scene.ground.pixelH);
    this.target = null;
  }

  /** Fade out, change scene, fade in. Ignored while a transition is already running. */
  goTo(id: string, spawnId: string): void {
    if (this.transition) return;
    this.furnish.putBack(); // furniture stays in the room it's in (pack it away to take it elsewhere)
    this.getScene(id); // fail fast on a bad id
    this.transition = { phase: 'out', t: 0, to: id, spawn: spawnId };
  }

  blocked = (r: Rect): boolean => {
    if (this.scene.ground.blocks(r)) return true;
    for (const b of this.scene.blockers) if (overlaps(r, b)) return true;
    for (const e of this.entities) {
      if (e === this.player) continue;
      const c = e.collider();
      if (c && overlaps(r, c)) return true;
    }
    return false;
  };

  /** The usable thing the player is facing, if any (closest wins). */
  private findTarget(): Entity | null {
    const p = this.player.probe();
    const pr = { x: p.x - 2, y: p.y - 2, w: 4, h: 4 };
    let best: Entity | null = null;
    let bestD = Infinity;
    for (const e of this.entities) {
      if (!e.interaction()) continue;
      const a = e.useArea();
      if (!a || !overlaps(pr, a)) continue;
      const d = Math.hypot(a.x + a.w / 2 - p.x, a.y + a.h / 2 - p.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  /** An exit the player is walking into, if any. */
  private exitHit(): { to: string; spawn: string } | null {
    if (this.arrivedAt) {
      const m = this.input.move(this.furnish.carrying);
      const away = Math.hypot(this.player.x - this.arrivedAt.x, this.player.y - this.arrivedAt.y) > ARM_DISTANCE;
      if ((!m.x && !m.y) || away) this.arrivedAt = null;
      else return null;
    }
    if (!this.player.moving) return null;
    const feet = this.player.feet();
    for (const ex of this.scene.exits) {
      if (ex.dir && ex.dir !== this.player.facing) continue;
      if (overlaps(feet, ex.area)) return ex;
    }
    return null;
  }

  update(dt: number): void {
    this.time += dt;
    this.input.update();
    if (this.input.pressed('debug')) this.debug = !this.debug;
    if (this.input.pressed('edit') && !this.transition && !this.dialog.open && !this.screen) this.editor.toggle();

    if (this.editor.active) {
      this.editor.update(dt);
    } else if (this.screen) {
      if (!this.screen.update(this.input, dt)) this.screen = null;
      this.target = null;
    } else if (this.transition) {
      const tr = this.transition;
      tr.t += dt;
      if (tr.phase === 'out' && tr.t >= FADE) {
        this.enter(tr.to, tr.spawn);
        this.transition = { ...tr, phase: 'in', t: 0 };
      } else if (tr.phase === 'in' && tr.t >= FADE) {
        this.transition = null;
      }
    } else if (this.dialog.open) {
      if (this.input.pressed('interact') || this.input.pressed('back')) this.dialog.advance();
      this.target = null;
    } else {
      if (this.input.pressed('map')) this.screen = new JournalScreen(this.bag, this.reputation, this.service, this.cookbook, this.content, this.assets);
      if (this.input.pressed('menu')) {
        this.screen = new InventoryScreen(this.bag, this.kitchen.stores, this.service.ready, isInn(this.scene.id),
          (item) => this.placeFromBag(item), this.content, this.assets);
      }
      const g = this.scene.ground;
      this.player.move(dt, this.input, this.blocked, (x, y) => g.speedAt?.(x, y) ?? 1, this.furnish.carrying);
      const exit = this.exitHit();
      if (exit) {
        this.goTo(exit.to, exit.spawn);
      } else {
        // the use button: a tap uses what's in front; holding it picks furniture up (see Furnish)
        const tapped = this.furnish.update(dt, this.input);
        this.target = this.furnish.carrying ? null : this.findTarget();
        const action = this.target?.interaction();
        if (action && tapped) {
          action.use();
          this.target = this.findTarget(); // using something can change or remove its action
        } else if (action?.alt && this.input.pressed('cook')) action.alt.use();
      }
    }
    if (!this.editor.active) {
      this.clock.update(dt, this.service.guests.size === 0);
      if (this.clock.day > this.day) {
        this.day = this.clock.day;
        this.morning();
      }
      this.tickService(dt);
      this.entities = [...this.scene.props, this.player, ...this.serviceEntities()];
    }
    for (const e of this.entities) e.update(dt);
    if (this.editor.active) {
      // the editor aims the camera directly (no easing), so the world never slides under its pointer
      this.camera.setZoom(this.editor.zoom);
      const c = this.editor.canvas;
      this.camera.setBounds(c.x0, c.y0, c.x1, c.y1);
      const f = this.editor.focus();
      this.camera.centerOn(f.x, f.y);
    } else this.camera.follow(this.player.center.x, this.player.center.y, dt);
  }

  render(alpha: number): void {
    const r = this.renderer;
    // Snap the camera to whole screen pixels once, so everything in the world moves together.
    r.begin(this.scene.backdrop);
    r.setZoom(this.editor.active ? this.editor.zoom : 1);
    const cam = this.camera.at(alpha);
    const cx = r.snap(cam.x);
    const cy = r.snap(cam.y);
    this.scene.ground.draw(r, cx, cy, this.time);
    if (this.debug) this.scene.ground.drawDebug?.(r, cx, cy);
    for (const e of this.entities) r.queueDraw(e.sortY, () => e.draw(r, cx, cy, this.time, alpha));
    if (!this.editor.active) this.furnish.draw(r, cx, cy);
    r.flush();
    this.emotes.draw(r, cx, cy, this.time);
    this.worldPops.draw(r, this.assets, this.content, this.time, cx, cy);
    this.floats.draw(r, this.assets, cx, cy, this.time);
    if (!this.editor.active) {
      // the time of day's light over the world
      const light = this.clock.light(this.scene.ground instanceof RoomMap);
      if (light.alpha > 0.005) {
        r.ctx.globalAlpha = light.alpha;
        r.rect(0, 0, VIEW_W, VIEW_H, light.color, true);
        r.ctx.globalAlpha = 1;
      }
    }

    if (this.editor.active) {
      this.editor.drawWorld(cx, cy);
      r.setZoom(1);
      this.editor.drawUi(cx, cy);
      return;
    }
    const action = this.target?.interaction();
    if (this.target && action && !this.dialog.open && !this.transition) {
      const p = this.player.at(alpha);
      drawPrompt(r, this.assets, this.input, 'interact', action.label, Math.round(p.x + 16 - cx), Math.round(p.y - cy - 24), this.time);
      if (action.alt) drawPrompt(r, this.assets, this.input, 'cook', action.alt.label, Math.round(p.x + 16 - cx), Math.round(p.y - cy - 48), this.time);
      const a = this.target.useArea();
      if (this.debug && a) r.rect(a.x - cx, a.y - cy, a.w, a.h, '#fbf236');
    }
    this.dialog.draw(r, this.assets, this.input, this.time);
    if (this.screen) {
      r.ctx.globalAlpha = 0.5;
      r.rect(0, 0, VIEW_W, VIEW_H, '#120e18', true);
      r.ctx.globalAlpha = 1;
      this.screen.draw(r, this.time);
    } else if (!this.dialog.open) {
      r.nine('panel_dark', 4, 4, 28 + String(this.bag.coins).length * 6, 24);
      drawCoins(r, this.assets, this.bag.coins, 8, 8);
      this.drawReputation(r);
      // the time of day: a clock face, pale by day and dark by night
      drawClockFace(r, 18, 70, 12, this.clock.minutes, this.clock.hour >= 20 || this.clock.hour < 6);
      if (this.furnish.carrying) {
        const t = hint(this.input.device, [['interact', 'set down'], ['cook', 'pack away'], ['back', 'put back']]);
        r.nine('panel_dark', Math.round((VIEW_W - measure(t)) / 2) - 8, VIEW_H - 26, measure(t) + 16, 20);
        drawText(r, this.assets, t, Math.round((VIEW_W - measure(t)) / 2), VIEW_H - 20);
      }
    }
    this.hudPops.draw(r, this.assets, this.content, this.time);
    if (this.debug) this.drawDebug(cx, cy);

    if (this.transition) {
      const k = Math.min(1, this.transition.t / FADE);
      r.ctx.globalAlpha = this.transition.phase === 'out' ? k : 1 - k;
      r.rect(0, 0, VIEW_W, VIEW_H, '#120e18', true);
      r.ctx.globalAlpha = 1;
    }
  }

  /** Mouse for full-screen UI (the editor listens for itself). */
  private listenMouse(canvas: HTMLCanvasElement): void {
    const at = (e: MouseEvent) => {
      const b = canvas.getBoundingClientRect();
      return { x: ((e.clientX - b.left) / b.width) * VIEW_W, y: ((e.clientY - b.top) / b.height) * VIEW_H };
    };
    canvas.addEventListener('mousemove', (e) => {
      if (!this.screen || this.editor.active) return;
      const p = at(e);
      this.screen.pointer(p.x, p.y, -1, e.shiftKey);
    });
    canvas.addEventListener('mousedown', (e) => {
      if (!this.screen || this.editor.active) return;
      const p = at(e);
      if (!this.screen.pointer(p.x, p.y, e.button, e.shiftKey)) this.screen = null;
    });
    // holding R (the turn key), the wheel turns a carried piece
    canvas.addEventListener('wheel', (e) => {
      if (this.editor.active || this.screen || !this.furnish.carrying || !this.input.down('recipes')) return;
      e.preventDefault();
      this.furnish.wheel(e.deltaY, e.shiftKey);
    }, { passive: false });
  }

  private drawDebug(cx: number, cy: number): void {
    const r = this.renderer;
    for (const e of this.entities) {
      const c = e === this.player ? this.player.feet() : e.collider();
      if (c) r.rect(c.x - cx, c.y - cy, c.w, c.h, e === this.player ? '#6abe30' : '#d95763');
    }
    for (const ex of this.scene.exits) r.rect(ex.area.x - cx, ex.area.y - cy, ex.area.w, ex.area.h, '#fbf236');
    const p = this.player.probe();
    r.rect(p.x - cx - 1, p.y - cy - 1, 3, 3, '#5fcde4', true);
    r.nine('panel_dark', VIEW_W - 92, 4, 88, 47);
    drawText(r, this.assets, `FPS ${this.stats.fps}`, VIEW_W - 86, 9);
    drawText(r, this.assets, this.input.device === 'gamepad' ? 'Pad' : 'Keys', VIEW_W - 86, 22);
    drawText(r, this.assets, this.scene.id, VIEW_W - 86, 35);
  }
}
