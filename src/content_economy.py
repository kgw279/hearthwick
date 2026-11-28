"""Economy: the player's purse and bag, and how shops stock, sell and buy.

Kept deliberately light (see the design notes: not a full simulator):
  * Every shop has a daily stock: each item it sells comes in a set number per day (cheap goods in
    bigger batches), restocked each morning. Anything left over is simply replaced.
  * The market sells a rotating handful of items from its pool each day.
  * Shops buy back what they sell; the market buys any raw ingredient. They pay the item's value.
"""
ECONOMY = {
    'starting_coins': 30,
    'bag_slots': 24,          # slots in the player's bag
    'stack_size': 20,         # how many of one item fit in a slot
    'bag_weight': 24,         # how much the player can carry (water weighs 3, most things 1, a mug 0.5)
    'sell_ratio': 1.0,        # shops pay value x this when buying from the player
    'market_daily_items': 6,  # how many pool items the market has each day
    'market_markup': 1.5,     # market price for pool items with no shop price: value x this, rounded up
}


def daily_qty(price):
    """Batch size by price: staples come by the crate, treats by the handful."""
    if price <= 3: return 10
    if price <= 6: return 6
    return 3
