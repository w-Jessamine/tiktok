# Commerce Video Prompt Playbook

This project should not use a generic "make a good video" prompt for ecommerce generation.
TikTok Shop / Douyin-style product videos need prompts that bind product truth, conversion
factors, shot timing and compliance constraints together.

## Core Rhythm

Use this rhythm for scripts under 15 seconds:

1. `0-3s Hook`: show a shopper pain point, first-person scene, contrast, or detail-first curiosity.
2. `Product Reveal`: make the real product visible as early as possible.
3. `Proof / Demo`: show texture, scale, material, before-after, hands-on use, or usage steps.
4. `Payoff`: connect the product to the target audience's daily scenario.
5. `CTA`: close with an offer-safe shopping cue.

## Prompt Template

```text
You are a TikTok Shop / Douyin ecommerce short-video director.
Generate conversion-focused product video scripts, not generic brand copy.

Product:
- title: {{title}}
- category: {{category}}
- selling points: {{sellingPoints}}
- audience: {{audience}}
- scenario: {{scenario}}
- language: {{language}}

Creative goal:
{{merchantPrompt}}

Required rhythm:
0-3s hook -> product reveal -> proof/demo -> usage payoff -> CTA.

Shot requirements:
- 4-6 shots, total duration <= 15000ms.
- Each shot includes visualPrompt, cameraMotion, materialQuery, subtitle, voiceover, bgmMood.
- visualPrompt must be usable by text-to-video, image-to-video, or material-mix editing.
- materialQuery must help retrieve product assets or slices.
- first shot must work without sound.
- subtitle <= 90 characters.
- voiceover <= 220 characters.

Compliance:
- show real product appearance when assets are available.
- do not invent medical efficacy, certifications, fake reviews, fake scarcity, or competitor names.
- use visible proof instead of unsupported absolute claims.

Return strict JSON only:
{ "scripts": ScriptModel[] }
```

## Built-in Angles

- `Pain Point Rescue`: pain-point cold open, hands-on feature proof, urgent but safe CTA.
- `Scene Seeding`: first-person lifestyle scene, natural product use, routine-upgrade CTA.
- `Proof Comparison`: before-after contrast, visible comparison proof, concise offer close.
- `Trust Offer`: detail-first trust hook, packshot and material cues, calm premium CTA.

## Good Merchant Prompts

```text
Make it feel like a creator found this during a rushed morning routine. Emphasize fast absorption,
real texture, no sticky finish, and a clear live bundle CTA.
```

```text
Use a before-after drawer reset story. Start messy, show compartments, prove space saving, close
with a limited bundle cue without fake scarcity.
```

```text
Target gift buyers. Show the unboxing moment, material detail, recipient reaction, and a calm
premium CTA.
```

## Bad Prompts To Avoid

- "Make it viral" without product, audience, proof or scene.
- "Guarantee results" or "best in the market" claims.
- "Copy this competitor video exactly."
- "Use fake reviews / sold-out urgency."
