# Build instructions for creating the mcaddon

To create the final .mcaddon package locally (containing both behavior_pack and resource_pack), do the following from the repo root:

On Windows (PowerShell):
Compress-Archive -Path behavior_pack,resource_pack -DestinationPath ALL_METAL_26.45.mcaddon

On macOS / Linux:
zip -r ALL_METAL_26.45.mcaddon behavior_pack resource_pack

Upload the resulting ALL_METAL_26.45.mcaddon to the Releases page or import it into Minecraft directly.
