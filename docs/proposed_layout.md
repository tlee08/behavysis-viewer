## Proposed Layout

3 tabs:

- Bouts
- Classifier (new tab, which has ClassifierPanel, which just simply has "show prediction probabilities" toggle)
- Features

| (when in bouts tab)                                            |
| -------------------------------------------------------------- |
| Menu bar                                                       |
| -------------------------------------------------------------- |
| Video + Tab selector (bouts)                                   |
| (scales in black sides) +-----------------------------------   |
| + BoutsPanel                                                   |
| +                                                              |
| +                                                              |
| +                                                              |
| ++++++++++++++++++++++++++++++++++++                           |
| + Bout Inspect                                                 |
| +                                                              |
| +                                                              |
| ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ |
| -------------------------------------------------------------- |
|                                                                | BoutTimeline                                                 |     |
|                                                                |                                                              |     |
|                                                                | ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ |     |
|                                                                | ClassifierGraph                                              |     |
|                                                                |                                                              |     |
|                                                                | ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ |     |
|                                                                | FeaturesGraph                                                |     |
|                                                                |                                                              |     |
| -------------------------------------------------------------- |
| -------------------------------------------------------------- |

| (when in features tab)                                         |
| -------------------------------------------------------------- |
| Menu bar                                                       |
| -------------------------------------------------------------- |
| Video + Tab selector (features)                                |
| (scales in black sides) +-----------------------------------   |
| + FeaturesPanel                                                |
| +                                                              |
| +                                                              |
| +                                                              |
| +                                                              |
| +                                                              |
| +                                                              |
| +                                                              |
| ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ |
| -------------------------------------------------------------- |
|                                                                | BoutTimeline                                                 |     |
|                                                                |                                                              |     |
|                                                                | ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ |     |
|                                                                | ClassifierGraph                                              |     |
|                                                                |                                                              |     |
|                                                                | ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ |     |
|                                                                | FeaturesGraph                                                |     |
|                                                                |                                                              |     |
| -------------------------------------------------------------- |
| -------------------------------------------------------------- |

Note: "+" means Splitter (Mantine)
For UI, use Mantine components
The ClassifierGraph ONLY shows when the "Show prediction probabilities" is toggled on. (which is on the ClassifierPanel page). Is hidden otherwise. The predictions come from the equivalent parquet file in "6_behaviours_predicted". Look at "../example_behavysis_projects/test_data_hpw" for an idea of an example project/experiment structure and the table schema for the 6_behaviours_predicted. The logic for creating this table and schema is also in ../behavysis/src/behavysis/schemas/schemas.
The FeaturesGraph ONLY shows when at least one feature is selected to view. Is hidden otherwise.
Use mantine skills, mantine mcp, context7, tavily, karpathy guidelines, simple english
Clean up the code to be simpler and uncomplicated.
Do NOT touch the underlying video and time-sync-components logic.
