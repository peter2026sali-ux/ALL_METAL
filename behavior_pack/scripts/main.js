// ALL_METAL — core scripts implementing tiered machines and utilities
// This script uses experimental scripting APIs; behaviour degrades gracefully if APIs are limited.

const system = server.registerSystem(0, 0);

const TIERS = {
  copper: {
    id: "all_metal:copper",
    hopper_capacity: 5,
    hopper_pull_interval: 40,
    magnet_range: 6,
    smelter_speed: 1.0,
    fuel_efficiency: 1.0
  },
  iron: {
    id: "all_metal:iron",
    hopper_capacity: 9,
    hopper_pull_interval: 30,
    magnet_range: 8,
    smelter_speed: 1.25,
    fuel_efficiency: 0.9
  },
  gold: {
    id: "all_metal:gold",
    hopper_capacity: 7,
    hopper_pull_interval: 20,
    magnet_range: 10,
    smelter_speed: 1.6,
    fuel_efficiency: 0.85
  },
  diamond: {
    id: "all_metal:diamond",
    hopper_capacity: 18,
    hopper_pull_interval: 12,
    magnet_range: 14,
    smelter_speed: 2.0,
    fuel_efficiency: 0.7
  },
  netherite: {
    id: "all_metal:netherite",
    hopper_capacity: 27,
    hopper_pull_interval: 6,
    magnet_range: 20,
    smelter_speed: 3.0,
    fuel_efficiency: 0.5
  }
};

// internal polling
let tickCounter = 0;
const HOPPER_GLOBAL_TICK = 10; // base tick for checking hoppers

system.initialize = function() {
  // register events we will use
  this.listenForEvent("minecraft:player_used_item", (e) => this.onPlayerUsedItem(e));
  this.registerEvent("all_metal:tick_event");
  this.setupTick();
  this.log("ALL_METAL scripts initialized");
}

system.setupTick = function() {
  this.registerDelayedEvent("all_metal:tick_event", 10);
}

system.onEvent = function(e) {
  if (e && e.data && e.data.name === "all_metal:tick_event") {
    tickCounter++;
    try { this.tickLogic(); } catch (err) { this.log(err); }
    this.setupTick();
  }
}

system.tickLogic = function() {
  // Hoppers: run less frequently based on base interval
  if (tickCounter % (HOPPER_GLOBAL_TICK) === 0) {
    this.processAllHoppers();
  }
  // Magnets: process players holding magnets
  this.processPlayerMagnets();
}

system.processAllHoppers = function() {
  // Query for block entities with container component — this API may vary; we use getEntities to be safe.
  let containers = [];
  try {
    containers = this.getEntitiesWithComponent("minecraft:container");
  } catch (e) {
    containers = [];
  }
  for (const ent of containers) {
    // attempt to identify a hopper by its identifier or component
    try {
      const idComp = this.getComponent(ent, "minecraft:identifier");
      if (idComp && idComp.name && idComp.name.includes("copper_hopper")) {
        this.processHopperAtEntity(ent, TIERS.copper);
      } else if (idComp && idComp.name && idComp.name.includes("iron_hopper")) {
        this.processHopperAtEntity(ent, TIERS.iron);
      } else if (idComp && idComp.name && idComp.name.includes("gold_hopper")) {
        this.processHopperAtEntity(ent, TIERS.gold);
      } else if (idComp && idComp.name && idComp.name.includes("diamond_hopper")) {
        this.processHopperAtEntity(ent, TIERS.diamond);
      } else if (idComp && idComp.name && idComp.name.includes("netherite_hopper")) {
        this.processHopperAtEntity(ent, TIERS.netherite);
      }
    } catch (err) {
      // ignore
    }
  }
}

system.processHopperAtEntity = function(entity, tier) {
  // Try to read container component
  try {
    const cont = this.getComponent(entity, "minecraft:container");
    if (!cont || !cont.items) return;
    // find first non-empty slot
    for (let i = 0; i < cont.items.length; i++) {
      const slot = cont.items[i];
      if (slot && slot.item) {
        // try to push to adjacent container
        const moved = this.transferItemFromContainer(entity, i, tier);
        if (moved) break; // move one item per tick
      }
    }
  } catch (e) {
    // graceful degrade
  }
}

