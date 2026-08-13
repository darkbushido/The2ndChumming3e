import globals from 'globals';

/**
 * Foundry executes a macro's body inside an implicit `async function`, so macros
 * legally use top-level `await` AND top-level `return`. No `sourceType` expresses
 * that: `module` allows the await but rejects the return, and `script`/`commonjs`
 * the reverse (`allowReturnOutsideFunction` is ignored in module mode, because
 * acorn forbids top-level return in modules unconditionally).
 *
 * So reproduce Foundry's wrapper before parsing. The opening text carries NO
 * newline, so every line number is preserved exactly and only column numbers on
 * line 1 shift — which keeps reported locations usable.
 *
 * Without this, 25 macro files fail to parse and are silently skipped, which is
 * the worst outcome available: zero coverage that looks like a clean run.
 */
const foundryMacroProcessor = {
  meta: { name: 'foundry-macro-wrapper', version: '1.0.0' },
  supportsAutofix: false,
  preprocess(text) {
    return [`(async () => {${text}\n})();`];
  },
  postprocess(messages) {
    return messages[0];
  },
};

/**
 * ESLint flat config for the SR3E Foundry VTT system.
 *
 * ── Why this exists ──────────────────────────────────────────────────────────
 * The project ran ~12,000 lines with no static analysis beyond `node --check`,
 * which is a SYNTAX check only. That let a `ReferenceError` ship: a call passed
 * `modBreakdown` in a function where it was never declared (it is a parameter of
 * a *different* function). ES modules are strict mode, so reading an undeclared
 * binding throws — and `?? null` does not help, because the throw happens on the
 * read. It would have crashed every ranged attack. `no-undef` catches that for
 * free, instantly.
 *
 * ── The globals list is load-bearing ─────────────────────────────────────────
 * Foundry injects its entire API as ambient globals. Without declaring them,
 * `no-undef` fires on every single `game`, `ui`, `CONFIG` and `Hooks` reference
 * and the real signal drowns in thousands of false positives — at which point
 * everyone turns the rule off, which is worse than not having it. If you see a
 * flood of no-undef on a Foundry class, add it here rather than disabling.
 *
 * ── Deliberately narrow ──────────────────────────────────────────────────────
 * This enables correctness rules, NOT style. A wall of formatting warnings on a
 * codebase this size gets ignored wholesale and takes the useful findings with
 * it. Style can come later, ideally via a formatter rather than lint rules.
 */

/** Foundry VTT ambient globals. Readonly — nothing here should be assigned. */
const foundryGlobals = {
  // Core singletons
  game: 'readonly',
  ui: 'readonly',
  canvas: 'readonly',
  CONFIG: 'readonly',
  CONST: 'readonly',
  Hooks: 'readonly',
  foundry: 'readonly',
  socket: 'readonly',

  // Document classes
  Actor: 'readonly',
  ActorDelta: 'readonly',
  ActiveEffect: 'readonly',
  Adventure: 'readonly',
  Card: 'readonly',
  Cards: 'readonly',
  ChatMessage: 'readonly',
  Combat: 'readonly',
  Combatant: 'readonly',
  Folder: 'readonly',
  Item: 'readonly',
  JournalEntry: 'readonly',
  JournalEntryPage: 'readonly',
  Macro: 'readonly',
  PlaylistSound: 'readonly',
  Playlist: 'readonly',
  RollTable: 'readonly',
  Scene: 'readonly',
  Setting: 'readonly',
  TableResult: 'readonly',
  User: 'readonly',
  Users: 'readonly',

  // Placeable documents
  AmbientLightDocument: 'readonly',
  AmbientSoundDocument: 'readonly',
  DrawingDocument: 'readonly',
  MeasuredTemplateDocument: 'readonly',
  NoteDocument: 'readonly',
  RegionDocument: 'readonly',
  RegionBehavior: 'readonly',
  TileDocument: 'readonly',
  TokenDocument: 'readonly',
  WallDocument: 'readonly',

  // Collections / apps
  Collection: 'readonly',
  CompendiumCollection: 'readonly',
  WorldCollection: 'readonly',
  Application: 'readonly',
  FormApplication: 'readonly',
  Dialog: 'readonly',
  FilePicker: 'readonly',
  DocumentSheetConfig: 'readonly',

  // Dice / rolls
  Roll: 'readonly',
  Die: 'readonly',
  RollTerm: 'readonly',

  // Helpers commonly used unqualified
  fromUuid: 'readonly',
  fromUuidSync: 'readonly',
  getDocumentClass: 'readonly',
  renderTemplate: 'readonly',
  loadTemplates: 'readonly',
  getTemplate: 'readonly',
  saveDataToFile: 'readonly',
  readTextFromFile: 'readonly',
  FormDataExtended: 'readonly',
  TextEditor: 'readonly',
  Handlebars: 'readonly',
  PIXI: 'readonly',

  // Deprecated v1 helpers still present in the codebase
  duplicate: 'readonly',
  mergeObject: 'readonly',
  setProperty: 'readonly',
  getProperty: 'readonly',
  hasProperty: 'readonly',
  expandObject: 'readonly',
  flattenObject: 'readonly',
  randomID: 'readonly',
  isNewerVersion: 'readonly',
  debounce: 'readonly',
};

