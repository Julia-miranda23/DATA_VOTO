import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, get, child, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Configuração do seu Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCqIH9iTrMh4Q4mqimB7HWxxxhH7znHz34",
    authDomain: "data-voto-cesf.firebaseapp.com",
    databaseURL: "https://data-voto-cesf-default-rtdb.firebaseio.com",
    projectId: "data-voto-cesf",
    storageBucket: "data-voto-cesf.firebasestorage.app",
    messagingSenderId: "740222592167",
    appId: "1:740222592167:web:71dd95e20244bd8dd6e782"
};

// Inicializa a aplicação e o Realtime Database
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// =========================================================================
// LÓGICA DA PÁGINA DE PESQUISA (index.html)
// =========================================================================
const formPesquisa = document.getElementById("pesquisaForm");

if (formPesquisa) {
    const mensagemFeedback = document.getElementById("mensagemFeedback");
    const btnEnviar = document.getElementById("btnEnviar");

    formPesquisa.addEventListener("submit", async (e) => {
        e.preventDefault();

        const moradoresVal = Number(document.getElementById("moradores").value);
        const trabalhadoresVal = Number(document.getElementById("trabalhadores").value);

        if (trabalhadoresVal > moradoresVal) {
            mensagemFeedback.textContent = "O número de trabalhadores não pode ser maior que o número de moradores.";
            mensagemFeedback.className = "error";
            mensagemFeedback.classList.remove("hidden");
            return;
        }

        const dadosResposta = {
            faixaEtaria: document.getElementById("faixaEtaria").value,
            bairro: document.getElementById("bairro").value.trim(),
            rotina: document.getElementById("rotina").value,
            rendaFamiliar: document.getElementById("rendaFamiliar").value,
            moradores: moradoresVal,
            trabalhadores: trabalhadoresVal,
            certezaVoto: document.getElementById("certezaVoto").value,
            pautaPrioritaria: document.getElementById("pautaPrioritaria").value,
            timestamp: serverTimestamp()
        };

        btnEnviar.disabled = true;
        btnEnviar.textContent = "Enviando...";

        try {
            // Grava no Realtime Database no nó 'datavoto_cesf_respostas'
            const respostasRef = ref(db, "datavoto_cesf_respostas");
            await push(respostasRef, dadosResposta);
            
            mensagemFeedback.textContent = "Resposta registrada com sucesso! Obrigado por colaborar.";
            mensagemFeedback.className = "success";
            mensagemFeedback.classList.remove("hidden");
            formPesquisa.reset();
        } catch (error) {
            console.error("Erro ao salvar no Realtime Database: ", error);
            mensagemFeedback.textContent = "Ocorreu um erro ao enviar sua resposta. Tente novamente.";
            mensagemFeedback.className = "error";
            mensagemFeedback.classList.remove("hidden");
        } finally {
            btnEnviar.disabled = false;
            btnEnviar.textContent = "Enviar Resposta";
        }
    });
}

// =========================================================================
// LÓGICA DO PAINEL ADMINISTRATIVO (admin.html)
// =========================================================================
const loginSection = document.getElementById("loginSection");

if (loginSection) {
    const SENHA_CORRETA = "admin123";
    const adminContent = document.getElementById("adminContent");
    const btnLogin = document.getElementById("btnLogin");
    const senhaAdmin = document.getElementById("senhaAdmin");
    const erroLogin = document.getElementById("erroLogin");

    let chartInstance = null;

    btnLogin.addEventListener("click", () => {
        if (senhaAdmin.value === SENHA_CORRETA) {
            loginSection.classList.add("hidden");
            adminContent.classList.remove("hidden");
            carregarDadosPainel();
        } else {
            erroLogin.classList.remove("hidden");
        }
    });

    async function carregarDadosPainel() {
        try {
            const dbRef = ref(db);
            const snapshot = await get(child(dbRef, "datavoto_cesf_respostas"));
            
            let total = 0;
            let somaMoradores = 0;
            let somaTrabalhadores = 0;
            
            const contagemPautas = {
                "Educacao": 0,
                "Saude": 0,
                "Seguranca": 0,
                "Infraestrutura": 0
            };

            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    const data = childSnapshot.val();
                    total++;

                    if (typeof data.moradores === "number") {
                        somaMoradores += data.moradores;
                    }
                    if (typeof data.trabalhadores === "number") {
                        somaTrabalhadores += data.trabalhadores;
                    }

                    if (contagemPautas[data.pautaPrioritaria] !== undefined) {
                        contagemPautas[data.pautaPrioritaria]++;
                    }
                });
            }

            document.getElementById("totalRespostas").textContent = total;
            document.getElementById("mediaMoradores").textContent = total > 0 ? (somaMoradores / total).toFixed(1) : "0.0";
            document.getElementById("mediaTrabalhadores").textContent = total > 0 ? (somaTrabalhadores / total).toFixed(1) : "0.0";

            gerarGrafico(contagemPautas);

        } catch (error) {
            console.error("Erro ao buscar dados do Realtime Database:", error);
        }
    }

    function gerarGrafico(dadosPautas) {
        const ctx = document.getElementById("graficoPautas").getContext("2d");

        if (chartInstance) {
            chartInstance.destroy();
        }

        chartInstance = new Chart(ctx, {
            type: "bar",
            data: {
                labels: ["Educação", "Saúde", "Segurança", "Infraestrutura"],
                datasets: [{
                    label: "Votos por Pauta",
                    data: [
                        dadosPautas.Educacao,
                        dadosPautas.Saude,
                        dadosPautas.Seguranca,
                        dadosPautas.Infraestrutura
                    ],
                    backgroundColor: ["#2e7d32", "#1976d2", "#f57c00", "#c2185b"]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                }
            }
        });
    }
}