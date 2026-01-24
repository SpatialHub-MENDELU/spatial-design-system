import "aframe";
import * as AFRAME from "aframe";

import "../../components/autoXr.js";
import "../../components/ar/hands.js";
import "../../primitives/ar-button.js";
import "../../components/finger-touch.js";
import "../../primitives/ar-button.js";
import "../../components/controllers.js";
import "../../components/stretchable.js";
import "../../components/hands-hoverable.js";

const animals = [
  {
    id: "rabbit",
    scale: "0.0009 0.0009 0.0009",
    rotation: "-90 0 90",
    spacing: 0.2,
    position: "0 1.2 -0.7",
    hint: "This little rabbit wants to play on the grass. Make enough space for him to play!",
  },
  {
    id: "cat",
    scale: "0.01 0.01 0.01",
    rotation: "0 0 0",
    spacing: 0.2,
    position: "0 1.2 -0.7",
    hint: "This cat is very curious. She wants to see from above. Use 2 pieces to build nice scratching posts.",
  },
  {
    id: "dog",
    scale: "0.5 0.5 0.5",
    rotation: "0 0 0",
    spacing: 0.3,
    position: "0 1.2 -0.7",
    hint: "This puppy likes to lay on couch. Use 2 pieces to build nice red couch.",
  },
  {
    id: "pig",
    scale: "0.3 0.3 0.3",
    rotation: "0 0 0",
    spacing: 0.3,
    position: "0 1.2 -0.7",
    hint: "This pig is very lazy. He wants to lay in his shed. Use 3 pieces to build nice shed.",
  },
  {
    id: "whale",
    scale: "0.002 0.002 0.002",
    rotation: "0 90 0",
    spacing: 0.4,
    position: "0 1 -1",
    hint: "This whale likes to swim in deep ocean.",
  },
];

let nextAnimalIndex = 0;
let spawnCount = 0;
const placedAnimals = new Set(); // Track which animals have been correctly placed
let currentUnplacedAnimal = null; // Track the current animal that hasn't been placed yet

function spawnAnimal() {
  const scene = document.querySelector("a-scene");
  if (!scene) return;

  // Check if all animals have been spawned
  if (spawnCount >= animals.length) {
    return;
  }

  const animal = animals[nextAnimalIndex % animals.length];
  nextAnimalIndex++;

  const el = document.createElement("a-entity");
  const spacing = animal.spacing;
  const xPosition = (spawnCount + 1) * spacing;
  spawnCount++;

  el.setAttribute("gltf-model", `#${animal.id}`);
  el.setAttribute("scale", animal.scale);
  el.setAttribute("position", animal.position);
  el.setAttribute("rotation", animal.rotation);
  el.setAttribute("grabbable", "");
  el.setAttribute("data-animal-id", animal.id); // Store animal ID for detection
  el.classList.add("animal");

  scene.appendChild(el);

  // Track this as the current unplaced animal
  currentUnplacedAnimal = { el, animalId: animal.id, animal };

  // Show hint for this animal
  showHint(animal.hint);

  // Start checking if animal is in correct box
  checkAnimalPlacement(el, animal.id);

  // Disable addAnimalButton and enable submitButton when all animals have been spawned
  if (spawnCount >= animals.length) {
    disableAddAnimalButton();
    enableSubmitButton();
  }
}

function disableAddAnimalButton() {
  const btn = document.querySelector("#addAnimalButton");
  if (btn) {
    // Remove finger-touch to make it non-interactive
    btn.removeAttribute("finger-touch");
    // Make it look disabled (keep text unchanged)
    btn.setAttribute("opacity", "0.5");
  }
}

function disableSubmitButton() {
  const btn = document.querySelector("#submitButton");
  if (btn) {
    // Make it look disabled (keep text unchanged)
    btn.setAttribute("opacity", "0.5");
  }
}

function enableSubmitButton() {
  const btn = document.querySelector("#submitButton");
  if (btn) {
    // Make it look enabled
    btn.setAttribute("opacity", "1");
  }
}

