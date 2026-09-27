## Current Layout

roughly

|--------------------------------------------------------------|
| Menu bar                                                     |
|--------------------------------------------------------------|
| Video                    + Tab selector (bouts, features)    |
| (scales out of area)     +-----------------------------------|
|                          + BoutsPanel                        |
|                          +                                   |
|                          +                                   |
|                          +                                   |
|                          +                                   |
|+++++++++++++++++++++++++++                                   |
| BoutTimeline             +-----------------------------------|
|                          + Bout Inspect                      |
|--------------------------+                                   |
| FeaturesGraph            +                                   |
|--------------------------------------------------------------|

Note: "+" means splitter (right now react-resizable-panels Separator)

## Proposed Layout

(when in bouts tab)
|--------------------------------------------------------------|
| Menu bar                                                     |
|--------------------------------------------------------------|
| Video                    + Tab selector (bouts)              |
| (scales in black sides)  +-----------------------------------|
|                          + BoutsPanel                        |
|                          +                                   |
|                          +                                   |
|                          +                                   |
|                          ++++++++++++++++++++++++++++++++++++|
|                          + Bout Inspect                      |
|                          +                                   |
|                          +                                   |
|++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++|
| BoutTimeline                                                 |
|                                                              |
|++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++|
| FeaturesGraph                                                |
|                                                              |
|--------------------------------------------------------------|

(when in features tab)
|--------------------------------------------------------------|
| Menu bar                                                     |
|--------------------------------------------------------------|
| Video                    + Tab selector (features)           |
| (scales in black sides)  +-----------------------------------|
|                          + FeaturesPanel                     |
|                          +                                   |
|                          +                                   |
|                          +                                   |
|                          +                                   |
|                          +                                   |
|                          +                                   |
|                          +                                   |
|++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++|
| BoutTimeline                                                 |
|                                                              |
|++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++|
| FeaturesGraph                                                |
|                                                              |
|--------------------------------------------------------------|



Note: "+" means Splitter (Mantine)
We need to reconfigure the layout and to change UI elements to Mantine.
Convert all UI elements to be Mantine items.
When I say Video (scales out of area), this means depending on the dimensions, some of the video goes out of the container. I want (scales in black sides) meaning that we keep the original aspect ratio and don't go out of the container. Any space on the sides should be black (or the background colour/transparent).
Use mantine skills, mantine mcp, context7, tavily, karpathy guidelines, simple english
Clean up the code to be simpler and uncomplicated.
Do NOT touch the underlying video and time-sync-components logic.

