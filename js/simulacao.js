let scene, camera, renderer, controls;
let planets = [];
let trails = [];

const textureLoader = new THREE.TextureLoader();
textureLoader.setPath('imgs/textures/');

let simulationSpeed = 1;
let showOrbits = true;
let showNames = true;

// Adicione esta função no início do arquivo
function initControls() {
    const controls = document.getElementById('controls');
    const toggleButton = document.getElementById('toggleControls');
    
    if (!controls || !toggleButton) {
        console.error("Elementos de controle não encontrados!");
        return;
    }
    
    // Inicia com o painel visível
    controls.classList.remove('hidden');
    toggleButton.textContent = '×';
    
    toggleButton.addEventListener('click', () => {
        controls.classList.toggle('hidden');
        toggleButton.textContent = controls.classList.contains('hidden') ? '☰' : '×';
    });
}

async function init() {
    console.log('Iniciando...');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); 

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 100, 200);  // Ajuste esses valores conforme necessário

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; 
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 1;
    controls.maxDistance = 500;
    controls.maxPolarAngle = Math.PI;

    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    try {
        console.log('Criando sol...');
        await createSun();
        console.log('Sol criado');

        console.log('Criando planetas...');
        await createPlanets();
        console.log('Planetas criados');

        console.log('Criando campo estelar...');
        createStarfield();
        console.log('Campo estelar criado');

        console.log('Iniciando controles...');
        setupControlToggle();
        initControls();
        console.log('Controles iniciados');

        console.log('Iniciando animação...');
        createInfoPanel();
        animate();

        setupEventListeners();
    } catch (error) {
        console.error("Erro durante a inicialização:", error);
    }
}

async function createSun() {
    const sunGeometry = new THREE.SphereGeometry(10, 32, 32);
    const sunTexture = await loadTexture('sun.jpg');
    const sunMaterial = new THREE.MeshBasicMaterial({ map: sunTexture });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);
}

async function createPlanets() {
    const planetData = [
        { name: "Mercúrio", radius: 0.383, distance: 20, speed: 0.01, texture: 'mercury.jpg', rotationDirection: 1 },
        { name: "Vênus", radius: 0.949, distance: 30, speed: 0.007, texture: 'venus_surface.jpg', rotationDirection: -1 },
        { name: "Terra", radius: 1, distance: 40, speed: 0.006, texture: 'earth_day.jpg', rotationDirection: 1 },
        { name: "Marte", radius: 0.532, distance: 50, speed: 0.005, texture: 'mars.jpg', rotationDirection: 1 },
        { name: "Júpiter", radius: 11.21, distance: 70, speed: 0.002, texture: 'jupiter.jpg', rotationDirection: 1 },
        { name: "Saturno", radius: 9.45, distance: 90, speed: 0.0009, texture: 'saturn.jpg', rotationDirection: 1 },
        { name: "Urano", radius: 4, distance: 110, speed: 0.0004, texture: 'uranus.jpg', rotationDirection: -1 },
        { name: "Netuno", radius: 3.88, distance: 130, speed: 0.0001, texture: 'neptune.jpg', rotationDirection: 1 }
    ];

    const scaleFactor = 0.5;

    for (const data of planetData) {
        const scaledRadius = data.radius * scaleFactor;
        await createPlanet({...data, radius: scaledRadius, orbitRadius: data.distance});
    }
}

async function createPlanet(data) {
    const geometry = new THREE.SphereGeometry(data.radius, 32, 32);
    const texture = await loadTexture(data.texture);
    const material = new THREE.MeshStandardMaterial({ map: texture });
    const planet = new THREE.Mesh(geometry, material);
    
    const planetSystem = new THREE.Object3D();
    planetSystem.add(planet);
    
    planet.position.x = data.orbitRadius;

    const trail = createTrail(data.orbitRadius);
    planetSystem.add(trail);

    scene.add(planetSystem);

    const nameLabel = createTextLabel(data.name, data.radius);
    planet.add(nameLabel);
    planet.nameLabel = nameLabel;

    let saturnRings;
    if (data.name === "Saturno") {
        saturnRings = await createSaturnRings(planet, data.radius);
    }

    planets.push({ 
        ...data, 
        mesh: planet, 
        system: planetSystem, 
        angle: Math.random() * Math.PI * 2,
        saturnRings: saturnRings
    });
}

