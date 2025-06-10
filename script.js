document.addEventListener('DOMContentLoaded', function () {
    // --- Gerenciamento de Abas ---
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    let integralTabInitialized = false; // Flag para cálculo inicial da integral

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            const tabId = button.dataset.tab;
            const activeContent = document.getElementById(`content-${tabId}`);
            if (activeContent) {
                activeContent.classList.add('active');
            }
            // MODIFICADO: Calcula o exemplo padrão da integral na primeira vez que a aba é aberta
            if (tabId === 'integrais' && !integralTabInitialized) {
                const primeiroExemplo = document.querySelector('#content-integrais .examples-integral code');
                if (primeiroExemplo) {
                    campoExpressaoIntegral.value = primeiroExemplo.dataset.func || 'x^2';
                    campoLimiteInferior.value = primeiroExemplo.dataset.a || '0';
                    campoLimiteSuperior.value = primeiroExemplo.dataset.b || '1';
                    campoNumeroTrapezios.value = primeiroExemplo.dataset.n || '1000';
                    calcularEExibirIntegral();
                    integralTabInitialized = true;
                }
            }
        });
    });

    // --- Calculadora de Derivadas: Referências a Elementos DOM ---
    const campoExpressao = document.getElementById('expressao');
    const botaoCalcular = document.getElementById('botao-calcular');
    const funcaoOriginalDisplay = document.getElementById('funcao-original');
    const primeiraDerivadaDisplay = document.getElementById('derivada1');
    const segundaDerivadaDisplay = document.getElementById('derivada2');
    const pontosCriticosDisplay = document.getElementById('pontos-criticos');

    // --- Funções Utilitárias ---
    function formatarNumero(num) {
        if (Math.abs(num) < 1e-10) return '0';
        if (Number.isInteger(num)) return num.toString();
        if (Math.abs(num) > 1e6 || (Math.abs(num) < 1e-4 && num !== 0)) {
            return num.toExponential(4);
        }
        return parseFloat(num.toFixed(5)).toString();
    }

    function mostrarErro(mensagem, elemento) {
        elemento.innerHTML = `<span class="error">${mensagem}</span>`;
        if (elemento === funcaoOriginalDisplay) {
            primeiraDerivadaDisplay.textContent = '';
            segundaDerivadaDisplay.textContent = '';
            pontosCriticosDisplay.innerHTML = '';
        } else if (elemento === primeiraDerivadaDisplay) {
            segundaDerivadaDisplay.textContent = '';
            pontosCriticosDisplay.innerHTML = '';
        } else if (elemento === segundaDerivadaDisplay) {
            pontosCriticosDisplay.innerHTML = '';
        }
    }

    function formatarExpressaoEntrada(expr) {
        if (typeof expr !== 'string') return '';
        let formatada = expr;
        formatada = formatada.replace(/(\d)([a-zA-Z(])/g, '$1*$2');
        formatada = formatada.replace(/(\))([a-zA-Z0-9(])/g, '$1*$2');
        formatada = formatada.replace(/([a-zA-Z])(\()/g, '$1*$2');
        return formatada;
    }

    // --- Calculadora de Derivadas ---
    function encontrarPontosCriticosComNewton(expressaoPrimeiraDerivada, expressaoSegundaDerivada, estimativasIniciais = [-10, -5, -2, -1, -0.5, 0, 0.5, 1, 2, 5, 10], tolerancia = 1e-7, maxIteracoes = 50) {
        const pontosCriticos = new Set();
        const escopo = {};
        for (let estimativa of estimativasIniciais) {
            let x = estimativa;
            for (let i = 0; i < maxIteracoes; i++) {
                escopo.x = x;
                let fPrimax, fSegundax;
                try {
                    fPrimax = math.evaluate(expressaoPrimeiraDerivada, escopo);
                    fSegundax = math.evaluate(expressaoSegundaDerivada, escopo);
                } catch (e) { break; }
                if (Math.abs(fPrimax) < tolerancia) {
                    pontosCriticos.add(parseFloat(x.toFixed(5)));
                    break;
                }
                if (Math.abs(fSegundax) < 1e-10) break;
                const xAnterior = x;
                x = x - fPrimax / fSegundax;
                if (!isFinite(x)) break;
                if (Math.abs(x - xAnterior) < tolerancia) {
                    escopo.x = x;
                    try {
                        fPrimax = math.evaluate(expressaoPrimeiraDerivada, escopo);
                        if (Math.abs(fPrimax) < tolerancia) {
                            pontosCriticos.add(parseFloat(x.toFixed(5)));
                        }
                    } catch (e) { /* Ignora */ }
                    break;
                }
            }
        }
        return Array.from(pontosCriticos).sort((a, b) => a - b);
    }

    function encontrarEClassificarPontosCriticos(expressaoOriginalStr, primeiraDerivadaStr, segundaDerivadaStr) {
        if (primeiraDerivadaStr === expressaoOriginalStr && segundaDerivadaStr === expressaoOriginalStr) {
            let isFirstDerivativeZeroConstant = false;
            try {
                const parsedFirstDerivative = math.parse(primeiraDerivadaStr);
                if (parsedFirstDerivative.isConstantNode && math.abs(parsedFirstDerivative.evaluate()) < 1e-10) {
                    isFirstDerivativeZeroConstant = true;
                }
            } catch (e) { /* Ignora */ }
            if (isFirstDerivativeZeroConstant) {
                return "A primeira derivada é 0 para todo x. Todos os pontos são críticos (função constante).";
            } else if (primeiraDerivadaStr !== "0") {
                return 'Nenhum ponto crítico (f\'(x) nunca é zero para esta função).';
            }
        }
        const pontosCriticosNumericos = encontrarPontosCriticosComNewton(primeiraDerivadaStr, segundaDerivadaStr);
        if (!pontosCriticosNumericos.length) {
            try {
                const noPrimeira = math.parse(primeiraDerivadaStr);
                if (noPrimeira.isConstantNode && math.abs(noPrimeira.evaluate()) > 1e-9) {
                    return 'Nenhum ponto crítico (a primeira derivada é uma constante diferente de zero).';
                }
            } catch (e) { /* Ignora */ }
            return 'Nenhum ponto crítico (onde f\'(x) ≈ 0) encontrado com as estimativas atuais.';
        }
        const resultadoFormatado = pontosCriticosNumericos.map(ponto => {
            const escopo = { x: ponto };
            try {
                const valorFuncao = math.evaluate(expressaoOriginalStr, escopo);
                const valorSegunda = math.evaluate(segundaDerivadaStr, escopo);
                if (!isFinite(valorSegunda)) {
                    return `<li>f"(${formatarNumero(ponto)}) é indefinida. f(${formatarNumero(ponto)}) = ${formatarNumero(valorFuncao)}</li>`;
                } else if (Math.abs(valorSegunda) < 1e-7) {
                    return `<li>Teste inconclusivo em x=${formatarNumero(ponto)} (f" ≈ 0), f(${formatarNumero(ponto)}) = ${formatarNumero(valorFuncao)}</li>`;
                } else if (valorSegunda > 0) {
                    return `<li>Mínimo Local em x=${formatarNumero(ponto)}, f(${formatarNumero(ponto)}) = ${formatarNumero(valorFuncao)}</li>`;
                } else {
                    return `<li>Máximo Local em x=${formatarNumero(ponto)}, f(${formatarNumero(ponto)}) = ${formatarNumero(valorFuncao)}</li>`;
                }
            } catch (e) {
                return `<li>Erro ao classificar x=${formatarNumero(ponto)}: ${e.message}</li>`;
            }
        }).join('');
        return `<ul>${resultadoFormatado}</ul>`;
    }

    function calcularEExibirResultados() {
        funcaoOriginalDisplay.textContent = '';
        primeiraDerivadaDisplay.textContent = '';
        segundaDerivadaDisplay.textContent = '';
        pontosCriticosDisplay.innerHTML = '';
        const expressaoOriginalUsuario = campoExpressao.value.trim();
        if (!expressaoOriginalUsuario) {
            mostrarErro('Por favor, insira uma expressão válida.', funcaoOriginalDisplay);
            return;
        }
        const expressaoFormatada = formatarExpressaoEntrada(expressaoOriginalUsuario);
        try {
            const noExpressao = math.parse(expressaoFormatada);
            funcaoOriginalDisplay.innerHTML = `\\( ${noExpressao.toTex({ parenthesis: 'auto' })} \\)`;
            const noPrimeiraDerivada = math.derivative(noExpressao, 'x');
            primeiraDerivadaDisplay.innerHTML = `\\( ${noPrimeiraDerivada.toTex({ parenthesis: 'auto' })} \\)`;
            const noSegundaDerivada = math.derivative(noPrimeiraDerivada, 'x');
            segundaDerivadaDisplay.innerHTML = `\\( ${noSegundaDerivada.toTex({ parenthesis: 'auto' })} \\)`;
            const infoPontosCriticos = encontrarEClassificarPontosCriticos(noExpressao.toString(), noPrimeiraDerivada.toString(), noSegundaDerivada.toString());
            pontosCriticosDisplay.innerHTML = infoPontosCriticos;
            if (window.MathJax && MathJax.typesetPromise) {
                MathJax.typesetPromise();
            }
        } catch (e) {
            console.error("Erro ao processar derivada:", e, "Entrada original:", expressaoOriginalUsuario, "Formatada:", expressaoFormatada);
            mostrarErro('Erro: ' + e.message + `<br>(Tentativa com: ${expressaoFormatada})`, funcaoOriginalDisplay);
        }
    }

    // --- Calculadora de Integrais: Referências a Elementos DOM e Lógica ---
    const campoExpressaoIntegral = document.getElementById('expressao-integral');
    const campoLimiteInferior = document.getElementById('limite-inferior');
    const campoLimiteSuperior = document.getElementById('limite-superior');
    const campoNumeroTrapezios = document.getElementById('numero-trapezios');
    const botaoCalcularIntegral = document.getElementById('botao-calcular-integral');
    const funcaoIntegralDisplay = document.getElementById('funcao-integral-display');
    const resultadoIntegralDisplay = document.getElementById('resultado-integral');
    const canvasGraficoIntegral = document.getElementById('graficoIntegral');
    let graficoIntegralChart = null; // 

    // Limpa o gráfico em caso de erro
    function mostrarErroIntegral(mensagem, elementoDisplay) {
        elementoDisplay.innerHTML = `<span class="error">${mensagem}</span>`;
        if (elementoDisplay === funcaoIntegralDisplay) {
            resultadoIntegralDisplay.textContent = '';
        }
        if (graficoIntegralChart) {
            graficoIntegralChart.destroy();
            graficoIntegralChart = null;
        }
    }

    function calcularIntegralTrapezio(funcaoNodeStr, a, b, n) {
        const h = (b - a) / n;
        let soma = 0;
        const escopo = {};
        escopo.x = a;
        try { soma += math.evaluate(funcaoNodeStr, escopo); } catch (e) { throw new Error(`Erro ao avaliar f(${formatarNumero(a)}): ${e.message}`); }
        escopo.x = b;
        try { soma += math.evaluate(funcaoNodeStr, escopo); } catch (e) { throw new Error(`Erro ao avaliar f(${formatarNumero(b)}): ${e.message}`); }
        for (let i = 1; i < n; i++) {
            const xi = a + i * h;
            escopo.x = xi;
            try { soma += 2 * math.evaluate(funcaoNodeStr, escopo); } catch (e) { throw new Error(`Erro ao avaliar f(${formatarNumero(xi)}): ${e.message}`); }
        }
        return (h / 2) * soma;
    }

    // Função para plotar o gráfico da integral
    function plotarGraficoIntegral(funcaoNodeStr, a, b, n) {
        if (graficoIntegralChart) {
            graficoIntegralChart.destroy(); // Refaz o grafico se já existir
        }
        if (!canvasGraficoIntegral) return;

        const compiledFunc = math.compile(funcaoNodeStr);
        const escopo = {};

        // Gera pontos para a curva da função 
        const pontosCurva = [];
        const numPontosCurva = Math.max(400, n);
        const stepCurva = (b - a) / numPontosCurva;
        for (let i = 0; i <= numPontosCurva; i++) {
            const x = a + i * stepCurva;
            escopo.x = x;
            try {
                const y = compiledFunc.evaluate(escopo);
                if (isFinite(y) && isFinite(x)) {
                    pontosCurva.push({ x: x, y: y });
                }
            } catch (e) { /* Ignora pontos indefinidos */ }
        }

        // Gera pontos para a área sob a curva
        const pontosArea = [];
        const h = (b - a) / n;
        for (let i = 0; i <= n; i++) {
            const x = a + i * h;
            escopo.x = x;
            try {
                const y = compiledFunc.evaluate(escopo);
                if (isFinite(y) && isFinite(x)) {
                    pontosArea.push({ x: x, y: y });
                }
            } catch (e) { /* Ignora pontos indefinidos */ }
        }

        const ctx = canvasGraficoIntegral.getContext('2d');
        graficoIntegralChart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Área da Integral',
                    data: pontosArea,
                    fill: 'origin', 
                    backgroundColor: 'rgba(52, 152, 219, 0.3)',
                    borderColor: 'rgba(52, 152, 219, 0.6)',
                    pointRadius: 0,
                    borderWidth: 1,
                }, {
                    label: 'f(x)',
                    data: pontosCurva,
                    borderColor: '#c0392b', 
                    backgroundColor: 'transparent',
                    borderWidth: 2.5,
                    pointRadius: 0,
                    tension: 0.1 
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 400 },
                plugins: {
                    title: {
                        display: true,
                        text: `Gráfico de f(x) e Área de ${formatarNumero(a)} a ${formatarNumero(b)}`,
                        font: { size: 16 }
                    },
                    legend: { position: 'top' },
                },
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: { display: true, text: 'x' }
                    },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'f(x)' }
                    }
                }
            }
        });
    }

    // Função para calcular e também exibir o gráfico
    function calcularEExibirIntegral() {
        if (!funcaoIntegralDisplay || !resultadoIntegralDisplay) return;

        funcaoIntegralDisplay.textContent = '';
        resultadoIntegralDisplay.textContent = '';

        const expressaoIntegralOriginalUsuario = campoExpressaoIntegral.value.trim();
        const aStr = campoLimiteInferior.value.trim();
        const bStr = campoLimiteSuperior.value.trim();
        const nStr = campoNumeroTrapezios.value.trim();

        if (!expressaoIntegralOriginalUsuario) {
            mostrarErroIntegral('Por favor, insira uma função válida.', funcaoIntegralDisplay);
            return;
        }
        if (aStr === '' || bStr === '' || nStr === '') {
            mostrarErroIntegral('Por favor, preencha os limites (a, b) e o número de trapézios (n).', resultadoIntegralDisplay);
            return;
        }

        const a = parseFloat(aStr);
        const b = parseFloat(bStr);
        const n = parseInt(nStr, 10);

        if (isNaN(a) || isNaN(b) || isNaN(n)) {
            mostrarErroIntegral('Limites (a, b) e número de trapézios (n) devem ser números.', resultadoIntegralDisplay);
            return;
        }
        if (n <= 0) {
            mostrarErroIntegral('O número de trapézios (n) deve ser um inteiro positivo.', resultadoIntegralDisplay);
            return;
        }
        if (a >= b && resultadoIntegralDisplay) {
            resultadoIntegralDisplay.innerHTML = `<span class="error">Aviso: limite inferior (a) não é menor que o superior (b).</span>`;
        }

        const expressaoIntegralFormatada = formatarExpressaoEntrada(expressaoIntegralOriginalUsuario);

        try {
            const noFuncaoIntegral = math.parse(expressaoIntegralFormatada);
            funcaoIntegralDisplay.innerHTML = `\\( \\int_{${formatarNumero(a)}}^{${formatarNumero(b)}} (${noFuncaoIntegral.toTex({ parenthesis: 'auto' })}) \\, dx \\)`;

            const resultado = calcularIntegralTrapezio(noFuncaoIntegral.toString(), a, b, n);
            if (isNaN(resultado)) {
                mostrarErroIntegral('Não foi possível calcular a integral (resultado NaN). Verifique a função e os limites.', resultadoIntegralDisplay);
            } else {
                resultadoIntegralDisplay.innerHTML += `\\( \\approx ${formatarNumero(resultado)} \\)`;
                plotarGraficoIntegral(noFuncaoIntegral.toString(), a, b, Math.min(n, 500)); // Limita n para a plotagem para não sobrecarregar
            }

            if (window.MathJax && MathJax.typesetPromise) {
                MathJax.typesetPromise();
            }

        } catch (e) {
            console.error("Erro ao processar integral:", e, "Entrada original:", expressaoIntegralOriginalUsuario, "Formatada:", expressaoIntegralFormatada);
            mostrarErroIntegral('Erro ao calcular integral: ' + e.message + `<br>(Tentativa com: ${expressaoIntegralFormatada})`, funcaoIntegralDisplay);
            if (window.MathJax && MathJax.typesetPromise) {
                MathJax.typesetPromise();
            }
        }
    }


    // --- Event Listeners ---
    if (botaoCalcular) {
        botaoCalcular.addEventListener('click', calcularEExibirResultados);
    }
    if (campoExpressao) {
        campoExpressao.addEventListener('keypress', function (event) {
            if (event.key === 'Enter') calcularEExibirResultados();
        });
        document.querySelectorAll('#content-derivadas .examples code').forEach(codeElement => {
            codeElement.addEventListener('click', function () {
                campoExpressao.value = this.textContent;
                campoExpressao.focus();
            });
        });
        if (campoExpressao.value === '' || campoExpressao.value === 'x^3 - 3*x') {
            campoExpressao.value = 'x^3 - 3*x';
            calcularEExibirResultados();
        }
    }

    if (botaoCalcularIntegral) {
        botaoCalcularIntegral.addEventListener('click', calcularEExibirIntegral);
    }
    [campoExpressaoIntegral, campoLimiteInferior, campoLimiteSuperior, campoNumeroTrapezios].forEach(campo => {
        if (campo) {
            campo.addEventListener('keypress', function (event) {
                if (event.key === 'Enter') {
                    calcularEExibirIntegral();
                }
            });
        }
    });
    document.querySelectorAll('#content-integrais .examples-integral code').forEach(codeElement => {
        codeElement.addEventListener('click', function () {
            if (campoExpressaoIntegral) campoExpressaoIntegral.value = this.dataset.func || '';
            if (campoLimiteInferior) campoLimiteInferior.value = this.dataset.a || '';
            if (campoLimiteSuperior) campoLimiteSuperior.value = this.dataset.b || '';
            if (campoNumeroTrapezios) campoNumeroTrapezios.value = this.dataset.n || '1000';
            if (campoExpressaoIntegral) campoExpressaoIntegral.focus();
            calcularEExibirIntegral(); // Calcula ao clicar no exemplo
        });
    });
});