function showHint(hintText) {
  const scene = document.querySelector("a-scene");
  if (!scene) return;

  // Remove existing hint if any
  hideHint();

  // Create hint panel container entity
  const hintPanel = document.createElement("a-entity");
  hintPanel.setAttribute("id", "animal-hint");
  hintPanel.setAttribute("position", "0 2.1 -2");
  hintPanel.setAttribute("visible", "true");

  // Background box
  const bgBox = document.createElement("a-box");
  bgBox.setAttribute("width", "2.2");
  bgBox.setAttribute("height", "0.4");
  bgBox.setAttribute("depth", "0.1");
  bgBox.setAttribute("color", "#ffffff");
  bgBox.setAttribute("opacity", "0.95");
  bgBox.setAttribute("position", "0 0 0");
  hintPanel.appendChild(bgBox);

  // Create hint text entity - positioned on top of background
  const hintEl = document.createElement("a-text");
  hintEl.setAttribute("value", hintText);
  hintEl.setAttribute("align", "center");
  hintEl.setAttribute("position", "0 0 0.1");
  hintEl.setAttribute("scale", "0.25 0.25 0.25");
  hintEl.setAttribute("color", "black");
  hintEl.setAttribute("width", "8");
  hintPanel.appendChild(hintEl);

  scene.appendChild(hintPanel);
}

function hideHint() {
  const existingHint = document.querySelector("#animal-hint");
  if (existingHint && existingHint.parentElement) {
    existingHint.parentElement.removeChild(existingHint);
  }
}

function checkAnimalPlacement(animalEl, animalId) {
  const boxEls = document.querySelectorAll(`[data-box-for="${animalId}"]`);
  if (!boxEls || boxEls.length === 0) return;

  // Listen for grab end to check placement
  animalEl.addEventListener("grabended", () => {
    setTimeout(() => {
      // Check all boxes for this animal
      for (const boxEl of boxEls) {
        checkIfInBox(animalEl, boxEl, animalId);
        if (placedAnimals.has(animalId)) break; // Stop if already placed
      }
    }, 100);
  });

  // Also check periodically
  const checkInterval = setInterval(() => {
    if (placedAnimals.has(animalId)) {
      clearInterval(checkInterval);
      return;
    }
    // Check all boxes for this animal
    for (const boxEl of boxEls) {
      checkIfInBox(animalEl, boxEl, animalId);
      if (placedAnimals.has(animalId)) break; // Stop if already placed
    }
  }, 500);
}

function checkIfInBox(animalEl, boxEl, animalId) {
  if (placedAnimals.has(animalId)) return; // Already placed

  // Use world positions
  const animalWorldPos = new AFRAME.THREE.Vector3();
  const boxWorldPos = new AFRAME.THREE.Vector3();
  animalEl.object3D.getWorldPosition(animalWorldPos);
  boxEl.object3D.getWorldPosition(boxWorldPos);

  // Get box dimensions from geometry component or attributes
  const geometry = boxEl.getAttribute("geometry");
  const width = geometry?.width || boxEl.getAttribute("width") || 0.4;
  const height = geometry?.height || boxEl.getAttribute("height") || 0.4;
  const depth = geometry?.depth || boxEl.getAttribute("depth") || 0.4;

  // Account for box scale
  const boxScale = boxEl.object3D.scale;
  const scaledWidth = width * boxScale.x;
  const scaledHeight = height * boxScale.y;
  const scaledDepth = depth * boxScale.z;

  // Check if animal is within box bounds
  const halfWidth = scaledWidth / 2;
  const halfHeight = scaledHeight / 2;
  const halfDepth = scaledDepth / 2;

  const inX = Math.abs(animalWorldPos.x - boxWorldPos.x) < halfWidth;
  const inY = Math.abs(animalWorldPos.y - boxWorldPos.y) < halfHeight;
  const inZ = Math.abs(animalWorldPos.z - boxWorldPos.z) < halfDepth;

  if (inX && inY && inZ) {
    placedAnimals.add(animalId);
    showSuccessMessage(animalId);

    // Clear current unplaced animal and hide hint
    if (currentUnplacedAnimal && currentUnplacedAnimal.animalId === animalId) {
      currentUnplacedAnimal = null;
      hideHint();
    }
  }
}

