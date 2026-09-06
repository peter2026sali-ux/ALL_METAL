// Preview spawner: when a player uses the Preview Wand (all_metal:preview_wand), spawn a demo scene nearby for screenshots.

const system = server.registerSystem(0, 0);

system.initialize = function() {
  this.listenForEvent("minecraft:player_used_item", (e) => this.onPlayerUsedItem(e));
  this.registerEvent("all_metal:tick_event");
}

system.onPlayerUsedItem = function(eventData) {
  try {
    const player = eventData.data.player;
    const item = eventData.data.item_stack || eventData.data.item;
    if (!player || !item) return;
    const itemId = (item.item || item.name || "");
    if (itemId.indexOf("all_metal:preview_wand") !== -1) {
      this.spawnPreviewSceneForPlayer(player);
    }
  } catch (e) {}
}

system.spawnPreviewSceneForPlayer = function(playerEntity) {
  try {
    const pos = this.getComponent(playerEntity, "minecraft:position");
    if (!pos) return;

    const baseX = Math.floor(pos.x + 2);
    const baseY = Math.floor(pos.y);
    const baseZ = Math.floor(pos.z + 2);

    // Place a small platform and put demo blocks/items
    const cmds = [];
    // platform
    for (let dx = -4; dx <= 4; dx++) {
      for (let dz = -4; dz <= 4; dz++) {
        cmds.push(`setblock ${baseX + dx} ${baseY - 1} ${baseZ + dz} all_metal:copper_block`);
      }
    }
    // chests and machines
    cmds.push(`setblock ${baseX - 2} ${baseY} ${baseZ - 1} all_metal:copper_chest`);
    cmds.push(`setblock ${baseX - 1} ${baseY} ${baseZ - 1} all_metal:copper_hopper`);
    cmds.push(`setblock ${baseX} ${baseY} ${baseZ - 1} all_metal:copper_furnace`);
    cmds.push(`setblock ${baseX + 1} ${baseY} ${baseZ - 1} all_metal:copper_barrel`);
    // rails and minecart
    cmds.push(`setblock ${baseX - 3} ${baseY} ${baseZ + 2} minecraft:rail`);
    cmds.push(`summon minecart ${baseX - 3} ${baseY + 1} ${baseZ + 2}`);
    // give player key items
    cmds.push(`give ${this.getEntityName(playerEntity)} all_metal:copper_magnet 1`);
    cmds.push(`give ${this.getEntityName(playerEntity)} all_metal:copper_bucket 1`);
    cmds.push(`give ${this.getEntityName(playerEntity)} all_metal:copper_toolbox 1`);

    // execute commands with slight delays
    for (let i = 0; i < cmds.length; i++) {
      const delay = i * 2; // small stagger
      this.registerDelayedEventWithData("all_metal:exec_cmd", delay, { cmd: cmds[i] });
    }

    this.log("Preview scene spawned. Take screenshots now.");
  } catch (e) {
    this.log("Failed to spawn preview scene: " + e);
  }
}

system.onEvent = function(e) {
  if (e && e.data && e.data.name === "all_metal:exec_cmd") {
    const cmd = e.data.data.cmd;
    try { this.executeCommand(cmd, (res) => {}); } catch (err) {}
  }
}

system.getEntityName = function(entity) {
  // returns a selector for this player if possible
  try {
    const comp = this.getComponent(entity, "minecraft:player_identity");
    if (comp && comp.name) return comp.name;
  } catch (e) {}
  return "@s";
}

system.registerDelayedEventWithData = function(name, delay, data) {
  try { this.registerDelayedEvent(name, delay, data); } catch (e) { this.registerDelayedEvent(name, delay); }
}

system.log = function(msg) {
  try { this.executeCommand(`tellraw @a {\"rawtext\":[{\"text\":\"[ALL_METAL] ${msg}\"}]}`); } catch (e) {}
}
