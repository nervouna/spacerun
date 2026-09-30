# Asset sources and licenses

The project MIT license covers original code and original project assets. Third-party materials below retain their own licenses and usage terms. Local `output/` working files referenced here are excluded from the public repository; their runtime derivatives are included.

All runtime images are bundled in `public/assets/`; there are no third-party texture requests during gameplay. Keep these files with the project and deployment build. Asset-research intermediates are in the OS temporary directory and are not required by the game.

## Photographic PBR textures

Downloaded on 2026-09-30 from Poly Haven's official public asset API. Each source JPEG was verified against the MD5 checksum in that API's manifest. All six maps are 2048 × 2048.

| Local files | Source | Credit | License |
| --- | --- | --- | --- |
| `rock-color.jpg`, `rock-normal.jpg`, `rock-roughness.jpg` | [Rock Boulder Dry](https://polyhaven.com/a/rock_boulder_dry) | Dimitrios Savva and Rico Cilliers | [CC0](https://polyhaven.com/license) |
| `metal-color.jpg`, `metal-normal.jpg`, `metal-roughness.jpg` | [Rusty Metal 02](https://polyhaven.com/a/rusty_metal_02) | Poly Haven | [CC0](https://polyhaven.com/license) |

Color maps use sRGB. OpenGL normal maps and roughness maps use linear sampling. The source textures are retained without resizing or re-encoding.

## Lunar surface

`moon-color.jpg` is the 2048 × 1024 JPEG color map from NASA's [CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/), downloaded from the [official image URL](https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_2k.jpg). Credit: NASA's Scientific Visualization Studio; visualizer Ernie Wright; LRO/LROC data. The in-game material is tinted warm for the fictional wasteland setting. This is scenery, not a scientific lunar visualization. NASA imagery is used under the [NASA Images and Media Usage Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/), with source credit; NASA does not endorse this project.

## Generated nebula

`wasteland-nebula.png` is a 1672 × 941 original generated with the built-in imagegen tool on 2026-09-30. The output is used at its native resolution, without upscaling. A copy is retained in this project; the generator's original output remains in its generated-images folder.

Final generation prompt:

> Use case: stylized-concept. Asset type: high-resolution wide background texture for a real-time 3D space wasteland shooter, cinematic AAA environment matte painting. Generate a landscape 16:9 image, at least 2560 pixels wide if supported. Scene: deep outer space filled with immense turbulent rusty ochre and burnt umber dust nebulae, intricate wisps and dense dark charcoal clouds, thin cold blue-grey haze, tiny distant stars and distant subtle scattered debris specks. Dramatic restrained amber backlighting behind dark dust, atmospheric depth and very fine realistic astronomical texture, filmic high-end science fiction concept art. Composition: main detailed nebula band drifts diagonally from lower left toward upper right, brightest dusty light concentrated near middle upper horizon; left upper corner and right edges remain dark for HUD readability; center bottom dark clear negative space for a real 3D player spaceship to be rendered later. Constraints: background only, absolutely NO spaceships, NO planets, NO foreground asteroids, NO station, NO text, NO UI, no borders, no watermarks. Avoid flat simple gradients, cartoon art, neon purple, colorful fantasy space. Mood: desolate industrial frontier, abandoned celestial wasteland.

## Procedural 3D details

`src/wasteland.js` builds vent grilles, exposed pipes, fasteners, chipped caution markings, the salvage serial decal, the broken orbital station, and peripheral debris. These are rendered geometry and locally generated textures. Decorative debris stays outside the playable corridor and does not introduce new collision targets. Three.js bloom adds glow to the cold-blue engines, shots, and station warning lights.

## Fighter selection concepts

The three selection images under `public/assets/fighters/` were generated with the built-in image_gen tool. Original concepts and complete prompts are retained under `output/concepts/`. The selectable 3D fighters are procedural geometry inspired by those images.

## Fighter materials

`public/assets/fighters/steel-albedo.png` and `ochre-albedo.png` are generated base-color maps using the A fighter concept as a material reference, created with the built-in image_gen tool. Complete prompts are retained in `output/concepts/MATERIAL-PROMPTS.md`. Both are bundled locally; player ships use dedicated UV mapping and a procedural RoomEnvironment reflection map. Normal and roughness maps retain the licensed metal sources listed above, at reduced normal intensity.

## Audio

- `public/assets/audio/beam-soft-loop.wav`: one second from the sustained portion of `output/audio/01-high-voltage-sizzle-soft.wav`, the user-approved first softened high-voltage variant. Original procedural synthesis, generated by `output/audio/generate-beam-previews.py --soft-only`. The more heavily softened `rounded` audition is not used.
- `public/assets/audio/explosion-real.wav`: converted to 48 kHz stereo PCM with 0.82 gain to prevent decoded MP3 peaks from clipping, a 3 ms onset fade, and a 150 ms end fade, from the publicly available high-quality MP3 of [Explosion, short [sidohzen 165808]](https://freesound.org/people/qubodup/sounds/171971/) by Iwan “qubodup” Gabovitch. The source page marks it CC0 and describes it as a cut, faded, normalized edit of [Explosion with debris - authentic. 4kg TNT](https://freesound.org/people/sidohzen/sounds/165808/) by sidohzen, a field recording of mine demolition in Cambodia. The downloaded source is retained at `output/audio/sources/explosion-qubodup-sidohzen.mp3`.
- Source media URL: `https://cdn.freesound.org/previews/171/171971_71257-hq.mp3`. The game bundles the converted sound locally and makes no runtime request to Freesound. Playback varies pitch, level, and stereo position by explosion type, size, and distance. Ship explosions play slower; simultaneous explosion voices are capped at six and pass through a dynamics compressor.

## Background music

Downloaded on 2026-09-30. Each author submission explicitly lists **CC0**. All four tracks are bundled in `public/assets/music/`; playback makes no request to OpenGameArt. Source downloads are retained in `output/music/sources/` for reproduction, but are not required at runtime.

| Runtime file | Track / author | Source tempo | Game tempo | License source |
| --- | --- | --- | --- | --- |
| `orbital-graveyard.mp3` | Orbital Graveyard / vitalezzz | Not specified; menu ambience | Unchanged | [Original submission](https://opengameart.org/content/orbital-graveyard) |
| `hard-battle-2-140.mp3` | Hard Battle 2 / MintoDog | 140 BPM, author filename | 140 BPM | [Original submission](https://opengameart.org/content/hard-battle-2) |
| `trance-battle-140.mp3` | Trance Battle / MintoDog | 140 BPM, author filename | 140 BPM | [Original submission](https://opengameart.org/content/trance-battle) |
| `space-battle-140.mp3` | Space Battle / MintoDog | 130 BPM, author filename | 140 BPM | [Original submission](https://opengameart.org/content/space-battle) |

Space Battle is processed offline with FFmpeg `atempo=1.076923076923` (140/130), changing tempo without changing pitch. All tracks use `loudnorm=I=-18:TP=-2:LRA=10` and are encoded as 48 kHz stereo MP3 at 192 kb/s. Combat files carry a `TBPM=140` metadata tag. Playback remains at rate 1; game speed and boost never change the music tempo. The two original 140 BPM songs are not time-stretched. The menu/combat transition fades over 0.8 seconds; this is not beat-phase synchronization. Combat uses a shuffled three-track bag, with no consecutive repeat across bag boundaries. Pause, mute, and hidden-tab playback preserve the current song position. Returning to selection restarts the menu track; a new run selects another combat track.

Verification: spectral-onset autocorrelation over the first 65 seconds of each processed combat file estimated 140.0 BPM for all three. Results and encoded tempo tags are retained in `output/music/verification.json`.
