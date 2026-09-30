PDF.js 6.3.289, official legacy distribution
Source: https://github.com/mozilla/pdf.js/releases/tag/v6.3.289
License: Apache-2.0; see LICENSE.txt and upstream resource license files.

The upstream build, viewer modules, CSS, image assets, fonts, character maps
and decoding resources are included locally. Source maps, demonstration PDFs
and unused locales are excluded. Text line endings are normalized to LF.
The viewer HTML adds the course title, Dutch language, reader styling and
application bootstrap. reader.mjs and reader.css implement the course tools,
local annotation persistence and document-specific viewing state.
reader-compat.js supplies Map helpers in older browsers before modules load.
The original exam PDFs are not modified by these assets.
