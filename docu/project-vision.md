# Ballerburg 3D - Project Vision

## Overview

**Ballerburg 3D** is a modern web-based recreation of the classic Atari ST artillery combat game "Ballerburg" (1985/1989) created by Eckhard Kruse. The project aims to bring this beloved German gaming classic to contemporary browsers while preserving its strategic depth and adding modern 3D visualization.

---

## Historical Context

### The Original Ballerburg (1985-1989)

Ballerburg was one of the most popular Atari ST games in German-speaking countries. Originally written in Lattice C for the Motorola 68000 processor, it featured:

- **Turn-based artillery combat** between two medieval castles
- **Physics simulation** with wind effects and trajectory calculation
- **Economic management** including taxes, population, and resource trading
- **Strategic depth** through castle fortification, cannon purchases, and market dynamics
- **AI opponents** with 8 distinct personalities and strategies
- **Customizable castles** via data files

The game's source code was released by Eckhard Kruse to registered users, making it a pioneering example of open-source gaming in the late 1980s.

---

## Project Intent

### Primary Goals

1. **Faithful Recreation**: Preserve the core gameplay mechanics that made the original compelling
2. **Modern Accessibility**: Browser-based HTML5/WebGL implementation requiring no installation
3. **Visual Enhancement**: 3D graphics via Three.js while maintaining aesthetic coherence
4. **Cross-Platform Play**: Desktop, tablet, and mobile support through responsive design
5. **Educational Value**: Demonstrate physics simulation, game architecture, and classic game design

### Secondary Goals

1. **Preserve Gaming History**: Document and showcase this important piece of German gaming heritage
2. **Modular Architecture**: Enable future extensibility for community contributions
3. **Performance**: Smooth 60fps gameplay on modest hardware

---

## Current Implementation Status

### Implemented Features

| Feature | Status | Notes |
|---------|--------|-------|
| 3D Rendering (Three.js) | Complete | Monochrome aesthetic |
| Two-Player Local | Complete | Turn-based |
| Castle Structures | Complete | Multi-part destructible |
| Cannon Mechanics | Complete | Angle, direction, power |
| Projectile Physics | Complete | Gravity, wind |
| Terrain Destruction | Complete | Crater formation |
| 5 Weapon Types | Complete | Varying damage/radius |
| Health System | Complete | Visual health bars |
| Wind Effects | Complete | Random per turn |
| Turn Timer | Complete | 45-second limit |
| Victory Detection | Complete | Castle destruction |
| Mobile Controls | Complete | Touch-friendly |

### Not Yet Implemented (From Original)

| Feature | Priority | Complexity |
|---------|----------|------------|
| Economic System | High | Medium |
| Market/Purchasing | High | Medium |
| Population Management | Medium | Low |
| AI Opponents | High | High |
| Multiple Castle Designs | Medium | Low |
| Fortification Building | Low | Medium |
| Resource Chambers (visual) | Low | Low |
| Score/Statistics Table | Low | Low |
| King/Throne Room | Medium | Medium |
| Mining Towers (Fördertürme) | Low | Medium |
| Sound/Music | Medium | Low |

---

## Technical Architecture

### Current Stack

```
┌─────────────────────────────────────────────┐
│              Browser (HTML5)                │
├─────────────────────────────────────────────┤
│         Three.js (WebGL Rendering)          │
├─────────────────────────────────────────────┤
│            Game Engine (app.js)             │
│  ┌─────────┬─────────┬──────────┬────────┐  │
│  │BallerBurg│ Castle  │ Cannon   │Projectile│
│  │(Main)   │(Entity) │(Entity)  │(Physics)│  │
│  └─────────┴─────────┴──────────┴────────┘  │
├─────────────────────────────────────────────┤
│              DOM UI Layer                   │
│  (Controls, Health Bars, Weapon Selection)  │
└─────────────────────────────────────────────┘
```

### Class Structure

```
BallerBurg (728 lines) - Main game controller
├── Scene Management (Three.js setup)
├── Game State (players, turns, victory)
├── Physics Engine (gravity, wind, collision)
├── UI System (controls, displays)
└── Event Handlers (keyboard, mouse, touch)

Castle (119 lines) - Castle structure
├── Multi-part construction (keep, towers, walls, roofs)
├── Health/damage system
└── Visual destruction

Cannon (27 lines) - Cannon entity
├── Visual representation
└── Position tracking

Projectile (35 lines) - Projectile physics
├── Velocity/position updates
├── Wind application
└── Collision detection
```

### Key Constants

| Parameter | Value | Purpose |
|-----------|-------|---------|
| TERRAIN_WIDTH | 120 | World units |
| TERRAIN_DEPTH | 20 | World units |
| TERRAIN_HEIGHT | 40 | Max elevation |
| GRAVITY | -9.8 | Physics constant |
| Turn Timer | 45s | Per-turn limit |
| Max Power | 35 | Shot strength |
| Angle Range | 10-80° | Firing angle |
| Direction Range | ±45° | Left/right aim |

---

## Optimal Design Implementation Goals

### Phase 1: Core Gameplay Polish

1. **Refine Physics**
   - Improve collision detection accuracy
   - Add trajectory preview visualization
   - Tune wind effects for gameplay balance

2. **Enhanced Visuals**
   - Castle damage states (visual degradation)
   - Improved explosion effects
   - Camera smoothing and tracking

3. **UI/UX Improvements**
   - Clearer turn indication
   - Better mobile control layout
   - Accessibility considerations

### Phase 2: Economic System

Based on the original game mechanics from ANLEITNG.TXT:

