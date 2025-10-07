# CGV-Maze

# how to run in local host

make sure you have the following installed:

npm install --save three
npm install --save-dev vite

ensure you are in directory
\CGV-Maze

run 
npx vite 

a link to : http://localhost:5173 should appear, click on it and enjoy



#  CGV Maze — Project Overview & Documentation

##  Project Purpose
**CGV Maze** is a 3D horror-style maze game built with **Three.js** and **Rapier physics**.  
Players navigate through a procedurally generated maze while avoiding enemies, collecting items, and managing visibility via fog of war and minimap systems.

This document explains the **responsibilities of each script**, how they **link together**, and what pages/scripts power the **main gameplay features**.

---

##  Project Structure

```
CGV-Maze-1.0.0/
│
├── index.html                 # Entry point, loads Three.js canvas and starts main.js
├── package.json               # Dependencies and scripts
├── jsconfig.json              # Path configuration
│
├── src/
│   ├── main.js                # Initializes the entire game (entry script)
│   │
│   ├── entities/              # Core in-game entities
│   │   ├── Player.js
│   │   ├── Enemy.js
│   │   └── Item.js
│   │
│   ├── managers/              # Systems that control game flow
│   │   ├── GameManager.js
│   │   ├── SceneManager.js
│   │   └── UIManager.js
│   │
│   ├── maze/                  # Maze generation and rendering logic
│   │   ├── MazeGenerator.js
│   │   └── MazeRenderer.js
│   │
│   ├── scenes/                # Different "screens" or stages of the game
│   │   ├── MenuScene.js
│   │   ├── GameScene.js
│   │   └── OptionsScene.js
│   │
│   ├── ui/                    # On-screen UI components
│   │   ├── HUD.js
│   │   ├── MenuUI.js
│   │   └── MiniMap.js
│   │
│   └── utils/                 # Helper modules and tools
│       ├── AudioManager.js
│       ├── CameraController.js
│       ├── FogOfWar.js
│       └── InputHandler.js
│
└── textures/                  # Textures for the maze environment
    ├── ground_horror.jpg
    ├── wall_horror.jpg
    └── wall_normal.png
```

---

##  How the Game Flows

### **1. Entry Point: `index.html`**
- The HTML page that loads Three.js, Rapier, and `main.js`.
- Sets up the rendering canvas.
- Once loaded, it calls `main.js` to initialize the game.

---

### **2. Initialization: `main.js`**
- Serves as the **bootstrap script** for the game.
- Creates a `GameManager` instance and starts the **initial scene** (usually `MenuScene`).
- Handles basic setup like:
  - WebGL renderer
  - Physics world (via Rapier)
  - Scene switching (delegated to `SceneManager`)

**Links to:**  
- `GameManager.js` → Manages high-level game state  
- `SceneManager.js` → Controls which scene (Menu/Game/Options) is active  

---

### **3. Scene Flow**

#### a. **`MenuScene.js`**
- Displays the **main menu** (ominous opening screen).
- Uses `MenuUI.js` for layout (buttons like *Start Game* and *Options*).
- On “Start Game”, calls `SceneManager` to load `GameScene`.

**Linked files:**  
- `MenuUI.js` (UI buttons)  
- `AudioManager.js` (background music / ambient sound)

---

#### b. **`OptionsScene.js`**
- Provides settings such as difficulty, sound, and possibly controls.
- Returns to `MenuScene` on cancel/back.

**Linked files:**  
- `UIManager.js` (menu transitions)
- `AudioManager.js` (adjusts volume or sound effects)

---

#### c. **`GameScene.js`**
- The **core gameplay scene**.
- Responsible for:
  - Creating and updating the player (`Player.js`)
  - Spawning enemies (`Enemy.js`)
  - Rendering the maze (`MazeGenerator.js` + `MazeRenderer.js`)
  - Displaying HUD elements (`HUD.js`, `MiniMap.js`)
  - Updating game logic via `GameManager`

**Linked files:**  
- `Player.js`, `Enemy.js`, `Item.js` (entities)
- `MazeGenerator.js`, `MazeRenderer.js` (maze structure)
- `FogOfWar.js`, `CameraController.js`, `InputHandler.js` (gameplay systems)
- `HUD.js`, `MiniMap.js` (UI)
- `AudioManager.js` (ambient + sound effects)

---

##  Core Managers

| File | Responsibility | Links To |
|------|----------------|----------|
| **GameManager.js** | Central controller. Manages player state, score, health, game events, and win/lose conditions. | All entities + `UIManager` |
| **SceneManager.js** | Handles scene transitions (menu → game → options → etc.) | `MenuScene.js`, `GameScene.js`, `OptionsScene.js` |
| **UIManager.js** | Controls UI overlays and dynamic updates. | `HUD.js`, `MenuUI.js` |

---

##  Entities

| File | Description |
|------|--------------|
| **Player.js** | Defines player object, movement (via `InputHandler`), collision, and interaction with maze and items. |
| **Enemy.js** | Defines AI enemies that chase or patrol the maze, possibly reacting to player position or noise. |
| **Item.js** | Defines collectible objects (keys, health, or power-ups) placed within the maze. |

---

##  Maze System

| File | Description |
|------|--------------|
| **MazeGenerator.js** | Generates the maze grid procedurally (randomized algorithm). |
| **MazeRenderer.js** | Converts generated maze data into 3D meshes (walls, floors, obstacles) using textures from `/textures`. |

---

##  Utilities

| File | Description |
|------|--------------|
| **AudioManager.js** | Loads and plays sound effects and ambient tracks. |
| **CameraController.js** | Keeps camera centered on player, smooth follow behavior. |
| **FogOfWar.js** | Limits player visibility (creepy effect, hides parts of maze). |
| **InputHandler.js** | Processes keyboard/mouse input and sends commands to `Player.js`. |

---

##  UI Components

| File | Description |
|------|--------------|
| **HUD.js** | Displays in-game UI (health, score, collected items). |
| **MenuUI.js** | Controls the main menu UI layout and interactions. |
| **MiniMap.js** | Provides a top-down mini-map of explored areas. |

---

##  Main Features & Page Flow

| Feature | Description | Page / Script Flow |
|----------|--------------|--------------------|
| **Opening Menu** | Main title screen with “Start Game” and “Options” | `index.html` → `main.js` → `MenuScene.js` → `MenuUI.js` |
| **Options Menu** | Adjust game settings (e.g. difficulty, sound) | `MenuScene.js` → `OptionsScene.js` → `UIManager.js` |
| **Game Start** | Launches the maze gameplay | `MenuScene.js` → `GameScene.js` → `MazeGenerator.js` + `MazeRenderer.js` |
| **Player Movement** | Keyboard control, physics integration | `GameScene.js` → `Player.js` → `InputHandler.js` |
| **Enemies** | AI chasing or patrolling | `GameScene.js` → `Enemy.js` |
| **Fog of War** | Hides unexplored maze sections | `GameScene.js` → `FogOfWar.js` |
| **Mini-map** | Displays top-down exploration view | `GameScene.js` → `MiniMap.js` |
| **HUD / Score Tracking** | Player health, keys, or timer | `GameScene.js` → `HUD.js` |
| **Scene Transitions** | Moving between menus and gameplay | `GameManager.js` → `SceneManager.js` |

---

##  Summary of Flow

```
index.html
   ↓
main.js
   ↓
SceneManager → MenuScene
   ↓ (on Start Game)
SceneManager → GameScene
   ↓ (on Options)
SceneManager → OptionsScene
   ↑ (on Back)
SceneManager → MenuScene
```
