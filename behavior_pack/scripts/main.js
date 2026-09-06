// Basic scripting: hopper-like pull and a simple magnet implementation
// NOTE: This script uses the experimental scripting / GameTest APIs.

const system = server.registerSystem(0, 0);

system.initialize = function() {
  this.listenForEvent("minecraft:player_used_item", (e) => this.onPlayerUse(e));
  // tick handler
  this.tickInterval = 10; // run logic every 10 server ticks
  this.scheduleTick();
}

system.scheduleTick = function() {
  this.createEventData("minecraft:define_container");
  this.registerDelayedEvent("all_metal:tick", this.tickInterval);
}

system.onEvent = function(eventData) {
  if (eventData.name === "all_metal:tick") {
    this.performTickLogic();
  }
}

system.performTickLogic = function() {
  // Placeholder logic: find all entities named all_metal:copper_hopper and attempt a simple pull
  // Real implementation would query block entities and move items between inventories.
  // This sample keeps behaviour minimal to be compatible and safe.
}

system.onPlayerUse = function(eventData) {
  // Example: when player uses copper magnet item, toggle magnet state (simplified)
}