function showSuccessMessage(animalId) {
  const scene = document.querySelector("a-scene");
  if (!scene) return;

  // Create success text entity
  const successEl = document.createElement("a-text");
  successEl.setAttribute(
    "value",
    `${animalId.toUpperCase()} placed correctly!`
  );
  successEl.setAttribute("align", "center");
  successEl.setAttribute("position", "0 2 -1.5");
  successEl.setAttribute("scale", "0.3 0.3 0.3");
  successEl.setAttribute("color", "rgb(33, 179, 52)");
  successEl.setAttribute("id", `success-${animalId}`);
  scene.appendChild(successEl);

  // Remove after 3 seconds
  setTimeout(() => {
    if (successEl.parentElement) {
      successEl.parentElement.removeChild(successEl);
    }
  }, 3000);
}

function checkAnimalPlacementForSubmit(animalEl, boxEl) {
  // Update world matrices
  animalEl.object3D.updateMatrixWorld(true);
  boxEl.object3D.updateMatrixWorld(true);

  // Get bounding boxes in world space
  const animalBox = new AFRAME.THREE.Box3();
  animalBox.setFromObject(animalEl.object3D);

  const boxBox = new AFRAME.THREE.Box3();
  boxBox.setFromObject(boxEl.object3D);

  // Check if bounding boxes intersect (collide/touch)
  return animalBox.intersectsBox(boxBox);
}

function checkAllAnimalsAndShowResults() {
  const scene = document.querySelector("a-scene");
  if (!scene) return;

  const results = [];
  const allAnimalIds = ["fish", ...animals.map((a) => a.id)];

  // Check each animal
  for (const animalId of allAnimalIds) {
    const animalEl = document.querySelector(`[data-animal-id="${animalId}"]`);
    if (!animalEl) continue;

    const boxEls = document.querySelectorAll(`[data-box-for="${animalId}"]`);
    if (!boxEls || boxEls.length === 0) {
      results.push({ animalId, placed: false });
      continue;
    }

    let isPlaced = false;
    for (const boxEl of boxEls) {
      if (checkAnimalPlacementForSubmit(animalEl, boxEl)) {
        isPlaced = true;
        break;
      }
    }
    results.push({ animalId, placed: isPlaced });
  }

  // Show results panel
  showResultsPanel(results);
}

function showResultsPanel(results) {
  const scene = document.querySelector("a-scene");
  if (!scene) return;

  // Remove existing results panel if any
  hideResultsPanel();

  const correctCount = results.filter((r) => r.placed).length;
  const totalCount = results.length;

  // Create results text
  let resultsText = `RESULTS\n\n`;
  resultsText += `Score: ${correctCount}/${totalCount}\n\n`;

  results.forEach((result) => {
    const status = result.placed ? "✓" : "✗";
    const animalName = result.animalId.replace(/_/g, " ").toUpperCase();
    resultsText += `${status} ${animalName}\n`;
  });

  // Create results panel entity
  const resultsPanel = document.createElement("a-entity");
  resultsPanel.setAttribute("id", "resultsPanel");
  resultsPanel.setAttribute("position", "0 2 -1.5");
  resultsPanel.setAttribute("visible", "true");

  // Background box
  const bgBox = document.createElement("a-box");
  bgBox.setAttribute("width", "2.5");
  bgBox.setAttribute("height", "2");
  bgBox.setAttribute("depth", "0.1");
  bgBox.setAttribute("color", "#ffffff");
  bgBox.setAttribute("opacity", "0.95");
  bgBox.setAttribute("position", "0 0 0");
  resultsPanel.appendChild(bgBox);

  // Title text
  const titleText = document.createElement("a-text");
  titleText.setAttribute("value", "RESULTS");
  titleText.setAttribute("align", "center");
  titleText.setAttribute("position", "0 0.7 0.1");
  titleText.setAttribute("scale", "0.2 0.2 0.2");
  titleText.setAttribute("color", "black");
  titleText.setAttribute("font-weight", "bold");
  resultsPanel.appendChild(titleText);

  // Score text
  const scoreText = document.createElement("a-text");
  const scoreColor =
    correctCount === totalCount ? "rgb(33, 179, 52)" : "rgb(200, 50, 50)";
  scoreText.setAttribute("value", `Score: ${correctCount}/${totalCount}`);
  scoreText.setAttribute("align", "center");
  scoreText.setAttribute("position", "0 0.4 0.1");
  scoreText.setAttribute("scale", "0.18 0.18 0.18");
  scoreText.setAttribute("color", scoreColor);
  resultsPanel.appendChild(scoreText);

  // Results text - only show successfully placed animals
  const resultsTextEl = document.createElement("a-text");
  let detailsText = "";
  const placedResults = results.filter((result) => result.placed);

  if (placedResults.length === 0) {
    detailsText = "No animals placed correctly yet.";
  } else {
    placedResults.forEach((result) => {
      const animalName = result.animalId.replace(/_/g, " ").toUpperCase();
      detailsText += `✓ ${animalName}\n`;
    });
  }

  resultsTextEl.setAttribute("value", detailsText);
  resultsTextEl.setAttribute("align", "center");
  resultsTextEl.setAttribute("position", "0 -0.1 0.1");
  resultsTextEl.setAttribute("scale", "0.12 0.12 0.12");
  resultsTextEl.setAttribute("color", "black");
  resultsTextEl.setAttribute("width", "10");
  resultsPanel.appendChild(resultsTextEl);

  scene.appendChild(resultsPanel);
}

