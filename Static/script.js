// Rodapé dinâmico
window.addEventListener("DOMContentLoaded", () => {
  const footer = document.createElement("footer");
  footer.className = "site-footer";
  footer.innerHTML = `
    <div class="footer-content">
      <h3>APP</h3>
      <h4>&copy; 2025 Arquivo Político Público – Todos os direitos reservados.</h4>
      <p>
        <a href="#">Política de Privacidade</a> |
        <a href="#">Termos de Uso</a> |
        <a href="#">Contato</a>
      </p>
    </div>
  `;
  const container = document.getElementById("footer-container");
  if (container) container.appendChild(footer);
});

// ===============================
// PERFIL.HTML - preencher os dados
// ===============================
if (window.location.pathname.includes("perfil.html")) {
  const candidatoBase = JSON.parse(localStorage.getItem("perfilCandidato"));

  if (candidatoBase) {
    const nome = candidatoBase.NM_URNA_CANDIDATO;
    fetch(`/govbuster?nome=${encodeURIComponent(nome)}`)
      .then(res => res.json())
      .then(data => {

        if (data.foto_url) {
          const fotoContainer = document.getElementById("foto-container");
          fotoContainer.innerHTML = `<img src="${data.foto_url}" alt="Foto do Candidato">`;
        }
        document.getElementById("nome-candidato").textContent = candidatoBase.NM_URNA_CANDIDATO || "—";
        document.getElementById("nome-urna").textContent = candidatoBase.NM_URNA_CANDIDATO || "—";
        document.getElementById("partido").textContent = candidatoBase.NM_PARTIDO || data.partido || "—";
        document.getElementById("cargo").textContent = candidatoBase.DS_CARGO || "—";
        document.getElementById("estado").textContent = candidatoBase.SG_UF || "—";
        document.getElementById("situacao").textContent = candidatoBase.DS_SITUACAO_CANDIDATURA || "—";

        document.getElementById("nome-civil").textContent = candidatoBase.NM_CANDIDATO || "—";
        document.getElementById("nascimento").textContent = candidatoBase.DT_NASCIMENTO || "—";
        document.getElementById("idade").textContent = candidatoBase.NR_IDADE_DATA_POSSE || "—";
        document.getElementById("genero").textContent = candidatoBase.DS_GENERO || "—";
        document.getElementById("estado-civil").textContent = candidatoBase.DS_ESTADO_CIVIL || "—";
        document.getElementById("cor-raca").textContent = candidatoBase.DS_COR_RACA || "—";
        document.getElementById("grau-instrucao").textContent = candidatoBase.DS_GRAU_INSTRUCAO || "—";
        document.getElementById("ocupacao").textContent = candidatoBase.DS_OCUPACAO || "—";

        document.getElementById("numero-candidato").textContent = candidatoBase.NR_CANDIDATO || "—";
        document.getElementById("situacao-candidatura").textContent = candidatoBase.DS_SITUACAO_CANDIDATURA || "—";
        document.getElementById("tipo-eleicao").textContent = candidatoBase.DS_TIPO_ELEICAO || "—";
        document.getElementById("turno").textContent = candidatoBase.NR_TURNO || "—";
        document.getElementById("federacao").textContent = candidatoBase.DS_COMPOSICAO_COLIGACAO || "—";
        document.getElementById("resultado-eleicao").textContent = candidatoBase.DS_SIT_TOT_TURNO || "—";

        document.getElementById("uf-nascimento").textContent = candidatoBase.SG_UF_NASCIMENTO || "—";
        document.getElementById("municipio-nascimento").textContent = candidatoBase.NM_MUNICIPIO_NASCIMENTO || "—";
        document.getElementById("uf-eleicao").textContent = candidatoBase.SG_UF || "—";
        document.getElementById("municipio-eleicao").textContent = candidatoBase.NM_MUNICIPIO || "—";

        document.getElementById("email").textContent = candidatoBase.DS_EMAIL || "—";
        document.getElementById("cpf").textContent = candidatoBase.NR_CPF_CANDIDATO || "—";
        document.getElementById("titulo-eleitoral").textContent = candidatoBase.NR_TITULO_ELEITORAL_CANDIDATO || "—";

        // PROPOSTA - se quiser exibir ou baixar, exemplo:
        if (data.proposta && data.proposta.length > 100) {
          // PROPOSTA - botão para baixar o PDF, sem mostrar o conteúdo
          const blocoProposta = document.createElement("div");
          blocoProposta.className = "bloco";
          blocoProposta.innerHTML = `
            <h3>Proposta de Governo</h3>
            <a class="btn-download" href="/Static/proposta/${nome}.pdf" download>Baixar Proposta em PDF</a>
          `;
          document.querySelector(".info-blocos").appendChild(blocoProposta);

        }

        // MOVIMENTAÇÕES PROCESSUAIS
        if (Array.isArray(data.processos)) {
          const blocoProcessos = document.createElement("div");
          blocoProcessos.className = "bloco";
          blocoProcessos.innerHTML = `<h3>Processos</h3>`;
          data.processos.forEach(proc => {
            blocoProcessos.innerHTML += `
              <p><strong>${proc.numero_cnj}</strong> – ${proc.fonte}<br><em>${proc.data_inicio}</em><br>${proc.ultima_movimentacao || ''}</p><hr>
            `;
          });
          document.querySelector(".info-blocos").appendChild(blocoProcessos);
        }
      })
      .catch(err => {
        console.error("Erro ao carregar dados do perfil:", err);
      });
  }
}

// ===============================
// INDEX.HTML - buscar candidatos
// ===============================
if (window.location.pathname.includes("index.html") || window.location.pathname === "/") {
  let candidatos = {};

  async function carregarCandidatos() {
    try {
      const response = await fetch("/dados-candidatos");
      const dados = await response.json();
      for (const cand of dados) {
        if (cand.NM_URNA_CANDIDATO) {
          candidatos[cand.NM_URNA_CANDIDATO] = cand;
        }
      }
    } catch (err) {
      console.error("Erro ao carregar candidatos:", err);
    }
  }

  carregarCandidatos();

  document.getElementById("search-button").addEventListener("click", () => {
    const nome = document.getElementById("search-bar").value.trim();
    const results = document.getElementById("results");
    const loader = document.getElementById("loader");

    results.innerHTML = "";
    loader.style.display = "block";

    if (nome && candidatos[nome]) {
      localStorage.setItem("perfilCandidato", JSON.stringify(candidatos[nome]));
      window.location.href = "perfil.html";
    } else {
      const matches = Object.keys(candidatos).filter(key =>
        key.toLowerCase().includes(nome.toLowerCase())
      );

      if (matches.length > 0) {
        results.innerHTML = `
          <p>Candidato exato não encontrado. Você quis dizer:</p>
          <ul>
            ${matches.slice(0, 5).map(name => `
              <li style="cursor:pointer;color:blue;" onclick="document.getElementById('search-bar').value='${name}';document.getElementById('search-button').click();">
                ${name}
              </li>`).join("")}
          </ul>
        `;
      } else {
        results.innerHTML = `<p>Candidato "${nome}" não encontrado.</p>`;
      }
    }

    loader.style.display = "none";
  });
}