export default [
  {
    // Not source: dependencies, LevelDB pack data, and archived JSON.
    ignores: [
      'node_modules/**',
      'packs/**',
      'archive/**',
      'rawdata/**',
      '**/*.min.js',
    ],
  },

  // ── Browser-side system code ────────────────────────────────────────────────
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser, ...foundryGlobals },
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    rules: {
      // ---- The rules that justify having a linter at all ------------------
      'no-undef': 'error',                 // the ReferenceError described above
      'no-dupe-class-members': 'error',    // caught the duplicate refreshAstralPool
      'no-dupe-keys': 'error',
      'no-dupe-args': 'error',
      'no-unreachable': 'error',
      'no-const-assign': 'error',
      'no-self-assign': 'error',
      'no-self-compare': 'error',
      'no-unsafe-negation': 'error',
      'no-unsafe-optional-chaining': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',
      'no-cond-assign': 'error',
      'no-constant-condition': ['error', { checkLoops: false }],
      'no-fallthrough': 'error',
      'no-func-assign': 'error',
      'no-import-assign': 'error',
      'no-obj-calls': 'error',
      'no-sparse-arrays': 'error',
      'no-class-assign': 'error',
      'no-compare-neg-zero': 'error',
      'no-dupe-else-if': 'error',
      'no-duplicate-case': 'error',
      'no-empty-pattern': 'error',
      'no-invalid-regexp': 'error',
      'no-misleading-character-class': 'error',
      'no-new-native-nonconstructor': 'error',
      'no-setter-return': 'error',
      'no-this-before-super': 'error',
      'no-unmodified-loop-condition': 'error',
      'no-unused-private-class-members': 'error',
      'no-useless-backreference': 'error',
      'getter-return': 'error',

      // ---- Async correctness — the class of bug the socket work is about ----
      'require-atomic-updates': 'warn',    // read-modify-write races across await
      'no-async-promise-executor': 'error',
      'no-await-in-loop': 'off',           // deliberate in the pack/populate scripts
      'no-promise-executor-return': 'error',
      'require-await': 'off',              // many Foundry overrides must stay async

      // ---- Hygiene, as warnings so they never block ------------------------
      'no-unused-vars': ['warn', {
        args: 'none',                      // Foundry hook signatures have unused params
        varsIgnorePattern: '^_',
        caughtErrors: 'none',
      }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-undef-init': 'warn',
      'no-useless-escape': 'warn',
    },
  },

  // ── Node-side: tests and build/maintenance scripts ──────────────────────────
  {
    files: ['tests/**/*.mjs', '*.mjs', 'build-*.mjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^_' }],
    },
  },

  // ── Playwright end-to-end tests ─────────────────────────────────────────────
  //
  // These files are Node on the outside and BROWSER on the inside: the bodies passed to
  // `page.evaluate()` are serialised and run inside Foundry, so they legitimately reference
  // `game`, `ChatMessage` and friends even though nothing in this file's own scope defines
  // them. Declaring both global sets is what keeps `no-undef` useful here — the alternative
  // is a file-level disable, which would also stop it catching a genuine typo in the Node
  // half.
  //
  // ⚠ It cannot distinguish the two sides, so a Foundry global referenced by mistake in the
  // Node half will not be flagged. That is the accepted cost of the rule staying on at all.
  {
    files: ['tests/e2e/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser, ...foundryGlobals },
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^_' }],
    },
  },

  // ── Macros run inside Foundry's macro sandbox ───────────────────────────────
  //
  // A Foundry macro is neither a module nor a plain script: its body is wrapped
  // in an implicit `async function`, so top-level `await` AND top-level `return`
  // are both legal. No single sourceType expresses that — `module` permits the
  // await but rejects the return, `script`/`commonjs` the reverse. So: parse as a
  // module for top-level await, and switch espree's allowReturnOutsideFunction on
  // for the return. Without both, 27 macros fail to parse and go entirely
  // unchecked, which is the worst outcome — silently zero coverage.
  {
    files: ['scripts/macros/**/*.js'],
    processor: foundryMacroProcessor,
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser, ...foundryGlobals },
    },
    rules: {
      'no-undef': 'error',
      'no-dupe-keys': 'error',
      'no-dupe-class-members': 'error',
      'no-unused-vars': 'off',   // macros routinely declare data they only partly use
    },
  },
];
