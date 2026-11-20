# ComfyUI batch 0.9.1 — missing weapon and armour pictures

Not shipped: `tools/` is outside `RELEASE_FILES` (`tools/release.mjs`), as is `art/`; `tools/comfyui/` sits beside the existing batch tooling (`tools/weapon-art-prompts.mjs`, `tools/key-art.py`).

**Counts:** weapons 160 missing of 223 distinct hand-weapon slugs in the shipped firearm and melee packs (63 already have a picture); armour 117 items, none with a picture (the armour designer has no picture folder yet — TODO 306).

## Shared prompt

Positive (replace `{ITEM}` with the row's name and `{DESC}` with its description):

```
{ITEM}, {DESC}, single item, three-quarter side view, centred, anime style illustration, clean cel shading, crisp dark outline, cyberpunk 2050s Shadowrun design, worn street-tech look, isolated on a transparent background, no hands, no people, no text, no logo
```

Negative:

```
white outline, white border, white halo, white fringe, glow edge, outer glow, rim light halo, drop shadow, cast shadow, ground shadow, reflection, gradient background, backdrop, scenery, hands, fingers, person, mannequin, text, watermark, signature, logo, multiple items, duplicate, cropped, blurry, photo, 3d render
```

Notes:
- The existing batch (`tools/weapon-art-prompts.mjs`) uses Flux dev, the vehicle pictures' anime style, and draws on **plain flat pure white** then keys it with `python tools/key-art.py <pngs> <out>`. If the workflow cannot output alpha, swap "isolated on a transparent background" for "plain flat pure white background" and key as usual; the negative list still applies.
- Armour: show the garment on its own, flat or on an invisible form, no wearer; ignore "no hands" wording where irrelevant.
- Save as `<slug>.png`; the slug is the output filename without `.webp`.
- Descriptions are our own shape cues (`tools/data/weapon-looks.json` and pack stats), not book text. Smartgun-capable guns: add "glowing LED indicator lights along the receiver".

## Weapons

### Light pistol (7)

| slug | item | book | description |
|---|---|---|---|
| ares-supersquirt-ii | Ares SuperSquirt II | MM p.115 | compressed-air chemical pistol with two differently shaped, coloured clips (gel reservoir and capsules) |
| beretta-model-101t | Beretta Model 101T | SR3 p.278 | light pistol, like a Beretta 92 Compact |
| nostal-ind-gentleman | Nostal. Ind. Gentleman | TSS p.2 | replica of a classic gentleman's pocket revolver, nickel and ivory |
| nostal-ind-yankee | Nostal. Ind. Yankee | TSS p.2 | replica of a classic single-action revolver, like a Colt Peacemaker |
| sa-puzzler | SA Puzzler | CC p.18 | small all-polymer pistol that breaks into parts, like a Liberator-style plastic pistol, smooth and seamless |
| seco-ld-120 | Seco LD-120 | CC p.18 | light pistol, like a Glock 19, laser sight under the barrel |
| taurus-multi-6 | Taurus Multi-6 | CC p.18 | light revolver, like a Taurus 856, revolver cylinder |

### Machine pistol (2)

| slug | item | book | description |
|---|---|---|---|
| ceska-black-scorpion | Ceska Black Scorpion | SR3 p.278 | machine pistol with a folding stock, like a CZ Skorpion vz. 61, folding stock |
| fam-95 | FAM 95 | FRA p.141 | machine pistol, like a Beretta 93R |

### Heavy pistol (11)

| slug | item | book | description |
|---|---|---|---|
| ares-black-knight | Ares Black Knight | TSS p.16 | heavy pistol with a matte black finish, like an FN FNX-45 Tactical, glowing LED indicator lights along the receiver |
| ares-predator | Ares Predator | SR3 p.278 | oversized squared-off heavy pistol: long flat-sided slide with horizontal grooves and a raised top rail, slotted vent cuts in a tall rear sight block, exposed hammer and beavertail, a full-length underbarrel rail housing running to a big flat muzzle face with a round bore, chunky grip with dark panels and screws, steel-grey finish |
| ares-predator-ii | Ares Predator II | CC p.19 | oversized squared-off heavy pistol: long flat-sided slide with horizontal grooves and a raised top rail, slotted vent cuts in a tall rear sight block, exposed hammer and beavertail, a full-length underbarrel rail housing running to a big flat muzzle face with a round bore, chunky grip with dark panels and screws, steel-grey finish, slightly more rounded edges, glowing LED indicator lights along the receiver |
| ares-predator-iii | Ares Predator III | CC p.19 | oversized squared-off heavy pistol: long flat-sided slide with horizontal grooves and a raised top rail, slotted vent cuts in a tall rear sight block, exposed hammer and beavertail, a full-length underbarrel rail housing running to a big flat muzzle face with a round bore, chunky grip with dark panels and screws, steel-grey finish, extra vent slots on the slide, glowing LED indicator lights along the receiver |
| ares-viper-slivergun | Ares Viper Slivergun | SR3 p.278 | heavy pistol with a thick integral silencer shroud and a high-capacity flechette magazine, long sound suppressor on the muzzle |
| morrissey-alta | Morrissey Alta | CC p.19 | elegant heavy pistol with an engraved slide, like a Sig P226 Legion, laser sight under the barrel |
| rmngton-roomsweeper-shg | Rmngton Roomsweeper ShG | SR3 p.278 | large revolver that fires shotgun shells, like a Taurus Judge |
| ruger-super-warhawk | Ruger Super Warhawk | SR3 p.278 | large heavy revolver, like a Ruger Super Redhawk, revolver cylinder |
| ruger-thunderboltlaser | Ruger Thunderbolt/Laser | CC p.19 | heavy pistol with an underbarrel laser sight, like a Ruger SR1911, laser sight under the barrel |
| ruger-thunderboltsmart | Ruger Thunderbolt/Smart | CC p.19 | heavy pistol, like a Ruger SR1911, glowing LED indicator lights along the receiver |
| ww-infiltrator | WW Infiltrator | CC p.19 | heavy pistol with an integral suppressor, like an HK Mk23 with suppressor |

### Taser (2)

| slug | item | book | description |
|---|---|---|---|
| defiance-super-shock | Defiance Super Shock | SR3 p.278 | rifle-sized taser with a dart cartridge, like a long-barrel stun gun, scope on top |
| jupiter-taser-club | Jupiter Taser Club | STA2 p.98 | police baton with electrode contacts at the tip and a glowing charge indicator |

### Submachine gun (15)

| slug | item | book | description |
|---|---|---|---|
| 9mm-flechette-smg | 9mm Flechette SMG | TSS p.7 | submachine gun firing flechettes, with a long ribbed barrel shroud and a box magazine |
| ak-97-smgcarbine | AK-97 SMG/Carbine | SR3 p.278 | short folding-stock carbine, like an AKS-74U, folding stock |
| ares-exec-protector | Ares Exec. Protector | CC p.31 | compact folding SMG like the Magpul FMG9, shown as a sleek hard-shell executive briefcase with a small barrel port in its side, long sound suppressor on the muzzle |
| ares-tommy-gun-heavy | Ares Tommy Gun Heavy | TSS p.16 | Thompson-style submachine gun with a drum magazine and a heavier barrel, vented muzzle brake, vertical foregrip, large high-capacity magazine, glowing LED indicator lights along the receiver |
| ares-tommy-gun-lite | Ares Tommy Gun Lite | TSS p.16 | Thompson-style submachine gun with a stick magazine, lighter build, vented muzzle brake, vertical foregrip, glowing LED indicator lights along the receiver |
| db45-a-double-barrel | DB45-A Double Barrel | TSS p.7 | submachine gun with two stacked barrels and twin magazines, large high-capacity magazine |
| heckler-koch-hk227 | Heckler & Koch HK227 | SR3 p.278 | submachine gun with a retractable stock, like an HK MP5A3, laser sight under the barrel, vented muzzle brake, folding stock |
| heckler-koch-hk227-s | Heckler & Koch HK227-S | SR3 p.278 | submachine gun with an integral suppressor, like an HK MP5SD, laser sight under the barrel, long sound suppressor on the muzzle, folding stock |
| ingram-supermach-100-ext | Ingram SuperMach 100 Ext | CC p.21 | machine pistol with an extended magazine and long suppressor, like a MAC-10, large high-capacity magazine |
| ingram-supermach-100-std | Ingram SuperMach 100 Std | CC p.21 | boxy machine pistol, like a MAC-10 |
| ingram-warrior-10 | Ingram Warrior-10 | CC p.21 | submachine gun, like an Ingram MAC-11 with a stock |
| nostalgia-ind-big-bore | Nostalgia Ind. Big Bore | TSS p.2 | replica of a classic submachine gun, like an M3 Grease Gun |
| sandler-tmp | Sandler TMP | CC p.21 | compact machine pistol with a foregrip, like a B&T TP9, laser sight under the barrel, folding stock |
| shiawase-blazer | Shiawase Blazer | CC p.30 | compact bullpup flamethrower with a fuel tank at the rear and a nozzle at the front |
| uzi-iii | Uzi III | SR3 p.278 | submachine gun with a folding stock, like an Uzi Pro, laser sight under the barrel, folding stock |

### Shotgun (11)

| slug | item | book | description |
|---|---|---|---|
| ares-thunderer | Ares Thunderer | CC p.78 | heavy semi-auto combat shotgun, like a Benelli M4, vertical foregrip |
| mossberg-sm-cmdt | Mossberg SM-CMDT | CC p.23 | combat shotgun with a top-mounted laser and smartgun, like a Mossberg 930 SPX, glowing LED indicator lights along the receiver |
| neostead-combat | Neostead Combat | TSS p.2 | pump-action bullpup shotgun with twin tube magazines, like a Neostead / KSG |
| nostal-ind-police-pm5 | Nostal. Ind. Police PM5 | TSS p.2 | replica of a classic police pump shotgun, like a Winchester Model 12 |
| nostal-ind-scattergun | Nostal. Ind. Scattergun | TSS p.2 | replica of a classic double-barrel coach gun |
| remington-990 | Remington 990 | CC p.23 | pump-action shotgun, like a Remington 870 |
| savage-model-77e | Savage Model 77E | TSS p.3 | pump-action shotgun, like a Savage Stevens 320 |
| street-sweeper-shtg | Street Sweeper ShtG | CC p.23 | crude jury-rigged muzzle-loading shotgun, like an old musket built from pipe and scrap, ganger-made, ammunition belt feeding from a box |
| vc-boxlock-hammerless | VC Boxlock Hammerless | TSS p.3 | double-barrel boxlock hammerless shotgun with wood stock, folding stock, ammunition belt feeding from a box |
| win-1300-defender-pg | Win. 1300 Defender PG | TSS p.3 | pump shotgun with a pistol grip, like a Winchester 1300 Defender pistol-grip |
| win-1300-defender-ss | Win. 1300 Defender SS | TSS p.3 | pump shotgun with a full stock, like a Winchester 1300 Defender, folding stock |

### Sport rifle (6)

| slug | item | book | description |
|---|---|---|---|
| hk-g38-carbine | HK G38 Carbine | CC p.22 | carbine, like an HK G36C |
| nostal-ind-long-gun | Nostal. Ind. Long Gun | TSS p.2 | replica of a classic lever-action rifle, like a Winchester 1873 |
| remington-750 | Remington 750 | SR3 p.278 | semi-auto hunting rifle with a scope, like a Remington 750 Woodsmaster |
| remington-950 | Remington 950 | SR3 p.278 | bolt-action rifle with a scope, like a Remington 700 |
| ruger-100 | Ruger 100 | CC p.21 | bolt-action hunting rifle with a scope, like a Ruger M77 |
| steyr-aug-csl-carbine | Steyr AUG-CSL Carbine | CC p.22 | short bullpup carbine, like a Steyr AUG A3 carbine |

### Sniper rifle (3)

| slug | item | book | description |
|---|---|---|---|
| ares-heavy-laser-plus | Ares Heavy Laser Plus | CC p.30 | heavy laser rifle on an underbarrel tripod, cabled to a backpack battery case, glowing emitter instead of a muzzle, mounted on a tripod, large high-capacity magazine |
| barret-model-121 | Barret Model 121 | CC p.21 | heavy anti-materiel sniper rifle with a large muzzle brake and bipod, like a Barrett M82, long sound suppressor on the muzzle, folding bipod near the muzzle, glowing LED indicator lights along the receiver |
| ranger-arms-sm-3 | Ranger Arms SM-3 | SR3 p.278 | sniper rifle with a large scope and bipod, like an Accuracy International AXMC, scope on top, long sound suppressor on the muzzle, vented muzzle brake |

### Assault rifle (7)

| slug | item | book | description |
|---|---|---|---|
| ak-97 | AK-97 | SR3 p.278 | assault rifle, like an AK-74M with a polymer stock |
| ak-98 | AK-98 | SR3 p.278 | assault rifle with an underbarrel grenade launcher, like an AK-74M with a GP-25, integrated underbarrel grenade launcher |
| ares-alpha | Ares Alpha | CC p.22 | bullpup-style combat rifle with an integrated underbarrel grenade launcher, like an FN F2000 with its GL, integrated underbarrel grenade launcher, glowing LED indicator lights along the receiver |
| fn-har | FN HAR | SR3 p.278 | assault rifle, like an FN SCAR-L, laser sight under the barrel, vented muzzle brake |
| m-16b | M-16B | TSS p.3 | M16A2 rifle, folding stock |
| vehement-a-v-full-auto | Vehement A-V Full Auto | TSS p.6 | assault rifle, like an Arsenal AR-M1 select-fire |
| vehement-a-v-standard | Vehement A-V Standard | TSS p.6 | assault rifle, like an Arsenal AR-M1 |

### Light machine gun (4)

| slug | item | book | description |
|---|---|---|---|
| ares-mp-lmg | Ares MP-LMG | CC p.26 | light machine gun, like an FN Minimi / M249 SAW, laser sight under the barrel, vented muzzle brake, hip brace, large high-capacity magazine |
| hk-g38-lmg | HK G38 LMG | CC p.22 | light machine gun with a bipod and drum, like an HK MG36 |
| ingram-valiant | Ingram Valiant | SR3 p.279 | light machine gun with a bipod, like a Negev, vented muzzle brake, hip brace |
| steyr-aug-csl-lmg | Steyr AUG-CSL LMG | CC p.22 | bullpup light machine gun with a long heavy barrel and bipod, like a Steyr AUG HBAR |

### Medium machine gun (1)

| slug | item | book | description |
|---|---|---|---|
| ultimax-mmg | Ultimax MMG | SR3 p.279 | medium machine gun with a bipod, like an Ultimax 100, mounted on a tripod |

### Heavy machine gun (1)

| slug | item | book | description |
|---|---|---|---|
| rpk-hmg | RPK HMG | SR3 p.279 | heavy machine gun on a tripod with a belt feed, like a DShK, mounted on a tripod |

### Assault cannon (3)

| slug | item | book | description |
|---|---|---|---|
| panther-assault-cannon-bipod | Panther Assault Cannon [Bipod] | CC p.26 | huge man-portable assault cannon with a thick barrel, box magazine and a detachable underbarrel folding bipod, folding bipod near the muzzle |
| panther-assault-cannon-shoulder-strap-hip-brace | Panther Assault Cannon [Shoulder Strap Hip-Brace] | CC p.26 | huge man-portable assault cannon with a thick barrel and box magazine, carried on a shoulder strap with a hip brace, hip brace |
| vigorous-assault-cannon | Vigorous Assault Cannon | SR3 p.279 | huge man-portable assault cannon with a thick barrel and a large magazine |

### Blowgun (1)

| slug | item | book | description |
|---|---|---|---|
| blowgun | Blowgun | CC p.31 | long thin blowgun tube with a mouthpiece, with a few darts, ammunition belt feeding from a box |

### Club (9)

| slug | item | book | description |
|---|---|---|---|
| az-150-stun-baton | AZ-150 Stun Baton | CC p.10 | a club |
| club | Club | SR3 p.275 | a club |
| extendable-baton | Extendable Baton | CC p.10 | a club |
| mace | Mace | CC p.10 | a club |
| rattan-stick | Rattan Stick | CC p.10 | a club |
| sai | Sai | CC p.10 | a club |
| sap | Sap | SR3 p.275 | a club |
| spiked-mace | Spiked Mace | CC p.10 | a club |
| stun-baton | Stun Baton | SR3 p.275 | a club |

### Cyber weapon (11)

| slug | item | book | description |
|---|---|---|---|
| fangs | Fangs | MM p.43 | a cyber weapon |
| hand-razors | Hand Razors | SR3 p.302 | a cyber weapon |
| horn-implants | Horn Implants | MM p.43 | a cyber weapon |
| oral-dart | Oral Dart | MM p.17 | a cyber weapon |
| oral-gun | Oral Gun | MM p.17 | a cyber weapon |
| oral-slasher | Oral Slasher | MM p.17 | a cyber weapon |
| razorscyb-1 | Razors(CYB) 1 | SR3 p.302 | a cyber weapon |
| retract-climbing-claws | Retract. Climbing Claws | MM p.31 | a cyber weapon |
| shock-hand | Shock Hand | MM p.43 | a cyber weapon |
| spur | Spur | SR3 p.302 | a cyber weapon |
| venom-sack | Venom Sack | MM p.42 | a cyber weapon |

### Edged weapon (15)

| slug | item | book | description |
|---|---|---|---|
| ares-monosword | Ares Monosword | CC p.8 | a edged weapon |
| cougarfinebladeknife-long | CougarFineBladeKnife-Long | CC p.8 | a edged weapon |
| cougarfinebladeknife-shrt | CougarFineBladeKnife-Shrt | CC p.8 | a edged weapon |
| forearm-snap-blades | Forearm Snap Blades | SR3 p.275 | a edged weapon |
| katana | Katana | SR3 p.275 | a edged weapon |
| katar | Katar | CC p.8 | a edged weapon |
| knife | Knife | SR3 p.275 | a edged weapon |
| kris | Kris | CC p.8 | a edged weapon |
| laser-cresent-axe | Laser Cresent Axe | CC p.8 | a edged weapon |
| macauitl | Macauitl | CC p.8 | a edged weapon |
| survival-knife | Survival Knife | SR3 p.275 | a edged weapon |
| sword | Sword | SR3 p.275 | a edged weapon |
| tomahawk | Tomahawk | CC p.8 | a edged weapon |
| vibro-knife | Vibro Knife | CC p.8 | a edged weapon |
| vibro-sword | Vibro Sword | CC p.8 | a edged weapon |

### Flamethrower (1)

| slug | item | book | description |
|---|---|---|---|
| flame-thrower | Flame Thrower | CC p.30 | flamethrower wand cabled to a backpack fuel tank, like an M2 flamethrower |

### Grenade launcher (2)

| slug | item | book | description |
|---|---|---|---|
| ares-antioch | Ares Antioch | SR3 p.279 | single-shot break-action grenade launcher with a folding stock, like an HK69 |
| us-m79 | US M79 | TSS p.3 | M79 break-action grenade launcher with a wooden stock |

### Hold-out pistol (9)

| slug | item | book | description |
|---|---|---|---|
| bracer | Bracer | CC p.31 | large ornate platinum bracelet with a tiny muzzle and a small button trigger below the wrist, ammunition belt feeding from a box |
| gun-cane | Gun Cane | CC p.31 | an ordinary elegant walking stick with a hidden muzzle in its tip, ammunition belt feeding from a box |
| morrissey-elan | Morrissey Elan | CC p.16 | elegant small hold-out pistol, like a Beretta Pico |
| nova-infranat-oneshot | Nova Infranat. OneShot | TSS p.5 | tiny single-shot disposable hold-out pistol, like an FP-45 Liberator |
| raecor-sting | Raecor Sting | CC p.16 | tiny all-plastic dart hold-out pistol, smooth and seamless |
| streetline-special | Streetline Special | SR3 p.278 | small cheap hold-out pistol, like a Hi-Point C9 compact |
| tiffani-needler | Tiffani Needler | CC p.16 | dainty, jewel-like flechette hold-out pistol with a thin needle barrel |
| tiffani-self-defender | Tiffani Self-Defender | CC p.16 | dainty, jewel-like single-shot hold-out pistol, like a pearl-gripped derringer |
| walther-palm-pistol | Walther Palm Pistol | SR3 p.278 | tiny palm-squeeze hold-out pistol, like a Chicago Palm Protector, ammunition belt feeding from a box |

### Laser (1)

| slug | item | book | description |
|---|---|---|---|
| ares-sonic-beam-rifle | Ares Sonic Beam Rifle | STA2 p.35 | rifle with a wide dish-shaped sonic emitter instead of a barrel, power pack in the stock, integrated underbarrel shotgun, laser sight under the barrel |

### Melee weapon (6)

| slug | item | book | description |
|---|---|---|---|
| acb-harmony-telescoping-staff | ACB Harmony Telescoping Staff | TSS p.3 | a melee weapon |
| black-whistle-butterfly-knife | Black Whistle Butterfly Knife | TSS p.2 | a melee weapon |
| chainsaw | Chainsaw | CC p.11 | a melee weapon |
| hand-blade | Hand Blade | SR3 p.302 | a melee weapon |
| hrazor | H.Razor | SR3 p.302 | a melee weapon |
| pipe | Pipe | SR3 p.328 | a melee weapon |

### Minigun (1)

| slug | item | book | description |
|---|---|---|---|
| vindicator-minigun | Vindicator Minigun | CC p.26 | rotary minigun with six barrels and an ammunition feed, like an M134, large high-capacity magazine |

### Missile launcher (7)

| slug | item | book | description |
|---|---|---|---|
| arbelast-ii-maw | Arbelast II MAW | CC p.28 | shoulder-fired rigid launcher canister with an optical sight, like a Carl Gustaf M4 / AT4, scope on top |
| aztechnology-lasher | Aztechnology Lasher | CC p.27 | shoulder-fired missile launcher tube with a sight unit, like an FGM-148 Javelin, ammunition belt feeding from a box |
| ballista-mis-launcher | Ballista Mis. Launcher | CC p.28 | backpack missile unit with a shoulder-fired tube deployed from it on an arm, laser designator on the tube, laser sight under the barrel |
| briefcase-rocket | Briefcase Rocket | STA2 p.35 | slim hard-shell briefcase that opens into a short rocket launcher tube |
| iws-multi-launcher | IWS Multi-Launcher | SR3 p.279 | multi-tube shoulder launcher with a sight unit, like a rotary multi-rocket launcher, ammunition belt feeding from a box |
| m79b1-law | M79B1 LAW | CC p.28 | disposable telescoping rocket tube, like an M72 LAW |
| spike | Spike | CC p.27 | shoulder-fired missile launcher tube with a sight, like a Spike-MR, ammunition belt feeding from a box |

### Mortar (1)

| slug | item | book | description |
|---|---|---|---|
| m-12-portable-mortar | M-12 Portable Mortar | CC p.26 | light portable mortar tube on a bipod and baseplate, like an M224 |

### Pole arm (11)

| slug | item | book | description |
|---|---|---|---|
| bo-staff | Bo Staff | CC p.10 | a pole arm |
| claymore | Claymore | CC p.10 | a pole arm |
| combat-axe | Combat Axe | SR3 p.275 | a pole arm |
| combat-axe-thrusting-point | Combat Axe Thrusting Point | SR3 p.275 | a pole arm |
| harpoon | Harpoon | CC p.10 | a pole arm |
| javelin | Javelin | CC p.10 | a pole arm |
| no-dachi | No-Dachi | CC p.10 | a pole arm |
| pole-arm | Pole Arm | SR3 p.275 | a pole arm |
| spear | Spear | CC p.10 | a pole arm |
| staff | Staff | SR3 p.275 | a pole arm |
| telescoping-staff | Telescoping Staff | CC p.10 | a pole arm |

### Spear gun (1)

| slug | item | book | description |
|---|---|---|---|
| spear-gun | Spear Gun | CC p.31 | pneumatic spear gun with a long metal spear loaded |

### Unarmed (2)

| slug | item | book | description |
|---|---|---|---|
| hardliner-gloves | Hardliner Gloves | CC p.49 | a unarmed |
| shock-glove | Shock Glove | SR3 p.275 | a unarmed |

### Vehicle jump pistol (1)

| slug | item | book | description |
|---|---|---|---|
| vogeljager-man-portable | Vogeljager Man Portable | CC p.27 | backpack anti-air missile unit with a shoulder launch tube and a sensor head, like a Stinger on a backpack frame |

### Whip / flail (8)

| slug | item | book | description |
|---|---|---|---|
| chain | Chain | CC p.11 | a whip / flail |
| kusarigama | Kusarigama | CC p.11 | a whip / flail |
| manriki-gusari | Manriki-gusari | CC p.11 | a whip / flail |
| monofilament-whip | Monofilament Whip | SR3 p.275 | a whip / flail |
| morning-star | Morning Star | CC p.11 | a whip / flail |
| nunchaku | Nunchaku | CC p.11 | a whip / flail |
| three-section-staff | Three-section Staff | CC p.11 | a whip / flail |
| whip | Whip | SR3 p.275 | a whip / flail |

## Armour

Grouped by the designer's type chip (`ArmorDesignerView.typeOf`, a name heuristic). Descriptions give garment kind and protection level only; add colour or cut cues from the item name.

### Body armour (34)

| slug | item | book | description |
|---|---|---|---|
| armante-dallas-jacket | Armante "Dallas" Jacket | CC p.46 | slim, low-profile armoured jacket or vest, ballistic 2/impact 2 |
| armante-dallas-short-jacket | Armante "Dallas" Short Jacket | CC p.46 | slim, low-profile armoured jacket or vest, ballistic 1/impact 1 |
| armante-dallas-vest | Armante "Dallas" Vest | CC p.46 | medium-weight armoured jacket or vest, ballistic 3/impact 1 |
| armor-jacket | Armor Jacket | SR3 p.284 | heavy plated armoured jacket or vest, ballistic 5/impact 3 |
| armor-vest | Armor Vest | SR3 p.284 | slim, low-profile armoured jacket or vest, ballistic 2/impact 1 |
| armor-vest-with-plates | Armor Vest with Plates | SR3 p.284 | medium-weight armoured jacket or vest, ballistic 4/impact 3 |
| camo-jacket-desert | Camo Jacket (Desert) | SR3 p.284 | medium-weight armoured jacket or vest, ballistic 3/impact 1 |
| camo-jacket-snow | Camo Jacket (Snow) | SR3 p.284 | medium-weight armoured jacket or vest, ballistic 3/impact 1 |
| camo-jacket-urban | Camo Jacket (Urban) | SR3 p.284 | medium-weight armoured jacket or vest, ballistic 3/impact 1 |
| camo-jacket-winter-woods | Camo Jacket (Winter Woods) | SR3 p.284 | medium-weight armoured jacket or vest, ballistic 3/impact 1 |
| camo-jacket-woods | Camo Jacket (Woods) | SR3 p.284 | medium-weight armoured jacket or vest, ballistic 3/impact 1 |
| diving-armor | Diving Armor | CC p.51 | medium-weight armoured jacket or vest, ballistic 4/impact 2 |
| form-fitting-full-body-suit | Form-fitting Full-Body Suit | CC p.51 | medium-weight armoured jacket or vest, ballistic 4/impact 1 |
| form-fitting-half-body-suit | Form-fitting Half-Body Suit | CC p.51 | medium-weight armoured jacket or vest, ballistic 3/impact 1 |
| heavy-military-armor | Heavy Military Armor | CC p.51 | heavy plated armoured jacket or vest, ballistic 9/impact 8 |
| heavy-security-armor | Heavy Security Armor | SR3 p.284 | heavy plated armoured jacket or vest, ballistic 7/impact 5 |
| light-military-armor | Light Military Armor | CC p.51 | heavy plated armoured jacket or vest, ballistic 7/impact 6 |
| light-security-armor | Light Security Armor | SR3 p.284 | heavy plated armoured jacket or vest, ballistic 6/impact 4 |
| medium-military-armor | Medium Military Armor | CC p.51 | heavy plated armoured jacket or vest, ballistic 8/impact 7 |
| medium-security-armor | Medium Security Armor | SR3 p.284 | heavy plated armoured jacket or vest, ballistic 6/impact 5 |
| mortimer-crimson-sky-jacket | Mortimer "Crimson Sky" Jacket | CC p.48 | slim, low-profile armoured jacket or vest, ballistic 2/impact 2 |
| olfactory-camouflage | Olfactory Camouflage | TWL p.131 | slim, low-profile armoured jacket or vest, ballistic 0/impact 0 |
| real-leather-jacket | Real Leather Jacket | SR3 p.284 | slim, low-profile armoured jacket or vest, ballistic 0/impact 2 |
| secure-jacket | Secure Jacket | SR3 p.284 | heavy plated armoured jacket or vest, ballistic 5/impact 3 |
| secure-ultra-vest | Secure Ultra-Vest | SR3 p.284 | medium-weight armoured jacket or vest, ballistic 3/impact 2 |
| secure-vest | Secure Vest | SR3 p.284 | slim, low-profile armoured jacket or vest, ballistic 2/impact 1 |
| shark-chain | Shark Chain | TSS p.12 | slim, low-profile armoured jacket or vest, ballistic 0/impact 0 |
| synth-leather-jacket | Synth Leather Jacket | SR3 p.284 | slim, low-profile armoured jacket or vest, ballistic 0/impact 1 |
| v-island-actioneer-jacket | V-Island "Actioneer" Jacket | CC p.49 | slim, low-profile armoured jacket or vest, ballistic 2/impact 1 |
| v-island-sleeping-tiger-vest | V-Island "Sleeping Tiger" Vest | CC p.49 | slim, low-profile armoured jacket or vest, ballistic 1/impact 1 |
| victory-wild-hunt-cjacket | Victory "Wild Hunt" C.Jacket | CC p.49 | medium-weight armoured jacket or vest, ballistic 4/impact 2 |
| victory-wild-hunt-cvest | Victory "Wild Hunt" C.Vest | CC p.49 | slim, low-profile armoured jacket or vest, ballistic 2/impact 2 |
| zo-second-skin-bodysuit | Zo� "Second Skin" Bodysuit | CC p.49 | slim, low-profile armoured jacket or vest, ballistic 2/impact 2 |
| zoe-second-skin-bodysuit | Zoe "Second Skin" Bodysuit | CC p.49 | slim, low-profile armoured jacket or vest, ballistic 2/impact 2 |

### Helmets (4)

| slug | item | book | description |
|---|---|---|---|
| helmetwrist-transceiver-armor | Helmet/Wrist Transceiver (Armor) | CC p.51 | slim, low-profile protective helmet, ballistic 0/impact 0 |
| military-helmet | Military Helmet | CC p.51 | medium-weight protective helmet, ballistic 2/impact 3 |
| security-helmet | Security Helmet | SR3 p.284 | slim, low-profile protective helmet, ballistic 1/impact 2 |
| victory-rapid-transit-helmet | Victory "Rapid Transit" Helmet | CC p.49 | slim, low-profile protective helmet, ballistic 0/impact 2 |

### Shields (4)

| slug | item | book | description |
|---|---|---|---|
| riot-shield-ballistic | Riot Shield, Ballistic | SR3 p.284 | medium-weight ballistic shield, ballistic 3/impact 1 |
| riot-shield-electro-large | Riot Shield, Electro (large) | STA2 p.98 | medium-weight ballistic shield, ballistic 2/impact 3 |
| riot-shield-large | Riot Shield, Large | SR3 p.284 | medium-weight ballistic shield, ballistic 2/impact 3 |
| riot-shield-small | Riot Shield, Small | SR3 p.284 | slim, low-profile ballistic shield, ballistic 1/impact 2 |

### Clothing (75)

| slug | item | book | description |
|---|---|---|---|
| armante-ancien-shawl | Armante "Ancien" Shawl | CC p.46 | slim, low-profile armoured clothing garment, ballistic 1/impact 0 |
| armante-dallas-shirt | Armante "Dallas" Shirt | CC p.46 | slim, low-profile armoured clothing garment, ballistic 1/impact 0 |
| armante-dallas-slacks | Armante "Dallas" Slacks | CC p.46 | slim, low-profile armoured clothing garment, ballistic 1/impact 0 |
| armante-executive-suite-tux | Armante "Executive Suite" Tux | CC p.46 | medium-weight armoured clothing garment, ballistic 3/impact 1 |
| armante-london-fog-chairman | Armante "London Fog" Chairman | CC p.46 | slim, low-profile armoured clothing garment, ballistic 2/impact 2 |
| armante-london-fog-count | Armante "London Fog" Count | CC p.46 | slim, low-profile armoured clothing garment, ballistic 2/impact 2 |
| armante-london-fog-majesty | Armante "London Fog" Majesty | CC p.46 | slim, low-profile armoured clothing garment, ballistic 2/impact 2 |
| armante-london-fog-merlin | Armante "London Fog" Merlin | CC p.46 | slim, low-profile armoured clothing garment, ballistic 2/impact 2 |
| armante-london-fog-profsnl | Armante "London Fog" Profsnl | CC p.46 | slim, low-profile armoured clothing garment, ballistic 2/impact 2 |
| armante-starlight-dress | Armante "Starlight" Dress | CC p.46 | slim, low-profile armoured clothing garment, ballistic 1/impact 1 |
| armante-venetian-dress | Armante "Venetian" Dress | CC p.46 | slim, low-profile armoured clothing garment, ballistic 1/impact 0 |
| armantes-ancien-shawl | Armante's "Ancien" Shawl | CC p.46 | slim, low-profile armoured clothing garment, ballistic 1/impact 0 |
| armor-clothing | Armor Clothing | SR3 p.284 | medium-weight armoured clothing garment, ballistic 3/impact 0 |
| camo-full-suit-desert | Camo Full Suit (Desert) | SR3 p.284 | heavy plated armoured clothing garment, ballistic 5/impact 3 |
| camo-full-suit-snow | Camo Full Suit (Snow) | SR3 p.284 | heavy plated armoured clothing garment, ballistic 5/impact 3 |
| camo-full-suit-urban | Camo Full Suit (Urban) | SR3 p.284 | heavy plated armoured clothing garment, ballistic 5/impact 3 |
| camo-full-suit-winter-woods | Camo Full Suit (Winter Woods) | SR3 p.284 | heavy plated armoured clothing garment, ballistic 5/impact 3 |
| camo-full-suit-woods | Camo Full Suit (Woods) | SR3 p.284 | heavy plated armoured clothing garment, ballistic 5/impact 3 |
| chemseal-armor | Chemseal (Armor) | CC p.51 | slim, low-profile armoured clothing garment, ballistic 0/impact 0 |
| electronic-magnification-armor | Electronic Magnification (Armor) | CC p.51 | slim, low-profile armoured clothing garment, ballistic 0/impact 0 |
| fine-clothing | Fine Clothing | SR3 p.284 | slim, low-profile armoured clothing garment, ballistic 0/impact 0 |
| forearm-guards | Forearm Guards | CC p.51 | slim, low-profile armoured clothing garment, ballistic 0/impact 1 |
| form-fitting-shirt | Form-fitting Shirt | CC p.51 | slim, low-profile armoured clothing garment, ballistic 2/impact 0 |
| geck-tape-gloves | Geck Tape Gloves | STA2 p.36 | slim, low-profile armoured clothing garment, ballistic 0/impact 0 |
| heads-up-disp100mp-armor | Heads Up Disp/100MP (Armor) | CC p.51 | slim, low-profile armoured clothing garment, ballistic 0/impact 0 |
| heads-up-display-100-mps-armor | Heads Up Display - 100 MPs (Armor) | CC p.51 | slim, low-profile armoured clothing garment, ballistic 0/impact 0 |
| lined-coat | Lined Coat | SR3 p.284 | medium-weight armoured clothing garment, ballistic 4/impact 2 |
| low-light-vision-armor | Low-light Vision (Armor) | CC p.51 | slim, low-profile armoured clothing garment, ballistic 0/impact 0 |
| massaging-liners-accessory | Massaging Liners - Accessory | CC p.49 | slim, low-profile armoured clothing garment, ballistic 0/impact 0 |
| mortimer-greatcoat-coat | Mortimer "Greatcoat" Coat | CC p.48 | medium-weight armoured clothing garment, ballistic 4/impact 2 |
| mortimer-summit-coat | Mortimer "Summit" Coat | CC p.48 | medium-weight armoured clothing garment, ballistic 3/impact 2 |
| mortimer-ulysses-coat | Mortimer "Ulysses" Coat | CC p.48 | medium-weight armoured clothing garment, ballistic 4/impact 2 |
| null-suit | Null Suit | STA2 p.36 | slim, low-profile armoured clothing garment, ballistic 0/impact 0 |
| optical-magnification-armor | Optical Magnification (Armor) | CC p.51 | slim, low-profile armoured clothing garment, ballistic 0/impact 0 |
| ordinary-clothing | Ordinary Clothing | SR3 p.284 | slim, low-profile armoured clothing garment, ballistic 0/impact 0 |
| plastic-restraint-melters-acc | Plastic Restraint Melters-Acc | CC p.49 | slim, low-profile armoured clothing garment, ballistic 0/impact 0 |
| real-leather-pants | Real Leather Pants | SR3 p.284 | slim, low-profile armoured clothing garment, ballistic 0/impact 2 |
| respirator-armor | Respirator (Armor) | CC p.51 | slim, low-profile armoured clothing garment, ballistic 0/impact 0 |
| secure-clothing | Secure Clothing | SR3 p.284 | medium-weight armoured clothing garment, ballistic 3/impact 0 |
| secure-long-coat | Secure Long Coat | SR3 p.284 | medium-weight armoured clothing garment, ballistic 4/impact 2 |
| signal-locator-armor | Signal Locator (Armor) | CC p.51 | slim, low-profile armoured clothing garment, ballistic 0/impact 0 |
| smart-goggles-1-armor | Smart Goggles 1 (Armor) | CC p.51 | slim, low-profile armoured clothing garment, ballistic 0/impact 0 |
| smart-goggles-2-armor | Smart Goggles 2 (Armor) | MM p.32 | slim, low-profile armoured clothing garment, ballistic 0/impact 0 |
| synth-leather-pants | Synth Leather Pants | SR3 p.284 | slim, low-profile armoured clothing garment, ballistic 0/impact 1 |
| thermo-vision-armor | Thermo Vision (Armor) | CC p.51 | slim, low-profile armoured clothing garment, ballistic 0/impact 0 |
| tracking-signal-armor | Tracking Signal (Armor) | CC p.51 | slim, low-profile armoured clothing garment, ballistic 0/impact 0 |
| tres-chic-clothing | Tres Chic Clothing | SR3 p.284 | slim, low-profile armoured clothing garment, ballistic 0/impact 0 |
| ultrasound-vision-armor | Ultrasound Vision (Armor) | CC p.51 | slim, low-profile armoured clothing garment, ballistic 0/impact 0 |
| v-island-actioneer-long-coat | V-Island "Actioneer" Long Coat | CC p.49 | slim, low-profile armoured clothing garment, ballistic 2/impact 2 |
| v-island-actioneer-shirt | V-Island "Actioneer" Shirt | CC p.49 | slim, low-profile armoured clothing garment, ballistic 2/impact 1 |
| v-island-actioneer-slacks | V-Island "Actioneer" Slacks | CC p.49 | slim, low-profile armoured clothing garment, ballistic 1/impact 1 |
| v-island-grand-dame-gown | V-Island "Grand Dame" Gown | CC p.49 | slim, low-profile armoured clothing garment, ballistic 1/impact 1 |
| v-island-sleeping-tiger-jack | V-Island "Sleeping Tiger" Jack | CC p.49 | slim, low-profile armoured clothing garment, ballistic 1/impact 1 |
| v-island-sleeping-tiger-jack8 | V-Island "Sleeping Tiger" Jack.8 | CC p.49 | slim, low-profile armoured clothing garment, ballistic 1/impact 1 |
| v-island-sleeping-tiger-shir8 | V-Island "Sleeping Tiger" Shir.8 | CC p.49 | slim, low-profile armoured clothing garment, ballistic 1/impact 1 |
| v-island-sleeping-tiger-slac | V-Island "Sleeping Tiger" Slac | CC p.49 | slim, low-profile armoured clothing garment, ballistic 1/impact 1 |
| v-island-sleeping-tiger-slac8 | V-Island "Sleeping Tiger" Slac.8 | CC p.49 | slim, low-profile armoured clothing garment, ballistic 1/impact 2 |
| victory-industrious-coverall | Victory "Industrious" Coverall | CC p.49 | medium-weight armoured clothing garment, ballistic 4/impact 2 |
| victory-industrious-hardhat | Victory "Industrious" Hardhat | CC p.49 | slim, low-profile armoured clothing garment, ballistic 0/impact 1 |
| victory-industrious-jumpsuit | Victory "Industrious" Jumpsuit | CC p.49 | slim, low-profile armoured clothing garment, ballistic 2/impact 0 |
| victory-industrious-winter | Victory "Industrious" Winter. | CC p.49 | medium-weight armoured clothing garment, ballistic 4/impact 4 |
| victory-rapid-transit-hvy-j | Victory "Rapid Transit" Hvy J. | CC p.49 | medium-weight armoured clothing garment, ballistic 2/impact 4 |
| victory-rapid-transit-lgt-j | Victory "Rapid Transit" Lgt J. | CC p.49 | slim, low-profile armoured clothing garment, ballistic 1/impact 2 |
| victory-wild-hunt-cjumpsuit | Victory "Wild Hunt" C.Jumpsuit | CC p.49 | medium-weight armoured clothing garment, ballistic 3/impact 2 |
| victory-wild-hunt-fatigues | Victory "Wild Hunt" Fatigues | CC p.49 | slim, low-profile armoured clothing garment, ballistic 2/impact 0 |
| victory-wild-hunt-hvy-armor | Victory "Wild Hunt" Hvy Armor | CC p.49 | medium-weight armoured clothing garment, ballistic 4/impact 0 |
| victory-wild-hunt-lgt-armor | Victory "Wild Hunt" Lgt Armor | CC p.49 | slim, low-profile armoured clothing garment, ballistic 1/impact 0 |
| zo-futura-blazer | Zo� "Futura" Blazer | CC p.49 | slim, low-profile armoured clothing garment, ballistic 2/impact 1 |
| zo-futura-slacks | Zo� "Futura" Slacks | CC p.49 | slim, low-profile armoured clothing garment, ballistic 1/impact 1 |
| zo-futura-sweater | Zo� "Futura" Sweater | CC p.49 | slim, low-profile armoured clothing garment, ballistic 2/impact 1 |
| zo-heritage-cultural | Zo� "Heritage" Cultural | CC p.49 | medium-weight armoured clothing garment, ballistic 4/impact 2 |
| zoe-futura-blazer | Zoe "Futura" Blazer | CC p.49 | slim, low-profile armoured clothing garment, ballistic 2/impact 1 |
| zoe-futura-slacks | Zoe "Futura" Slacks | CC p.49 | slim, low-profile armoured clothing garment, ballistic 1/impact 1 |
| zoe-futura-sweater | Zoe "Futura" Sweater | CC p.49 | slim, low-profile armoured clothing garment, ballistic 2/impact 1 |
| zoe-heritage-cultural | Zoe "Heritage" Cultural | CC p.49 | medium-weight armoured clothing garment, ballistic 4/impact 2 |

## Registering new pictures

- **Weapons:** key the PNGs (`python tools/key-art.py <pngs> styles/weapons`), then add each slug to `PICTURES` in `scripts/data/weapon-art.mjs` and credit it in `styles/weapons/CREDITS.md`. `tests/weapon-designer-shop.test.mjs` fails if `PICTURES` and `styles/weapons/*.webp` differ. Regenerate the weapon list with `node tools/weapon-art-prompts.mjs`.
- **Armour:** no mechanism yet. The designer's `pic()` calls `view.img(ref)` (the pack icon, else a type emoji), and the web build only knows `icons/armor-*.svg`. TODO 306 plans `styles/armor/<slug>.webp` plus an armour `PICTURES` set mirroring `weapon-art.mjs`, using the same `slug()` rule. Until that lands, drop keyed files in `styles/armor/` and register nothing.