function createTrail(radius) {
    const segments = 128;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(segments * 3);

    for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = Math.sin(angle) * radius;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 });
    return new THREE.Line(geometry, material);
}

async function createSaturnRings(saturn, saturnRadius) {
    const innerRadius = saturnRadius * 1.4;
    const outerRadius = saturnRadius * 2.0;
    
    // Carregar a textura do anel
    const ringTexture = await loadTexture('saturn_ring.png');
    
    // Criar o anel principal
    const ringGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 128, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
        map: ringTexture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
    });

    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;  // Rotacionar para ficar horizontal

    // Criar partículas de poeira
    const dustGeometry = new THREE.BufferGeometry();
    const dustPositions = [];
    const dustColors = [];
    const dustVelocities = [];  // Nova array para armazenar as velocidades das partículas
    const dustCount = 20000;  // Número de partículas

    const innerColor = new THREE.Color(0xA79C86);
    const outerColor = new THREE.Color(0x876D4B);

    for (let i = 0; i < dustCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = THREE.MathUtils.lerp(innerRadius, outerRadius, Math.random());
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = THREE.MathUtils.randFloatSpread(0.1); // Pequena variação na altura

        dustPositions.push(x, y, z);

        const normalizedRadius = (radius - innerRadius) / (outerRadius - innerRadius);
        const color = new THREE.Color().lerpColors(innerColor, outerColor, normalizedRadius);
        dustColors.push(color.r, color.g, color.b);

        // Calcular a velocidade orbital baseada na distância
        // Partículas mais próximas se movem mais rápido
        const orbitalPeriod = THREE.MathUtils.lerp(7, 14, normalizedRadius);  // Em horas
        const angularVelocity = (2 * Math.PI) / (orbitalPeriod * 3600);  // Radianos por segundo
        dustVelocities.push(angularVelocity);
    }

    dustGeometry.setAttribute('position', new THREE.Float32BufferAttribute(dustPositions, 3));
    dustGeometry.setAttribute('color', new THREE.Float32BufferAttribute(dustColors, 3));
    dustGeometry.setAttribute('velocity', new THREE.Float32BufferAttribute(dustVelocities, 1));

    const dustMaterial = new THREE.PointsMaterial({
        size: 0.03,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });

    const dust = new THREE.Points(dustGeometry, dustMaterial);

    // Criar um grupo para conter o anel e a poeira
    const ringGroup = new THREE.Group();
    ringGroup.add(ring);
    ringGroup.add(dust);

    saturn.add(ringGroup);

    return ringGroup;
}

function createStarfield() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({ color: 0xFFFFFF, size: 0.1, sizeAttenuation: true });

    const starsVertices = [];
    for (let i = 0; i < 10000; i++) {  // Aumentado de 1000 para 10000 estrelas
        const x = THREE.MathUtils.randFloatSpread(1000);  // Aumentado o alcance
        const y = THREE.MathUtils.randFloatSpread(1000);
        const z = THREE.MathUtils.randFloatSpread(1000);
        starsVertices.push(x, y, z);
    }

    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    const starField = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starField);

    // Comentar ou remover o código da nebulosa se não quiser usá-lo
    /*
    const nebulaTexture = textureLoader.load('nebula.jpg');
    const nebulaGeometry = new THREE.SphereGeometry(400, 32, 32);
    const nebulaMaterial = new THREE.MeshBasicMaterial({
        map: nebulaTexture,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.3
    });
    const nebula = new THREE.Mesh(nebulaGeometry, nebulaMaterial);
    scene.add(nebula);
    */
}

