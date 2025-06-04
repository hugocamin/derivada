document.addEventListener('DOMContentLoaded', function () {
    // --- Gerenciamento de Abas ---
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            const tabId = button.dataset.tab; // Recupera o valor do atributo 'data-tab'
            const activeContent = document.getElementById(`content-${tabId}`);
            if (activeContent) {
                activeContent.classList.add('active'); // Ativa o conteúdo da aba alvo
            }
        });
    });

    // --- Calculadora de Derivadas: Referências a Elementos DOM ---
    const campoExpressao = document.getElementById('expressao');
    const botaoCalcular = document.getElementById('botao-calcular'); // Botão para cálculo de derivadas

    const funcaoOriginalDisplay = document.getElementById('funcao-original');
    const primeiraDerivadaDisplay = document.getElementById('derivada1');
    const segundaDerivadaDisplay = document.getElementById('derivada2');
    const pontosCriticosDisplay = document.getElementById('pontos-criticos');

    // --- Funções Utilitárias ---

    /**
     * Formata um número para exibição, tratando inteiros, números pequenos/grandes (exponencial) e decimais fixos.
     * @param {number} num - O número a ser formatado.
     * @returns {string} O número formatado como string.
     */
    function formatarNumero(num) {
        if (Math.abs(num) < 1e-10) return '0';
        if (Number.isInteger(num)) return num.toString();
        if (Math.abs(num) > 1e6 || (Math.abs(num) < 1e-4 && num !== 0)) {
            return num.toExponential(4);
        }
        return parseFloat(num.toFixed(5)).toString();
    }

    /**
     * Exibe uma mensagem de erro em um elemento HTML especificado e limpa campos de resultado subsequentes
     * para a calculadora de derivadas.
     * @param {string} mensagem - A mensagem de erro.
     * @param {HTMLElement} elemento - O elemento HTML para exibir o erro.
     */
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

    // --- Calculadora de Derivadas: Lógica Principal ---

    /**
     * Encontra pontos críticos usando o método de Newton-Raphson, buscando raízes da primeira derivada.
     * @param {string} expressaoPrimeiraDerivada - Representação em string da primeira derivada.
     * @param {string} expressaoSegundaDerivada - Representação em string da segunda derivada.
     * @param {number[]} [estimativasIniciais] - Array de estimativas iniciais para o método de Newton.
     * @param {number} [tolerancia=1e-7] - Tolerância para convergência.
     * @param {number} [maxIteracoes=50] - Número máximo de iterações por estimativa inicial.
     * @returns {number[]} Array ordenado dos pontos críticos (valores de x) encontrados.
     */
    function encontrarPontosCriticosComNewton(expressaoPrimeiraDerivada, expressaoSegundaDerivada, estimativasIniciais = [-10, -5, -2, -1, -0.5, 0, 0.5, 1, 2, 5, 10], tolerancia = 1e-7, maxIteracoes = 50) {
        const pontosCriticos = new Set(); // Usando Set para armazenar pontos únicos
        const escopo = {}; // Objeto de escopo para math.evaluate

        for (let estimativa of estimativasIniciais) {
            let x = estimativa;
            for (let i = 0; i < maxIteracoes; i++) {
                escopo.x = x;
                let fPrimax, fSegundax;
                try {
                    fPrimax = math.evaluate(expressaoPrimeiraDerivada, escopo);
                    fSegundax = math.evaluate(expressaoSegundaDerivada, escopo);
                } catch (e) {
                    break; // Erro durante a avaliação, interrompe o loop interno
                }

                if (Math.abs(fPrimax) < tolerancia) { // Encontrou uma raiz para f'(x)
                    pontosCriticos.add(parseFloat(x.toFixed(5)));
                    break;
                }

                if (Math.abs(fSegundax) < 1e-10) break; // Evita divisão por zero ou próximo de zero na fórmula de Newton

                const xAnterior = x;
                x = x - fPrimax / fSegundax; // Passo de Newton-Raphson

                if (!isFinite(x)) break; // Verificação de divergência

                if (Math.abs(x - xAnterior) < tolerancia) { // Verificação de convergência
                    escopo.x = x;
                    try { // Verificação final no x convergido
                        fPrimax = math.evaluate(expressaoPrimeiraDerivada, escopo);
                        if (Math.abs(fPrimax) < tolerancia) {
                            pontosCriticos.add(parseFloat(x.toFixed(5)));
                        }
                    } catch (e) { /* Ignora erro potencial na verificação final */ }
                    break;
                }
            }
        }
        return Array.from(pontosCriticos).sort((a, b) => a - b);
    }

    /**
     * Encontra e classifica pontos críticos usando o teste da segunda derivada.
     * @param {string} expressaoOriginalStr - String da função original.
     * @param {string} primeiraDerivadaStr - String da primeira derivada.
     * @param {string} segundaDerivadaStr - String da segunda derivada.
     * @returns {string} String HTML listando pontos críticos e sua classificação.
     */
    function encontrarEClassificarPontosCriticos(expressaoOriginalStr, primeiraDerivadaStr, segundaDerivadaStr) {
        // Trata casos como f(x) = e^x onde f(x) = f'(x) = f''(x) e f'(x) nunca é zero.
        if (primeiraDerivadaStr === expressaoOriginalStr && segundaDerivadaStr === expressaoOriginalStr) {
            let isFirstDerivativeZeroConstant = false;
            try {
                const parsedFirstDerivative = math.parse(primeiraDerivadaStr);
                if (parsedFirstDerivative.isConstantNode && math.abs(parsedFirstDerivative.evaluate()) < 1e-10) {
                    isFirstDerivativeZeroConstant = true;
                }
            } catch (e) { /* Ignora erro de parse */ }

            if (isFirstDerivativeZeroConstant) {
                return "A primeira derivada é 0 para todo x. Todos os pontos são críticos (função constante).";
            } else if (primeiraDerivadaStr !== "0") { // Se f'(x) não é a constante "0"
                return 'Nenhum ponto crítico (f\'(x) nunca é zero para esta função).';
            }
        }

        const pontosCriticosNumericos = encontrarPontosCriticosComNewton(primeiraDerivadaStr, segundaDerivadaStr);

        if (!pontosCriticosNumericos.length) {
            try {
                const noPrimeira = math.parse(primeiraDerivadaStr);
                // Verifica se f'(x) é uma constante não nula
                if (noPrimeira.isConstantNode && math.abs(noPrimeira.evaluate()) > 1e-9) {
                    return 'Nenhum ponto crítico (a primeira derivada é uma constante diferente de zero).';
                }
            } catch(e) { /* Ignora erro de parse */ }
            return 'Nenhum ponto crítico (onde f\'(x) ≈ 0) encontrado com as estimativas atuais.';
        }

        const resultadoFormatado = pontosCriticosNumericos.map(ponto => {
            const escopo = { x: ponto };
            try {
                const valorFuncao = math.evaluate(expressaoOriginalStr, escopo); // f(ponto)
                const valorSegunda = math.evaluate(segundaDerivadaStr, escopo); // f''(ponto)

                if (!isFinite(valorSegunda)) {
                    return `<li>f\"(${formatarNumero(ponto)}) é indefinida. f(${formatarNumero(ponto)}) = ${formatarNumero(valorFuncao)}</li>`;
                } else if (Math.abs(valorSegunda) < 1e-7) { // Teste da segunda derivada inconclusivo
                    return `<li>Teste inconclusivo em x=${formatarNumero(ponto)} (f\" ≈ 0), f(${formatarNumero(ponto)}) = ${formatarNumero(valorFuncao)}</li>`;
                } else if (valorSegunda > 0) { // Mínimo local
                    return `<li>Mínimo Local em x=${formatarNumero(ponto)}, f(${formatarNumero(ponto)}) = ${formatarNumero(valorFuncao)}</li>`;
                } else { // Máximo local
                    return `<li>Máximo Local em x=${formatarNumero(ponto)}, f(${formatarNumero(ponto)}) = ${formatarNumero(valorFuncao)}</li>`;
                }
            } catch (e) {
                return `<li>Erro ao classificar x=${formatarNumero(ponto)}: ${e.message}</li>`;
            }
        }).join('');
        return `<ul>${resultadoFormatado}</ul>`;
    }

    /**
     * Função principal para cálculos de derivadas. Interpreta a entrada, calcula derivadas,
     * encontra pontos críticos e atualiza a exibição.
     */
    function calcularEExibirResultados() {
        // Limpa resultados anteriores
        funcaoOriginalDisplay.textContent = '';
        primeiraDerivadaDisplay.textContent = '';
        segundaDerivadaDisplay.textContent = '';
        pontosCriticosDisplay.innerHTML = '';

        const expressaoStr = campoExpressao.value.trim();
        if (!expressaoStr) {
            mostrarErro('Por favor, insira uma expressão válida.', funcaoOriginalDisplay);
            return;
        }

        try {
            const noExpressao = math.parse(expressaoStr);
            funcaoOriginalDisplay.innerHTML = `\\( ${noExpressao.toTex()} \\)`;

            const noPrimeiraDerivada = math.derivative(noExpressao, 'x');
            primeiraDerivadaDisplay.innerHTML = `\\( ${noPrimeiraDerivada.toTex()} \\)`;

            const noSegundaDerivada = math.derivative(noPrimeiraDerivada, 'x');
            segundaDerivadaDisplay.innerHTML = `\\( ${noSegundaDerivada.toTex()} \\)`;

            const infoPontosCriticos = encontrarEClassificarPontosCriticos(
                noExpressao.toString(),
                noPrimeiraDerivada.toString(),
                noSegundaDerivada.toString()
            );
            pontosCriticosDisplay.innerHTML = infoPontosCriticos;

            // Re-renderiza MathJax para novo conteúdo LaTeX
            if (window.MathJax && MathJax.typesetPromise) {
                MathJax.typesetPromise();
            }
        } catch (e) {
            mostrarErro('Erro: ' + e.message, funcaoOriginalDisplay);
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

    /**
     * Exibe uma mensagem de erro na aba de integral.
     * @param {string} mensagem - A mensagem de erro.
     * @param {HTMLElement} elementoDisplay - O elemento para exibir o erro.
     */
    function mostrarErroIntegral(mensagem, elementoDisplay) {
        elementoDisplay.innerHTML = `<span class="error">${mensagem}</span>`;
        if (elementoDisplay === funcaoIntegralDisplay) {
            resultadoIntegralDisplay.textContent = '';
        }
    }

    /**
     * Calcula a integral definida usando o método do trapézio.
     * @param {string} funcaoStr - String da função f(x).
     * @param {number} a - Limite inferior de integração.
     * @param {number} b - Limite superior de integração.
     * @param {number} n - Número de trapézios (subintervalos).
     * @returns {number} Valor aproximado da integral definida.
     */
    function calcularIntegralTrapezio(funcaoStr, a, b, n) {
        let noFuncao;
        try {
            noFuncao = math.parse(funcaoStr);
        } catch (e) {
            throw new Error(`Erro ao interpretar a função: ${e.message}`);
        }

        const h = (b - a) / n; // Largura de cada trapézio
        let soma = 0;
        const escopo = {}; // Objeto de escopo para math.evaluate

        escopo.x = a;
        try {
            soma += math.evaluate(noFuncao.toString(), escopo); // f(a)
        } catch (e) {
            throw new Error(`Erro ao avaliar f(${formatarNumero(a)}): ${e.message}`);
        }

        escopo.x = b;
        try {
            soma += math.evaluate(noFuncao.toString(), escopo); // f(b)
        } catch (e) {
            throw new Error(`Erro ao avaliar f(${formatarNumero(b)}): ${e.message}`);
        }

        for (let i = 1; i < n; i++) { // Soma dos termos internos 2*f(x_i)
            const xi = a + i * h;
            escopo.x = xi;
            try {
                soma += 2 * math.evaluate(noFuncao.toString(), escopo);
            } catch (e) {
                throw new Error(`Erro ao avaliar f(${formatarNumero(xi)}): ${e.message}`);
            }
        }
        return (h / 2) * soma; // Fórmula do método do trapézio
    }

    /**
     * Função principal para cálculo de integral. Interpreta entradas, calcula e exibe o resultado.
     */
    function calcularEExibirIntegral() {
        if (!funcaoIntegralDisplay || !resultadoIntegralDisplay) return; // Proteção caso os elementos não existam

        funcaoIntegralDisplay.textContent = '';
        resultadoIntegralDisplay.textContent = '';

        const expressaoIntegralStr = campoExpressaoIntegral.value.trim();
        const aStr = campoLimiteInferior.value.trim();
        const bStr = campoLimiteSuperior.value.trim();
        const nStr = campoNumeroTrapezios.value.trim();

        // Validações de entrada
        if (!expressaoIntegralStr) {
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
        if (a >= b && resultadoIntegralDisplay) { // Verifica se a < b, comum para integrais
             mostrarErroIntegral('Aviso: limite inferior (a) não é menor que o superior (b).', resultadoIntegralDisplay);
             // Nota: O método do trapézio ainda funciona, mas o sinal pode ser o oposto do esperado para a área.
        }

        try {
            const noFuncaoIntegral = math.parse(expressaoIntegralStr);
            funcaoIntegralDisplay.innerHTML = `\\( \\int_{${formatarNumero(a)}}^{${formatarNumero(b)}} (${noFuncaoIntegral.toTex()}) \\, dx \\)`;

            const resultado = calcularIntegralTrapezio(expressaoIntegralStr, a, b, n);
            if (isNaN(resultado)) { // Verifica se o resultado é um número válido
                 mostrarErroIntegral('Não foi possível calcular a integral (resultado NaN). Verifique a função e os limites.', resultadoIntegralDisplay);
            } else {
                resultadoIntegralDisplay.innerHTML = `\\( \\approx ${formatarNumero(resultado)} \\)`;
            }

            if (window.MathJax && MathJax.typesetPromise) {
                MathJax.typesetPromise();
            }

        } catch (e) {
            mostrarErroIntegral('Erro ao calcular integral: ' + e.message, funcaoIntegralDisplay);
            if (window.MathJax && MathJax.typesetPromise) { // Tenta re-renderizar MathJax mesmo em erro
                MathJax.typesetPromise();
            }
        }
    }

    // --- Event Listeners ---

    // Calculadora de Derivadas
    if (botaoCalcular) {
        botaoCalcular.addEventListener('click', calcularEExibirResultados);
    }
    if (campoExpressao) {
        campoExpressao.addEventListener('keypress', function (event) {
            if (event.key === 'Enter') calcularEExibirResultados();
        });
        // Listeners para exemplos de derivadas (específico para a aba de derivadas)
        document.querySelectorAll('#content-derivadas .examples code').forEach(codeElement => {
            codeElement.addEventListener('click', function () {
                campoExpressao.value = this.textContent;
                campoExpressao.focus();
                calcularEExibirResultados();
            });
        });
        // Cálculo inicial para a aba de derivadas
        campoExpressao.value = 'x^3 - 3*x';
        calcularEExibirResultados();
    }

    // Calculadora de Integrais
    if (botaoCalcularIntegral) {
        botaoCalcularIntegral.addEventListener('click', calcularEExibirIntegral);
    }
    // Listeners para Enter nos campos de integral
    [campoExpressaoIntegral, campoLimiteInferior, campoLimiteSuperior, campoNumeroTrapezios].forEach(campo => {
        if (campo) {
            campo.addEventListener('keypress', function(event) {
                if (event.key === 'Enter') {
                    calcularEExibirIntegral();
                }
            });
        }
    });
    // Listeners para exemplos de integral (específico para a aba de integrais)
    document.querySelectorAll('#content-integrais .examples-integral code').forEach(codeElement => {
        codeElement.addEventListener('click', function() {
            if(campoExpressaoIntegral) campoExpressaoIntegral.value = this.dataset.func || '';
            if(campoLimiteInferior) campoLimiteInferior.value = this.dataset.a || '';
            if(campoLimiteSuperior) campoLimiteSuperior.value = this.dataset.b || '';
            if(campoNumeroTrapezios) campoNumeroTrapezios.value = this.dataset.n || '1000';
            if(campoExpressaoIntegral) campoExpressaoIntegral.focus();
        });
    });
});