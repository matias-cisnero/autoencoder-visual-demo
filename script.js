// --- CONFIGURACIÓN MANUAL ---
const CONFIG_LABEL_SIZE = 14; // Cambia este valor para regular el tamaño de las letras
// ----------------------------

let pesosAutoencoder = null;
const labels = ['@', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '[', '\\', ']', '^', '_'];
const coords = [[16.18, 7.73], [0.22, 3.47], [4.56, 6.37], [5.43, 1.69], [4.71, 0.44], [1.26, 1.63], [2.4, 3.46], [6.55, 2.63], [5.61, 15.9], [7.6, -0.17], [0.66, 0.41], [0.84, 2.59], [0.82, 1.3], [0.61, 4.59], [-0.17, 7.15], [8.13, 3.04], [9.87, 10.26], [14.09, 7.8], [11.76, 11.6], [11.74, 3.21], [2.26, -0.17], [2.12, 6.48], [1.67, 10.79], [-0.1, 8.69], [-0.16, 5.62], [-0.06, 0.71], [1.65, 0.26], [5.48, 0.25], [-0.15, 0.37], [0.62, 0.27], [0.56, -0.15], [0.33, 0.06]];

const trainingLatentSpaceData = coords.map((coord, index) => ({
    label: labels[index], x: coord[0], y: coord[1]
}));

let selectedArbitraryCircle = null;

function initChart() {
    const container = document.querySelector('.diagram-area');
    const svg = d3.select("#chart-svg");
    
    const margin = { top: 30, right: 30, bottom: 50, left: 50 };
    const fullWidth = container.clientWidth;
    const fullHeight = container.clientHeight;
    const width = fullWidth - margin.left - margin.right;
    const height = fullHeight - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 ${fullWidth} ${fullHeight}`);
    svg.selectAll("*").remove();
    
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear().domain([-2, 18]).range([0, width]);
    const yScale = d3.scaleLinear().domain([-2, 18]).range([height, 0]);

    // Ejes y Cuadrícula
    g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(xScale)).attr("class", "axis-color");
    g.append("g").call(d3.axisLeft(yScale)).attr("class", "axis-color");
    g.append("g").attr("class", "grid").attr("transform", `translate(0,${height})`).call(d3.axisBottom(xScale).tickSize(-height).tickFormat(""));
    g.append("g").attr("class", "grid").call(d3.axisLeft(yScale).tickSize(-width).tickFormat(""));

    // --- DIBUJAR PUNTOS ---
    const points = g.selectAll(".point-group")
        .data(trainingLatentSpaceData)
        .enter().append("g")
        .attr("class", "point-group")
        .attr("transform", d => `translate(${xScale(d.x)},${yScale(d.y)})`)
        .on("click", (event, d) => {
            event.stopPropagation();
            
            // CAMBIO: Si hay una letra seleccionada, borramos el punto rojo manual
            if (selectedArbitraryCircle) {
                selectedArbitraryCircle.remove();
                selectedArbitraryCircle = null;
            }

            g.selectAll("text").classed("selected-text", false)
                .style("font-size", `${CONFIG_LABEL_SIZE}px`); // Reset tamaño

            d3.select(event.currentTarget).select("text")
                .classed("selected-text", true)
                .style("font-size", `${CONFIG_LABEL_SIZE * 1.5}px`); // Destacar seleccionada

            updateInputs(d.x, d.y);
        });

    points.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", ".35em")
        .style("font-size", `${CONFIG_LABEL_SIZE}px`) // Aplicar tamaño desde variable
        .text(d => d.label);

    // Click en área vacía
    svg.on("click", (event) => {
        const coords = d3.pointer(event, g.node());
        const mX = coords[0];
        const mY = coords[1];

        if (mX >= 0 && mX <= width && mY >= 0 && mY <= height) {
            const dataX = xScale.invert(mX);
            const dataY = yScale.invert(mY);
            
            if (selectedArbitraryCircle) selectedArbitraryCircle.remove();
            
            // Quitar selección de letras y resetear sus tamaños
            g.selectAll("text").classed("selected-text", false)
                .style("font-size", `${CONFIG_LABEL_SIZE}px`);

            selectedArbitraryCircle = g.append("circle")
                .attr("class", "selected-arbitrary-point")
                .attr("cx", mX).attr("cy", mY).attr("r", 6);

            updateInputs(dataX, dataY);
        }
    });
}

function updateInputs(x, y) {
    document.getElementById('manualX').value = x.toFixed(3);
    document.getElementById('manualY').value = y.toFixed(3);
    handleDecodePrediction();
}

// Lógica Matemática
function gelu(x) {
    return math.dotMultiply(0.5, math.dotMultiply(x, math.add(1, math.map(math.add(math.multiply(0.7978845608, x), math.multiply(0.0356774, math.dotPow(x, 3))), v => Math.tanh(v)))));
}

function decoder(V, w3, w4, b3, b4) {
    let V3 = gelu(math.add(math.multiply(V, w3), b3));
    return gelu(math.add(math.multiply(V3, w4), b4));
}

async function handleDecodePrediction() {
    const x = parseFloat(document.getElementById('manualX').value);
    const y = parseFloat(document.getElementById('manualY').value);
    const resBox = document.getElementById('resultado');

    if (!pesosAutoencoder || isNaN(x) || isNaN(y)) return;

    resBox.textContent = `Procesando: [${x}, ${y}]...`;

    try {
        const V_latente = math.matrix([[x, y]]);
        const salida = decoder(V_latente, math.matrix(pesosAutoencoder.w3), math.matrix(pesosAutoencoder.w4), math.matrix(pesosAutoencoder.b3), math.matrix(pesosAutoencoder.b4));
        const binary = salida.toArray()[0].map(v => v > 0.5 ? 1 : 0);
        
        renderMatrix(binary);
        resBox.textContent = `Decodificación exitosa.\nVector: [${binary.join(', ')}]`;
    } catch (e) {
        resBox.textContent = "Error en decodificación: " + e.message;
    }
}

function renderMatrix(data) {
    const container = document.getElementById('predictionMatrix');
    const placeholder = document.getElementById('predictionPlaceholder');
    
    // 1. Ocultar placeholder por completo
    if (placeholder) placeholder.style.display = 'none';
    
    // 2. Mostrar contenedor de matriz
    container.style.display = 'grid'; 
    container.innerHTML = '';
    
    data.forEach(val => {
        const cell = document.createElement('div');
        cell.className = `matrix-cell ${val ? 'active' : 'inactive'}`;
        container.appendChild(cell);
    });
}

async function cargarPesos() {
    try {
        const resp = await fetch('pesos_autoencoder.json');
        pesosAutoencoder = await resp.json();
        document.getElementById('resultado').textContent = "Sistema listo. Selecciona coordenadas.";
    } catch (e) {
        document.getElementById('resultado').textContent = "Error: No se encontró pesos_autoencoder.json";
    }
}

document.addEventListener('DOMContentLoaded', () => {
    cargarPesos();
    initChart();
});

window.addEventListener('resize', initChart);