function animate() {
    requestAnimationFrame(animate);
    
    planets.forEach(planet => {
        planet.angle += planet.speed * simulationSpeed * 0.1;
        
        // Rotacione o sistema do planeta inteiro
        planet.system.rotation.y = planet.angle;
        
        // Rotação do planeta em torno do próprio eixo
        planet.mesh.rotation.y += planet.speed * 5 * simulationSpeed * planet.rotationDirection;

        // Animação dos anéis de Saturno
        if (planet.name === "Saturno" && planet.saturnRings) {
            const dustParticles = planet.saturnRings.children[1];
            const positions = dustParticles.geometry.attributes.position;
            const velocities = dustParticles.geometry.attributes.velocity;

            for (let i = 0; i < positions.count; i++) {
                const x = positions.getX(i);
                const z = positions.getZ(i);
                const y = positions.getY(i);
                
                // Calcular o raio atual da partícula
                const radius = Math.sqrt(x * x + z * z);
                
                // Calcular o novo ângulo baseado na velocidade orbital da partícula
                const currentAngle = Math.atan2(z, x);
                const angularVelocity = velocities.getX(i);
                const newAngle = currentAngle + angularVelocity * simulationSpeed * 0.1;
                
                // Atualizar a posição mantendo o mesmo raio
                positions.setXYZ(i, 
                    Math.cos(newAngle) * radius,
                    y,
                    Math.sin(newAngle) * radius
                );
            }
            positions.needsUpdate = true;
        }

        // Efeito de brilho pulsante para o Sol
        if (planet.name === "Sol") {
            const pulseFactor = Math.sin(Date.now() * 0.001) * 0.1 + 1;
            planet.mesh.scale.set(pulseFactor, pulseFactor, pulseFactor);
        }
    });

    // Rotação lenta do campo estelar
    scene.children.forEach(child => {
        if (child instanceof THREE.Points) {
            child.rotation.y += 0.0001 * simulationSpeed * 0.1;
        }
    });

    updateInfoPanel();
    controls.update();
    renderer.render(scene, camera);
}

function loadTexture(url) {
    return new Promise((resolve, reject) => {
        textureLoader.load(url, resolve, undefined, reject);
    });
}

// Adicione esta função para lidar com o redimensionamento da janela
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function setupEventListeners() {
    document.getElementById('speedSlider').addEventListener('input', (e) => {
        simulationSpeed = parseFloat(e.target.value);
        document.getElementById('speedValue').textContent = simulationSpeed.toFixed(1);
    });

    document.getElementById('showOrbits').addEventListener('change', (e) => {
        showOrbits = e.target.checked;
        updateOrbitVisibility();
    });

    document.getElementById('showNames').addEventListener('change', (e) => {
        showNames = e.target.checked;
        updateNameVisibility();
    });

    // Adicionar eventos para mouse e touch
    renderer.domElement.addEventListener('mousedown', onDocumentMouseDown, false);
    renderer.domElement.addEventListener('touchstart', onDocumentTouchStart, false);
}

function updateOrbitVisibility() {
    planets.forEach(planet => {
        planet.system.children[1].visible = showOrbits;
    });
}

function updateNameVisibility() {
    planets.forEach(planet => {
        if (planet.mesh && planet.mesh.nameLabel) {
            planet.mesh.nameLabel.visible = showNames;
        }
    });
}

function createTextLabel(text, planetRadius) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = 'bold 32px Arial';
    context.fillStyle = 'rgba(255, 255, 255, 0.8)';
    context.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    context.lineWidth = 4;
    
    // Medir o texto para ajustar o tamanho do canvas
    const textMetrics = context.measureText(text);
    const textWidth = textMetrics.width;
    const textHeight = 32;  // Altura aproximada do texto

    // Ajustar o tamanho do canvas
    canvas.width = textWidth + 20;  // Adicionar um pouco de padding
    canvas.height = textHeight + 10;

    // Redesenhar o texto no canvas redimensionado
    context.font = 'bold 32px Arial';
    context.fillStyle = 'rgba(255, 255, 255, 0.8)';
    context.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    context.lineWidth = 4;
    context.strokeText(text, 10, textHeight);
    context.fillText(text, 10, textHeight);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);

    // Ajustar a escala do sprite baseado no tamanho do planeta
    const scale = Math.max(1, planetRadius * 0.5);
    sprite.scale.set(scale * 10, scale * 5, 1);

    // Posicionar o rótulo acima do planeta
    sprite.position.set(0, planetRadius + scale * 3, 0);

    return sprite;
}

