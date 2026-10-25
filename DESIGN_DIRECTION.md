# Visual direction — updated October 25, 2026

## Current goal: presentation-first visual quality

The project is primarily for a demonstration. The user's explicit priority is visual impact, with less effort spent on interaction details. This section supersedes earlier priorities where they conflict.

Priority: rendered visual quality > a stable demonstration path > interaction polish and edge cases. Preserve a usable exploration → inventory → cooking → reveal path. Spend the next iterations on visible improvements rather than expanding controls, mobile support, physics, or gameplay systems unless required for the demonstration.

Visual targets, in order:

1. Character: a convincing silhouette and head-to-body ratio informed by Link references, then coherent hair masses, layered clothing and readable equipment. Refine facial shape, eyes and material response after the overall form works. Avoid using small accessories as a substitute for improving the main forms.
2. Environment: compose a strong opening view with foreground, middle ground and distant terrain; improve vegetation silhouettes, ground variation, atmospheric depth and sunlight/shadow balance toward the Breath of the Wild visual direction.
3. Cooking and food: make the pot, fire, steam and finished food attractive in close views; align composition, lighting and material detail with the presentation camera.
4. Interface: keep the world and character visible, with restrained overlays and readable presentation framing.

Acceptance is based on actual rendered views: character front/side/back, the opening camp view, the inventory character view, and cooking/reveal close-ups. Review screenshots or a short demonstration at the intended presentation resolution. A successful typecheck or build is a technical prerequisite, not proof of visual quality. No fixed frame-rate or visual similarity result has been verified for this new pass.

## Existing visual foundation

The user wants the visual language and cooking experience of Breath of the Wild. The playable 3D world must carry the design. This pass replaces the miniature, geometric prototype with a sunlit, windswept valley, a normally proportioned blue-tunic traveler, layered vegetation and a complete iron cooking pot.

Palette: sky #b9dce2, distant ridge #789ba3, grass #829b3c, leaf shadow #294c38, tunic #287d9d, ivory #f3efdb. Warm direct sunlight and cool ambient fill create readable shadow shapes. A four-step toon ramp unifies the character, camp and food. Dirt and foliage use world-space color variation; grass bends on the GPU.

Type: Songti SC / STSong / Georgia for location and discovery titles; system sans for menu labels; monospace for keyboard hints and time. No remote font requirement.

Layout: the horizon occupies the upper third of a true third-person view; the traveler sits below center, with the cooking pot ahead. A small vital-status cluster, inventory shortcuts and a topographic minimap leave the world visible. Inventory occupies the left half and preserves a live character preview on the right. Cooking cuts to a closer side view; the dish rises physically from the pot before the result UI enters.

Signature: a dark iron pot over a real wood fire. Ingredients travel from the traveler's raised hands along individual arcs, bounce above the pot to the cooking rhythm, disappear into a burst of steam, and reveal a rotating 3D burger. The camera and actor share the same timeline.

Critique: avoid using a tinted full-screen panel to conceal a sparse environment. Build actual silhouettes, depth, grass, bark, cloth seams, leather equipment, the pot's interior and rim, and cast shadows. No stock floating cards. Art is authored in this project and rendered live; the implementation uses no extracted game models or prerecorded footage.

Food detail: the bun has a rounded cap, toasted surface variation and sesame seeds placed on its surface. Patties use irregular edges, crust variation and grill marks; cheese bends over the edges. The finished burger reflects the actual selected ingredients, including vegetarian and double-beef variants.

Validation: the complete inventory → held ingredients → cooking → result flow was exercised in the browser. Desktop (1440 × 900), tall phone (390 × 844) and compact phone (447 × 663) layouts were inspected. Production build and all 20 existing tests passed; the final browser console reported no errors or warnings. Visual captures are saved under output/playwright/.
