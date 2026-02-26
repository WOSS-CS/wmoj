import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

let camera, scene, renderer, controls;

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;

let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

let score = 0;
const scoreElement = document.getElementById('score');

const projectiles = [];
const targets = [];
const arenaSize = 100;
const wallHeight = 40;

// Particle System
const maxParticles = 4000;
let particleMesh;
const particles = [];
const dummy = new THREE.Object3D();

init();
animate();

function init() {
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 0, 150);

    const light = new THREE.HemisphereLight(0xeeeeff, 0x777788, 0.75);
    light.position.set(0.5, 1, 0.75);
    scene.add(light);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(20, 100, 50);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = arenaSize;
    dirLight.shadow.camera.bottom = - arenaSize;
    dirLight.shadow.camera.left = - arenaSize;
    dirLight.shadow.camera.right = arenaSize;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 500;
    scene.add(dirLight);

    controls = new PointerLockControls(camera, document.body);

    const blocker = document.getElementById('blocker');
    const instructions = document.getElementById('instructions');

    instructions.addEventListener('click', function () {
        controls.lock();
    });

    controls.addEventListener('lock', function () {
        instructions.style.display = 'none';
        blocker.style.display = 'none';
    });

    controls.addEventListener('unlock', function () {
        blocker.style.display = 'flex';
        instructions.style.display = '';
    });

    scene.add(controls.getObject());

    // Initial Camera position
    controls.getObject().position.y = 10;

    const onKeyDown = function (event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                moveForward = true;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                moveLeft = true;
                break;
            case 'ArrowDown':
            case 'KeyS':
                moveBackward = true;
                break;
            case 'ArrowRight':
            case 'KeyD':
                moveRight = true;
                break;
            case 'Space':
                if (canJump === true) {
                    velocity.y = 100;
                    canJump = false;
                }
                break;
        }
    };

    const onKeyUp = function (event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                moveForward = false;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                moveLeft = false;
                break;
            case 'ArrowDown':
            case 'KeyS':
                moveBackward = false;
                break;
            case 'ArrowRight':
            case 'KeyD':
                moveRight = false;
                break;
        }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    document.addEventListener('mousedown', (event) => {
        if (controls.isLocked && event.button === 0) {
            shootProjectile();
        }
    });

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(arenaSize, arenaSize, 10, 10);
    floorGeometry.rotateX(- Math.PI / 2);
    const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x448844 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.receiveShadow = true;
    scene.add(floor);

    // Walls
    const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const wallGeo = new THREE.PlaneGeometry(arenaSize, wallHeight);

    // North wall
    const wallN = new THREE.Mesh(wallGeo, wallMaterial);
    wallN.position.z = -arenaSize / 2;
    wallN.position.y = wallHeight / 2;
    wallN.receiveShadow = true;
    scene.add(wallN);

    // South wall
    const wallS = new THREE.Mesh(wallGeo, wallMaterial);
    wallS.position.z = arenaSize / 2;
    wallS.position.y = wallHeight / 2;
    wallS.rotation.y = Math.PI;
    wallS.receiveShadow = true;
    scene.add(wallS);

    // East wall
    const wallE = new THREE.Mesh(wallGeo, wallMaterial);
    wallE.position.x = arenaSize / 2;
    wallE.position.y = wallHeight / 2;
    wallE.rotation.y = -Math.PI / 2;
    wallE.receiveShadow = true;
    scene.add(wallE);

    // West wall
    const wallW = new THREE.Mesh(wallGeo, wallMaterial);
    wallW.position.x = -arenaSize / 2;
    wallW.position.y = wallHeight / 2;
    wallW.rotation.y = Math.PI / 2;
    wallW.receiveShadow = true;
    scene.add(wallW);

    // Particle System Initialization
    const particleGeo = new THREE.SphereGeometry(0.5, 6, 6);
    const particleMat = new THREE.MeshLambertMaterial({ color: 0x6B4226 });
    particleMesh = new THREE.InstancedMesh(particleGeo, particleMat, maxParticles);
    particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    particleMesh.castShadow = true;
    scene.add(particleMesh);

    // Add initial targets
    for (let i = 0; i < 15; i++) {
        spawnTarget();
    }

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function createPoopGeometry() {
    const geometries = [];
    const layers = 6;

    for (let i = 0; i < layers; i++) {
        const t = i / layers;
        const radius = 0.5 * (1 - t * 0.6);
        const tube = 0.18 * (1 - t * 0.3);
        const torus = new THREE.TorusGeometry(radius, tube, 8, 16);
        torus.rotateX(Math.PI / 2);
        torus.rotateY(i * 0.9);
        torus.translate(0, i * 0.28, 0);
        geometries.push(torus);
    }

    // Pointy tip on top
    const tip = new THREE.SphereGeometry(0.15, 8, 8);
    tip.translate(0, layers * 0.28 + 0.1, 0);
    geometries.push(tip);

    // Flat base
    const base = new THREE.SphereGeometry(0.55, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
    base.rotateX(Math.PI);
    base.translate(0, 0, 0);
    geometries.push(base);

    const merged = mergeGeometries(geometries);
    // Center the geometry vertically
    merged.computeBoundingBox();
    const center = new THREE.Vector3();
    merged.boundingBox.getCenter(center);
    merged.translate(-center.x, -center.y, -center.z);
    // Scale down to projectile size
    merged.scale(0.7, 0.7, 0.7);

    return merged;
}

const poopGeometry = createPoopGeometry();

function shootProjectile() {
    const mat = new THREE.MeshLambertMaterial({ color: 0x5C4033 }); // Dark Brown
    const projectile = new THREE.Mesh(poopGeometry, mat);
    projectile.castShadow = true;

    // Spawn at camera position
    projectile.position.copy(controls.getObject().position);

    // Calculate direction player is facing
    const camDirection = new THREE.Vector3(0, 0, -1);
    camDirection.applyQuaternion(camera.quaternion);

    // Move it slightly forward so we don't shoot from inside our own eyes
    projectile.position.add(camDirection.clone().multiplyScalar(2));

    scene.add(projectile);

    // Set velocity based on look direction + an arc
    const projVelocity = camDirection.clone().multiplyScalar(80);
    projVelocity.y += 15; // Arc

    projectiles.push({
        mesh: projectile,
        velocity: projVelocity,
        life: 0
    });
}

function createSplatter(position, normal, count = 20) {
    for (let i = 0; i < count; i++) {
        // Random direction
        const randomDir = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
        ).normalize();

        // Bias towards normal if provided
        if (normal) {
            randomDir.add(normal.clone().multiplyScalar(1.5)).normalize();
        }

        const velocity = randomDir.multiplyScalar(Math.random() * 25 + 10);

        particles.push({
            position: position.clone(),
            velocity: velocity,
            life: 0.8 + Math.random() * 0.7 // 0.8 to 1.5 seconds life
        });
    }
}

