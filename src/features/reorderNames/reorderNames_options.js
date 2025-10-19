/*
Created By: Elaine Martzen (Weatherall-96)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isProfilePage } from "../../core/pageType";

registerFeature({
  name: "ReorderNames",
  id: "reorderNames",
  description:
    "Only for the person profiled, separates out non-Roman letter names, placing each language on its own line in the family box.",
  category: "Profile",
  creators: [{ name: "Elaine Martzen", wikitreeid: "Weatherall-96" }],
  contributors: [],
  defaultValue: false,
  pages: [isProfilePage],
});