function createInfoPanel() {
    const infoPanel = document.getElementById('planetInfo');
    if (!infoPanel) {
        console.error("Elemento 'planetInfo' não encontrado!");
        return;
    }
    infoPanel.innerHTML = '<h2>Informações do Planeta</h2><p>Clique em um planeta para ver detalhes.</p>';
    infoPanel.style.display = 'none';
}

function updateInfoPanel() {
    // Implementar lógica para atualizar o painel de informações com dados em tempo real
}

function showPlanetInfo(planet) {
    const infoPanel = document.getElementById('planetInfo');
    infoPanel.innerHTML = `
        <h2>${planet.name}</h2>
        <p><strong>Raio relativo:</strong> ${(planet.radius / 0.3).toFixed(2)} (Terra = 1)</p>
        <p><strong>Distância do Sol:</strong> ${planet.orbitRadius.toFixed(2)} UA</p>
        <p><strong>Velocidade orbital:</strong> ${planet.speed.toFixed(5)} UA/dia</p>
        <p><strong>Período orbital:</strong> ${(365.25 / (planet.speed * 100)).toFixed(2)} anos terrestres</p>
    `;
    infoPanel.style.display = 'block';
    
    // Adicionar classe para animação de fade-in
    infoPanel.classList.remove('fade-out');
    infoPanel.classList.add('fade-in');
}

function onDocumentMouseDown(event) {
    event.preventDefault();
    const mouse = new THREE.Vector2();
    
    // Usar clientX e clientY para compatibilidade com diferentes navegadores
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(scene.children, true);
    if (intersects.length > 0) {
        const clickedObject = intersects[0].object;
        const planet = planets.find(p => p.mesh === clickedObject || p.mesh.children.includes(clickedObject));
        if (planet) {
            showPlanetInfo(planet);
        } else {
            hidePlanetInfo();
        }
    } else {
        hidePlanetInfo();
    }
}

// Função para lidar com eventos de toque
function onDocumentTouchStart(event) {
    event.preventDefault();
    event.clientX = event.touches[0].clientX;
    event.clientY = event.touches[0].clientY;
    onDocumentMouseDown(event);
}

function hidePlanetInfo() {
    const infoPanel = document.getElementById('planetInfo');
    infoPanel.classList.remove('fade-in');
    infoPanel.classList.add('fade-out');
    setTimeout(() => {
        infoPanel.style.display = 'none';
    }, 500);
}

// Adicione este evento para fechar o painel de informações ao clicar fora dos planetas
document.addEventListener('mousedown', onDocumentMouseDown, false);

window.addEventListener('resize', onWindowResize);

function setupControlToggle() {
    const toggleButton = document.getElementById('toggleControls');
    const controlPanel = document.getElementById('controls');
    
    if (!toggleButton || !controlPanel) {
        console.error("Elementos de controle não encontrados!");
        return;
    }

    toggleButton.addEventListener('click', () => {
        controlPanel.classList.toggle('hidden');
        toggleButton.textContent = controlPanel.classList.contains('hidden') ? '☰' : '×';
    });

    // Inicialmente, mostre o painel e defina o botão como '×'
    controlPanel.classList.remove('hidden');
    toggleButton.textContent = '×';
}

// Chame esta função no seu init() ou em algum ponto apropriado na inicialização
setupControlToggle();

init().catch(error => {
    console.error("Erro na inicialização:", error);
});