
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const ui = {
    overlay: $("overlay"),
    end: $("end-screen"),
    objective: $("objective"),
    detail: $("objective-detail"),
    prompt: $("prompt"),
    health: $("health"),
    healthFill: $("health-fill"),
    ammo: $("ammo"),
    endTitle: $("end-title"),
    endCopy: $("end-copy"),
    hit: $("hit-marker")
  };

  if (!window.THREE) {
    ui.objective.textContent = "Three.js could not load";
    ui.detail.textContent = "Check your internet connection and refresh.";
    return;
  }

  const THREE = window.THREE;

  let scene, camera, renderer, clock, player, flashlight, weapon;
  let running = false;
  let ended = false;
  let pointerLocked = false;

  let health = 100;
  let ammo = 12;
  let reserve = 48;
  let reloading = false;

  let keyFound = false;
  let powerOn = false;
  let extracted = false;

  let enemy;
  let enemyActive = true;
  let enemyHealth = 100;
  let enemyAttackCooldown = 0;

  let interactionTarget = null;

  const keys = Object.create(null);

  const move = {
    forward: false,
    back: false,
    left: false,
    right: false
  };

  // Collision system.
  // Every collider is a rectangular obstacle on the floor.
  const colliders = [];
  const PLAYER_RADIUS = 0.32;

  let interactables = [];

  const raycaster = new THREE.Raycaster();
  const center = new THREE.Vector2(0, 0);
  const tempVec = new THREE.Vector3();

  let lastShot = 0;

  const mat = (color, roughness = 0.9, metalness = 0) =>
    new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness
    });

  const box = (w, h, d, material, x, y, z, target = scene) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      material
    );

    mesh.position.set(x, y, z);
    mesh.castShadow = false;
    mesh.receiveShadow = true;

    target.add(mesh);
    return mesh;
  };

  const cylinder = (r1, r2, h, material, x, y, z, target = scene) => {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(r1, r2, h, 10),
      material
    );

    mesh.position.set(x, y, z);
    target.add(mesh);

    return mesh;
  };

  // Register an obstacle.
  function addCollider(x, z, width, depth) {
    colliders.push({
      minX: x - width / 2,
      maxX: x + width / 2,
      minZ: z - depth / 2,
      maxZ: z + depth / 2
    });
  }

  // Check whether the player's circular footprint
  // overlaps any rectangular obstacle.
  function isBlocked(x, z) {
    for (const obstacle of colliders) {
      const closestX = Math.max(
        obstacle.minX,
        Math.min(obstacle.maxX, x)
      );

      const closestZ = Math.max(
        obstacle.minZ,
        Math.min(obstacle.maxZ, z)
      );

      const dx = x - closestX;
      const dz = z - closestZ;

      if (
        dx * dx + dz * dz <
        PLAYER_RADIUS * PLAYER_RADIUS
      ) {
        return true;
      }
    }

    return false;
  }

  function buildWorld() {
    scene = new THREE.Scene();

    scene.background = new THREE.Color(0x07090c);
    scene.fog = new THREE.FogExp2(0x080b0e, 0.032);

    camera = new THREE.PerspectiveCamera(
      74,
      innerWidth / innerHeight,
      0.08,
      100
    );

    camera.position.set(0, 1.68, 5);

    player = new THREE.Object3D();
    player.position.set(0, 0, 5);
    player.add(camera);
    scene.add(player);

    renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: "low-power"
    });

    renderer.setPixelRatio(
      Math.min(devicePixelRatio || 1, 1.35)
    );

    renderer.setSize(innerWidth, innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    $("game").insertBefore(renderer.domElement, $("hud"));

    clock = new THREE.Clock();

    scene.add(
      new THREE.HemisphereLight(
        0x9aa7b4,
        0x171116,
        0.38
      )
    );

    const ambient = new THREE.AmbientLight(0x6e7782, 0.13);
    scene.add(ambient);

    flashlight = new THREE.SpotLight(
      0xe4e8e8,
      3.2,
      23,
      Math.PI / 7,
      0.45,
      1.4
    );

    flashlight.position.set(0, 0, 0);
    flashlight.target.position.set(0, 0, -1);

    camera.add(flashlight);
    camera.add(flashlight.target);

    const floorMat = mat(0x34383b);
    const wallMat = mat(0x626164);
    const darkMat = mat(0x202327);
    const ceilingMat = mat(0x292b2e);
    const trimMat = mat(0x4b4143);

    // Hospital floor, ceiling and walls.
    box(9, 0.25, 54, floorMat, 0, -0.15, -19);
    box(9, 0.25, 54, ceilingMat, 0, 3.55, -19);

    box(0.25, 3.7, 54, wallMat, -4.55, 1.7, -19);
    box(0.25, 3.7, 54, wallMat, 4.55, 1.7, -19);

    // Corridor decorative panels.
    for (let z = 6; z > -46; z -= 4) {
      box(0.12, 1.1, 2.2, trimMat, -4.39, 1.55, z - 1.4);
      box(0.12, 1.1, 2.2, trimMat, 4.39, 1.55, z - 1.4);

      box(0.18, 0.08, 3.2, darkMat, 0, 3.35, z - 1.5);
    }

    // Floor tile seams.
    const tileMat = mat(0x56585a);

    for (let z = 7; z > -47; z -= 2) {
      box(8.8, 0.012, 0.025, tileMat, 0, -0.012, z);
    }

    // Ceiling lights.
    for (let z = 3; z > -43; z -= 8) {
      box(1.1, 0.08, 0.34, mat(0x9a9a8c), 0, 3.39, z);

      if (Math.abs(z) > 10) {
        const lamp = new THREE.PointLight(
          0x9ba7ad,
          0.5,
          8,
          2
        );

        lamp.position.set(0, 3.1, z);
        scene.add(lamp);
      } else {
        box(0.9, 0.04, 0.25, mat(0x3b2528), 0, 3.32, z);
      }
    }

    // Gurneys and hospital furniture.
    for (const z of [-4, -12, -24, -34]) {
      const x = z === -12 ? -2.8 : 2.7;

      box(1.35, 0.18, 2.5, darkMat, x, 0.72, z);
      box(1.35, 0.6, 0.12, trimMat, x, 1.08, z - 1.18);

      for (const dx of [-0.5, 0.5]) {
        for (const dz of [-0.9, 0.9]) {
          cylinder(
            0.07,
            0.07,
            0.65,
            mat(0x55595c),
            x + dx,
            0.34,
            z + dz
          );
        }
      }

      // Prevent walking through the gurney.
      addCollider(x, z, 1.55, 2.65);
    }

    // Nurses station.
    box(
      2.2,
      1.05,
      0.8,
      mat(0x555052),
      -2.9,
      0.52,
      -19
    );

    addCollider(-2.9, -19, 2.35, 0.95);

    // Emergency power cabinet.
    box(
      0.8,
      1.4,
      0.55,
      mat(0x33383a),
      2.8,
      0.7,
      -27
    );

    addCollider(2.8, -27, 0.95, 0.8);

    const panel = box(
      0.42,
      0.62,
      0.12,
      mat(0x182b25),
      2.8,
      1.15,
      -26.68
    );

    addInteractable(
      panel,
      "power",
      "Restore emergency power"
    );

    // Security keycard.
    const keyCard = box(
      0.28,
      0.035,
      0.18,
      mat(0xd2b35b),
      -2.6,
      0.78,
      -10
    );

    keyCard.rotation.y = 0.35;

    addInteractable(
      keyCard,
      "key",
      "Pick up security key"
    );

    // Extraction door.
    const door = box(
      3.4,
      3.1,
      0.18,
      mat(0x34383a),
      0,
      1.48,
      -44.7
    );

    addCollider(0, -44.7, 3.5, 0.3);

    addInteractable(
      door,
      "exit",
      "Reach extraction"
    );

    // Red emergency lighting.
    for (const x of [-4.25, 4.25]) {
      const red = new THREE.PointLight(
        0x9d1c2d,
        0.85,
        7,
        2
      );

      red.position.set(x, 2.8, -21);
      scene.add(red);

      box(
        0.18,
        0.28,
        0.12,
        mat(0x9c2334),
        x,
        2.8,
        -21
      );
    }

    // Enemy placeholder.
    enemy = new THREE.Group();
    enemy.position.set(1.2, 0, -31);
    scene.add(enemy);

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.38, 1.0, 8),
      mat(0x171719)
    );

    body.position.y = 1.05;
    enemy.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.27, 8, 7),
      mat(0x292326)
    );

    head.position.y = 1.9;
    enemy.add(head);

    const eyeMat = new THREE.MeshBasicMaterial({
      color: 0xb51d2d
    });

    for (const x of [-0.105, 0.105]) {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 6, 5),
        eyeMat
      );

      eye.position.set(x, 1.94, -0.235);
      enemy.add(eye);
    }

    const armMat = mat(0x171719);

    for (const x of [-0.48, 0.48]) {
      const arm = cylinder(
        0.12,
        0.09,
        0.95,
        armMat,
        x,
        1.1,
        0,
        enemy
      );

      arm.rotation.z = x < 0 ? -0.18 : 0.18;
    }

    // First-person weapon placeholder.
    weapon = new THREE.Group();
    weapon.position.set(0.34, -0.3, -0.58);
    camera.add(weapon);

    box(0.16, 0.18, 0.62, mat(0x24282a), 0, 0, 0, weapon);
    box(0.1, 0.1, 0.38, mat(0x41484b), 0, 0.02, -0.43, weapon);
    box(0.13, 0.22, 0.18, mat(0x181a1c), 0, -0.16, 0.12, weapon);

    const muzzle = box(
      0.055,
      0.055,
      0.05,
      mat(0x8c7a62),
      0,
      0.02,
      -0.64,
      weapon
    );

    weapon.userData.muzzle = muzzle;

    // Corridor limits.
    // Player is also checked against individual obstacles.
    window.addEventListener("resize", onResize);

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("pointerlockchange", onPointerLock);
    document.addEventListener("mousedown", onMouseDown);

    renderer.domElement.addEventListener(
      "click",
      requestPointerLock
    );

    $("start-button").addEventListener("click", startMission);

    $("restart-button").addEventListener(
      "click",
      () => location.reload()
    );

    $("mobile-interact").addEventListener("click", interact);
    $("mobile-fire").addEventListener("click", shoot);

    document.querySelectorAll("[data-move]").forEach((btn) => {
      const dir = btn.dataset.move;

      btn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        move[dir] = true;
      }, { passive: false });

      btn.addEventListener("touchend", () => {
        move[dir] = false;
      });

      btn.addEventListener("touchcancel", () => {
        move[dir] = false;
      });
    });

    animate();
  }

  function addInteractable(mesh, kind, label) {
    mesh.userData.kind = kind;
    mesh.userData.label = label;
    interactables.push(mesh);
  }

  function setObjective(title, detail) {
    ui.objective.textContent = title;
    ui.detail.textContent = detail;
  }

  function startMission() {
    ui.overlay.classList.add("hidden");
    running = true;
    ended = false;

    renderer.domElement.requestPointerLock?.();
    clock.getDelta();
  }

  function requestPointerLock() {
    if (running && !ended) {
      renderer.domElement.requestPointerLock?.();
    }
  }

  function onPointerLock() {
    pointerLocked =
      document.pointerLockElement === renderer.domElement;
  }

  function onKeyDown(e) {
    keys[e.code] = true;

    if (
      ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]
        .includes(e.code)
    ) {
      e.preventDefault();
    }

    if (e.code === "KeyE") interact();
    if (e.code === "KeyR") reload();

    if (e.code === "Escape" && running && !ended) {
      running = false;
      ui.overlay.classList.remove("hidden");
    }
  }

  function onKeyUp(e) {
    keys[e.code] = false;
  }

  function onMouseMove(e) {
    if (!running || !pointerLocked) return;

    player.rotation.y -= e.movementX * 0.0021;

    camera.rotation.x -= e.movementY * 0.0018;

    camera.rotation.x = Math.max(
      -1.35,
      Math.min(1.35, camera.rotation.x)
    );
  }

  function onMouseDown(e) {
    if (e.button === 0) shoot();
  }

  function shoot() {
    if (!running || ended || reloading) return;

    const now = performance.now();

    if (now - lastShot < 260) return;

    lastShot = now;

    if (ammo <= 0) {
      setObjective("Magazine empty", "Press R to reload.");
      return;
    }

    ammo--;
    updateAmmo();

    weapon.position.z += 0.045;

    setTimeout(() => {
      if (weapon) weapon.position.z = -0.58;
    }, 65);

    raycaster.setFromCamera(center, camera);

    const hits = raycaster.intersectObject(enemy, true);

    if (
      hits.length &&
      enemyActive &&
      hits[0].distance < 27
    ) {
      enemyHealth -= 34;

      ui.hit.style.opacity = "1";

      setTimeout(() => {
        ui.hit.style.opacity = "0";
      }, 100);

      if (enemyHealth <= 0) {
        enemyActive = false;
        scene.remove(enemy);

        setObjective(
          "Threat neutralized",
          "Continue to the emergency power panel."
        );
      }
    }
  }

  function reload() {
    if (!running || reloading || ammo === 12 || reserve <= 0) {
      return;
    }

    reloading = true;

    setObjective(
      "Reloading",
      "Hold position until the magazine is ready."
    );

    setTimeout(() => {
      const needed = 12 - ammo;
      const take = Math.min(needed, reserve);

      ammo += take;
      reserve -= take;
      reloading = false;

      updateAmmo();
      refreshObjective();
    }, 1250);
  }

  function updateAmmo() {
    ui.ammo.textContent = ammo + " / " + reserve;
  }

  function refreshObjective() {
    if (!keyFound) {
      setObjective(
        "Find the security key",
        "Search the hospital corridor."
      );
    } else if (!powerOn) {
      setObjective(
        "Restore emergency power",
        "Find the electrical panel near the nurses station."
      );
    } else if (enemyActive) {
      setObjective(
        "Reach extraction",
        "The emergency door is powered. Watch for movement."
      );
    } else {
      setObjective(
        "Reach extraction",
        "The corridor is clear. Get to the exit."
      );
    }
  }

  function interact() {
    if (!running || ended) return;
    if (!interactionTarget) return;

    const kind = interactionTarget.userData.kind;

    if (kind === "key" && !keyFound) {
      keyFound = true;

      scene.remove(interactionTarget);

      interactables = interactables.filter(
        (x) => x !== interactionTarget
      );

      refreshObjective();

    } else if (kind === "power" && keyFound && !powerOn) {
      powerOn = true;

      interactionTarget.material = mat(0x2d8b61);

      const glow = new THREE.PointLight(
        0x4fc18b,
        1.1,
        5
      );

      glow.position.copy(interactionTarget.position);
      scene.add(glow);

      refreshObjective();

    } else if (kind === "exit") {
      if (!keyFound) {
        setObjective(
          "Access denied",
          "You need the security key."
        );
        return;
      }

      if (!powerOn) {
        setObjective(
          "No power",
          "Restore emergency power first."
        );
        return;
      }

      if (enemyActive) {
        setObjective(
          "Threat in the corridor",
          "Neutralize the hostile before extraction."
        );
        return;
      }

      extracted = true;
      finish(true);
    }
  }

  function findInteraction() {
    interactionTarget = null;

    let nearest = Infinity;

    for (const item of interactables) {
      if (!item.parent) continue;

      const d = item.position.distanceTo(player.position);

      const range = item.userData.kind === "exit" ? 3.2 : 2.2;

      if (d < range && d < nearest) {
        nearest = d;
        interactionTarget = item;
      }
    }

    if (interactionTarget) {
      const kind = interactionTarget.userData.kind;

      let label = interactionTarget.userData.label;

      if (kind === "power" && (!keyFound || powerOn)) {
        label = powerOn
          ? "Power restored"
          : "Find the security key first";
      }

      if (
        kind === "exit" &&
        (!keyFound || !powerOn || enemyActive)
      ) {
        label = "Extraction locked — complete objectives";
      }

      ui.prompt.textContent = "[ E ] " + label;
      ui.prompt.classList.add("visible");

    } else {
      ui.prompt.classList.remove("visible");
    }
  }

  // Updated movement with obstacle collision and wall sliding.
  function updatePlayer(dt) {
    const forward =
      (keys.KeyW || keys.ArrowUp || move.forward ? 1 : 0) -
      (keys.KeyS || keys.ArrowDown || move.back ? 1 : 0);

    const side =
      (keys.KeyD || keys.ArrowRight || move.right ? 1 : 0) -
      (keys.KeyA || keys.ArrowLeft || move.left ? 1 : 0);

    const speed =
      (keys.ShiftLeft || keys.ShiftRight ? 5.1 : 3.25) * dt;

    const dir = new THREE.Vector3(side, 0, -forward);

    if (dir.lengthSq() > 0) {
      dir.normalize();

      dir.applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        player.rotation.y
      );

      const currentX = player.position.x;
      const currentZ = player.position.z;

      const nextX = Math.max(
     -4.05 + PLAYER_RADIUS,
Math.min(4.05 - PLAYER_RADIUS, currentX + dir.x * speed))
      );

      const nextZ = Math.max(
        -43.7,
        Math.min(6.5, currentZ + dir.z * speed)
      );

      // Test horizontal movement separately.
      // This lets the player slide along walls.
      if (!isBlocked(nextX, currentZ)) {
        player.position.x = nextX;
      }

      // Test forward/backward movement separately.
      if (!isBlocked(player.position.x, nextZ)) {
        player.position.z = nextZ;
      }

      camera.position.y =
        1.68 +
        Math.sin(performance.now() * 0.009) * 0.025;

    } else {
      camera.position.y +=
        (1.68 - camera.position.y) * Math.min(dt * 8, 1);
    }
  }

  function updateEnemy(dt) {
    if (!enemyActive) return;

    const distance = enemy.position.distanceTo(player.position);

    if (distance < 23) {
      tempVec.copy(player.position).sub(enemy.position);
      tempVec.y = 0;

      if (tempVec.length() > 1.15) {
        tempVec.normalize();

        enemy.position.addScaledVector(tempVec, dt * 1.55);

        enemy.rotation.y = Math.atan2(
          tempVec.x,
          tempVec.z
        );

      } else {
        enemyAttackCooldown -= dt;

        if (enemyAttackCooldown <= 0) {
          health = Math.max(0, health - 12);

          enemyAttackCooldown = 1.25;

          updateHealth();

          if (health <= 0) finish(false);
        }
      }
    }
  }

  function updateHealth() {
    ui.health.textContent = health;
    ui.healthFill.style.width = health + "%";
  }

  function finish(won) {
    if (ended) return;

    ended = true;
    running = false;

    document.exitPointerLock?.();

    ui.endTitle.textContent = won
      ? "MISSION COMPLETE"
      : "MISSION FAILED";

    ui.endCopy.textContent = won
      ? "You secured the hospital and reached extraction. This is the first playable mission milestone."
      : "You were lost inside the hospital. Regroup and try again.";

    ui.end.classList.remove("hidden");
  }

  function onResize() {
    if (!camera || !renderer) return;

    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();

    renderer.setPixelRatio(
      Math.min(devicePixelRatio || 1, 1.35)
    );

    renderer.setSize(innerWidth, innerHeight);
  }

  function animate() {
    requestAnimationFrame(animate);

    const dt = Math.min(clock.getDelta(), 0.04);

    if (running && !ended) {
      updatePlayer(dt);
      updateEnemy(dt);
      findInteraction();
    }

    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  buildWorld();

})();
