document.addEventListener('DOMContentLoaded', function () {
    const campoExpressao = document.getElementById('expressao');
    const botaoCalcular = document.getElementById('botao-calcular');

    const funcaoOriginalDisplay = document.getElementById('funcao-original');
    const primeiraDerivadaDisplay = document.getElementById('derivada1');
    const segundaDerivadaDisplay = document.getElementById('derivada2');
    const pontosCriticosDisplay = document.getElementById('pontos-criticos');

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

    function encontrarPontosCriticosComNewton(expressaoPrimeiraDerivada, expressaoSegundaDerivada, estimativasIniciais = [-10, -5, -2, -1, -0.5, 0, 0.5, 1, 2, 5, 10], tolerancia = 1e-7, maxIteracoes = 100) {
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
                } catch (e) {
                    break;
                }

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
                    } catch (e) { }
                    break;
                }
            }
        }

        return Array.from(pontosCriticos).sort((a, b) => a - b);
    }

    function encontrarEClassificarPontosCriticos(expressaoOriginalStr, primeiraDerivadaStr, segundaDerivadaStr) {
        // Se a derivada é sempre positiva ou negativa (ex: e^x), não há pontos críticos
        if (primeiraDerivadaStr === expressaoOriginalStr && segundaDerivadaStr === expressaoOriginalStr) {
            return 'Nenhum ponto crítico (onde f\'(x) ≈ 0) encontrado com as estimativas atuais.';
        }

        const pontosCriticosNumericos = encontrarPontosCriticosComNewton(primeiraDerivadaStr, segundaDerivadaStr);

        if (!pontosCriticosNumericos.length) {
            return 'Nenhum ponto crítico (onde f\'(x) ≈ 0) encontrado com as estimativas atuais.';
        }

        const resultadoFormatado = pontosCriticosNumericos.map(ponto => {
            const escopo = { x: ponto };
            try {
                const valorFuncao = math.evaluate(expressaoOriginalStr, escopo);
                const valorSegunda = math.evaluate(segundaDerivadaStr, escopo);

                if (!isFinite(valorSegunda)) {
                    return `<li>f\"(${formatarNumero(ponto)}) é indefinida. f(${formatarNumero(ponto)}) = ${formatarNumero(valorFuncao)}</li>`;
                } else if (Math.abs(valorSegunda) < 1e-7) {
                    return `<li>Teste inconclusivo em x=${formatarNumero(ponto)} (f\" ≈ 0), f(${formatarNumero(ponto)}) = ${formatarNumero(valorFuncao)}</li>`;
                } else if (valorSegunda > 0) {
                    return `<li>Mínimo Local em x=${formatarNumero(ponto)}, f(${formatarNumero(ponto)}) = ${formatarNumero(valorFuncao)}</li>`;
                } else {
                    return `<li>Máximo Local em x=${formatarNumero(ponto)}, f(${formatarNumero(ponto)}) = ${formatarNumero(valorFuncao)}</li>`;
                }
            } catch (e) {
                return `<li>Erro ao classificar x=${formatarNumero(ponto)}</li>`;
            }
        }).join('');

        return `<ul>${resultadoFormatado}</ul>`;
    }

    function calcularEExibirResultados() {
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
            funcaoOriginalDisplay.textContent = noExpressao.toString();

            const noPrimeiraDerivada = math.derivative(noExpressao, 'x');
            primeiraDerivadaDisplay.textContent = noPrimeiraDerivada.toString();

            const noSegundaDerivada = math.derivative(noPrimeiraDerivada, 'x');
            segundaDerivadaDisplay.textContent = noSegundaDerivada.toString();

            const infoPontosCriticos = encontrarEClassificarPontosCriticos(
                noExpressao.toString(),
                noPrimeiraDerivada.toString(),
                noSegundaDerivada.toString()
            );
            pontosCriticosDisplay.innerHTML = infoPontosCriticos;

        } catch (e) {
            mostrarErro('Erro: ' + e.message, funcaoOriginalDisplay);
        }
    }

    botaoCalcular.addEventListener('click', calcularEExibirResultados);
    campoExpressao.addEventListener('keypress', function (event) {
        if (event.key === 'Enter') calcularEExibirResultados();
    });
    document.querySelectorAll('.examples code').forEach(codeElement => {
        codeElement.addEventListener('click', function () {
            campoExpressao.value = this.textContent;
            campoExpressao.focus();
            calcularEExibirResultados();
        });
    });

    campoExpressao.value = 'x^3 - 3*x';
    calcularEExibirResultados();
});