import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDBEb-TyC8wFQAG6rNsidvafhG7VN-TJEE",
    authDomain: "data-voto-2.firebaseapp.com",
    databaseURL: "https://data-voto-2-default-rtdb.firebaseio.com",
    projectId: "data-voto-2",
    storageBucket: "data-voto-2.firebasestorage.app",
    messagingSenderId: "123075628669",
    appId: "1:123075628669:web:80adcb64fd98d8963f6b14"
};

// Inicializa a aplicação e o banco Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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
            await addDoc(collection(db, "datavoto_cesf_respostas"), dadosResposta);
            
            mensagemFeedback.textContent = "Resposta registrada com sucesso! Obrigado por colaborar.";
            mensagemFeedback.className = "success";
            mensagemFeedback.classList.remove("hidden");
            formPesquisa.reset();
        } catch (error) {
            console.error("Erro ao salvar no Firestore: ", error);
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
            const querySnapshot = await getDocs(collection(db, "datavoto_cesf_respostas"));
            
            let total = 0;
            let somaMoradores = 0;
            let somaTrabalhadores = 0;
            
            const contagemPautas = {
                "Educacao": 0,
                "Saude": 0,
                "Seguranca": 0,
                "Infraestrutura": 0
            };

            querySnapshot.forEach((doc) => {
                const data = doc.data();
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

            document.getElementById("totalRespostas").textContent = total;
            document.getElementById("mediaMoradores").textContent = total > 0 ? (somaMoradores / total).toFixed(1) : "0.0";
            document.getElementById("mediaTrabalhadores").textContent = total > 0 ? (somaTrabalhadores / total).toFixed(1) : "0.0";

            gerarGrafico(contagemPautas);

        } catch (error) {
            console.error("Erro ao buscar dados do Firestore:", error);
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