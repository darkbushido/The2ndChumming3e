# Spirit portraits

The twelve spirit-type pictures (`<type>.webp`: four elementals and eight nature spirits) are original drawings generated on the
maintainer's local ComfyUI with the Illustrious XL checkpoint from the prompts in `tools/spirit-art-prompts.mjs` (our own
descriptions, no rulebook text), then keyed to a transparent background with `tools/key-art.py`. No reference photographs or
third-party artwork are used. `SPIRIT_PICTURES` in `scripts/data/item-icons.mjs` lists them; `tests/spirit-art.test.mjs` keeps
that list equal to this folder.