function hideResultsPanel() {
  const existingPanel = document.querySelector("#resultsPanel");
  if (existingPanel && existingPanel.parentElement) {
    existingPanel.parentElement.removeChild(existingPanel);
  }
}

function showInstructionPanel() {
  const scene = document.querySelector("a-scene");
  if (!scene) return;

  // Create instruction panel entity
  const instructionPanel = document.createElement("a-entity");
  instructionPanel.setAttribute("id", "instructionPanel");
  instructionPanel.setAttribute("position", "0 2 -1.5");
  instructionPanel.setAttribute("visible", "true");

  // Background box
  const bgBox = document.createElement("a-box");
  bgBox.setAttribute("width", "2.8");
  bgBox.setAttribute("height", "3.2");
  bgBox.setAttribute("depth", "0.1");
  bgBox.setAttribute("color", "#ffffff");
  bgBox.setAttribute("opacity", "0.95");
  bgBox.setAttribute("position", "0 0 0");
  instructionPanel.appendChild(bgBox);

  // Title text
  const titleText = document.createElement("a-text");
  titleText.setAttribute("value", "INSTRUCTIONS");
  titleText.setAttribute("align", "center");
  titleText.setAttribute("position", "0 1.3 0.1");
  titleText.setAttribute("scale", "0.2 0.2 0.2");
  titleText.setAttribute("color", "black");
  titleText.setAttribute("font-weight", "bold");
  instructionPanel.appendChild(titleText);

  // Instruction text
  const instructionText = document.createElement("a-text");
  instructionText.setAttribute(
    "value",
    "Welcome to the demo!\n\nThis demo showcases components using hand gestures. Your task is to add animals to the scene and place them into their correct environments - such as water for fishes, or a comfy sofa for a dog.\n\nAs it gets harder, you'll need to use more materials for their comfort. Think twice before you build it. You can always open Help to see what you should use. After you are done, press Submit to proceed to results.\n\nYour goal is to test new components. You should be able to move materials to free space and stretch them to match the size and shape you need. Some materials you can stretch along specific axes."
  );
  instructionText.setAttribute("align", "center");
  instructionText.setAttribute("position", "0 0.1 0.1");
  instructionText.setAttribute("scale", "0.11 0.11 0.11");
  instructionText.setAttribute("color", "black");
  instructionText.setAttribute("width", "12");
  instructionText.setAttribute("wrap-count", "35");
  instructionText.setAttribute("id", "instructionText");
  instructionPanel.appendChild(instructionText);

  // Continue button
  const continueButton = document.createElement("a-ar-button");
  continueButton.setAttribute("id", "continueButton");
  continueButton.setAttribute("position", "0 -1 0.1");
  continueButton.setAttribute("size", "small");
  continueButton.setAttribute("content", "Continue");
  continueButton.setAttribute("finger-touch", "");
  instructionPanel.appendChild(continueButton);

  scene.appendChild(instructionPanel);
}

function hideInstructionPanel() {
  const instructionPanel = document.querySelector("#instructionPanel");
  if (instructionPanel && instructionPanel.parentElement) {
    instructionPanel.parentElement.removeChild(instructionPanel);
  }
}

function showScene() {
  const sceneContent = document.querySelector("#sceneContent");
  if (sceneContent) {
    sceneContent.setAttribute("visible", "true");
  }
}

function hideScene() {
  const sceneContent = document.querySelector("#sceneContent");
  if (sceneContent) {
    sceneContent.setAttribute("visible", "false");
  }
}