function spawnTarget() {
    // Toilet paper shape
    const geo = new THREE.CylinderGeometry(1.5, 1.5, 3, 32);
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const target = new THREE.Mesh(geo, mat);
    target.castShadow = true;
    target.receiveShadow = true;

    // Make it look a bit more like a roll
    const holeGeo = new THREE.CylinderGeometry(0.5, 0.5, 3.1, 16);
    const holeMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const hole = new THREE.Mesh(holeGeo, holeMat);
    target.add(hole); // Simple trick instead of CSG subtraction

    // Random position within arena bounds
    const safeZone = arenaSize - 10;
    const x = (Math.random() - 0.5) * safeZone;
    const z = (Math.random() - 0.5) * safeZone;
    const y = Math.random() * 15 + 5; // Between 5 and 20 height

    target.position.set(x, y, z);

    // Random rotation
    target.rotation.x = Math.random() * Math.PI;
    target.rotation.z = Math.random() * Math.PI;

    scene.add(target);

    // Create bounding box for collisions
    target.geometry.computeBoundingBox();
    const box = new THREE.Box3();

    targets.push({
        mesh: target,
        box: box,
        bobOffset: Math.random() * Math.PI * 2,
        rotSpeedX: (Math.random() - 0.5) * 0.02,
        rotSpeedY: (Math.random() - 0.5) * 0.02
    });
}

