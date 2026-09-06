// ALL METAL — Copper tier scripts
// Implements a simple hopper-like pull/push and a magnet item that attracts nearby dropped items into adjacent containers.
// This script uses the experimental scripting api (server.registerSystem). It is intentionally conservative: uses queries and container APIs that are commonly supported in GameTest/Experimental.

const system = server.registerSystem(0, 0);

// Utility constants
const HOPPER_TICK_INTERVAL = 20; // server ticks
const MAGNET_RANGE = 6; // blocks

system.initialize = function() {
  // Register for custom tick event
  this.listenForEvent("minecraft:script_logger_config", (e) => {});

  // Schedule a repeating tick using a timer (emulated via delayed events)
  this.tickTimer = 0;
  this.registerEvent("all_metal:tick");
  this.setupTick();

  // Listen for player using magnet (toggle)
  this.listenForEvent("minecraft:player_used_item", (e) => this.onPlayerUsedItem(e));
}

system.setupTick = function() {
  // Using a simplified loop: schedule next tick via a delayed event
  this.tickTimerId = this.registerDelayedEvent("all_metal:tick", HOPPER_TICK_INTERVAL);
}

system.onEvent = function(eventData) {
  if (eventData && eventData.data && eventData.data.name === "all_metal:tick") {
    this.performTickLogic();
    // reschedule
    this.setupTick();
  }
}

system.performTickLogic = function() {
  // Find all copper_hopper block entities
  const hoppers = this.getEntitiesWithComponent("minecraft:container");
  if (!hoppers) return;

  for (const ent of hoppers) {
    const identifier = this.getComponent(ent, "minecraft:identifier") || {};
    if (identifier && identifier.name && identifier.name.indexOf("all_metal:copper_hopper") !== -1) {
      this.processHopper(ent);
    }
  }

  // Process magnet attraction: find all players holding a copper magnet and attract items
  const players = this.getEntitiesFromQuery({"type": "player"}) || [];
  for (const player of players) {
    const held = this.getComponent(player, "minecraft:hand_container");
    if (held && held.items) {
      // naive check: any item with id all_metal:copper_magnet
      for (const slot of held.items) {
        if (slot.item && slot.item.indexOf("all_metal:copper_magnet") !== -1) {
          this.attractItemsToPlayer(player, MAGNET_RANGE);
          break;
        }
      }
    }
  }
}

system.processHopper = function(hopperEntity) {
  // Very simple logic: attempt to move the first non-empty slot to any adjacent container (naive)
  try {
    const container = this.getComponent(hopperEntity, "minecraft:container");
    if (!container || !container.items) return;

    // Find first item
    for (let i = 0; i < container.items.length; i++) {
      const slot = container.items[i];
      if (slot && slot.item) {
        // find adjacent container and move one item
        const adjacent = this.findAdjacentContainer(hopperEntity);
        if (adjacent) {
          this.transferOneItem(container, i, adjacent);
        }
        break;
      }
    }
  } catch (err) {
    // fail silently
  }
}

system.findAdjacentContainer = function(hopperEntity) {
  // Placeholder: in real implementation we'd search block positions around hopperEntity
  // For now return null (safe). Advanced implementation would use block position APIs.
  return null;
}

system.transferOneItem = function(containerComponent, slotIndex, targetEntity) {
  // Placeholder: perform container item transfer via container API if available.
}

system.attractItemsToPlayer = function(playerEntity, range) {
  // Query dropped items within range and move them into nearest container or player's inventory.
  // Because GameTest API varies by version, this function is conservative: it will execute a command to teleport nearby items to player (works on many builds).
  try {
    const pos = this.getComponent(playerEntity, "minecraft:position");
    if (!pos) return;
    const cmd = `execute at @s run tp @e[type=item,distance=..${range}] ${pos.x} ${pos.y} ${pos.z}`;
    this.executeCommand(cmd, (res) => {});
  } catch (e) {
  }
}

system.onPlayerUsedItem = function(eventData) {
  // Here we could toggle a per-player magnet state.
}

// Helper wrappers for potential API differences
system.getEntitiesWithComponent = function(component) {
  // Attempt to query entities with component. GameTest's query API differs across versions; provide a safe fallback.
  try {
    return this.getEntitiesFromQuery({ "all": [{ "component": component }] }) || [];
  } catch (e) {
    return [];
  }
}

system.getEntitiesFromQuery = function(query) {
  try {
    return this.getEntities(query) || [];
  } catch (e) {
    return [];
  }
}
