# Grand Line Reels — Player Agent

## What it does
Simulates a slot machine session for Grand Line Reels and generates a first-person emotional narrative from the perspective of Marco, a player whose experience evolves from casual curiosity to calibrated understanding across the session.

## The problem it solves
Standard slot math tools report statistics: RTP, hit frequency, dry spell length. They describe what happens but not what it feels like. This tool bridges that gap by simulating both the math outcomes and the human emotional response to those outcomes in real time.

## Input
- Starting bankroll (default $5.00)
- Number of spins (default 300)
- Optional seed for reproducible sessions
- Detail level: standard or detailed

## Output
1. Session statistics: spins played, final balance, realized RTP, biggest win, longest dry spell, bonus triggered
2. Marco's first person narrative: emotional reactions at every significant event, voice evolving across four phases
3. Emotional arc analysis: third person design observations about how the math created the emotional experience

## The four phases
- Discovery (spins 1-50): Casual fan, reacts to everything, One Piece references feel natural
- Calibration (spins 51-150): Starting to understand the rhythm, less reactive to small wins
- Grind (spins 151-300): Analytical, tracking Straw Hat scatters, patient and focused
- Resolution (spins 300+): Emotional release if bonus triggered, reflective acceptance if depleting

## Scope
Hardcoded to Grand Line Reels paytable and reel configuration. Not a generic slot simulator. The math is derived directly from the Python simulation notebook.

## How it was built
The math simulation runs entirely in JavaScript using the exact reel strips and paytable from config.json. Session events are passed to Claude claude-sonnet-4-20250514 with a detailed system prompt defining Marco's character arc and voice rules. Claude generates the narrative and arc analysis in a single API call.

## Example runs
Run with default settings three times using seeds 1, 2, and 3 to see how different session outcomes produce different emotional arcs while Marco's calibration arc remains consistent.