system.transferItemFromContainer = function(srcEntity, slotIndex, tier) {
  // Attempt to find adjacent containers via position queries
  try {
    const pos = this.getComponent(srcEntity, "minecraft:position");
    if (!pos) return false;
    // search blocks in 6 directions within 1 block
    const offsets = [ [1,0,0], [-1,0,0], [0,1,0], [0,-1,0], [0,0,1], [0,0,-1] ];
    for (const off of offsets) {
      const tx = Math.floor(pos.x + off[0]);
      const ty = Math.floor(pos.y + off[1]);
      const tz = Math.floor(pos.z + off[2]);
      // try to find container at that position
      const q = { "all": [{ "component": "minecraft:container" }], "position": { "x": tx, "y": ty, "z": tz } };
      let targets = [];
      try { targets = this.getEntitiesFromQuery(q); } catch (e) { targets = []; }
      for (const t of targets) {
        // perform transfer via replaceitem/give/clear commands if available
        // fallback: teleport item entity into the target and let the game pick it up
        const success = this.attemptContainerInsertViaCommands(srcEntity, slotIndex, t);
        if (success) return true;
      }
    }
  } catch (e) {}
  return false;
}

system.attemptContainerInsertViaCommands = function(srcEntity, slotIndex, targetEntity) {
  // GameTest APIs across versions differ. We'll attempt to use `container` modify commands via executeCommand.
  // Fallback teleport method: spawn a new item entity at target and remove one from source.
  try {
    // Get source container component and item info
    const cont = this.getComponent(srcEntity, "minecraft:container");
    if (!cont || !cont.items || !cont.items[slotIndex]) return false;
    const item = cont.items[slotIndex];
    // create an item entity at target position
    const tpos = this.getComponent(targetEntity, "minecraft:position");
    if (!tpos) return false;
    const itemId = item.item || item.name || "minecraft:stone";
    const cmd = `summon item ${tpos.x} ${tpos.y + 0.5} ${tpos.z} {Item:{id:${itemId},Count:1}}`;
    // Note: Bedrock command syntax for summon item NBT differs; this may not work on every version.
    this.executeCommand(cmd, (res) => {});
    // TODO: decrement source slot via available commands or by setting container component if API allows
    return true;
  } catch (e) {
    return false;
  }
}

system.processPlayerMagnets = function() {
  const players = this.getEntitiesFromQuery({ "type": "player" }) || [];
  for (const p of players) {
    try {
      const hand = this.getComponent(p, "minecraft:hand_container");
      if (!hand || !hand.items) continue;
      for (const slot of hand.items) {
        if (slot && slot.item && slot.item.indexOf("magnet") !== -1) {
          // determine tier from item id
          const tier = this.resolveTierFromItemId(slot.item);
          if (tier) this.pullNearbyDroppedItemsToEntity(p, tier);
          break;
        }
      }
    } catch (e) {}
  }
}

system.resolveTierFromItemId = function(itemId) {
  if (!itemId) return null;
  if (itemId.indexOf("copper") !== -1) return TIERS.copper;
  if (itemId.indexOf("iron") !== -1) return TIERS.iron;
  if (itemId.indexOf("gold") !== -1) return TIERS.gold;
  if (itemId.indexOf("diamond") !== -1) return TIERS.diamond;
  if (itemId.indexOf("netherite") !== -1) return TIERS.netherite;
  return null;
}

system.pullNearbyDroppedItemsToEntity = function(entity, tier) {
  try {
    const pos = this.getComponent(entity, "minecraft:position");
    if (!pos) return;
    const range = tier.magnet_range || 6;
    // Teleport item entities to the entity location (simplified but reliable).
    const cmd = `execute as @e[type=item,dx=0,dy=0,dz=0] run tp @e[type=item,distance=..${range}] ${pos.x} ${pos.y} ${pos.z}`;
    // The above command may not be precise; we fallback to a safer execute command anchored at entity
    const safeCmd = `execute at ${entity.__identifier || "@s"} run tp @e[type=item,distance=..${range}] ${pos.x} ${pos.y} ${pos.z}`;
    this.executeCommand(safeCmd, (res) => {});
  } catch (e) {}
}

// Generic wrappers
system.getEntitiesWithComponent = function(comp) {
  try { return this.getEntitiesFromQuery({ "all": [{ "component": comp }] }) || []; } catch (e) { return []; }
}

system.getEntitiesFromQuery = function(q) {
  try { return this.getEntities(q) || []; } catch (e) { return []; }
}

// Utility logging
system.log = function(msg) {
  try { this.executeCommand(`tellraw @a {"rawtext":[{"text":"[ALL_METAL] ${msg}"}]}`); } catch (e) {}
}
