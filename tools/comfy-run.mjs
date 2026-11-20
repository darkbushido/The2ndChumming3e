#!/usr/bin/env node
/**
 * Run a prompt batch on the local ComfyUI, one job at a time · used with tools/spirit-art-prompts.mjs.
 *
 *   node tools/comfy-run.mjs <prompts.json> <out dir> [--count 2] [--only slug,slug] [--ckpt name] [--host http://127.0.0.1:8188]
 *
 * Each entry { slug, prompt, negative } becomes <out dir>/<slug>-<n>.png; existing files are skipped. It waits while the queue
 * holds anyone else's jobs and never cancels or clears anything. Workflow: a plain txt2img graph on Illustrious XL, the anime
 * checkpoint (Flux dev, used for the weapon pictures, is not installed on this ComfyUI), 832x1216 portrait.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i < 0 ? d : args[i + 1]; };
const [file, outDir] = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
if (!file || !outDir) { console.error('usage: comfy-run.mjs <prompts.json> <out dir> [--count N] [--only a,b] [--ckpt name]'); process.exit(2); }
const HOST = opt('host', 'http://127.0.0.1:8188');
const COUNT = Number(opt('count', 1));
const ONLY = (opt('only', '') ?? '').split(',').filter(Boolean);
const CKPT = opt('ckpt', 'illustriousXL20_v20.safetensors');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJson = async p => (await fetch(HOST + p)).json();

const graph = (prompt, negative, seed, w = 832, h = 1216) => ({
  1: { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: CKPT } },
  2: { class_type: 'CLIPTextEncode', inputs: { text: prompt, clip: ['1', 1] } },
  3: { class_type: 'CLIPTextEncode', inputs: { text: negative, clip: ['1', 1] } },
  4: { class_type: 'EmptyLatentImage', inputs: { width: w, height: h, batch_size: 1 } },
  5: { class_type: 'KSampler', inputs: { seed, steps: 28, cfg: 6, sampler_name: 'euler_ancestral', scheduler: 'normal', denoise: 1,
    model: ['1', 0], positive: ['2', 0], negative: ['3', 0], latent_image: ['4', 0] } },
  6: { class_type: 'VAEDecode', inputs: { samples: ['5', 0], vae: ['1', 2] } },
  7: { class_type: 'SaveImage', inputs: { filename_prefix: 'sr3e_art', images: ['6', 0] } },
});

async function idle() {
  for (;;) { const q = await getJson('/queue'); if (!q.queue_running.length && !q.queue_pending.length) return; await sleep(5000); }
}

async function main() {
  const list = JSON.parse(readFileSync(resolve(file), 'utf8')).filter(e => !ONLY.length || ONLY.includes(e.slug));
  mkdirSync(resolve(outDir), { recursive: true });
  for (const e of list) for (let n = 1; n <= COUNT; n++) {
    const out = join(resolve(outDir), `${e.slug}-${n}.png`);
    if (existsSync(out)) continue;
    await idle();
    const seed = Math.floor(Math.random() * 2 ** 31);
    const res = await (await fetch(`${HOST}/prompt`, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: graph(e.prompt, e.negative ?? '', seed) }) })).json();
    if (!res.prompt_id) { console.error('rejected', JSON.stringify(res).slice(0, 400)); process.exit(1); }
    let img;
    while (!img) {
      await sleep(2000);
      const h = (await getJson(`/history/${res.prompt_id}`))[res.prompt_id];
      img = h?.outputs?.[7]?.images?.[0];
      if (h?.status?.status_str === 'error') { console.error('job failed', e.slug); process.exit(1); }
    }
    const bin = await fetch(`${HOST}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder)}&type=${img.type}`);
    writeFileSync(out, Buffer.from(await bin.arrayBuffer()));
    console.log(`${e.slug}-${n} (seed ${seed}) -> ${out}`);
  }
}
main().catch(err => { console.error(err); process.exit(1); });
