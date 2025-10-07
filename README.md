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



# page usage(how pages use each other and stuff)

index.html
Purpose: Main HTML entry point that loads the Three.js application

Uses: src/main.js as the module entry point

Integration: Provides the canvas container for WebGL rendering

src/main.js
Purpose: Application entry point and initialization

Uses:

managers/SceneManager.js

managers/GameManager.js

managers/UIManager.js

Integration: Initializes Rapier physics, creates renderer, and sets up core managers

Manager Classes
managers/SceneManager.js
Purpose: Controls scene transitions and rendering loop

Uses:

scenes/MenuScene.js

scenes/GameScene.js

scenes/OptionsScene.js

Integration: Switches between scenes, manages camera, and handles window resize

managers/GameManager.js
Purpose: Central game state management

Uses: SceneManager.js (via dependency injection)

Integration: Tracks player stats, inventory, game state, and handles game logic

managers/UIManager.js
Purpose: Manages UI element creation and cleanup

Uses: None directly (called by scenes)

Integration: Provides UI management services to all scenes

Scene Classes
scenes/MenuScene.js
Purpose: Main menu with game start and options

Uses:

GameManager.js (to start games)

SceneManager.js (for scene transitions)

Integration: Creates menu UI and handles navigation to game/options

scenes/GameScene.js
Purpose: Main gameplay scene with maze and player

Uses:

entities/Player.js

maze/MazeGenerator.js

maze/MazeRenderer.js

ui/HUD.js

utils/FogOfWar.js

Integration: Coordinates maze generation, player spawn, HUD, and fog system

scenes/OptionsScene.js
Purpose: Settings and configuration screen

Uses: SceneManager.js (to return to menu)

Integration: Provides game options interface

Entity Classes
entities/Player.js
Purpose: Player character controller with physics

Uses:

utils/InputHandler.js

utils/CameraController.js

GameManager.js

Integration: Handles movement, jumping, item usage, and camera control

Maze System
maze/MazeGenerator.js
Purpose: Procedural maze generation based on difficulty

Uses: None (pure algorithm)

Integration: Called by GameScene to create maze data

maze/MazeRenderer.js
Purpose: Renders maze geometry and physics colliders

Uses: Three.js and Rapier physics

Integration: Takes maze data and creates visual/physical maze

UI Components
ui/HUD.js
Purpose: In-game heads-up display

Uses: GameManager.js

Integration: Shows health, stamina, timer, minimap, and inventory

Utility Classes
utils/InputHandler.js
Purpose: Centralized input management

Uses: None (event listener based)

Integration: Provides input state to Player and other systems

utils/CameraController.js
Purpose: First-person camera control with mouse look

Uses: Three.js camera

Integration: Attached to Player for first-person view

utils/FogOfWar.js
Purpose: Dynamic fog system that reveals areas as player explores

Uses: Maze data and player position

Integration: Updates fog opacity based on player discovery

Data Files
package.json
Purpose: Project dependencies and scripts

Uses: Three.js, Rapier3D, Vite

Integration: Defines build system and external libraries

Integration Flow
Startup: index.html → main.js → SceneManager → MenuScene

Game Start: MenuScene → GameManager.startGame() → SceneManager → GameScene

Gameplay: GameScene coordinates:

MazeGenerator + MazeRenderer = Maze world

Player + InputHandler + CameraController = Player control

HUD + GameManager = UI and game state

FogOfWar = Visibility system

Scene Management: SceneManager handles all transitions between scenes