1. **Resource Management**
   ```
   Resources:
   - Gold (Geld): Currency for purchases
   - Powder (Pulver): Required for firing (5-20 units per shot)
   - Cannonballs (Kugeln): Ammunition stock
   - Population (Volk): Tax revenue source
   ```

2. **Market System**
   ```
   Purchasable Items:
   - Cannons (when positions available)
   - Powder supplies
   - Cannonballs
   - Wind flag (strategic info)
   - Mining towers (passive income: 40-70 gold/turn)
   - Wall repairs
   - Fortification stones (20 stones for building)
   ```

3. **Tax System**
   - Adjustable tax rate affecting:
     - Revenue generation
     - Population growth/decline
     - Emigration at high rates
   - Population generates tax income
   - Low taxes attract immigrants

### Phase 3: AI Opponents

Implement the 8 original AI personalities:

| Name | Accuracy | Strategy |
|------|----------|----------|
| Tölpel | 1 | Random targeting |
| Dummel | 2 | Gold > Powder > King |
| Brubbel | 2 | Gold > Cannons > King |
| Wusel | 3 | Equal priority all targets |
| Brösel | 3 | Cannons > King |
| Toffel | 3 | Mining towers > Cannons > King |
| Rüpel | 4 | King only (assassin) |

AI Implementation Approach:
- State machine for decision-making
- Accuracy affects targeting precision (noise)
- Priority system for target selection
- Economic decisions (purchases, taxes)

### Phase 4: Extended Features

1. **Multiple Castle Types**
   - 6+ castle configurations with different stats
   - Custom castle file format (like BALLER.DAT)
   - Balance: More cannons = less gold, etc.

2. **Victory Conditions**
   - King hit (primary)
   - Capitulation (no cannons, no money, no hope)
   - Population extinction
   - Round limit (optional, victory by total value)

3. **Options System**
   - Enable/disable fortification building
   - Maximum round limit
   - Auto-capitulation toggle

---

## Practical Real-World Constraints

### Technical Constraints

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| Browser Performance | Complex scenes slow on mobile | LOD, simplified physics |
| WebGL Compatibility | Some older devices unsupported | Canvas 2D fallback |
| Memory Limits | Large textures problematic | Procedural generation |
| Touch Precision | Mobile aiming difficult | Larger touch targets, zoom |
| Network (future) | Latency for multiplayer | Turn-based mitigates |

### Development Constraints

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| Single JS File | Limited modularity | Refactor to ES6 modules |
| No Build System | No bundling/minification | Consider Vite/Rollup |
| No Type Safety | Runtime errors | Consider TypeScript |
| No Testing | Regression risk | Add Jest/Vitest |

### User Experience Constraints

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| Learning Curve | Physics-based aiming is hard | Tutorial/practice mode |
| Game Length | Matches can be long | Quick play mode |
| Two Players Required | Need local opponent | AI opponents priority |
| German Heritage | Non-German speakers | Localization support |

### Design Philosophy Constraints

| Principle | Rationale |
|-----------|-----------|
| Preserve Core Feel | The strategic depth is the game's soul |
| No Pay-to-Win | Fair play for all players |
| Offline-First | Should work without internet |
| Accessible | Keyboard, mouse, and touch support |
| Performant | 60fps on 5-year-old hardware |

---

## File Structure (Proposed)

```
baller3D/
├── docu/
│   └── project-vision.md      # This document
├── src/
│   ├── core/
│   │   ├── Game.js            # Main game controller
│   │   ├── Physics.js         # Physics engine
│   │   └── AI.js              # AI system
│   ├── entities/
│   │   ├── Castle.js          # Castle class
│   │   ├── Cannon.js          # Cannon class
│   │   └── Projectile.js      # Projectile class
│   ├── systems/
│   │   ├── Economy.js         # Economic system
│   │   ├── Market.js          # Market/trading
│   │   └── Population.js      # Population management
│   ├── ui/
│   │   ├── Controls.js        # Input handling
│   │   ├── HUD.js             # Heads-up display
│   │   └── Menu.js            # Menus/dialogs
│   └── utils/
│       └── helpers.js         # Utility functions
├── assets/
│   ├── castles/               # Castle configurations
│   └── sounds/                # Audio (future)
├── baller_sources/            # Original Atari ST reference
├── index.html                 # Entry point
├── app.js                     # Current monolithic (legacy)
└── ballerburg3D-remixed.html  # Current implementation
```

---

## Success Metrics

### Gameplay Quality

- [ ] Players can complete full matches without bugs
- [ ] Physics feels fair and intuitive
- [ ] AI provides meaningful challenge at all levels
- [ ] Mobile experience matches desktop quality

### Technical Quality

- [ ] 60fps on mid-range devices
- [ ] < 3 second initial load time
- [ ] Zero critical bugs in production
- [ ] Cross-browser compatibility (Chrome, Firefox, Safari, Edge)

### User Engagement

- [ ] Average match completion > 80%
- [ ] Return player rate > 30%
- [ ] Positive qualitative feedback

---

## Summary

Ballerburg 3D aims to be the definitive modern version of this classic artillery game. By faithfully implementing the original's strategic depth while leveraging modern web technologies, we can introduce a new generation to this piece of gaming history while providing nostalgic players a fresh way to experience a beloved classic.

The monochrome Three.js aesthetic pays homage to the original Atari ST's high-resolution mode while the browser-based approach ensures universal accessibility. Future development should prioritize the economic system and AI opponents, as these represent the original game's most significant strategic elements beyond basic artillery mechanics.

---

*Last Updated: 2025-11-22*
*Based on analysis of original Atari ST source code (BALLER1.C, BALLER2.C), game manual (ANLEITNG.TXT), and current Three.js implementation (app.js)*