document.querySelector("#app").innerHTML = `
<a-scene auto-xr="autoEnter: true;">
    <a-assets>
        <a-asset-item id="cat" src="../models/Kitten.glb"></a-asset-item>
        <a-asset-item id="fish" src="../models/Blowfish.glb"></a-asset-item>
        <a-asset-item id="rabbit" src="../models/Rabbit.glb"></a-asset-item>
        <a-asset-item id="dog" src="../models/Corgi.glb"></a-asset-item>
        <a-asset-item id="whale" src="../models/Killer Whale.glb"></a-asset-item>
        <a-asset-item id="pig" src="../models/Piggy bank.glb"></a-asset-item>

        <img id="carpet" src="../textures/Carpet001.jpg">
        <img id="grass" src="../textures/Grass001.jpg">
        <img id="roof" src="../textures/RoofingTiles008.jpg">
        <img id="wood" src="../textures/Wood062.jpg">
        <img id="textile" src="../textures/Fabric006.jpg">
    </a-assets>

    <a-entity id="rig" hands></a-entity>

    <!-- Scene content container - initially hidden -->
    <a-entity id="sceneContent" visible="true">

    <!-- Water Areas Sign -->
    <a-entity position="-1 1.5 0.8">
        <a-text
            value="Water areas"
            align="center"
            position="0 0 0"
            scale="0.4 0.4 0.4"
            rotation="0 90 0"
            color="rgb(71, 134, 25)"
            >
        </a-text>
    </a-entity>

    <!-- Indoor materials sign -->
    <a-entity position="1 1.5 0.8">
        <a-text
            value="Indoor materials"
            align="center"
            position="0 0 0"
            rotation="0 -90 0"
            scale="0.4 0.4 0.4"
            color="rgb(71, 134, 25)"
            >
        </a-text>
    </a-entity>

    <!-- Outdoor materials sign -->
    <a-entity position="-0.8 1.3 0.3">
        <a-text
            value="Outdoor materials"
            align="center"
            position="0 0 0"
            rotation="0 90 0"
            scale="0.4 0.4 0.4"
            color="rgb(71, 134, 25)"
            >
        </a-text>
    </a-entity>

    <!-- Fish - initial animal -->
        <a-entity gltf-model="#fish" 
              position="0 1.2 -0.7" 
              scale="0.02 0.02 0.02"
              grabbable
              data-animal-id="fish"
              class="animal"></a-entity>

    <!-- Buttons group -->
    <a-entity position="-0 1.5 -0.7">
        <a-ar-button
            id="submitButton"
            position="-0.8 0 0"
            size="small"
            content="Submit"
            finger-touch
            opacity="0.5">
        </a-ar-button>

        <a-ar-button
            id="addAnimalButton"
            position="0 0 0"
            size="small"
            content="Add animal"
            finger-touch>
        </a-ar-button>

        <a-ar-button
            id="helpButton"
            position="0.8 0 0"
            size="small"
            content="Help"
            primary="rgb(162, 162, 162)"
            finger-touch>
        </a-ar-button>
    </a-entity>

    <!-- Help Panel -->
    <a-entity id="helpPanel" visible="false" position="0 2 -1.5">
        <a-box
            width="2"
            height="1.5"
            depth="0.1"
            color="#ffffff"
            opacity="0.9"
            position="0 0 0">
        </a-box>
        <a-text
            value="HOW TO PLAY"
            align="center"
            position="0 0.6 0.1"
            scale="0.2 0.2 0.2"
            color="black"
            font-weight="bold">
        </a-text>
        <a-text
            value="1. Click 'Add animal' to spawn an animal and place it in the correct box\n2. To move objects, pinch them with your fingers in the middle of the object\n3. To stretch objects, pinch them with your fingers at the edges of the object\n4. Make sure animals are touching the ground\n5. Submit and get results when done!"
            align="center"
            position="0 0.1 0.1"
            scale="0.12 0.12 0.12"
            color="black"
            width="8"
            wrap-count="30">
        </a-text>
    </a-entity>

    <!-- Users can select which one to grab/stretch -->
    <a-box data-box-for="fish"
           position="-0.8 1.2 0.8"
           depth="0.2" height="0.2" width="0.2"
           material="color: rgb(120, 231, 241)"
           opacity="0.5"
           grabbable stretchable="mode: scale" hands-hoverable></a-box>

    <a-box data-box-for="whale"
           position="-1 1 0.8"
           depth="0.7" height="0.4" width="0.4"
           material="color: rgb(39, 57, 224)"
           opacity="0.5"
           grabbable stretchable hands-hoverable></a-box>

    <!-- Cat scratching posts - one longer (taller) and one flatter -->
    <a-box data-box-for="cat"
           position="1 0.8 1"
           depth="0.1" height="0.6" width="0.2"
           material="src: #carpet"
           grabbable stretchable="dimensionAxes: x, y"
            hands-hoverable></a-box>

    <a-box data-box-for="cat"
           position="1 1.2 1"
           depth="0.3" height="0.03" width="0.3"
           material="src: #carpet"
           grabbable stretchable="dimensionAxes: x, z" hands-hoverable></a-box>

    <!-- Corgi couch - 2 pieces -->
    <a-box data-box-for="dog"
           position="1 0.8 0.5"
           depth="0.4" height="0.4" width="0.4"
           material="src: #textile"
           grabbable stretchable hands-hoverable></a-box>
    <a-box data-box-for="dog"
           position="1 0.9 0.7"
           depth="0.4" height="0.4" width="0.4"
           material="src: #textile"
           grabbable stretchable hands-hoverable></a-box>

    <!-- Rabbit grass - 1 piece -->
    <a-box data-box-for="rabbit"
           position="-0.7 1.1 0.2"
           depth="0.2" height="0.025" width="0.2"
           material="src: #grass"
           grabbable stretchable="dimensionAxes: x, z" hands-hoverable></a-box>

    <!-- Pig shed - 3 pieces (2 roof, 1 wood) -->
    <a-box data-box-for="pig"
           position="-0.7 1 0.2"
           depth="0.3" height="0.025" width="0.3"
           material="src: #roof"
           grabbable stretchable="dimensionAxes: x, z" hands-hoverable></a-box>

    <a-box data-box-for="pig"
           position="-0.7 0.9 0.2"
           depth="0.3" height="0.025" width="0.3"
           material="src: #roof"
           grabbable stretchable="dimensionAxes: x, z" hands-hoverable></a-box>

    <a-box data-box-for="pig"
           position="-0.7 0.8 0.2"
           depth="0.3" height="0.05" width="0.3"
           material="src: #wood"
           grabbable stretchable="dimensionAxes: x, z" hands-hoverable></a-box>

    </a-entity>

</a-scene>
`;