function animate() {
    requestAnimationFrame(animate);

    const time = performance.now();
    const delta = (time - prevTime) / 1000;
    prevTime = time;

    if (controls.isLocked === true) {
        // --- Player Movement & Physics ---
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        velocity.y -= 9.8 * 30.0 * delta; // Gravity

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize(); // Ensure consistent speed in all directions

        const speedMultiplier = 400.0;
        if (moveForward || moveBackward) velocity.z -= direction.z * speedMultiplier * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * speedMultiplier * delta;

        controls.moveRight(- velocity.x * delta);
        controls.moveForward(- velocity.z * delta);
        controls.getObject().position.y += (velocity.y * delta);

        // Floor collision
        if (controls.getObject().position.y < 5) {
            velocity.y = 0;
            controls.getObject().position.y = 5;
            canJump = true;
        }

        // Wall collision (Bounds checking)
        const playerSize = 2; // player radius
        const maxPos = (arenaSize / 2) - playerSize;

        if (controls.getObject().position.x > maxPos) controls.getObject().position.x = maxPos;
        if (controls.getObject().position.x < -maxPos) controls.getObject().position.x = -maxPos;
        if (controls.getObject().position.z > maxPos) controls.getObject().position.z = maxPos;
        if (controls.getObject().position.z < -maxPos) controls.getObject().position.z = -maxPos;

        // --- Projectile Physics & Collision ---
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const p = projectiles[i];

            p.velocity.y -= 9.8 * 15.0 * delta; // gravity pulls poop down

            p.mesh.position.add(p.velocity.clone().multiplyScalar(delta));
            p.life += delta;

            let projectileRemoved = false;

            // Sphere for collision detection
            const pSphere = new THREE.Sphere(p.mesh.position, 0.6);

            // Check targets
            for (let j = targets.length - 1; j >= 0; j--) {
                const t = targets[j];
                // Update bounding box to match mesh world position
                t.box.copy(t.mesh.geometry.boundingBox).applyMatrix4(t.mesh.matrixWorld);

                if (t.box.intersectsSphere(pSphere)) {
                    // Hit target!
                    createSplatter(p.mesh.position, null, 50);

                    scene.remove(t.mesh);
                    targets.splice(j, 1);

                    score += 1;
                    scoreElement.innerText = score;

                    spawnTarget();

                    projectileRemoved = true;
                    break;
                }
            }

            // Check floor, walls, and age
            if (!projectileRemoved) {
                const halfArena = arenaSize / 2;
                if (p.mesh.position.y <= 0.6) {
                    createSplatter(new THREE.Vector3(p.mesh.position.x, 0.6, p.mesh.position.z), new THREE.Vector3(0, 1, 0), 40);
                    projectileRemoved = true;
                } else if (p.mesh.position.x >= halfArena) {
                    createSplatter(new THREE.Vector3(halfArena, p.mesh.position.y, p.mesh.position.z), new THREE.Vector3(-1, 0, 0), 40);
                    projectileRemoved = true;
                } else if (p.mesh.position.x <= -halfArena) {
                    createSplatter(new THREE.Vector3(-halfArena, p.mesh.position.y, p.mesh.position.z), new THREE.Vector3(1, 0, 0), 40);
                    projectileRemoved = true;
                } else if (p.mesh.position.z >= halfArena) {
                    createSplatter(new THREE.Vector3(p.mesh.position.x, p.mesh.position.y, halfArena), new THREE.Vector3(0, 0, -1), 40);
                    projectileRemoved = true;
                } else if (p.mesh.position.z <= -halfArena) {
                    createSplatter(new THREE.Vector3(p.mesh.position.x, p.mesh.position.y, -halfArena), new THREE.Vector3(0, 0, 1), 40);
                    projectileRemoved = true;
                } else if (p.life > 5) {
                    projectileRemoved = true;
                }
            }

            if (projectileRemoved) {
                scene.remove(p.mesh);
                projectiles.splice(i, 1);
            }
        }

        // --- Target Animation (floating/bobbing) ---
        targets.forEach(t => {
            t.mesh.position.y += Math.sin(time * 0.002 + t.bobOffset) * 0.02;
            t.mesh.rotation.y += t.rotSpeedY;
            t.mesh.rotation.x += t.rotSpeedX;
        });

        // --- Particle System Animation ---
        let activeCount = 0;
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.life -= delta;

            if (p.life <= 0 || activeCount >= maxParticles) {
                particles.splice(i, 1);
                continue;
            }

            // Physics
            p.velocity.y -= 9.8 * 4.0 * delta; // Gravity for particles
            p.position.add(p.velocity.clone().multiplyScalar(delta));

            // Floor collision for particles (optional bounce/stop)
            if (p.position.y < 0.1) {
                p.position.y = 0.1;
                p.velocity.y *= -0.3; // Dampen bounce
                p.velocity.x *= 0.8;  // Friction
                p.velocity.z *= 0.8;
            }

            // Update instance matrix
            dummy.position.copy(p.position);
            dummy.scale.setScalar(p.life * 3.0); // Shrink as it dies
            dummy.updateMatrix();
            particleMesh.setMatrixAt(activeCount, dummy.matrix);
            activeCount++;
        }
        particleMesh.count = activeCount;
        particleMesh.instanceMatrix.needsUpdate = true;
    }

    renderer.render(scene, camera);
}