setTimeout(() => {
  showInstructionPanel();
  hideScene();

  const continueBtn = document.querySelector("#continueButton");
  if (continueBtn) {
    continueBtn.addEventListener("button-clicked", (event) => {
      hideInstructionPanel();

      setTimeout(() => {
        showScene();
      }, 50);
    });
  }

  disableSubmitButton();

  const btn = document.querySelector("#addAnimalButton");
  if (btn) {
    btn.addEventListener("button-clicked", () => {
      if (spawnCount < animals.length) {
        spawnAnimal();
      }
    });
  }

  const helpBtn = document.querySelector("#helpButton");
  const helpPanel = document.querySelector("#helpPanel");
  if (helpBtn && helpPanel) {
    helpBtn.addEventListener("button-clicked", () => {
      const isVisible =
        helpPanel.getAttribute("visible") === "true" ||
        helpPanel.getAttribute("visible") === true;
      helpPanel.setAttribute("visible", !isVisible);
    });
  }

  const submitBtn = document.querySelector("#submitButton");
  if (submitBtn) {
    submitBtn.addEventListener("button-clicked", () => {
      const resultsPanel = document.querySelector("#resultsPanel");
      const isVisible =
        resultsPanel &&
        (resultsPanel.getAttribute("visible") === "true" ||
          resultsPanel.getAttribute("visible") === true);

      if (isVisible) {
        hideResultsPanel();
      } else {
        checkAllAnimalsAndShowResults();
      }
    });
  }

  const fish = document.querySelector('[data-animal-id="fish"]');
  if (fish) {
    if (!placedAnimals.has("fish")) {
      currentUnplacedAnimal = {
        el: fish,
        animalId: "fish",
        animal: {
          hint: "This fish needs a water to swim in with her friends.",
        },
      };
      showHint(currentUnplacedAnimal.animal.hint);
    }
    checkAnimalPlacement(fish, "fish");
  }
}, 50);
